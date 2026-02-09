import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { task_id, user_inputs } = await req.json()

    if (!task_id) {
        return new Response(JSON.stringify({ error: 'Missing task_id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    // Retrieve system_prompt and task_config
    // Since RLS is enabled, we rely on the user's token passed in Authorization header.
    // However, template_tasks are generally readable.
    const { data: task, error: taskError } = await supabaseClient
        .from('template_tasks')
        .select('task_config')
        .eq('id', task_id)
        .single()

    if (taskError || !task) {
        return new Response(JSON.stringify({ error: 'Task not found or access denied', details: taskError }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    const systemPrompt = task.task_config?.system_prompt;

    if (!systemPrompt) {
         return new Response(JSON.stringify({ error: 'System prompt not configured for this task' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
System Prompt: ${systemPrompt}

User Inputs: ${JSON.stringify(user_inputs)}

Generate a valid JSON object based on the above. output JSON only.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Attempt to parse JSON to ensure validity
    // Sometimes Gemini wraps code in markdown blocks like ```json ... ```
    let jsonStr = text;
    // Improved Logic: Allow optional 'json' tag, and optional whitespace/newlines inside the block boundaries.
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1];
    }

    let jsonResult;
    try {
        jsonResult = JSON.parse(jsonStr);
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to generate valid JSON', raw_output: text }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    return new Response(JSON.stringify(jsonResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
