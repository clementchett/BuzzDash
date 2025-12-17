import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * TODO: Replace the following config with your own Firebase project configuration.
 * You can find this in your Firebase Console -> Project Settings -> General -> Your Apps.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCQwwtzlC5XhO6kuwPyEiiDg6-PnBk7M-c",
  authDomain: "buzzdash-2baeb.firebaseapp.com",
  projectId: "buzzdash-2baeb",
  storageBucket: "buzzdash-2baeb.firebasestorage.app",
  messagingSenderId: "587129535164",
  appId: "1:587129535164:web:06e73085ced8ee4dfeaeb9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };