import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handleAdminAuth } from "./src/admin-auth.js";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));

function loadLocalEnvironmentFile() {
  const envFile = resolve(root, ".env.local");
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const entry = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!entry || entry[1] in process.env) continue;
    let value = entry[2];
    if (value.startsWith('"') && value.endsWith('"')) {
      try { value = JSON.parse(value); } catch { value = value.slice(1, -1); }
    } else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    process.env[entry[1]] = value;
  }
}

loadLocalEnvironmentFile();

const port = Number(process.env.PORT || 4173);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

async function readRequestBody(request, maxBytes = 8192) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", "http://localhost");
  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }

  if (pathname.startsWith("/api/admin/")) {
    let body;
    try {
      body = ["GET", "HEAD"].includes(request.method || "GET") ? undefined : await readRequestBody(request);
    } catch {
      response.writeHead(413, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ error: "Request body too large." }));
      return;
    }
    const headers = new Headers();
    for (const name of ["content-type", "cookie", "origin"]) {
      if (typeof request.headers[name] === "string") headers.set(name, request.headers[name]);
    }
    const apiRequest = new Request(new URL(request.url || pathname, "http://" + (request.headers.host || "127.0.0.1")), {
      method: request.method || "GET",
      headers,
      ...(body === undefined ? {} : { body })
    });
    const apiResponse = await handleAdminAuth(apiRequest);
    response.writeHead(apiResponse.status, Object.fromEntries(apiResponse.headers.entries()));
    response.end(await apiResponse.text());
    return;
  }

  if (pathname === "/") pathname = "/index.html";
  const filePath = resolve(root, "." + pathname);
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404).end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-cache"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log("CacheCourse is running at http://localhost:" + port);
});
