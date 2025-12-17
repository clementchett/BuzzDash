export enum GameState {
  WAITING = 'WAITING', // Waiting for buzz
  LOCKED = 'LOCKED',   // Someone buzzed
  PAUSED = 'PAUSED',   // Host paused the game
}

export interface Player {
  id: string;
  name: string;
  joinedAt: number;
  score: number;
}

export interface Buzz {
  playerId: string;
  timestamp: number;
  delta: number; // Time difference from first buzz
}

export interface RoomData {
  roomId: string;
  hostId: string;
  gameState: GameState;
  players: Player[];
  buzzes: Buzz[];
  currentQuestion?: string;
}

// Events for our simulated realtime service
export type GameEvent = 
  | { type: 'JOIN'; payload: { roomId: string; player: Player } }
  | { type: 'BUZZ'; payload: { roomId: string; playerId: string; timestamp: number } }
  | { type: 'RESET'; payload: { roomId: string } }
  | { type: 'KICK'; payload: { roomId: string; playerId: string } }
  | { type: 'SYNC_STATE'; payload: { roomId: string; state: Partial<RoomData> } }
  | { type: 'SET_QUESTION'; payload: { roomId: string; question: string } };
