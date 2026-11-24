/* ==========================================================================
   IXCHAT MONSTER PRO - CORE JAVASCRIPT ENGINE (PART 1)
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase Configuration (Make sure firebase-config.js is linked or config is loaded)
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
const MASTER_ADMIN_EMAIL = "ajitkumar180081@gmail.com";

// DOM Elements
const screenLogin = document.getElementById("screen-login");
const screenHome = document.getElementById("screen-home");
const screenChatroom = document.getElementById("screen-chatroom");
const screenSettings = document.getElementById("screen-settings");

// --- AUTHENTICATION ENGINE ---
document.getElementById("btn-login-submit").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  const errBox = document.getElementById("auth-error-msg");
  errBox.textContent = "";

  if (!email || !pass) {
    errBox.textContent = "Kripya email aur password dono daalein!";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (error) {
    errBox.textContent = "Login Error: " + error.message;
  }
});

document.getElementById("btn-signup-submit").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  const errBox = document.getElementById("auth-error-msg");
  errBox.textContent = "";

  if (!email || !pass) {
    errBox.textContent = "Sign up ke liye email aur password zaroori hai!";
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    // Create user profile in Firestore
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email: email,
      name: email.split("@")[0],
      bio: "Today in emoji... 😎🔥",
      avatar: "",
      online: true,
      createdAt: Date.now()
    });
  } catch (error) {
    errBox.textContent = "Signup Error: " + error.message;
  }
});

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    screenLogin.classList.remove("active");
    screenHome.classList.add("active");
    
    // Check if Master Admin
    if (user.email === MASTER_ADMIN_EMAIL) {
      document.getElementById("menu-admin").style.display = "flex";
      document.getElementById("ix-global-notice").style.display = "flex";
      document.getElementById("ix-global-notice").innerHTML = `<span>⚡</span> <b>Master Admin Active:</b> Full Monster Privileges Enabled!`;
    }

    // Load User Profile Data in Settings
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const uData = userDoc.data();
      document.getElementById("set-user-name").textContent = uData.name || user.email.split("@")[0];
      document.getElementById("set-user-bio").textContent = uData.bio || "Today in emoji... 😎🔥";
      document.getElementById("set-avatar-letter").textContent = (uData.name || user.email)[0].toUpperCase();
    }

  } else {
    currentUser = null;
    screenHome.classList.remove("active");
    screenChatroom.classList.remove("active");
    screenSettings.classList.remove("active");
    screenLogin.classList.add("active");
  }
});

// --- NAVIGATION & TABS ENGINE ---
const navButtons = document.querySelectorAll(".ix-nav-btn");
const tabPanels = document.querySelectorAll(".ix-tab-panel");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    navButtons.forEach(b => b.classList.remove("active"));
    tabPanels.forEach(p => p.classList.remove("active"));

    btn.classList.add("active");
    const targetTab = btn.getAttribute("data-tab");
    document.getElementById(`panel-${targetTab}`).classList.add("active");
  });
});

// 3-Dots Dropdown Menu Toggle
const topMenuBtn = document.getElementById("btn-top-menu");
const mainMenu = document.getElementById("ix-main-menu");

topMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  mainMenu.classList.toggle("open");
});

document.addEventListener("click", () => {
  mainMenu.classList.remove("open");
});

// Menu Navigation Links
document.getElementById("menu-settings").addEventListener("click", () => {
  screenHome.classList.remove("active");
  screenSettings.classList.add("active");
});

document.getElementById("btn-settings-back").addEventListener("click", () => {
  screenSettings.classList.remove("active");
  screenHome.classList.add("active");
});

document.getElementById("tile-logout").addEventListener("click", async () => {
  await signOut(auth);
});/* ==========================================================================
   IXCHAT MONSTER PRO - CORE JAVASCRIPT ENGINE (PART 2)
   ========================================================================== */

import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let activeChatId = null;
let unsubscribeMessages = null;

// --- DIRECTORY & USERS LIST (CALLS & EXPLORE TAB) ---
async function loadUserDirectory() {
  const dirContainer = document.getElementById("list-directory");
  if (!dirContainer) return;

  try {
    const q = query(collection(db, "users"));
    onSnapshot(q, (snapshot) => {
      dirContainer.innerHTML = "";
      snapshot.forEach((docSnap) => {
        const u = docSnap.data();
        if (currentUser && u.uid === currentUser.uid) return; // Skip self

        const div = document.createElement("div");
        div.className = "ix-chat-item";
        div.innerHTML = `
          <div class="ix-avatar-wrap">
            <div class="ix-avatar">${(u.name || u.email)[0].toUpperCase()}</div>
            ${u.online ? '<div class="ix-online-dot"></div>' : ''}
          </div>
          <div class="ix-chat-info">
            <div class="ix-chat-row-top">
              <span class="ix-chat-name">${u.name || u.email}</span>
            </div>
            <div class="ix-chat-row-bot">
              <span class="ix-chat-snippet">${u.bio || "Available on IxChat"}</span>
              <button class="ix-btn-follow" style="padding:4px 12px; font-size:12px;">Chat</button>
            </div>
          </div>
        `;

        div.querySelector("button").addEventListener("click", () => {
          openChatRoom(u.uid, u.name || u.email);
        });

        dirContainer.appendChild(div);
      });
    });
  } catch (err) {
    console.error("Directory load error:", err);
  }
}

// --- CHAT ROOM & MESSAGING ENGINE ---
function openChatRoom(recipientUid, recipientName) {
  activeChatId = currentUser.uid < recipientUid ? `${currentUser.uid}_${recipientUid}` : `${recipientUid}_${currentUser.uid}`;
  
  document.getElementById("chat-room-title").textContent = recipientName;
  document.getElementById("chat-room-sub").textContent = "online";
  
  screenHome.classList.remove("active");
  screenChatroom.classList.add("active");

  loadMessages(activeChatId);
}

document.getElementById("btn-chat-back").addEventListener("click", () => {
  screenChatroom.classList.remove("active");
  screenHome.classList.add("active");
  if (unsubscribeMessages) unsubscribeMessages();
});

// Send Message
document.getElementById("btn-chat-send").addEventListener("click", async () => {
  const input = document.getElementById("chat-msg-input");
  const text = input.value.trim();
  if (!text || !activeChatId) return;

  input.value = "";

  try {
    await addDoc(collection(db, "chats", activeChatId, "messages"), {
      senderId: currentUser.uid,
      text: text,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("Send message error:", err);
  }
});

// Real-time Messages Listener
function loadMessages(chatId) {
  const container = document.getElementById("ix-messages-container");
  container.innerHTML = "";

  const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
  
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    container.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const isMine = msg.senderId === currentUser.uid;

      const bubble = document.createElement("div");
      bubble.className = `ix-msg-bubble ${isMine ? "mine" : ""}`;
      bubble.innerHTML = `
        <div>${escapeHtml(msg.text)}</div>
        <div class="ix-msg-meta">
          <span>${formatTime(msg.timestamp)}</span>
          ${isMine ? '<span class="ticks">✓✓</span>' : ''}
        </div>
      `;
      container.appendChild(bubble);
    });
    container.scrollTop = container.scrollHeight;
  });
}

// Helpers
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatTime(ts) {
  if (!ts) return "Just now";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Trigger directory load when authenticated
setTimeout(() => {
  loadUserDirectory();
}, 1500);
