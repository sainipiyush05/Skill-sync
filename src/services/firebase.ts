import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyB_nFEQ5wmCjGzYVJYGaxMbs0aX4wct_dE",
  authDomain: "sync-skill.firebaseapp.com",
  projectId: "sync-skill",
  storageBucket: "sync-skill.firebasestorage.app",
  messagingSenderId: "851243344613",
  appId: "1:851243344613:web:7e7b61924f318613bdea0c",
  measurementId: "G-VRYCT5FFMR"
};

// Log the config to verify values are loaded
console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics
const analytics = getAnalytics(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Export the Firebase app instance
export default app; 