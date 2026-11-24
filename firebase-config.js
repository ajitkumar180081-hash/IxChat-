import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCgv2pmfJv_ki7iZkdWlU4u1RbLM0p3JsA",
  authDomain: "ixchat-92440.firebaseapp.com",
  projectId: "ixchat-92440",
  storageBucket: "ixchat-92440.firebasestorage.app",
  messagingSenderId: "164527066733",
  appId: "1:164527066733:web:50bcffc97f0dc90e8f3964",
  measurementId: "G-Q06D8YLFE1"
};

export const SUPER_ADMIN_EMAIL = "ajitkumar180081@gmail.com";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
