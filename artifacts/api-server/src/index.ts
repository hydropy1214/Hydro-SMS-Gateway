import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { initWebSocket } from "./lib/websocket";
import { startScheduler } from "./lib/scheduler";
import { purgeExpiredSessions } from "./lib/auth";

// Default to 8080 so the server works on Ubuntu without setting PORT
const port = Number(process.env["PORT"] ?? 8080);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);
}

const server = createServer(app);

initWebSocket(server);
startScheduler();

// Purge expired DB sessions once at startup, then every 6 hours
purgeExpiredSessions().catch(() => {});
setInterval(() => purgeExpiredSessions().catch(() => {}), 6 * 60 * 60 * 1000);

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});

server.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});
