import { GameEvent, RoomData, GameState } from '../types';

// We use a global channel for the demo. In a real app with this architecture, 
// you might segregate channels by room ID to reduce noise.
const CHANNEL_NAME = 'buzzdash_global_channel';
const channel = new BroadcastChannel(CHANNEL_NAME);

// BroadcastChannel does NOT fire onmessage for the sender (the tab that sent it).
// We need a local listener system to 'echo' our own events back to the UI.
const localListeners = new Set<(event: GameEvent) => void>();

channel.onmessage = (msg) => {
  const event = msg.data as GameEvent;
  localListeners.forEach(listener => listener(event));
};

export const gameService = {
  // Send an event to the specific room's channel
  send: async (event: GameEvent) => {
    try {
      if (!('roomId' in event.payload)) {
        console.error("Event missing roomId", event);
        return;
      }
      
      // 1. Broadcast to other tabs
      channel.postMessage(event);

      // 2. Echo locally so the sender's UI updates too
      // We use setTimeout to push it to the next tick, simulating async network behavior
      setTimeout(() => {
        localListeners.forEach(listener => listener(event));
      }, 0);

    } catch (e) {
      console.error("Error sending event", e);
    }
  },

  // Listen for events in a specific room
  subscribe: (roomId: string, callback: (event: GameEvent) => void) => {
    // Wrap the callback to filter events by roomId
    const filteredCallback = (event: GameEvent) => {
      // Ensure we only process events for the room we are subscribed to
      if ('payload' in event && event.payload.roomId === roomId) {
        callback(event);
      }
    };

    localListeners.add(filteredCallback);

    // Return cleanup function (unsubscribe)
    return () => {
      localListeners.delete(filteredCallback);
    };
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