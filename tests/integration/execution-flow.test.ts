
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as ts from 'typescript';
import { TextEncoder } from 'util';

// Polyfill TextEncoder for JSDOM environment
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

// --- DYNAMICALLY LOAD CORE LOGIC ---
// This ensures we test the ACTUAL source code from supabase/functions/execute-action/core.ts
// instead of a copy, addressing the code review feedback.

function loadCoreModule() {
  const corePath = path.join(process.cwd(), 'supabase/functions/execute-action/core.ts');
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
      if (id.includes('https://esm.sh/')) {
        return {
          SupabaseClient: class {}, // Mock SupabaseClient class if needed
          createClient: jest.fn(),
        };
      }
      return require(id);
    },
    exports: {},
    console,
    TextEncoder,
    // Mock crypto for VM context since JSDOM/Node crypto support can be tricky in VM
    crypto: {
      subtle: {
        digest: async (_algo: string, _data: any) => {
          return new Uint8Array(32).buffer; // Return mock 32-byte hash
        }
      }
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

// Load the module once
const { executeAction } = loadCoreModule();


// --- INTEGRATION TESTS ---

describe('Execution Flow Verification (Live Source)', () => {
  const mockTaskId = 'task-123';
  const mockMarketId = 'market-456';
  const mockToken = 'mock-gtm-token';
  const mockTaskConfig = {
    accountId: '111',
    containerId: '222',
    workspaceId: '333'
  };

  let mockSupabase: any;
  let mockFetch: any;
  let insertSpy: any;
  let updateSpy: any;

  beforeEach(() => {
    // Spies
    insertSpy = jest.fn().mockResolvedValue({ error: null });
    updateSpy = jest.fn().mockResolvedValue({ error: null });

    // Mock Supabase Chain
    const mockFrom = (table: string) => {
      if (table === 'market_tasks') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  market_id: mockMarketId,
                  task_config: mockTaskConfig,
                  status: 'TODO'
                },
                error: null
              })
            })
          }),
          update: (data: any) => {
             return { eq: async () => updateSpy(data) };
          }
        };
      }
      if (table === 'snapshots') {
        return {
            insert: async (data: any) => insertSpy(data)
        };
      }
      return {};
    };

    mockSupabase = {
      from: jest.fn(mockFrom),
      rpc: jest.fn().mockResolvedValue({ data: mockToken, error: null }),
    };

    mockFetch = jest.fn();
  });

  test('Snapshot Mandate: Snapshot is taken BEFORE execution for updates', async () => {
    const payload = { tagId: 'tag-999', name: 'Updated Tag' };
    const callOrder: string[] = [];

    // Mock Fetch implementation to track order
    mockFetch.mockImplementation(async (url: string, options: any) => {
      if (options.method === 'GET') {
        callOrder.push('SNAPSHOT_FETCH');
        return {
          ok: true,
          json: async () => ({ tagId: 'tag-999', name: 'Old Tag' })
        };
      }
      if (options.method === 'PUT') {
        callOrder.push('EXECUTE_FETCH');
        return {
          ok: true,
          json: async () => ({ tagId: 'tag-999', name: 'Updated Tag' })
        };
      }
      return { ok: false };
    });

    // Mock Insert implementation to track order
    insertSpy.mockImplementation(async () => {
      callOrder.push('SNAPSHOT_INSERT');
      return { error: null };
    });

    await executeAction(mockSupabase, mockTaskId, payload, mockFetch);

    // Check Strict Sequence
    expect(callOrder).toEqual(['SNAPSHOT_FETCH', 'SNAPSHOT_INSERT', 'EXECUTE_FETCH']);

    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'DONE' })); // DB Update
  });

  test('Create Flow: No Snapshot for new resources', async () => {
    const payload = { name: 'New Tag' }; // No ID

    // Mock Fetch: Only POST (Execute)
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tagId: 'tag-new', name: 'New Tag' })
    });

    await executeAction(mockSupabase, mockTaskId, payload, mockFetch);

    expect(insertSpy).not.toHaveBeenCalled(); // No Snapshot
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/tags'), expect.objectContaining({ method: 'POST' }));
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'DONE' }));
  });

  test('Safety Check: Snapshot Failure aborts execution', async () => {
    const payload = { tagId: 'tag-999', name: 'Updated Tag' };

    // Mock Fetch: GET fails
    mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: async () => 'Internal Error'
    });

    await expect(executeAction(mockSupabase, mockTaskId, payload, mockFetch))
      .rejects.toThrow('Snapshot fetch failed');

    expect(mockFetch).toHaveBeenCalledTimes(1); // Only snapshot attempted
    expect(insertSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled(); // No DB update
  });

  test('External Effect: API Failure prevents DB update', async () => {
    const payload = { tagId: 'tag-999', name: 'Updated Tag' };

    // Mock Fetch: Snapshot OK, PUT Fails
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tagId: 'tag-999', name: 'Old Tag' })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'GTM Error',
        text: async () => 'GTM Failed'
      });

    await expect(executeAction(mockSupabase, mockTaskId, payload, mockFetch))
      .rejects.toThrow('GTM API Write failed');

    expect(insertSpy).toHaveBeenCalled(); // Snapshot was taken
    expect(mockFetch).toHaveBeenCalledTimes(2); // Execution attempted
    expect(updateSpy).not.toHaveBeenCalled(); // Task NOT marked DONE
  });
});
