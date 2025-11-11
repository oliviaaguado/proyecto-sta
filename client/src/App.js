import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [count, setCount] = useState(0);
  const [scores, setScores] = useState({});
  const [bonusVisible, setBonusVisible] = useState(false);
  const [bonusWinner, setBonusWinner] = useState(null);
  const [bonusMultiplier, setBonusMultiplier] = useState(null);
  const [bonusPosition, setBonusPosition] = useState({ top: "50%", left: "50%" });

  // 🔹 Estado para el color de fondo de toda la página
  const [bgColor, setBgColor] = useState("#0f172a");

  // 🔌 WebSocket
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");
    setSocket(ws);

    ws.onopen = () => {
      setConnected(true);
      console.log("✅ Conectado al servidor WS");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "init") {
        setCount(data.value);
        setScores(data.scores);
      }
      if (data.type === "update") setCount(data.value);
      if (data.type === "updateScores") setScores(data.scores);
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
    };

    ws.onclose = () => {
      setConnected(false);
      console.log("🔴 Desconectado del servidor");
    };

    return () => ws.close();
  }, []);

  // 🎮 Funciones
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

  // 🏆 Ranking ordenado
  const sortedScores = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 🔹 Lógica de rebote del contador
  const level = Math.floor(count / 10); // cada 10 clicks sube un nivel
  const MAX_LEVEL = 26; // corresponde al tamaño máximo 12rem
  const relativeLevel = level % (MAX_LEVEL + 1); // vuelve a 0 al superar el máximo

  // 🔹 Cambiar color de fondo de toda la página al rebote
  useEffect(() => {
    if (relativeLevel === 0 && count !== 0) {
      const colors = ["#f87171", "#facc15", "#f472b6", "#34d399", "#60a5fa"];
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
                  <h4>👤 {username}: {scores[username]}</h4>
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

          {/* BONUS BUTTON */}
          {bonusVisible && (
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
        </>
      )}
    </div>
  );
}

export default App;
