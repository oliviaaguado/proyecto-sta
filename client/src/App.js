import { useState, useEffect } from "react";

function App() {
  // -------------------------------
  // VARIABLES DE ESTADO (React)
  // -------------------------------
  const [socket, setSocket] = useState(null);    // conexión con el servidor
  const [connected, setConnected] = useState(false); 
  const [username, setUsername] = useState("");  // nombre del jugador
  const [joined, setJoined] = useState(false);   // si ya ha entrado al juego

  const [count, setCount] = useState(0);         // contador global
  const [scores, setScores] = useState({});      // puntuaciones de todos

  const [bonusVisible, setBonusVisible] = useState(false);  // botón dorado
  const [bonusWinner, setBonusWinner] = useState(null);     // quién tiene bonus
  const [bonusMultiplier, setBonusMultiplier] = useState(null); // valor x5

  const [bonusPosition, setBonusPosition] = useState({ top: "50%", left: "50%" });

  // -------------------------------------
  // 1️⃣ Conectarse al servidor WebSocket
  // -------------------------------------
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");
    setSocket(ws);

    ws.onopen = () => {
      setConnected(true);
      console.log("✅ Conectado al servidor WS");
    };

    // -------------------------------------
    // 2️⃣ Recibir mensajes del servidor
    // -------------------------------------
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Estado inicial cuando te unes
      if (data.type === "init") {
        setCount(data.value);
        setScores(data.scores);
      }

      // Actualización del contador global
      if (data.type === "update") setCount(data.value);

      // Actualización del ranking
      if (data.type === "updateScores") setScores(data.scores);

      // Evento: aparece el botón dorado
      if (data.type === "bonusStart") {
        const pos = {
          top: Math.floor(Math.random() * 70 + 10) + "%",
          left: Math.floor(Math.random() * 70 + 10) + "%",
        };
        setBonusPosition(pos);
        setBonusVisible(true);
        setBonusWinner(null);
      }

      // Evento: alguien gana el bonus
      if (data.type === "bonusAward") {
        setBonusVisible(false);
        setBonusWinner(data.winner);
        setBonusMultiplier(data.multiplier);
      }

      // Evento: el bonus termina
      if (data.type === "bonusEnd") {
        setBonusVisible(false);
        setBonusWinner(null);
        setBonusMultiplier(null);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log("🔴 Desconectado del servidor");
    };

    return () => ws.close();
  }, []);

  // -------------------------------------
  // 3️⃣ Funciones que envían mensajes
  // -------------------------------------
  const joinGame = () => {
    if (socket && username.trim()) {
      socket.send(JSON.stringify({ type: "join", username }));
      setJoined(true);
    }
  };

  const handleClick = () => {
    if (socket && connected && joined) {
      socket.send(JSON.stringify({ type: "increment" }));
    }
  };

  const handleBonusClick = () => {
    if (socket && connected) {
      socket.send(JSON.stringify({ type: "bonusClaim" }));
    }
  };

  // Ordenamos las puntuaciones de mayor a menor para el ranking
  const sortedScores = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // -------------------------------------
  // 4️⃣ Interfaz gráfica
  // -------------------------------------
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#0f172a",
        color: "#e2e8f0",
        fontFamily: "Arial, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* PANTALLA DE INICIO */}
      {!joined ? (
        <div>
          <h1>🏁 ¡Bienvenido a ClickBattle!</h1>
          <input
            placeholder="Tu nombre..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              fontSize: "1.2rem",
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              marginRight: "10px",
            }}
          />
          <button
            onClick={joinGame}
            style={{
              fontSize: "1.2rem",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#3b82f6",
              color: "white",
              cursor: "pointer",
            }}
          >
            Entrar
          </button>
        </div>
      ) : (
        <>
          {/* PANTALLA PRINCIPAL DEL JUEGO */}
          <h1>🌍 Contador Global</h1>
          <h2 style={{ fontSize: "4rem", margin: "20px 0" }}>{count}</h2>

          <button
            onClick={handleClick}
            style={{
              fontSize: "1.5rem",
              padding: "15px 30px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              backgroundColor:
                bonusWinner === username ? "#facc15" : "#3b82f6",
              color: "black",
              transition: "0.2s",
            }}
          >
            {bonusWinner === username
              ? `+1 (x${bonusMultiplier})`
              : "+1"}
          </button>

          {/* RANKING */}
          <h3 style={{ marginTop: "40px" }}>🏆 Top 5 jugadores</h3>
          <ul style={{ listStyle: "none", padding: 0, fontSize: "1.2rem" }}>
            {sortedScores.map(([user, points], i) => (
              <li
                key={user}
                style={{
                  fontWeight: bonusWinner === user ? "bold" : "normal",
                  color: bonusWinner === user ? "#facc15" : "#e2e8f0",
                }}
              >
                {i + 1}. {user}: {points}
              </li>
            ))}
          </ul>

          {/* BOTÓN DORADO DEL BONUS */}
          {bonusVisible && (
            <button
              onClick={handleBonusClick}
              style={{
                position: "absolute",
                top: bonusPosition.top,
                left: bonusPosition.left,
                backgroundColor: "#facc15",
                border: "2px solid #eab308",
                borderRadius: "12px",
                fontSize: "1.2rem",
                padding: "12px 20px",
                cursor: "pointer",
                color: "#000",
                boxShadow: "0 0 20px #fde047",
              }}
            >
              💥 ¡BONUS!
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default App;
