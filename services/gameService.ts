import { db } from './firebaseConfig';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  setDoc, 
  arrayUnion, 
  runTransaction 
} from 'firebase/firestore';
import { GameEvent, RoomData, GameState, Buzz } from '../types';

export const gameService = {
  // Send an event to update Firestore
  send: async (event: GameEvent) => {
    try {
      if (!('roomId' in event.payload)) return;
      
      const roomId = event.payload.roomId;
      const roomRef = doc(db, 'rooms', roomId);

      switch (event.type) {
        case 'JOIN':
          // Add player to the players array
          await updateDoc(roomRef, {
            players: arrayUnion(event.payload.player)
          });
          break;

        case 'BUZZ':
          // Use transaction to prevent race conditions on the first buzz
          await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(roomRef);
            if (!sfDoc.exists()) throw "Document does not exist!";
            
            const data = sfDoc.data() as RoomData;
            
            // Only accept buzz if waiting
            if (data.gameState === GameState.WAITING) {
              const buzz: Buzz = {
                playerId: event.payload.playerId,
                timestamp: event.payload.timestamp,
                delta: data.buzzes.length === 0 ? 0 : event.payload.timestamp - data.buzzes[0].timestamp
              };

              const newBuzzes = [...data.buzzes, buzz];
              
              // First buzz locks the game
              const newGameState = newBuzzes.length === 1 ? GameState.LOCKED : data.gameState;

              transaction.update(roomRef, {
                buzzes: newBuzzes,
                gameState: newGameState
              });
            }
          });
          break;

        case 'RESET':
          await updateDoc(roomRef, {
            gameState: GameState.WAITING,
            buzzes: []
          });
          break;
        
        case 'SET_QUESTION':
          await updateDoc(roomRef, {
            currentQuestion: event.payload.question,
            gameState: GameState.WAITING,
            buzzes: []
          });
          break;

        case 'SYNC_STATE':
          // Force overwrite/init of state (mostly used by Host on creation)
          await setDoc(roomRef, event.payload.state, { merge: true });
          break;
      }

    } catch (e) {
      console.error("Error sending event", e);
    }
  },

  // Listen for real-time updates from Firestore
  subscribe: (roomId: string, callback: (event: GameEvent) => void) => {
    const unsubscribe = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as RoomData;
        // Emit a SYNC_STATE event so components can update their full state
        callback({
          type: 'SYNC_STATE',
          payload: { roomId, state: data }
        });
      }
    });

    return unsubscribe;
  },

  // Helper to generate IDs
  generateId: () => Math.random().toString(36).substr(2, 9),
  
  // Helper to get initial state
  getInitialRoomState: (roomId: string, hostId: string): RoomData => ({
    roomId,
    hostId,
    gameState: GameState.WAITING,
    players: [],
    buzzes: [],
  })
};