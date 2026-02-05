import { Server } from "@hocuspocus/server";

const server = new Server({
  name: "hocuspocus-fra1-01",
  port: 5174,
  timeout: 30000,
  debounce: 5000,
  maxDebounce: 30000,
  quiet: true,
});

server.listen();