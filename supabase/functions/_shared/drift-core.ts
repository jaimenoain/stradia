import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import microdiff from "https://esm.sh/microdiff@1.3.2";

export interface DriftResult {
  status: "MATCH" | "DRIFTED";
  diff?: any[];
  truthHash: string;
  liveHash: string;
}

const NOISY_FIELDS = [
  "updated_at",
  "created_at",
  "timestamp",
  "revision_id",
  "last_modified",
];

/**
 * recursively sorts keys and removes noisy fields
 */
export function normalizeJson(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(normalizeJson);
  } else if (obj !== null && typeof obj === "object") {
    const sortedKeys = Object.keys(obj).sort();
    const result: any = {};
    for (const key of sortedKeys) {
      if (NOISY_FIELDS.includes(key)) continue;
      result[key] = normalizeJson(obj[key]);
    }
    return result;
  }
  return obj;
}

/**
 * Generates SHA-256 hash of the JSON stringified object
 */
export async function generateHash(obj: any): Promise<string> {
  const str = JSON.stringify(obj);
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getLastExecutionLog(
  supabase: SupabaseClient,
  taskId: string
): Promise<any> {
  const { data: logData, error: logError } = await supabase
    .from("execution_logs")
    .select("payload")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (logError && logError.code !== 'PGRST116') {
     throw new Error(`Failed to fetch execution logs: ${logError.message}`);
  }

  return logData?.payload || {};
}

/**
 * Core Drift Check Logic
 */
export async function checkDrift(
  supabase: SupabaseClient,
  taskId: string,
  livePayload: any,
  truthPayload?: any
): Promise<DriftResult> {
  // 1. Fetch Latest Execution Log (Stradia Truth) if not provided
  let truthPayloadRaw = truthPayload;
  if (!truthPayloadRaw) {
    truthPayloadRaw = await getLastExecutionLog(supabase, taskId);
  }

  const livePayloadRaw = livePayload || {};

  // 2. Normalize Inputs
  const truthNormalized = normalizeJson(truthPayloadRaw);
  const liveNormalized = normalizeJson(livePayloadRaw);

  // 3. Generate Hashes
  const truthHash = await generateHash(truthNormalized);
  const liveHash = await generateHash(liveNormalized);

  // 4. Compare
  if (truthHash === liveHash) {
    return {
      status: "MATCH",
      truthHash,
      liveHash,
    };
  } else {
    // 5. Generate Diff
    const diff = microdiff(truthNormalized, liveNormalized);

    return {
      status: "DRIFTED",
      diff,
      truthHash,
      liveHash,
    };
  }
}
