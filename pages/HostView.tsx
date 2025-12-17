import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { RoomData, GameState, GameEvent } from '../types';
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
  
  // Ref to track previous state for sound effects
  const prevBuzzCount = useRef(0);
  const prevGameState = useRef<GameState>(GameState.WAITING);

  // Initialize Room
  useEffect(() => {
    if (!roomId) return;
    
    // Create and save initial state if we are the first host
    const hostId = gameService.generateId();
    const initialData = gameService.getInitialRoomState(roomId, hostId);
    
    // Optimistic set
    setRoomData(initialData);

    // Sync to Firestore (creates doc if missing)
    gameService.send({ type: 'SYNC_STATE', payload: { roomId, state: initialData } });

    // Subscribe to events
    const unsubscribe = gameService.subscribe(roomId, (event: GameEvent) => {
      if ('payload' in event && event.payload.roomId !== roomId) return;

      switch (event.type) {
        // Firestore source of truth
        case 'SYNC_STATE':
           setRoomData(event.payload.state as RoomData);
           break;
          
        // Fallback for direct events if used in future
        case 'JOIN':
        case 'BUZZ':
           // No-op: we rely on SYNC_STATE from onSnapshot for data consistency
           break;
            
        default:
           break;
      }
    });

    return unsubscribe;
  }, [roomId]);

  // Handle Sound Effects based on state changes
  useEffect(() => {
    if (!roomData) return;

    // Play buzz sound if buzz count increased
    if (roomData.buzzes.length > prevBuzzCount.current) {
      playSound('buzz');
    }

    // Play reset sound if transitioning from LOCKED to WAITING (manual reset)
    if (prevGameState.current === GameState.LOCKED && roomData.gameState === GameState.WAITING) {
      playSound('reset');
    }

    prevBuzzCount.current = roomData.buzzes.length;
    prevGameState.current = roomData.gameState;
  }, [roomData]);

  const handleReset = useCallback(() => {
    if (!roomData || !roomId) return;
    // We don't update local state manually here to avoid desync.
    // We send the command and wait for Firestore to update us.
    gameService.send({ type: 'RESET', payload: { roomId } });
  }, [roomData, roomId]);

  const handleSetQuestion = () => {
    if (!roomId) return;
    gameService.send({ type: 'SET_QUESTION', payload: { roomId, question: questionInput } });
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