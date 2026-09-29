import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";
import { supabaseSecretKey } from "@/lib/server-env";
import type { Database } from "./database.types";

/**
 * Supabase client with the secret key. It bypasses row-level security, so only use it for
 * system work (the reminder dispatcher, account deletion) and never with user-supplied filters
 * that aren't scoped to the verified user id.
 */
export function createAdminClient() {
  return createClient<Database>(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
