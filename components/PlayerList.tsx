import React from 'react';
import { Player, Buzz } from '../types';

interface PlayerListProps {
  players: Player[];
  buzzes: Buzz[];
}

const PlayerList: React.FC<PlayerListProps> = ({ players, buzzes }) => {
  const buzzMap = new Map<string, Buzz>(buzzes.map(b => [b.playerId, b] as [string, Buzz]));

  // Sort players: Buzzers first (by time), then non-buzzers
  const sortedPlayers = [...players].sort((a, b) => {
    const buzzA = buzzMap.get(a.id);
    const buzzB = buzzMap.get(b.id);
    if (buzzA && buzzB) return buzzA.timestamp - buzzB.timestamp;
    if (buzzA) return -1;
    if (buzzB) return 1;
    return a.joinedAt - b.joinedAt;
  });

  return (
    <div className="w-full max-w-md bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-700">
      <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">
        Active Players ({players.length})
      </h3>
      
      <ul className="space-y-2">
        {sortedPlayers.length === 0 ? (
          <li className="text-slate-500 text-center py-4 italic">Waiting for players to join...</li>
        ) : (
          sortedPlayers.map((player, index) => {
            const buzz = buzzMap.get(player.id);
            const isFirst = buzz && index === 0;

            return (
              <li 
                key={player.id} 
                className={`
                  flex items-center justify-between p-3 rounded-lg transition-all
                  ${buzz ? 'bg-slate-700' : 'bg-slate-800'}
                  ${isFirst ? 'ring-2 ring-green-500 bg-green-900/30' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${isFirst ? 'bg-green-500 text-white' : buzz ? 'bg-red-500 text-white' : 'bg-slate-600 text-slate-300'}
                  `}>
                    {buzz ? index + 1 : '-'}
                  </div>
                  <span className={`font-medium ${isFirst ? 'text-white' : 'text-slate-200'}`}>
                    {player.name}
                  </span>
                </div>
                
                {buzz && (
                  <span className="text-xs font-mono text-slate-400">
                    +{buzz.delta > 0 ? (buzz.delta / 1000).toFixed(3) : '0.000'}s
                  </span>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
};

export default PlayerList;