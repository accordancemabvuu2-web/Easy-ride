import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 4000);
const server = createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN ?? "http://localhost:3000");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ status: "ok", service: "easy-ride-backend" }));
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Route not found." }));
});

server.listen(port, () => {
  console.log(`Easy Ride backend listening on port ${port}`);
});
