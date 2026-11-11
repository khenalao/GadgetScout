import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAJd44Nhe_hkaoRFe2c5jHt2oCHtTUrKNQ",
  authDomain: "gadgetscout-62bde.firebaseapp.com",
  databaseURL: "https://gadgetscout-62bde-default-rtdb.firebaseio.com",
  projectId: "gadgetscout-62bde",
  storageBucket: "gadgetscout-62bde.firebasestorage.app",
  messagingSenderId: "724169212456",
  appId: "1:724169212456:web:72ac2d9e01b6fb40956b1d",
  measurementId: "G-Z4B3VW5RYC"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);