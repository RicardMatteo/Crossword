import { useState, useEffect, useRef } from 'react';

const useWebSocket = (roomId, playerName) => {
    const [token, setToken] = useState(localStorage.getItem(`token-${roomId}`) || null);
    const wsRef = useRef(null);
    const [progressOtherPlayers, setProgressOtherPlayers] = useState({});
    const [progress, setProgress] = useState({});

    useEffect(() => {
        if (!playerName || !roomId) {
            console.log("playerName ou roomId manquant, WebSocket non ouverte");
            return;
        }

        if (wsRef.current) {
            console.log("WebSocket déjà connectée, on ne refait pas de connexion");
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${roomId}`;
        console.log("Connexion WebSocket à :", wsUrl);

        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
            console.log("WebSocket ouverte");
            socket.send(JSON.stringify({ type: 'join', name: playerName, token: token}));
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                console.log("WebSocket message received:", msg.type);

                if (msg.type === "token") {
                    localStorage.setItem(`token-${msg.room_id}`, msg.token);
                    console.log("Token reçu et stocké:", msg.token, msg.room_id);
                    setToken(msg.token);
                } else if (msg.type === "self_progress") {
                    console.log("Ancienne progression retrouvé :", msg.progress);
                    setProgress(msg.progress);
                    console.log("Progression du joueur mise à jour:", progress);
    
                    
                } else if (msg.type === "player_progress") {
                    console.log("Progression du joueur reçue:", msg.from, msg.progress);
                    setProgressOtherPlayers(prev => ({
                        ...prev,
                        [msg.from]: msg.progress
                    }));
                } else if (msg.type === "player_disconnected") {
                    setProgressOtherPlayers(prev => {
                        const newProgress = { ...prev };
                        delete newProgress[msg.from];
                        return newProgress;
                    });
                }

            } catch (err) {
                console.error("Error processing WebSocket message:", err);
            }
        };

        socket.onclose = (event) => {
            console.log("WebSocket closed:", event.code, event.reason);
            if (event.code !== 1000) {
                console.error("WebSocket closed unexpectedly, attempting to reconnect...");
                setTimeout(() => {
                    wsRef.current = null;
                }, 1000);
            } else {
                console.log("WebSocket closed normally");
                wsRef.current = null;
            }
        };

        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                console.log("Cleaning up WebSocket connection");
                wsRef.current.close(1000, "Cleaning up");
            }
        };
    }, [roomId, playerName]);

    return { token, progressOtherPlayers, progress };
};

export default useWebSocket;