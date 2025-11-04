import React, { useEffect, useRef, useState } from 'react';

function App() {
  const [count, setCount] = useState(0);  // Contador mostrado
  const [status, setStatus] = useState("Conectando..."); 
  const ws = useRef(null);  // Referencia al WebSocket

  useEffect(() => {
    // Crear conexión WebSocket
    const socket = new WebSocket('ws://localhost:8080');
    ws.current = socket;

    // Cuando se conecta
    socket.onopen = () => setStatus("Conectado");

    // Cuando se cierra
    socket.onclose = () => setStatus("Desconectado");

    // Cuando hay error
    socket.onerror = (error) => console.error("WebSocket error:", error);

    // Recibir mensajes del servidor
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type == "init"){
        setCount(msg.value);  // Valor inicial
      } else if (msg.type == "update"){
        setCount(msg.value);  // Actualización del contador
      }
    };

    return () => socket.close();
  }, []);

  // Enviar mensaje increment
  const handleClick = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN){
      ws.current.send(JSON.stringify({ type: 'increment' }));
    }
  };

    return (
    <div style={{ textAlign: "center", marginTop: "5rem" }}>
      <h1>🖱️ Contador Colaborativo</h1>
      <p>Estado: {status}</p>
      <h2 style={{ fontSize: "4rem" }}>{count}</h2>
      <button
        onClick={handleClick}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.5rem",
          cursor: "pointer",
          borderRadius: "1rem",
        }}
      >
        +1 Click
      </button>
    </div>
  );
}

export default App;
