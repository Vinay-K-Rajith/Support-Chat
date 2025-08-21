import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

// ✅ Fix: Create cross-platform compatible __dirname
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const normalizedDirname =
  process.platform === "win32" && __dirname.startsWith("/")
    ? __dirname.slice(1)
    : __dirname;

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // ✅ Fix: Use regular path.resolve instead of posixPath.resolve
      const clientTemplate = path.resolve(
        normalizedDirname,
        "..",
        "client",
        "index.html"
      );

      // Debug: Log the resolved path
      console.log("Resolved client template path:", clientTemplate);

      // always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error("Error in setupVite middleware:", e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // ✅ Fix: Use regular path.resolve instead of posixPath.resolve
  const distPath = path.resolve(normalizedDirname, "..");

  console.log("Resolved dist path:", distPath);

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    // ✅ Fix: Use regular path.resolve instead of posixPath.resolve
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}