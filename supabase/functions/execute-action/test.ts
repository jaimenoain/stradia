
import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { executeAction } from "./core.ts";

// Mock Data
const MOCK_TASK_ID = "task-123";
const MOCK_MARKET_ID = "market-123";
const MOCK_TOKEN = "decrypted-token";
const MOCK_TASK_CONFIG = {
  accountId: "acc-1",
  containerId: "cont-1",
  workspaceId: "work-1",
};
const MOCK_PAYLOAD_UPDATE = { tagId: "tag-1", name: "Updated Tag" };
const MOCK_PAYLOAD_CREATE = { name: "New Tag" };

// Mock Supabase Client Factory
function createMockSupabase(overrides: any = {}) {
  const mockFrom = (table: string) => {
    if (table === "market_tasks") {
      return {
        select: () => ({
          eq: () => ({
            single: async () => {
              if (overrides.taskError) return { error: overrides.taskError };
              return {
                data: {
                  market_id: MOCK_MARKET_ID,
                  task_config: MOCK_TASK_CONFIG,
                  status: "TODO",
                },
              };
            },
          }),
        }),
        update: (updates: any) => ({
          eq: async () => {
            if (overrides.updateError) return { error: overrides.updateError };
            return { data: null };
          },
        }),
      };
    }
    if (table === "snapshots") {
      return {
        insert: async (data: any) => {
          if (overrides.snapshotInsertError) return { error: overrides.snapshotInsertError };
          return { data: null };
        },
      };
    }
    return {};
  };

  const mockRpc = async (func: string, args: any) => {
    if (func === "retrieve_decrypted_secret") {
      if (overrides.rpcError) return { error: overrides.rpcError };
      return { data: MOCK_TOKEN };
    }
    return { error: "Unknown RPC" };
  };

  return { from: mockFrom, rpc: mockRpc } as any;
}

// Mock Fetch Factory
function createMockFetch(responses: Record<string, Response>) {
  return async (url: string | Request, options?: RequestInit) => {
    const urlStr = url.toString();
    // Check if URL matches known endpoints
    if (urlStr.includes("/tags/tag-1")) {
      if (options?.method === "GET") return responses["GET_TAG"] || new Response("{}", { status: 200 });
      if (options?.method === "PUT") return responses["PUT_TAG"] || new Response('{"id":"tag-1"}', { status: 200 });
    }
    if (urlStr.includes("/tags") && !urlStr.includes("/tag-1")) {
      if (options?.method === "POST") return responses["POST_TAG"] || new Response('{"id":"tag-2"}', { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
  };
}

Deno.test("executeAction - Success Scenario (Update)", async () => {
  const mockSupabase = createMockSupabase();
  const mockFetch = createMockFetch({
    "GET_TAG": new Response(JSON.stringify({ id: "tag-1", name: "Old Tag" }), { status: 200 }),
    "PUT_TAG": new Response(JSON.stringify({ id: "tag-1", name: "Updated Tag" }), { status: 200 }),
  });

  const result = await executeAction(mockSupabase, MOCK_TASK_ID, MOCK_PAYLOAD_UPDATE, mockFetch);

  assertEquals(result.success, true);
  assertEquals(result.data.name, "Updated Tag");
});

Deno.test("executeAction - Success Scenario (Create)", async () => {
  const mockSupabase = createMockSupabase();
  const mockFetch = createMockFetch({
    "POST_TAG": new Response(JSON.stringify({ id: "tag-2", name: "New Tag" }), { status: 200 }),
  });

  const result = await executeAction(mockSupabase, MOCK_TASK_ID, MOCK_PAYLOAD_CREATE, mockFetch);

  assertEquals(result.success, true);
  assertEquals(result.data.name, "New Tag");
});

Deno.test("executeAction - Fails if Snapshot Fails", async () => {
  const mockSupabase = createMockSupabase();
  const mockFetch = createMockFetch({
    "GET_TAG": new Response("API Error", { status: 500 }),
  });

  await assertRejects(
    async () => {
      await executeAction(mockSupabase, MOCK_TASK_ID, MOCK_PAYLOAD_UPDATE, mockFetch);
    },
    Error,
    "Snapshot fetch failed"
  );
});

Deno.test("executeAction - Fails if Write Fails", async () => {
  const mockSupabase = createMockSupabase();
  const mockFetch = createMockFetch({
    "GET_TAG": new Response(JSON.stringify({ id: "tag-1" }), { status: 200 }),
    "PUT_TAG": new Response("Write Error", { status: 500 }),
  });

  await assertRejects(
    async () => {
      await executeAction(mockSupabase, MOCK_TASK_ID, MOCK_PAYLOAD_UPDATE, mockFetch);
    },
    Error,
    "GTM API Write failed"
  );
});

Deno.test("executeAction - Fails if RPC (Decryption) Fails", async () => {
  const mockSupabase = createMockSupabase({ rpcError: "RPC Error" });
  const mockFetch = createMockFetch({});

  await assertRejects(
    async () => {
      await executeAction(mockSupabase, MOCK_TASK_ID, MOCK_PAYLOAD_UPDATE, mockFetch);
    },
    Error,
    "Failed to retrieve credentials"
  );
});
