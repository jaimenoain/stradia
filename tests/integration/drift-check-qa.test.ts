import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as ts from 'typescript';
import { TextEncoder } from 'util';
import * as crypto from 'crypto';

// Polyfill TextEncoder if not present
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

function loadDriftCoreModule() {
  const corePath = path.join(process.cwd(), 'supabase/functions/drift-check/core.ts');
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

describe('QA: Snapshot & Diffing Logic Verification', () => {
    const mockTaskId = 'qa-task-123';
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

    // 1. Zero-Drift Baseline
    test('Zero-Drift Baseline: Identical objects return MATCH and empty diff', async () => {
        const payload = {
            container_id: 'container-A',
            config: {
                timeout: 300,
                retries: 3
            },
            tags: ['prod', 'v1']
        };

        mockExecutionLog = { payload };
        const livePayload = JSON.parse(JSON.stringify(payload)); // Deep copy to ensure independence

        const result = await checkDrift(mockSupabase, mockTaskId, livePayload);

        expect(result.status).toBe('MATCH');
        expect(result.truthHash).toBe(result.liveHash);
        expect(result.diff).toBeUndefined();
    });

    // 2. Positive Drift Detection
    test('Positive Drift Detection: Substantive change returns DRIFTED and correct diff path', async () => {
        const truthPayload = {
            container_id: 'container-A',
            config: {
                timeout: 300,
                retries: 3
            }
        };
        mockExecutionLog = { payload: truthPayload };

        const livePayload = {
            container_id: 'container-B', // Changed
            config: {
                timeout: 300,
                retries: 3
            }
        };

        const result = await checkDrift(mockSupabase, mockTaskId, livePayload);

        expect(result.status).toBe('DRIFTED');
        expect(result.truthHash).not.toBe(result.liveHash);
        expect(result.diff).toBeDefined();

        // Verify diff identifies the specific path
        const change = result.diff.find((d: any) => d.path.includes('container_id'));
        expect(change).toBeDefined();
        expect(change).toMatchObject({
            type: 'CHANGE',
            path: ['container_id'],
            value: 'container-B',
            oldValue: 'container-A'
        });
    });

    // 3. Normalization/Noise Tolerance
    test('Normalization/Noise Tolerance: Only noisy fields differ returns MATCH', async () => {
        const truthPayload = {
            id: 'item-1',
            value: 100,
            updated_at: '2023-01-01T00:00:00Z',
            created_at: '2023-01-01T00:00:00Z',
            timestamp: 1672531200000,
            revision_id: 'rev-1'
        };
        mockExecutionLog = { payload: truthPayload };

        const livePayload = {
            id: 'item-1',
            value: 100,
            updated_at: '2023-01-02T12:00:00Z', // Changed
            created_at: '2023-01-01T00:00:00Z',
            timestamp: 1672660800000, // Changed
            revision_id: 'rev-2' // Changed
        };

        const result = await checkDrift(mockSupabase, mockTaskId, livePayload);

        expect(result.status).toBe('MATCH');
        expect(result.truthHash).toBe(result.liveHash);
        // The hashes should match because noisy fields are removed before hashing
    });

    test('Normalization/Noise Tolerance: Nested noisy fields are ignored', async () => {
        const truthPayload = {
            meta: {
                generated_by: 'system',
                last_modified: '2023-01-01'
            }
        };
        mockExecutionLog = { payload: truthPayload };

        const livePayload = {
            meta: {
                generated_by: 'system',
                last_modified: '2023-02-02' // Changed
            }
        };

        const result = await checkDrift(mockSupabase, mockTaskId, livePayload);

        expect(result.status).toBe('MATCH');
    });
});
