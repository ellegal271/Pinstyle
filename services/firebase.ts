import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

// ------------------------------------------------------------------
// INSTRUCCIONES PARA EL USUARIO:
// 1. Ve a https://console.firebase.google.com/
// 2. Crea un proyecto nuevo (gratis).
// 3. Añade una "Web App" a tu proyecto.
// 4. Copia las credenciales (firebaseConfig) y pégalas abajo.
// 5. En Authentication, habilita el proveedor "Google".
// 6. En Firestore Database, crea la base de datos y pon las reglas en modo prueba (o permite lectura/escritura).
// ------------------------------------------------------------------

const firebaseConfig = {
  // PEGA TUS CLAVES AQUI REEMPLAZANDO ESTOS VALORES VACÍOS
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// ------------------------------------------------------------------

let app;
let auth: any = null;
let db: any = null;
let googleProvider: any = null;
let isConfigured = false;

// Check if config is actually filled
if (firebaseConfig.apiKey && firebaseConfig.apiKey.length > 5) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    isConfigured = true;
    console.log("Firebase configured successfully");
  } catch (e) {
    console.error("Error initializing Firebase:", e);
  }
} else {
  console.warn("Firebase config is missing. App running in Demo Mode.");
}

export { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  firebaseSignOut, 
  onAuthStateChanged,
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  isConfigured 
};
