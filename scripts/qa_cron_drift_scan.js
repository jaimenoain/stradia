const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

// --- Mocks ---

const mockTasks = [
  {
    id: 'task-1',
    market_id: 'market-1',
    status: 'DONE',
    template_tasks: {
      task_config: { some: 'config' },
      task_type: 'C'
    }
  },
  {
    id: 'task-2', // For resilience check
    market_id: 'market-1',
    status: 'DONE',
    template_tasks: {
      task_config: { some: 'config' },
      task_type: 'C'
    }
  }
];

const mockUpdates = [];
let mockDriftResult = { status: 'MATCH' };
let mockFailFirstTask = false;

const mockSupabase = {
  from: (table) => ({
    select: (query) => ({
      eq: (col, val) => {
        // Simple mock chaining for query building
        const chain = {
            eq: (col2, val2) => {
                return {
                    data: mockTasks,
                    error: null
                };
            }
        };
        // If it's the first eq, return chain for second eq
        return chain;
      }
    }),
    update: (updates) => ({
      eq: (col, val) => {
        mockUpdates.push({ table, updates, match: { [col]: val } });
        return { error: null };
      }
    })
  }),
  rpc: (func, args) => ({
    data: 'mock-token',
    error: null
  })
};

// --- VM Setup ---

function loadCronDriftScanCore() {
  const corePath = path.join(process.cwd(), 'supabase/functions/cron-drift-scan/core.ts');
  const source = fs.readFileSync(corePath, 'utf8');

  // Transpile TypeScript to CommonJS
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    }
  });

  const context = vm.createContext({
    require: (id) => {
      // Mock Deno/ESM imports
      if (id.includes('@supabase/supabase-js')) {
        return {
          SupabaseClient: class {},
          createClient: () => mockSupabase,
        };
      }
      if (id.includes('../_shared/drift-core.ts')) {
        return {
          getLastExecutionLog: async (supabase, taskId) => {
            if (mockFailFirstTask && taskId === 'task-1') {
                throw new Error('Simulated failure for task-1');
            }
            return { tagId: 'resource-123', payload: { foo: 'bar' } };
          },
          checkDrift: async () => mockDriftResult
        };
      }
      if (id.includes('../_shared/gtm.ts')) {
        return {
            fetchGtmConfig: async () => ({ foo: 'baz' }) // Assume different config if needed
        };
      }
      return require(id);
    },
    exports: {},
    console: {
        ...console,
        log: () => {}, // Silence logs
        warn: () => {},
        error: () => {} // Silence errors during resilience check
    },
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    fetch: global.fetch // Pass fetch to VM context
  });

  try {
    vm.runInContext(result.outputText, context);
  } catch (e) {
    console.error("Failed to compile/run core.ts:", e);
    throw e;
  }

  return context.exports;
}

// --- Tests ---

async function runTests() {
  const { scanDrift } = loadCronDriftScanCore();

  console.log('--- Starting QA for cron-drift-scan ---');

  // Test 1: Targeting Verification
  console.log('Test 1: Targeting Verification...');

  let targetingVerified = false;
  const originalSelect = mockSupabase.from;
  mockSupabase.from = (table) => {
      if (table === 'market_tasks') {
          return {
              select: (q) => {
                  return {
                      eq: (c1, v1) => ({
                          eq: (c2, v2) => {
                              if (c1 === 'status' && v1 === 'DONE' && c2 === 'template_tasks.task_type' && v2 === 'C') {
                                  targetingVerified = true;
                              }
                              return { data: mockTasks, error: null };
                          }
                      })
                  };
              },
              update: originalSelect(table).update // fallback
          };
      }
      return originalSelect(table);
  };

  await scanDrift(mockSupabase);
  if (targetingVerified) {
      console.log('✅ PASS: Correctly targets DONE Type C tasks.');
  } else {
      console.error('❌ FAIL: Did not target correctly.');
      process.exit(1);
  }

  // Restore mock
  mockSupabase.from = originalSelect;

  // Test 2: Sabotage Simulation (Drift Detection)
  console.log('Test 2: Sabotage Simulation...');
  mockDriftResult = { status: 'DRIFTED', diff: [] }; // Force drift
  mockUpdates.length = 0; // Clear updates
  mockFailFirstTask = false;

  const results = await scanDrift(mockSupabase);

  // Verify updates
  const driftedTask = mockUpdates.find(u => u.table === 'market_tasks' && u.updates.status === 'DRIFTED');
  if (driftedTask) {
       console.log('✅ PASS: Detected drift and updated status.');
  } else {
       console.error('❌ FAIL: Did not update status to DRIFTED.');
       console.log('Results:', results);
       process.exit(1);
  }


  // Test 3: Resilience Check
  console.log('Test 3: Resilience Check...');
  mockDriftResult = { status: 'MATCH' }; // Reset to match
  mockFailFirstTask = true; // Make task-1 fail
  mockUpdates.length = 0;

  const resResults = await scanDrift(mockSupabase);

  const task1Result = resResults.find((r) => r.taskId === 'task-1');
  const task2Result = resResults.find((r) => r.taskId === 'task-2');

  if (task1Result?.status === 'ERROR' && task2Result?.status === 'MATCH') {
      console.log('✅ PASS: Function continued after task-1 failed.');
  } else {
      console.error('❌ FAIL: Resilience check failed.');
      console.log('Results:', resResults);
      process.exit(1);
  }

  console.log('--- QA Complete: All Checks Passed ---');
}

runTests().catch(e => {
    console.error('Unhandled error in tests:', e);
    process.exit(1);
});
