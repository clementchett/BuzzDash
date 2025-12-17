import React from 'react';
import { GameState } from '../types';

interface BuzzerButtonProps {
  gameState: GameState;
  onBuzz: () => void;
  isMyBuzz: boolean;
  winnerName?: string;
}

const BuzzerButton: React.FC<BuzzerButtonProps> = ({ gameState, onBuzz, isMyBuzz, winnerName }) => {
  
  // Handle interaction (touch or click)
  const handleInteraction = (e: React.SyntheticEvent) => {
    e.preventDefault(); // Prevent double firing on touch devices
    if (gameState === GameState.WAITING) {
      onBuzz();
    }
  };

  if (gameState === GameState.LOCKED) {
    if (isMyBuzz) {
      return (
        <div className="flex flex-col items-center justify-center h-64 w-64 rounded-full bg-green-500 shadow-[0_0_50px_rgba(34,197,94,0.6)] animate-pulse">
          <span className="text-4xl font-bold text-white uppercase tracking-wider">YOU WON!</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-64 w-64 rounded-full bg-slate-700 border-4 border-slate-600 opacity-50">
        <span className="text-xl font-bold text-gray-400 uppercase">LOCKED</span>
        {winnerName && <span className="text-sm text-gray-300 mt-2">Winner: {winnerName}</span>}
      </div>
    );
  }

  return (
    <button
      onMouseDown={handleInteraction}
      onTouchStart={handleInteraction}
      className={`
        relative h-72 w-72 rounded-full 
        bg-gradient-to-br from-red-500 to-red-700 
        shadow-[0_10px_0_rgb(153,27,27)] active:shadow-none active:translate-y-[10px]
        transition-all duration-100 ease-out
        border-8 border-red-800
        flex items-center justify-center
        group
        cursor-pointer select-none
        tap-highlight-transparent
      `}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="absolute inset-0 rounded-full bg-white opacity-10 group-hover:opacity-20 transition-opacity" />
      <span className="text-5xl font-black text-white uppercase tracking-widest drop-shadow-md">
        BUZZ
      </span>
    </button>
  );
};

export default BuzzerButton;