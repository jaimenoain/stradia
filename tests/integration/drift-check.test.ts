import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as ts from 'typescript';
import { TextEncoder } from 'util';
import * as crypto from 'crypto';

// Polyfill TextEncoder
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

function loadDriftCoreModule() {
  const corePath = path.join(process.cwd(), 'supabase/functions/_shared/drift-core.ts');
  const source = fs.readFileSync(corePath, 'utf8');

  // Transpile TypeScript to CommonJS
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    }
  });

  const context = vm.createContext({
    require: (id: string) => {
      // Mock Deno/ESM imports
      if (id.includes('https://esm.sh/@supabase/supabase-js')) {
        return {
          SupabaseClient: class {},
          createClient: jest.fn(),
        };
      }
      if (id.includes('https://esm.sh/microdiff')) {
        return require('microdiff');
      }
      return require(id);
    },
    exports: {},
    console,
    TextEncoder,
    crypto: {
        subtle: crypto.webcrypto.subtle // Use Node's webcrypto implementation
    },
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    URL,
    URLSearchParams
  });

  try {
    vm.runInContext(result.outputText, context);
  } catch (e) {
    console.error("Failed to compile/run core.ts:", e);
    throw e;
  }

  return context.exports as any;
}

const { checkDrift, normalizeJson, generateHash } = loadDriftCoreModule();

describe('Drift Check Logic (Live Source)', () => {
    const mockTaskId = 'task-123';
    let mockSupabase: any;
    let mockExecutionLog: any;

    beforeEach(() => {
        mockExecutionLog = null; // Reset
        const mockFrom = (table: string) => {
            if (table === 'execution_logs') {
                return {
                    select: () => ({
                        eq: () => ({
                            order: () => ({
                                limit: () => ({
                                    single: async () => ({
                                        data: mockExecutionLog,
                                        error: mockExecutionLog ? null : { code: 'PGRST116', message: 'Row not found' }
                                    })
                                })
                            })
                        })
                    })
                };
            }
            return {};
        };

        mockSupabase = {
            from: jest.fn(mockFrom),
        };
    });

    test('Normalization: Sorts keys and removes noisy fields', () => {
        const input = {
            b: 2,
            a: 1,
            updated_at: '2023-01-01',
            nested: {
                timestamp: 123456,
                y: 'foo',
                x: 'bar'
            }
        };
        const expected = {
            a: 1,
            b: 2,
            nested: {
                x: 'bar',
                y: 'foo'
            }
        };
        expect(normalizeJson(input)).toEqual(expected);
    });

    test('Hashing: Generates consistent SHA-256 hash', async () => {
        const obj = { a: 1, b: 2 };
        const hash1 = await generateHash(obj);
        const hash2 = await generateHash(obj);
        expect(hash1).toBe(hash2);
        expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
    });

    test('Scenario: MATCH (Identical payloads)', async () => {
        mockExecutionLog = { payload: { foo: 'bar', list: [1, 2] } };
        const livePayload = { foo: 'bar', list: [1, 2] };

        const result = await checkDrift(mockSupabase, mockTaskId, livePayload);

        expect(result.status).toBe('MATCH');
        expect(result.truthHash).toBe(result.liveHash);
        expect(result.diff).toBeUndefined();
    });

    test('Scenario: MATCH (Drift is only noisy fields)', async () => {
        mockExecutionLog = { payload: { foo: 'bar', updated_at: 'old' } };
        const livePayload = { foo: 'bar', updated_at: 'new' };

        const result = await checkDrift(mockSupabase, mockTaskId, livePayload);

        expect(result.status).toBe('MATCH');
    });

    test('Scenario: DRIFTED (Real change)', async () => {
        mockExecutionLog = { payload: { foo: 'bar' } };
        const livePayload = { foo: 'baz' };

        const result = await checkDrift(mockSupabase, mockTaskId, livePayload);

        expect(result.status).toBe('DRIFTED');
        expect(result.truthHash).not.toBe(result.liveHash);
        expect(result.diff).toBeDefined();
        // Check microdiff structure: [{path: ['foo'], type: 'CHANGE', value: 'baz', oldValue: 'bar'}]
        expect(result.diff[0]).toMatchObject({
            path: ['foo'],
            type: 'CHANGE', // microdiff specific
            value: 'baz',
            oldValue: 'bar'
        });
    });

    test('Scenario: DRIFTED (New field added)', async () => {
        mockExecutionLog = { payload: { foo: 'bar' } };
        const livePayload = { foo: 'bar', newField: 1 };

        const result = await checkDrift(mockSupabase, mockTaskId, livePayload);

        expect(result.status).toBe('DRIFTED');
        expect(result.diff).toEqual(expect.arrayContaining([
            expect.objectContaining({ path: ['newField'], type: 'CREATE', value: 1 })
        ]));
    });

    test('Scenario: No Prior Execution (Drift from Empty)', async () => {
        mockExecutionLog = null; // No log found
        const livePayload = { foo: 'bar' };

        const result = await checkDrift(mockSupabase, mockTaskId, livePayload);

        expect(result.status).toBe('DRIFTED');
        // Truth is {}, Live is {foo:'bar'}
        expect(result.diff).toBeDefined();
        expect(result.diff.length).toBeGreaterThan(0);
    });
});
