const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const root = __dirname;
const submissionsDir = path.join(root, "submissions");
const port = Number(process.env.PORT || 8787);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav"
};

function send(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, { "Content-Type": contentType });
  response.end(body);
}

function reviewerSlug(name) {
  return String(name || "reviewer")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "reviewer";
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        request.destroy(new Error("Request body too large"));
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function handleSubmit(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = JSON.parse(body || "{}");
    const reviewer = reviewerSlug(payload.reviewer);
    const csv = String(payload.csv || "");

    if (!csv.trim()) {
      send(response, 400, JSON.stringify({ error: "Missing CSV data" }), "application/json; charset=utf-8");
      return;
    }

    fs.mkdirSync(submissionsDir, { recursive: true });
    const filename = `audio-feedback-${reviewer}.csv`;
    fs.writeFileSync(path.join(submissionsDir, filename), csv, "utf8");
    send(response, 200, JSON.stringify({ filename, path: `submissions/${filename}` }), "application/json; charset=utf-8");
  } catch (error) {
    send(response, 500, JSON.stringify({ error: error.message }), "application/json; charset=utf-8");
  }
}

function serveFile(request, response) {
  const url = new URL(request.url, `http://localhost:${port}`);
  const requestedPath = url.pathname === "/" ? "/audio-feedback.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, requestedPath));

  if (!filePath.startsWith(root)) {
    send(response, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(response, 404, "Not found");
      return;
    }

    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/submit-review") {
    handleSubmit(request, response);
    return;
  }

  if (request.method === "GET") {
    serveFile(request, response);
    return;
  }

  send(response, 405, "Method not allowed");
});

server.listen(port, "0.0.0.0", () => {
  const os = require("node:os");
  const interfaces = os.networkInterfaces();
  let localIP = "127.0.0.1";
  
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
  }
  
  console.log(`Audio feedback page running at:`);
  console.log(`  Local: http://127.0.0.1:${port}/audio-feedback.html`);
  console.log(`  Network: http://${localIP}:${port}/audio-feedback.html`);
  console.log(`Review CSV files will be written to ${submissionsDir}`);
});