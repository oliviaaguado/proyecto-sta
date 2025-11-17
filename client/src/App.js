// app.js --> frontend
// useState --> añade estado a un componente (al cambiar el estado se vuelve a renderizar)
// useEffect --> maneja efectos secundarios (peticiones, timers...), se ejecuta tras el render
import { useState, useEffect } from "react";
import "./App.css";

function App() {
  // Estados que se recuerdan entre renderizados
  // socket: variable de estado, guarda el valor actual
  // setSocket: función para actualizar el valor de la variable de estado (cada vez que se llama, se vuelve a renderizar el componente)
  const [socket, setSocket] = useState(null); // WebSocket
  const [connected, setConnected] = useState(false); // Estado de conexión
  const [username, setUsername] = useState(""); // Nombre de usuario
  const [joined, setJoined] = useState(false); // Estado de unión al juego
  const [count, setCount] = useState(0); // Contador de clicks
  const [scores, setScores] = useState({}); // Puntuaciones de los jugadores
  const [bonusVisible, setBonusVisible] = useState(false); // Visibilidad del bonus
  const [bonusWinner, setBonusWinner] = useState(null); // Ganador del bonus
  const [bonusMultiplier, setBonusMultiplier] = useState(null); // Multiplicador del bonus
  const [bonusPosition, setBonusPosition] = useState({ top: "50%", left: "50%" }); // Posición aleatoria del bonus

  // Estado para el color de fondo de toda la página
  const [bgColor, setBgColor] = useState("#0f172a");

  // Estados nuevos (animaciones y antitrampas)
  const [hits, setHits] = useState([]); // Lista de animaciones de clics (+1, +5)
  const [lastClickTime, setLastClickTime] = useState(0);  // Para detectar autoclicks
  const [warning, setWarning] = useState(false);  // Muestra un mensaje si se hace trampas
  const [timeLeft, setTimeLeft] = useState(60); // Tiempo restante de la partida
  const [gameOver, setGameOver] = useState(false); // Estado de fin de juego

  //Crear conexión WebSocket al servidor cuando la app carga
  useEffect(() => {
    // Crear nuevo socket y almacenarlo en el estado
    const ws = new WebSocket("ws://localhost:8080");
    setSocket(ws);

    // Cuando se abre la conexión cambia el estado a conectado
    ws.onopen = () => {
      setConnected(true);
      console.log("✅ Conectado al servidor WS");
    };

    // Cuando llega un mensaje
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data); // Convertimos el texto JSON a objeto
      
      // Si el mensaje es de tipo 'init', recibimos el estado inicial del juego y actualizamos los estados
      if (data.type === "init") {
        setCount(data.value);
        setScores(data.scores);
      }
      // Actualizamos el contador
      if (data.type === "update") setCount(data.value);
      // Actualizamos el ranking
      if (data.type === "updateScores") setScores(data.scores);
      // Cuando empieza el bonus
      if (data.type === "bonusStart") {
        const pos = {
          top: Math.floor(Math.random() * 70 + 10) + "%",
          left: Math.floor(Math.random() * 70 + 10) + "%",
        };
        setBonusPosition(pos);
        setBonusVisible(true);
        setBonusWinner(null);
      }
      if (data.type === "bonusAward") {
        setBonusVisible(false);
        setBonusWinner(data.winner);
        setBonusMultiplier(data.multiplier);
      }
      if (data.type === "bonusEnd") {
        setBonusVisible(false);
        setBonusWinner(null);
        setBonusMultiplier(null);
      }
      if (data.type === "timeUpdate"){
        setTimeLeft(data.timeLeft);
      }
      if (data.type === "gameOver") {
        setGameOver(true);
      }
      if (data.type === "reset"){
          setCount(0);
          setScores({});
          setBonusVisible(false);
          setBonusWinner(null);
          setBonusMultiplier(null);
          setTimeLeft(60); // 5 minutos
          setGameOver(false);
          setBgColor("#0f172a");
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log("🔴 Desconectado del servidor");
    };

    return () => ws.close();
  }, []); // Array de dependencias vacío: se ejecuta solo al montar el componente

  // useEffect del temporizador
  useEffect(() => {
    // Solo se activa si el usuario se ha unido y el juego no ha terminado
    if (!joined || gameOver) return;

    // Cada segundo se reduce el tiempo y si llega a 0 se termina el juego
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [joined, gameOver]); // Se ejecuta cada vez que 'joined' o 'gameOver' cambien

  // Se envía el nombre de usuario al servidor para unirse al juego
  const joinGame = () => {
    if (socket && username.trim()) {
      socket.send(JSON.stringify({ type: "join", username }));
      setJoined(true);
    }
  };

  // Función de clic con animación + detector de autoclick
  const handleClick = () => {
    if (!joined || !connected || gameOver) return;
    if (socket && connected && joined) {
      const now = Date.now();
      const diff = now - lastClickTime;
      setLastClickTime(now);

      // 🚨 Detección de autoclick (clics <150ms)
      if (diff < 50) {
        setWarning(true);
        setTimeout(() => setWarning(false), 2000);
        return; // No contar el clic
      }

      socket.send(JSON.stringify({ type: "increment" }));

      // Crear animación +1 o +5
      const newHit = {
        id: Date.now(),
        x: Math.random() * 60 + 20,
        y: Math.random() * 60 + 20,
        text: bonusWinner === username ? "+5" : "+1",
        color: bonusWinner === username ? "#fde047" : "#facc15",
      };

      setHits((prev) => [...prev, newHit]);

      // Eliminar después de 1 segundo
      setTimeout(() => {
        setHits((prev) => prev.filter((h) => h.id !== newHit.id));
      }, 1000);
    }
  };

  // Función para reclamar el bonus
  const handleBonusClick = () => {
    if (socket && connected) {
      socket.send(JSON.stringify({ type: "bonusClaim" }));
    }
  };

  //  Ranking ordenado
  const sortedScores = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Lógica de rebote del contador
  const level = Math.floor(count / 10); // cada 10 clicks sube un nivel
  const MAX_LEVEL = 26; 
  const relativeLevel = level % (MAX_LEVEL + 1); // vuelve a 0 al superar el máximo

  // Cambiar color de fondo de toda la página al rebote
  useEffect(() => {
    if (relativeLevel === 0 && count !== 0) {
      const colors = ["#f87171", "#15fa9eff", "#f472b6", "#f149f7ff", "#a0fa60ff"];
      setBgColor(colors[Math.floor(Math.random() * colors.length)]);
    }
  }, [relativeLevel, count]);

  // 🎨 UI
  return (
    <div
      className="AppContainer"
      onClick={handleClick}
      style={{ backgroundColor: bgColor, transition: "background-color 0.5s ease" }}
    >
      {!joined ? (
        <div className="StartScreen">
          <h1>🏁 ¡Bienvenido a ClickBattle!</h1>
          <input
            className="NameInput"
            placeholder="Tu nombre..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button className="JoinButton" onClick={joinGame}>
            Entrar
          </button>
        </div>
      ) : (
        <>
          {/* TEMPORIZADOR */}
          {!gameOver && (
            <div className="Timer">
              ⏱ {Math.floor(timeLeft / 60).toString().padStart(2, "0")}:
              {(timeLeft % 60).toString().padStart(2, "0")}
            </div>
          )}

          {/* OVERLAY FIN DE JUEGO */}
          {gameOver && (
            <div className="GameOverOverlay">
              <h1>⏱ ¡Tiempo terminado!</h1>
              <h2>🏆 Ranking final</h2>
              <ul className="Ranking">
                {Object.entries(scores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([user, points], i) => (
                    <li key={user} className={user === username ? "MyUser" : ""}>
                      {i + 1}. {user}: {points}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* LAYOUT PRINCIPAL DEL JUEGO */}
          {!gameOver && (
            <div className="GameLayout">
              {/* PANEL IZQUIERDO */}
              <div className="LeftPanel">
                <h1 className="CounterTitle">🌍 Contador Global</h1>
                <h2
                  className={`Counter ${username === bonusWinner ? "BonusActive" : ""} ${
                    relativeLevel === 0 ? "Rebounce" : ""
                  }`}
                  style={{ "--level": relativeLevel }}
                >
                  {count}
                </h2>
              </div>

              {/* PANEL DERECHO */}
              <div className="RightPanel">
                {/* Usuario propio arriba a la derecha */}
                {username && scores[username] !== undefined && (
                  <div className="MyScoreRight">
                    <h4>
                      👤 {username}: {scores[username]}
                    </h4>
                  </div>
                )}

                {/* Top 5 jugadores */}
                <h3>🏆 Top 5 jugadores</h3>
                <ul className="Ranking">
                  {sortedScores.map(([user, points], i) => (
                    <li
                      key={user}
                      className={`RankingItem ${
                        bonusWinner === user ? "BonusWinner" : ""
                      } ${user === username ? "MyUser" : ""}`}
                    >
                      {i + 1}. {user}: {points}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* BONUS BUTTON */}
          {bonusVisible && !gameOver && (
            <button
              className="BonusButton"
              style={{
                top: bonusPosition.top,
                left: bonusPosition.left,
              }}
              onClick={handleBonusClick}
            >
              💥 ¡BONUS!
            </button>
          )}

          {/* 🚨 Aviso antitrampas */}
          {warning && (
            <div className="AntiCheatWarning">
              🚨 DEJA DE HACER TRAMPAS PAYASO 🚨
            </div>
          )}

          {/* 💥 Animaciones de clic (hitmarkers) */}
          {!gameOver &&
            hits.map((hit) => (
              <div
                key={hit.id}
                className="Hitmarker"
                style={{
                  top: `${hit.y}%`,
                  left: `${hit.x}%`,
                  color: hit.color,
                }}
              >
                {hit.text}
              </div>
            ))}
        </>
      )}
    </div>
  );


}

export default App;
