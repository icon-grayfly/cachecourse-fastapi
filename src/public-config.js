export function handlePublicConfig(request, env = process.env) {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", Allow: "GET" }
    });
  }

  return new Response(JSON.stringify({
    supabaseUrl: env.SUPABASE_URL || "",
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || ""
  }), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
