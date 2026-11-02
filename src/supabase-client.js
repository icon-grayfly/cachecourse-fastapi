import { COMMUNITY_CHAT_CONFIG, loadCommunityChatConfig } from "./community-chat-config.js";

let clientPromise;

export async function getSupabaseClient() {
  await loadCommunityChatConfig();
  if (!COMMUNITY_CHAT_CONFIG.supabaseUrl || !COMMUNITY_CHAT_CONFIG.publishableKey || !navigator.onLine) return undefined;
  if (!clientPromise) {
    clientPromise = import("https://esm.sh/@supabase/supabase-js@2.118.0?bundle")
      .then(({ createClient }) => createClient(COMMUNITY_CHAT_CONFIG.supabaseUrl, COMMUNITY_CHAT_CONFIG.publishableKey))
      .catch((error) => {
        clientPromise = undefined;
        throw error;
      });
  }
  return clientPromise;
}
