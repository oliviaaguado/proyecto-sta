// server.js --> backend

// Importamos la librería 'ws' que nos permite crear un servidor WebSocket
import { WebSocketServer } from "ws";

// Definimos el puerto donde funcionará el servidor
const PORT = 8080;

// Creamos el servidor WebSocket
const wss = new WebSocketServer({ port: PORT });

// Variables globales que mantendrán el estado del juego
let counter = 0;           // Contador global de clicks
let scores = {};           // Puntuaciones por usuario (ej: {Carlos: 10, Lucía: 5})
let bonusActive = false;   // Indica si el botón de bonus está visible
let bonusOwner = null;     // Usuario que tiene el bonus activo
let bonusTimer = null;     // Temporizador interno del bonus
let gameTime = 60;         // 5 minutos de juego (1 min para pruebas)
let gameInterval = null;   // Temporizador principal del juego (controla la cuenta atrás)
let gameStarted = false;   // Estado de la partida
let gameOver = false;      // Indica si el juego ha terminado
let gameTimer = null;


console.log(`🚀 Servidor WebSocket escuchando en ws://localhost:${PORT}`);


// Esta función envía un mensaje a TODOS los jugadores conectados
// Recibe un objeto JS, lo convierte a JSON y lo envía a cada jugador
function broadcast(data) {
  const msg = JSON.stringify(data); // Convertimos el objeto JS a texto JSON
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(msg); // Enviamos el mensaje
    }
  });
}

// Función para iniciar el juego
function startGame() {
  if (gameStarted) return; // ya iniciado
  gameStarted = true;

  // setInterval --> repetimos la función cada cierto tiempo (1000 ms = 1 segundo)
  // en gameInterval se guarda el ID del intervalo para poder pararlo luego con clearInterval
  gameInterval = setInterval(() => {
    gameTime--; // Cada segundo se reduce el tiempo

    broadcast({ type: "timeUpdate", timeLeft: gameTime });  // Se envía el tiempo restante a los jugadores

    if (gameTime <= 0) {  // Cuando se acaba el tiempo
      // Se detiene el intervalo
      clearInterval(gameInterval);
      // Se envían las puntuaciones finales a todos los jugadores
      broadcast({ type: "gameOver", scores });
      console.log("Tiempo acabado, juego terminado");
      // Reiniciamos variables para la próxima partida
      gameStarted = false;
      counter = 0;
      bonusActive = false;
      bonusOwner = null;
    }
  }, 1000);   // 1000 ms = 1 segundo

  console.log("Partida iniciada");
}


/**
 * Función que crea un nuevo bonus aleatorio cada 30–60 segundos
 *  - Cuando aparece, todos los clientes verán el botón dorado
 *  - Si nadie lo reclama en 10 segundos, desaparece
 */
function startBonusCycle() {
  const nextIn = Math.floor(Math.random() * 30000) + 30000; // tiempo aleatorio entre 30 y 60 s

  // Función que se ejecuta tras el tiempo aleatorio
  setTimeout(() => {
    if (!bonusActive) { // Para evitar superponer 2 bonuses al mismo tiempo
      bonusActive = true;
      bonusOwner = null;
      console.log("💥 Nuevo bonus disponible!");
      broadcast({ type: "bonusStart" }); // avisamos a todos los jugadores

      // Temporizador de 10 segundos para que el bonus expire si nadie lo reclama
      bonusTimer = setTimeout(() => {
        if (bonusActive) {
          bonusActive = false;  // el bonus ya no está disponible
          broadcast({ type: "bonusEnd" });  // avisamos a todos que el bonus ha expirado
          console.log("⏰ Bonus expirado (nadie lo reclamó)");
        }
        startBonusCycle(); // se prepara el siguiente bonus
      }, 10000);
    }
  }, nextIn);
}
startBonusCycle(); // Llamamos a la función por primera vez al arrancar el servidor


// Manejamos los eventos de conexión de los clientes (se ejecuta cada vez que un cliente se conecta)
// wss representa una conexión individual
wss.on("connection", (ws) => {
  console.log("🟢 Nuevo cliente conectado");
  let username = null; // Nombre del usuario que se conecte

  // Bloque de reinicio tras GameOver
  if (gameStarted === false && gameTime <= 0) {
    console.log("🔄 Reiniciando juego por nueva conexión tras gameOver");
    counter = 0;
    scores = {};
    bonusActive = false;
    bonusOwner = null;
    clearTimeout(bonusTimer);
    gameTime = 60;   // 5 minutos
    gameStarted = false;
    broadcast({ type: "reset" });
  }

  // Cuando el cliente envía un mensaje al servidor

  ws.on("message", (msg) => {
    const data = JSON.parse(msg); // Convertimos el texto JSON a objeto

    // El usuario se une al juego 
    if (data.type === "join") {
      username = data.username || "Anon-" + Math.floor(Math.random() * 1000);
      scores[username] = scores[username] || 0; // Si es nuevo su puntuación es 0

      // Enviamos al usuario el estado inicial del juego
      ws.send(JSON.stringify({ type: "init", value: counter, scores }));

      // Avisamos a todos de que hay nuevas puntuaciones
      broadcast({ type: "updateScores", scores });
      console.log(`👤 ${username} se ha unido`);

      // Iniciar la partida si aún no ha comenzado
      if (!gameStarted){
        startGame();
      }
    }

    // El usuario hace clic 
    if (data.type === "increment" && username) {
      // Si el usuario tiene bonus, su clic vale x5
      const mult = username === bonusOwner ? 5 : 1;

      counter += mult;
      scores[username] = (scores[username] || 0) + mult;

      // Enviamos a todos los clientes el nuevo estado
      broadcast({ type: "update", value: counter });
      broadcast({ type: "updateScores", scores });

      console.log(`🔼 ${username} (+${mult}) total=${scores[username]}`);
    }

    //  El usuario intenta reclamar el bonus 
    if (data.type === "bonusClaim" && bonusActive && !bonusOwner) {
      bonusOwner = username;    // este usuario gana el bonus
      bonusActive = false;      // ya no está disponible
      clearTimeout(bonusTimer); // cancelamos el temporizador de expiración

      // Avisamos a todos quién lo ha ganado
      broadcast({ type: "bonusAward", winner: username, multiplier: 5 });
      console.log(`🏅 ${username} ganó el bonus!`);

      // Después de 10 segundos, el bonus termina
      setTimeout(() => {
        if (bonusOwner === username) {
          bonusOwner = null;
          broadcast({ type: "bonusEnd" });
          console.log("🔥 Bonus terminado");
        }
        startBonusCycle(); // programamos el siguiente bonus
      }, 10000);
    }
  });

  // Cuando un cliente se desconecta
  ws.on("close", () => {
    console.log(`🔴 ${username || "Cliente"} desconectado`);
  });
});
