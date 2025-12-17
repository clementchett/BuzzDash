import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { GameState, GameEvent, Player, RoomData } from '../types';
import BuzzerButton from '../components/BuzzerButton';

const PlayerView: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [gameState, setGameState] = useState<GameState>(GameState.WAITING);
  const [buzzerId, setBuzzerId] = useState<string | null>(null); // Who buzzed first
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  
  const hasVibrated = useRef(false);

  // Connection logic
  useEffect(() => {
    if (!roomId || !player) return;

    // Join Event
    gameService.send({ 
      type: 'JOIN', 
      payload: { roomId, player } 
    });

    // Listen
    const unsubscribe = gameService.subscribe(roomId, (event: GameEvent) => {
      // Filter by room (redundant but safe)
      if ('payload' in event && event.payload.roomId !== roomId) return;

      switch (event.type) {
        case 'SYNC_STATE':
          const data = event.payload.state as Partial<RoomData>;
          if (data.gameState) setGameState(data.gameState);
          if (data.currentQuestion !== undefined) setCurrentQuestion(data.currentQuestion || null);
          
          if (data.buzzes && data.buzzes.length > 0) {
             setBuzzerId(data.buzzes[0].playerId);
             // Haptic feedback if someone else buzzed and we lost
             if (data.gameState === GameState.LOCKED && !hasVibrated.current) {
                if (navigator.vibrate) navigator.vibrate(200);
                hasVibrated.current = true;
             }
          } else {
             setBuzzerId(null);
             hasVibrated.current = false;
          }
          break;
        
        case 'RESET':
          setGameState(GameState.WAITING);
          setBuzzerId(null);
          hasVibrated.current = false;
          break;

        case 'SET_QUESTION':
          setCurrentQuestion(event.payload.question);
          setGameState(GameState.WAITING); // Implicit reset on new question usually
          setBuzzerId(null);
          break;
      }
    });

    return unsubscribe;
  }, [roomId, player]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setPlayer({
        id: gameService.generateId(),
        name: nameInput.trim(),
        joinedAt: Date.now(),
        score: 0
      });
    }
  };

  const handleBuzz = () => {
    if (!player || !roomId || gameState !== GameState.WAITING) return;
    
    // Optimistic update
    // setGameState(GameState.LOCKED); // Don't lock immediately locally, wait for server to confirm order to be fair? 
    // Actually for a buzzer, local immediate feedback is better UX, but waiting for 'server' is more accurate.
    // Let's send event immediately.
    
    if (navigator.vibrate) navigator.vibrate([50]);
    
    gameService.send({
      type: 'BUZZ',
      payload: {
        roomId,
        playerId: player.id,
        timestamp: Date.now()
      }
    });
  };

  // Join Screen
  if (!player) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Join Room <span className="text-red-500 font-mono">{roomId}</span></h2>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm font-bold mb-2">Display Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={12}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-red-500 transition-colors"
                placeholder="Ex. QuickSilver"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-transform active:scale-95"
            >
              Enter Game
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Game Screen
  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white">
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-slate-800 border-b border-slate-700">
        <div className="font-bold text-lg">{player.name}</div>
        <div className="font-mono text-slate-400">{roomId}</div>
      </div>

      {/* Question Area */}
      <div className="p-6 text-center min-h-[120px] flex items-center justify-center">
        {currentQuestion ? (
          <p className="text-xl font-medium leading-relaxed">{currentQuestion}</p>
        ) : (
          <p className="text-slate-500 italic">Watch the host screen for questions...</p>
        )}
      </div>

      {/* Buzzer Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <BuzzerButton 
          gameState={gameState} 
          onBuzz={handleBuzz} 
          isMyBuzz={buzzerId === player.id}
          winnerName={buzzerId ? 'Someone' : undefined} 
        />
      </div>

      {/* Footer Status */}
      <div className="p-4 text-center text-sm text-slate-500">
        {gameState === GameState.WAITING && "Tap button to buzz!"}
        {gameState === GameState.LOCKED && buzzerId === player.id && "You buzzed first!"}
        {gameState === GameState.LOCKED && buzzerId !== player.id && "Locked out."}
      </div>
    </div>
  );
};

export default PlayerView;