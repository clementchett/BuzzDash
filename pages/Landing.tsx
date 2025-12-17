import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../services/gameService';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');

  const handleCreateGame = () => {
    const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    navigate(`/host/${newRoomId}`);
  };

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length > 0) {
      navigate(`/play/${joinCode.toUpperCase()}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">
            BUZZ<span className="text-red-500">DASH</span>
          </h1>
          <p className="text-slate-400 text-lg">
            Real-time buzzer for quiz nights and classrooms.
          </p>
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm">
             <span className="font-bold">Note:</span> This demo simulates a realtime backend. Open two tabs (one Host, one Player) to test it!
          </div>
        </div>

        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
          <div className="space-y-6">
            <button
              onClick={handleCreateGame}
              className="w-full py-4 px-6 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-lg transition-transform active:scale-95 shadow-lg shadow-red-900/20"
            >
              Host a New Game
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800 text-slate-500 uppercase">Or join existing</span>
              </div>
            </div>

            <form onSubmit={handleJoinGame} className="space-y-4">
              <input
                type="text"
                placeholder="Enter Room Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full px-5 py-3 bg-slate-900 border border-slate-700 rounded-xl text-center text-xl font-mono uppercase text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all placeholder-slate-600"
                maxLength={6}
              />
              <button
                type="submit"
                disabled={!joinCode}
                className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors"
              >
                Join Game
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;