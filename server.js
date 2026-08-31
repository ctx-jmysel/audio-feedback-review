const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const { google } = require("googleapis");
const { auth } = require("google-auth-library");

const root = __dirname;
const port = Number(process.env.PORT || 8787);
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_CREDENTIALS = process.env.GOOGLE_CREDENTIALS;

let sheetsClient = null;

// Initialize Google Sheets client
async function initializeGoogleSheets() {
  try {
    console.log("🔍 Checking credentials...");
    console.log("SPREADSHEET_ID:", SPREADSHEET_ID ? "✅ Set" : "❌ Not set");
    console.log("GOOGLE_CREDENTIALS:", GOOGLE_CREDENTIALS ? "✅ Set" : "❌ Not set");

    if (!GOOGLE_CREDENTIALS || !SPREADSHEET_ID) {
      console.log("⚠️  Google Sheets not configured. Set GOOGLE_CREDENTIALS and SPREADSHEET_ID environment variables.");
      return false;
    }

    // Parse credentials - handle various formats
    let credentials;
    let credentialsString = GOOGLE_CREDENTIALS;

    try {
      console.log("Attempting to parse credentials (first 200 chars):", credentialsString.substring(0, 200));
      
      // Try direct JSON parse first
      credentials = JSON.parse(credentialsString);
      console.log("✅ Credentials parsed successfully (direct)");
    } catch (parseError) {
      console.log("⚠️  Direct parse failed, trying base64...", parseError.message);
      
      try {
        // Try base64 decode
        const cleanBase64 = GOOGLE_CREDENTIALS.replace(/\s/g, "");
        credentialsString = Buffer.from(cleanBase64, "base64").toString("utf-8");
        credentials = JSON.parse(credentialsString);
        console.log("✅ Credentials parsed successfully (base64)");
      } catch (base64Error) {
        console.error("❌ Base64 parse also failed:", base64Error.message);
        console.error("First 300 chars of GOOGLE_CREDENTIALS:", GOOGLE_CREDENTIALS.substring(0, 300));
        throw new Error(`Failed to parse credentials: ${parseError.message}`);
      }
    }

    console.log("Service account email:", credentials.client_email);

    const authClient = new auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    sheetsClient = google.sheets({ version: "v4", auth: authClient });
    console.log("✅ Google Sheets authenticated successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize Google Sheets:", error.message);
    console.error("Full error:", error);
    return false;
  }
}

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
    const csv = String(payload.csv || "");

    console.log("📝 Received submission from:", payload.reviewer);

    if (!csv.trim()) {
      send(response, 400, JSON.stringify({ error: "Missing CSV data" }), "application/json; charset=utf-8");
      return;
    }

    // If Google Sheets not configured, return error
    if (!sheetsClient) {
      console.error("❌ Google Sheets client not initialized. Check credentials.");
      send(response, 503, JSON.stringify({ error: "Google Sheets not configured - check server logs" }), "application/json; charset=utf-8");
      return;
    }

    console.log("Appending to Google Sheet...");
    // Parse CSV and append to Google Sheet
    const lines = csv.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, ""));
    const values = [];

    for (let i = 1; i < lines.length; i++) {
      const row = [];
      let current = "";
      let inQuotes = false;

      // Simple CSV parser
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        if (char === '"') {
          if (inQuotes && lines[i][j + 1] === '"') {
            current += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          row.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      row.push(current.trim());
      values.push(row);
    }

    // Append to Google Sheet
    const result = await sheetsClient.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: values
      }
    });

    console.log("✅ Successfully appended to Google Sheet");
    send(response, 200, JSON.stringify({ message: "Review submitted to Google Sheet successfully" }), "application/json; charset=utf-8");
  } catch (error) {
    console.error("❌ Error submitting to Google Sheets:", error.message);
    console.error("Full error:", error);
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

server.listen(port, "0.0.0.0", async () => {
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

  await initializeGoogleSheets();
});