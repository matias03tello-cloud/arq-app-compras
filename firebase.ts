import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB8tjj8d1qFFU860bNioC02bbLq_Fr9IUc",
  authDomain: "super-ahorro-app.firebaseapp.com",
  projectId: "super-ahorro-app",
  storageBucket: "super-ahorro-app.firebasestorage.app",
  messagingSenderId: "175580172771",
  appId: "1:175580172771:web:230fd51ceb905c6bc490d6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);