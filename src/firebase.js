import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCutd-Rj0JC2sjQxMhDpdWOzNd34Gx626M",
  authDomain: "frootze.firebaseapp.com",
  projectId: "frootze",
  storageBucket: "frootze.firebasestorage.app",
  messagingSenderId: "249864481027",
  appId: "1:249864481027:web:d4fc3d8b896b61ea7a6136"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
export default app;
