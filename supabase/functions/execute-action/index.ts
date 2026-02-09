
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeAction } from "./core.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Auth Check (User Level)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Create client with user's token to verify access
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Parse Input
    const { taskId, payload } = await req.json();

    if (!taskId || !payload) {
      return new Response(JSON.stringify({ error: 'Missing taskId or payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Verify Access to Task (Using User Client)
    // We check if the user can read the task. If so, they have access to the market.
    const { data: taskCheck, error: accessError } = await userClient
        .from('market_tasks')
        .select('id')
        .eq('id', taskId)
        .single();

    if (accessError || !taskCheck) {
        return new Response(JSON.stringify({ error: 'Access Denied: Cannot access this task' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // 4. Execute Action (Using Service Role Client for Privileged Ops)
    // We use the service role client because we need to access `retrieve_decrypted_secret`
    // and potentially bypass RLS for snapshots if needed (though RLS allows insert usually).
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const result = await executeAction(adminClient, taskId, payload, fetch);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
