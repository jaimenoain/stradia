import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getLastExecutionLog, checkDrift } from "../_shared/drift-core.ts";
import { fetchGtmConfig } from "../_shared/gtm.ts";

export async function scanDrift(
  supabase: SupabaseClient,
  fetchImpl: typeof fetch = fetch
) {
  console.log("Starting Drift Scan...");

  // 1. Fetch Candidate Tasks
  // We join market_tasks with template_tasks to filter by Type C and get config
  const { data: tasks, error } = await supabase
    .from("market_tasks")
    .select(`
      id,
      market_id,
      status,
      template_tasks!inner (
        task_config,
        task_type
      )
    `)
    .eq("status", "DONE")
    .eq("template_tasks.task_type", "C");

  if (error) {
    console.error("Failed to fetch tasks:", error);
    throw new Error("Failed to fetch tasks");
  }

  console.log(`Found ${tasks?.length || 0} candidate tasks.`);

  const results = [];

  if (!tasks || tasks.length === 0) {
    return results;
  }

  // 2. Iterate (Sequential to handle rate limits)
  for (const task of tasks) {
    const taskId = task.id;
    const marketId = task.market_id;
    // task.template_tasks is an object because of !inner join on single relation (or array?)
    // PostgREST returns object for single relation if it's many-to-one, but here market_tasks -> template_tasks is N:1.
    // So it should be an object.
    const templateTask = Array.isArray(task.template_tasks) ? task.template_tasks[0] : task.template_tasks;
    const taskConfig = templateTask?.task_config;

    if (!taskConfig) {
      console.warn(`Task ${taskId} has no config. Skipping.`);
      results.push({ taskId, status: "SKIPPED", reason: "No Config" });
      continue;
    }

    try {
      // 3. Get Last Execution Log to identify resource
      const lastPayload = await getLastExecutionLog(supabase, taskId);
      // Expecting payload to have tagId or id (based on execute-action logic)
      const resourceId = lastPayload.tagId || lastPayload.id;

      if (!resourceId) {
        console.warn(`Task ${taskId} has no resource ID in last execution log. Skipping.`);
        results.push({ taskId, status: "SKIPPED", reason: "No Resource ID" });
        continue;
      }

      // 4. Retrieve Credentials
      const { data: token, error: tokenError } = await supabase.rpc(
        "retrieve_decrypted_secret",
        {
          p_market_id: marketId,
          p_provider: "GTM", // Enforce GTM for now
        }
      );

      if (tokenError || !token) {
        console.warn(`Task ${taskId}: Failed to retrieve credentials.`, tokenError);
        results.push({ taskId, status: "ERROR", reason: "Credentials Failed" });
        continue;
      }

      // 5. Fetch Live Config
      // We assume GTM for now as it's the only supported Type C
      let liveConfig;
      try {
        liveConfig = await fetchGtmConfig(token, taskConfig, resourceId, fetchImpl);
      } catch (fetchError) {
        console.warn(`Task ${taskId}: Failed to fetch live config.`, fetchError);
        results.push({ taskId, status: "ERROR", reason: `Fetch Failed: ${fetchError.message}` });
        continue;
      }

      // 6. Check Drift
      const driftResult = await checkDrift(supabase, taskId, liveConfig, lastPayload);

      if (driftResult.status === "DRIFTED") {
        console.log(`Task ${taskId} DRIFTED! Updating status.`);

        const { error: updateError } = await supabase
          .from("market_tasks")
          .update({ status: "DRIFTED" })
          .eq("id", taskId);

        if (updateError) {
             console.error(`Task ${taskId}: Failed to update status to DRIFTED.`, updateError);
             results.push({ taskId, status: "ERROR", reason: "Update Failed" });
        } else {
             results.push({ taskId, status: "DRIFTED" });
        }
      } else {
        console.log(`Task ${taskId} MATCH.`);
        results.push({ taskId, status: "MATCH" });
      }

    } catch (e) {
      console.error(`Unexpected error processing task ${taskId}:`, e);
      results.push({ taskId, status: "ERROR", reason: e.message });
    }
  }

  return results;
}
