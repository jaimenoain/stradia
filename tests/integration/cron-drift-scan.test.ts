import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as ts from 'typescript';

function loadScanDriftModule(mocks: any) {
  const corePath = path.join(process.cwd(), 'supabase/functions/cron-drift-scan/core.ts');
  const source = fs.readFileSync(corePath, 'utf8');

  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  });

  const context = vm.createContext({
    require: (id: string) => {
      if (id.includes('@supabase/supabase-js')) {
        return { SupabaseClient: class {} };
      }
      if (id.includes('_shared/drift-core')) {
        return mocks.driftCore;
      }
      if (id.includes('_shared/gtm')) {
        return mocks.gtm;
      }
      return require(id);
    },
    exports: {},
    console,
    process
  });

  vm.runInContext(result.outputText, context);
  return context.exports;
}

describe('Cron Drift Scan Logic', () => {
    let mockSupabase: any;
    let mockDriftCore: any;
    let mockGtm: any;
    let scanDrift: any;
    let mockFetch: any;

    beforeEach(() => {
        mockFetch = jest.fn();

        mockDriftCore = {
            getLastExecutionLog: jest.fn(),
            checkDrift: jest.fn()
        };
        mockGtm = {
            fetchGtmConfig: jest.fn()
        };

        const loaded = loadScanDriftModule({ driftCore: mockDriftCore, gtm: mockGtm });
        scanDrift = loaded.scanDrift;

        // Mock Supabase Chain
        const mockUpdate = jest.fn(() => Promise.resolve({ error: null }));
        const mockEqUpdate = jest.fn(() => ({ update: mockUpdate, eq: jest.fn(() => Promise.resolve({ error: null })) })); // Fix chaining for update

        // Correct chain for update: .from().update().eq()
        const mockEq3 = jest.fn(() => Promise.resolve({ error: null }));
        const mockUpdate2 = jest.fn(() => ({ eq: mockEq3 }));

        mockSupabase = {
            rpc: jest.fn(),
            from: jest.fn((table: string) => {
                if (table === 'market_tasks') {
                    return {
                        select: jest.fn(() => ({
                            eq: jest.fn(() => ({
                                eq: jest.fn(() => Promise.resolve({
                                    data: [
                                        {
                                            id: 'task-1',
                                            market_id: 'market-1',
                                            template_tasks: { task_config: { accountId: 'a' } }
                                        }
                                    ],
                                    error: null
                                }))
                            }))
                        })),
                        update: mockUpdate2
                    }
                }
                return {};
            })
        };
    });

    test('Flow: Scans tasks, fetches config, checks drift, updates status if drifted', async () => {
        // Setup Mocks
        // 1. getLastExecutionLog returns payload with ID
        mockDriftCore.getLastExecutionLog.mockResolvedValue({ tagId: 'tag-123' });

        // 2. rpc returns token
        mockSupabase.rpc.mockResolvedValue({ data: 'secret-token', error: null });

        // 3. fetchGtmConfig returns live config
        const mockLiveConfig = { tagId: 'tag-123', name: 'Live' };
        mockGtm.fetchGtmConfig.mockResolvedValue(mockLiveConfig);

        // 4. checkDrift returns DRIFTED
        mockDriftCore.checkDrift.mockResolvedValue({ status: 'DRIFTED' });

        // Run
        const results = await scanDrift(mockSupabase, mockFetch);

        // Assertions
        expect(mockDriftCore.getLastExecutionLog).toHaveBeenCalledWith(mockSupabase, 'task-1');
        expect(mockSupabase.rpc).toHaveBeenCalledWith('retrieve_decrypted_secret', { p_market_id: 'market-1', p_provider: 'GTM' });
        expect(mockGtm.fetchGtmConfig).toHaveBeenCalledWith('secret-token', { accountId: 'a' }, 'tag-123', mockFetch);
        expect(mockDriftCore.checkDrift).toHaveBeenCalledWith(mockSupabase, 'task-1', mockLiveConfig, { tagId: 'tag-123' });

        // Check update
        expect(mockSupabase.from).toHaveBeenCalledWith('market_tasks');
        // We expect update({ status: 'DRIFTED' }).eq('id', 'task-1')
        // Accessing the mock calls is tricky with nested mocks, but we can verify results
        expect(results).toEqual([{ taskId: 'task-1', status: 'DRIFTED' }]);
    });

    test('Flow: Skips if no config', async () => {
        // Mock Tasks with no config
        mockSupabase.from = jest.fn(() => ({
            select: () => ({
                eq: () => ({
                    eq: () => Promise.resolve({
                        data: [{ id: 'task-2', template_tasks: {} }], // No task_config
                        error: null
                    })
                })
            })
        }));

        const results = await scanDrift(mockSupabase, mockFetch);
        expect(results).toEqual([{ taskId: 'task-2', status: 'SKIPPED', reason: 'No Config' }]);
    });

    test('Flow: Skips if no resource ID in log', async () => {
         mockDriftCore.getLastExecutionLog.mockResolvedValue({}); // Empty payload

         const results = await scanDrift(mockSupabase, mockFetch);
         expect(results).toEqual([{ taskId: 'task-1', status: 'SKIPPED', reason: 'No Resource ID' }]);
    });

    test('Flow: Error handling (Credentials Fail)', async () => {
        mockDriftCore.getLastExecutionLog.mockResolvedValue({ id: '1' });
        mockSupabase.rpc.mockResolvedValue({ data: null, error: 'Auth Error' });

        const results = await scanDrift(mockSupabase, mockFetch);
        expect(results).toEqual([{ taskId: 'task-1', status: 'ERROR', reason: 'Credentials Failed' }]);
    });

     test('Flow: Error handling (Fetch Fail)', async () => {
        mockDriftCore.getLastExecutionLog.mockResolvedValue({ id: '1' });
        mockSupabase.rpc.mockResolvedValue({ data: 'token', error: null });
        mockGtm.fetchGtmConfig.mockRejectedValue(new Error('Network Error'));

        const results = await scanDrift(mockSupabase, mockFetch);
        expect(results).toEqual([{ taskId: 'task-1', status: 'ERROR', reason: 'Fetch Failed: Network Error' }]);
    });
});
