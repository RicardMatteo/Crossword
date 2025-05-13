import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// import CrosswordGrid from './components/CrosswordGrid';
import CrosswordPage from './pages/CrossWordPage';

export default function App() {
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState(localStorage.getItem('name') || '');
  const [joined, setJoined] = useState(false);

  const navigate = useNavigate();
  const { roomFromURL } = useParams();

  // Redirection automatique si room dans l’URL et token/nom déjà présents
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedName = localStorage.getItem('name');

    if (roomFromURL) {
      if (token && storedName) {
        setRoomId(roomFromURL);
        setName(storedName);
        setJoined(true);
      } else {
        setJoined(false);
        navigate('/');
      }
    }
  }, [roomFromURL, navigate]);

  const handleJoin = () => {
    if (roomId && name) {
      localStorage.setItem('name', name);
      setJoined(true);
      navigate(`/game/${roomId}`);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      {!joined ? (
        <div style={{ maxWidth: '400px', margin: 'auto' }}>
          <h2>Rejoindre une partie</h2>
          <input
            type="text"
            placeholder="Code de la partie"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
          />
          <input
            type="text"
            placeholder="Votre nom"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
          />
          <button
            onClick={handleJoin}
            style={{
              width: '105%',
              padding: '0.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Rejoindre
          </button>
        </div>
      ) : (
        <div>
          <CrosswordPage roomId={roomId} playerName={name} />
        </div>
      )}
    </div>
  );
}
