const WebSocket = require('ws');

// Crear servidor en puerto 8080
// Abre un canal de comunicación en ese puerto; todos los clientes que se conecten podrán enviar y recibir mensajes
const wss = new WebSocket.Server({ port: 8080 });

console.log('Servidor WebSocket escuchando en ws://localhost:8080');

// Variable que guarda el contador (todos los clientes verán este valor)
let counter = 0;

// Detectar conexiones: cada vez que un cliente se conecte se ejecuta esta función
wss.on('connection', (ws) => {
  console.log('Cliente conectado')

  // Enviar el valor actual del contador al cliente que se acaba de conectar
  ws.send(JSON.stringify({ type: 'init', value: counter }));

  // Recibir mensajes del cliente => cada vez que un cliente envíe un mensaje se ejecuta esta función
  ws.on('message', (message) => {
    const msg = JSON.parse(message);

    if (msg.type === 'increment') {
      // Incrementa el contador
      counter++;

      // Crear mensaje de actualización
      const update = JSON.stringify({ type: 'update', value: counter });

      // Enviar el nuevo valor a los clientes conectados
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(update);
        }
      });
    }
  });

  // Detectar desconexiones de clientes
  ws.on('close', () => console.log('Cliente desconectado'));
});