import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { RoomData, GameState, Buzz, GameEvent } from '../types';
import PlayerList from '../components/PlayerList';

// Simple audio synth for sound effects
const playSound = (type: 'buzz' | 'reset') => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  if (type === 'buzz') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } else {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }
};

const HostView: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [questionInput, setQuestionInput] = useState('');

  // Initialize Room
  useEffect(() => {
    if (!roomId) return;
    
    // Create initial state
    const hostId = gameService.generateId();
    const initialData = gameService.getInitialRoomState(roomId, hostId);
    setRoomData(initialData);

    // Subscribe to events
    const unsubscribe = gameService.subscribe(roomId, (event: GameEvent) => {
      // Filter events only for this room (double check, though Firestore query handles it)
      if ('payload' in event && event.payload.roomId !== roomId) return;

      setRoomData(prev => {
        if (!prev) return prev;
        const newState = { ...prev };

        switch (event.type) {
          case 'JOIN':
            // Add player if not exists
            if (!newState.players.find(p => p.id === event.payload.player.id)) {
              newState.players = [...newState.players, event.payload.player];
              
              // With Firestore, we don't strictly need to send SYNC_STATE immediately 
              // because the player will replay events, but sending it helps 
              // "checkpoint" the state for late joiners if we were implementing snapshotting.
              // For this simple version, we'll keep the logic but it might be redundant.
              // Actually, preventing infinite loops is good. 
              // Let's only sync if WE are the host and we just processed a new join.
              // Since we are in the HostView, we are the host.
              
              // Note: Sending SYNC_STATE after every JOIN creates a lot of traffic.
              // The event replay handles the player's local state construction.
              // However, the original logic relied on this for the player to know about OTHER players.
              // Let's keep it but throttle it or rely on the fact that players also receive JOIN events.
              // Wait, players receive JOIN events too. So they build their own list!
              // The SYNC_STATE is mostly useful for 'late' joiners in a broadcast channel.
              // In Firestore Event Sourcing, the late joiner gets the JOIN events too!
              // So we can technically remove the SYNC_STATE call here, but let's leave it 
              // to be safe with the existing architecture.
              
              if (prev.hostId === newState.hostId) {
                 setTimeout(() => {
                   gameService.send({ 
                     type: 'SYNC_STATE', 
                     payload: { roomId, state: newState } 
                   });
                 }, 500);
              }
            }
            return newState;

          case 'BUZZ':
            // Only accept buzz if waiting
            if (newState.gameState === GameState.WAITING) {
              const firstBuzzTime = newState.buzzes.length > 0 ? newState.buzzes[0].timestamp : event.payload.timestamp;
              const newBuzz: Buzz = {
                playerId: event.payload.playerId,
                timestamp: event.payload.timestamp,
                delta: event.payload.timestamp - firstBuzzTime
              };
              
              // Check if buzz already exists (deduplication)
              if (!newState.buzzes.find(b => b.playerId === newBuzz.playerId)) {
                 newState.buzzes = [...newState.buzzes, newBuzz];
              }

              // If it's the first buzz, lock the game
              if (newState.buzzes.length === 1) {
                newState.gameState = GameState.LOCKED;
                playSound('buzz');
                // Broadcast the new state immediately so players lock out
                setTimeout(() => {
                   gameService.send({ type: 'SYNC_STATE', payload: { roomId, state: newState } });
                }, 0);
              }
            }
            return newState;
            
          default:
            return prev;
        }
      });
    });

    return unsubscribe;
  }, [roomId]);

  // Sync state broadcast whenever roomData changes
  // WARNING: In Firestore, this can cause infinite loops if we aren't careful.
  // Every time we update local state from an event, we trigger this effect.
  // If we send a SYNC_STATE, we get an event, update state, send SYNC_STATE... loop!
  // The original BroadcastChannel logic didn't echo back to self easily, or it was filtered.
  // With Firestore, we receive our own events.
  // WE MUST REMOVE THIS automatic sync effect for the backend implementation 
  // and only sync when specific actions happen (like Reset).
  
  /* 
  useEffect(() => {
    if (roomData && roomId) {
      gameService.send({ 
        type: 'SYNC_STATE', 
        payload: { roomId, state: roomData } 
      });
    }
  }, [roomData, roomId]);
  */

  const handleReset = useCallback(() => {
    if (!roomData || !roomId) return;
    playSound('reset');
    setRoomData(prev => ({
      ...prev!,
      gameState: GameState.WAITING,
      buzzes: []
    }));
    gameService.send({ type: 'RESET', payload: { roomId } });
  }, [roomData, roomId]);

  const handleSetQuestion = () => {
    if (!roomId) return;
    setRoomData(prev => prev ? { ...prev, currentQuestion: questionInput } : null);
    gameService.send({ type: 'SET_QUESTION', payload: { roomId, question: questionInput } });
    handleReset();
  };

  if (!roomData) return <div className="text-white p-8">Initializing Game Room...</div>;

  return (
    <div className="flex-1 flex flex-col md:flex-row h-screen bg-slate-900 overflow-hidden">
      
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Room Code</h2>
          <div className="text-4xl font-mono font-black text-white tracking-widest">{roomId}</div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* Controls */}
          <div className="space-y-4">
            <button
              onClick={handleReset}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all
                ${roomData.gameState === GameState.LOCKED 
                  ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900 translate-y-0' 
                  : 'bg-slate-700 text-slate-400 cursor-default'}
              `}
            >
              {roomData.gameState === GameState.LOCKED ? 'RESET BUZZERS' : 'Buzzers Open'}
            </button>
          </div>

          {/* Manual Question Input */}
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
              <span>📝 Question</span>
            </h3>
            <textarea
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Type a question here..."
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm w-full text-white focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none h-24 mb-2"
            />
            <button
              onClick={handleSetQuestion}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Update Question
            </button>
          </div>

        </div>
        
        <div className="p-4 border-t border-slate-800 text-center">
            <button onClick={() => navigate('/')} className="text-slate-500 hover:text-white text-sm">Exit Game</button>
        </div>
      </aside>

      {/* Main Display */}
      <main className="flex-1 flex flex-col bg-slate-900 relative">
        {/* Question Display */}
        <div className="flex-shrink-0 p-8 border-b border-slate-800 min-h-[160px] flex items-center justify-center bg-slate-800/50">
           {roomData.currentQuestion ? (
             <h2 className="text-2xl md:text-3xl text-center font-medium text-slate-100 leading-relaxed max-w-4xl">
               {roomData.currentQuestion}
             </h2>
           ) : (
             <div className="text-slate-600 text-center italic">
               Waiting for a question...<br/>
               <span className="text-sm not-italic mt-2 block">Read one out loud or type it in.</span>
             </div>
           )}
        </div>

        {/* Player/Buzz Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center">
           <PlayerList players={roomData.players} buzzes={roomData.buzzes} />
           
           {/* Big Visual Indicator for who buzzed first */}
           {roomData.buzzes.length > 0 && (
             <div className="mt-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
               <div className="text-slate-400 uppercase tracking-widest text-sm mb-2">Fastest Finger</div>
               <div className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 drop-shadow-sm">
                 {roomData.players.find(p => p.id === roomData.buzzes[0].playerId)?.name || 'Unknown'}
               </div>
             </div>
           )}
        </div>
      </main>
    </div>
  );
};

export default HostView;