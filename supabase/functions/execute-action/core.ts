
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ExecuteActionResult {
  success: boolean;
  message: string;
  data?: any;
}

export async function executeAction(
  supabase: SupabaseClient,
  taskId: string,
  payload: any,
  fetchImpl: typeof fetch = fetch
): Promise<ExecuteActionResult> {
  // 1. Fetch Task Context
  const { data: task, error: taskError } = await supabase
    .from("market_tasks")
    .select("market_id, task_config, status")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    throw new Error(`Task not found or access denied: ${taskError?.message}`);
  }

  // 2. Retrieve Decrypted Token
  const { data: token, error: tokenError } = await supabase.rpc(
    "retrieve_decrypted_secret",
    {
      p_market_id: task.market_id,
      p_provider: "GTM", // Enforce GTM for now
    }
  );

  if (tokenError || !token) {
    throw new Error("Failed to retrieve credentials. Ensure Vault is configured.");
  }

  // 3. Identify GTM Resource
  // Expected task_config: { accountId, containerId, workspaceId }
  // Expected payload: { tagId?, name, ... }
  const { accountId, containerId, workspaceId } = task.task_config || {};
  if (!accountId || !containerId || !workspaceId) {
    throw new Error("Missing GTM configuration in task_config (accountId, containerId, workspaceId required).");
  }

  const resourceId = payload.tagId || payload.id; // Try to find ID in payload

  // Security Check: Ensure resourceId does not contain path traversal characters
  if (resourceId && !/^[a-zA-Z0-9_.-]+$/.test(String(resourceId))) {
      throw new Error("Invalid resource ID format.");
  }

  const isUpdate = !!resourceId;

  const baseUrl = `https://tagmanager.googleapis.com/api/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;
  let resourceUrl = `${baseUrl}/tags`;
  if (isUpdate) {
    resourceUrl += `/${resourceId}`;
  }

  // 4. Snapshot (Safety Mandate)
  if (isUpdate) {
    const snapshotResponse = await fetchImpl(resourceUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (snapshotResponse.ok) {
      const currentConfig = await snapshotResponse.json();
      // Save to snapshots table
      const { error: snapshotError } = await supabase.from("snapshots").insert({
        market_id: task.market_id,
        task_id: taskId,
        resource_type: "GTM_TAG", // Assuming Tags for now
        resource_id: resourceId,
        content: currentConfig,
      });

      if (snapshotError) {
        throw new Error(`Snapshot failed: ${snapshotError.message}. ABORTING.`);
      }
    } else if (snapshotResponse.status === 404) {
      // Resource doesn't exist, proceed (maybe it was deleted manually?)
      console.warn(`Resource ${resourceId} not found during snapshot. Proceeding as generic write.`);
    } else {
      // API Error
      const errorText = await snapshotResponse.text();
      throw new Error(`Snapshot fetch failed: ${snapshotResponse.status} ${snapshotResponse.statusText} - ${errorText}`);
    }
  }

  // 5. Execution
  const method = isUpdate ? "PUT" : "POST";
  const writeResponse = await fetchImpl(resourceUrl, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!writeResponse.ok) {
    const errorText = await writeResponse.text();
    throw new Error(`GTM API Write failed: ${writeResponse.status} ${writeResponse.statusText} - ${errorText}`);
  }

  const writeResult = await writeResponse.json();

  // 6. State Update & Hashing
  // Calculate SHA-256 hash of the payload (as per requirement: "hash of the result/payload")
  // We'll hash the successful payload we just sent.
  const payloadString = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const data = encoder.encode(payloadString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const { error: updateError } = await supabase
    .from("market_tasks")
    .update({
      status: "DONE",
      result_hash: hashHex,
      execution_notes: `Executed via API. Method: ${method}. Resource: ${writeResult.tagId || writeResult.id || 'N/A'}`,
    })
    .eq("id", taskId);

  if (updateError) {
     // This is bad, the action succeeded but we failed to update status.
     // Ideally we'd rollback (revert GTM), but that's complex.
     // For now, we throw, and the UI might show error, but the task is done in reality.
     // We log strictly.
     console.error("CRITICAL: Task executed but failed to update status.", updateError);
     throw new Error("Task executed successfully, but failed to update database record.");
  }

  return {
    success: true,
    message: "Task executed successfully",
    data: writeResult,
  };
}
