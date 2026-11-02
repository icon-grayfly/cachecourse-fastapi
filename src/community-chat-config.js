export const COMMUNITY_CHAT_CONFIG = {
  supabaseUrl: "",
  publishableKey: ""
};

let configPromise;

export async function loadCommunityChatConfig() {
  if (!configPromise) {
    configPromise = fetch("/api/public-config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Public Supabase configuration could not be loaded.");
        }
        const config = await response.json();
        COMMUNITY_CHAT_CONFIG.supabaseUrl = config.supabaseUrl || "";
        COMMUNITY_CHAT_CONFIG.publishableKey = config.publishableKey || "";
        return COMMUNITY_CHAT_CONFIG;
      })
      .catch((error) => {
        configPromise = undefined;
        throw error;
      });
  }
  return configPromise;
}
