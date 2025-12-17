import { GameEvent, RoomData, GameState } from '../types';
import { db } from './firebaseConfig';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

export const gameService = {
  // Send an event to the specific room's event collection
  send: async (event: GameEvent) => {
    try {
      if (!('roomId' in event.payload)) {
        console.error("Event missing roomId", event);
        return;
      }
      const roomId = event.payload.roomId;
      const eventsRef = collection(db, 'rooms', roomId, 'events');
      
      await addDoc(eventsRef, {
        ...event,
        createdAt: serverTimestamp() // Use server timestamp for sorting
      });
    } catch (e) {
      console.error("Error sending event", e);
    }
  },

  // Listen for events in a specific room
  subscribe: (roomId: string, callback: (event: GameEvent) => void) => {
    const eventsRef = collection(db, 'rooms', roomId, 'events');
    const q = query(eventsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // We cast the data back to GameEvent. 
          // Note: createdAt is present in data but not in GameEvent interface, which is fine.
          callback(data as GameEvent);
        }
      });
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