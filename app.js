import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import crypto from "crypto";
import path from "path";

const __dirname = import.meta.dirname;

const PORT = 3001;
const DATA_FILE = path.join(__dirname, "data", "links.json");

const serveFile = async function (res, filePath, contentType) {
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    return res.end(data);
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(404, { "Content-Type": "text/html" });
      return res.end("404 Page Not Found");
    }
  }
};

const loadLinks = async function () {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(DATA_FILE, JSON.stringify({}));
      return {};
    }
  }
};

const saveLinks = async function (links) {
  await writeFile(DATA_FILE, JSON.stringify(links));
};

const server = createServer(async (req, res) => {
  const __dirname = import.meta.dirname;

  if (req.method === "GET") {
    if (req.url === "/") {
      serveFile(res, path.join(__dirname, "public", "index.html"), "text/html");
    } else if (req.url === "/style.css") {
      serveFile(res, path.join(__dirname, "public", "style.css"), "text/css");
    } else if (req.url === "/links") {
      const links = await loadLinks();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(links));
    } else {
      const links = await loadLinks();
      const shortCode = req.url.slice(1);
      if (links[shortCode]) {
        res.writeHead(302, { location: links[shortCode] });
        return res.end();
      }

      res.writeHead(404, { "Content-Type": "plain/text" });
      return res.end("Shortened URL not found");
    }
  }

  if (req.method === "POST" && req.url === "/shorten") {
    const links = await loadLinks();

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      const { url, shortCode } = JSON.parse(body);

      if (!url) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("URL is required.");
      }

      const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex");

      if (links[finalShortCode]) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("Short Code already exists. Please try another one!!");
      }

      links[finalShortCode] = url;
      await saveLinks(links);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "success", shortCode: finalShortCode }));
    });
  }
});

server.listen(PORT, () => {
  console.log("server running");
});
