// Minimal static file server for local QA of RVU Connect.
//
// Serves the repo root, resolved from this file's own location rather than from the working
// directory — the launcher may start it with a cwd it cannot read, and hardcoding an absolute
// path would tie the harness to one machine.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 8765;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400).end("bad request");
      return;
    }
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    fs.readFile(filePath, (err, buf) => {
      if (err) {
        console.log(`404 ${urlPath}`);
        res.writeHead(404, { "Content-Type": "text/plain" }).end("not found");
        return;
      }
      console.log(`200 ${urlPath}`);
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(buf);
    });
  })
  .listen(PORT, "127.0.0.1", () => console.log(`QA server on http://localhost:${PORT}`));
