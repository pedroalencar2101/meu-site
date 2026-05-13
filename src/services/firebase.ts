import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD6DdP1nM7uHeGSuH-ogrq-bUyBQthZ4WQ",
  authDomain: "noctal-cc448.firebaseapp.com",
  projectId: "noctal-cc448",
  storageBucket: "noctal-cc448.firebasestorage.app",
  messagingSenderId: "885534280878",
  appId: "1:885534280878:web:d1189e84e26ffa9302713f",
  measurementId: "G-0W4FVXQG2B"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);