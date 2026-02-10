import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getLastExecutionLog } from "../_shared/drift-core.ts";
import { fetchGtmConfig } from "../_shared/gtm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Create client with user's token to verify access
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { taskId } = await req.json();

    if (!taskId) {
      throw new Error("Missing taskId");
    }

    // 1. Fetch Task Details (to get config and market_id)
    const { data: task, error: taskError } = await supabase
      .from("market_tasks")
      .select(`
        id,
        market_id,
        template_tasks!inner (
          task_config
        )
      `)
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      throw new Error("Task not found or access denied");
    }

    const marketId = task.market_id;
    // Handle template_tasks being object or array (PostgREST quirk)
    const templateTask = Array.isArray(task.template_tasks) ? task.template_tasks[0] : task.template_tasks;
    const taskConfig = templateTask?.task_config;

    if (!taskConfig) {
      throw new Error("Task has no configuration");
    }

    // 2. Get Last Execution Log (Stradia Expected)
    // We use service role client here to ensure access to logs and secure RPC
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const lastPayload = await getLastExecutionLog(supabaseAdmin, taskId);

    // Attempt to extract resource ID from various potential fields
    const resourceId = lastPayload.tagId || lastPayload.id || lastPayload.triggerId || lastPayload.variableId;

    if (!resourceId) {
       // If we can't find resourceId in payload, we can't fetch live.
       throw new Error("Could not determine Resource ID from last execution log.");
    }

    // 3. Retrieve Credentials (using Admin client)
    const { data: token, error: tokenError } = await supabaseAdmin.rpc(
      "retrieve_decrypted_secret",
      {
        p_market_id: marketId,
        p_provider: "GTM",
      }
    );

    if (tokenError || !token) {
      console.error("Token retrieval error:", tokenError);
      throw new Error("Failed to retrieve credentials");
    }

    // 4. Fetch Live Config (Actual)
    const liveConfig = await fetchGtmConfig(token, taskConfig, resourceId, fetch);

    return new Response(JSON.stringify({
      expected: lastPayload,
      actual: liveConfig
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in get-drift-details:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
