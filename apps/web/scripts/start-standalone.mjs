import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneRoot = join(webRoot, ".next", "standalone", "apps", "web");
const standaloneServer = join(standaloneRoot, "server.js");

if (!existsSync(standaloneServer)) {
  throw new Error("Missing standalone Next.js build. Run pnpm build first.");
}

const staticSource = join(webRoot, ".next", "static");
const staticTarget = join(standaloneRoot, ".next", "static");
mkdirSync(dirname(staticTarget), { recursive: true });
cpSync(staticSource, staticTarget, { recursive: true, force: true });

const publicSource = join(webRoot, "public");
if (existsSync(publicSource)) {
  cpSync(publicSource, join(standaloneRoot, "public"), { recursive: true, force: true });
}

const hostnameIndex = process.argv.indexOf("--hostname");
const portIndex = process.argv.indexOf("--port");
if (hostnameIndex >= 0 && process.argv[hostnameIndex + 1]) process.env.HOSTNAME = process.argv[hostnameIndex + 1];
if (portIndex >= 0 && process.argv[portIndex + 1]) process.env.PORT = process.argv[portIndex + 1];

await import(pathToFileURL(standaloneServer).href);
