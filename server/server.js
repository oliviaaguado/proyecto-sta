import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });
console.log("✅ Servidor WebSocket escuchando en ws://localhost:8080");

wss.on("connection", (ws) => {
  console.log("🟢 Nuevo cliente conectado");
  ws.send(JSON.stringify({ type: "hello", message: "Conectado al servidor!" }));
});
