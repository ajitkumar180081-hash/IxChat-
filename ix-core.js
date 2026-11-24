/* ==========================================================================
   IXCHAT MONSTER PRO - CORE JAVASCRIPT ENGINE (FIXED & UNIFIED)
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
  onSnapshot,
  addDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
const MASTER_ADMIN_EMAIL = "ajitkumar180081@gmail.com";

let activeChatId = null;
let unsubscribeMessages = null;

// DOM Elements Initialization on Window Load
window.addEventListener("DOMContentLoaded", () => {
  const screenLogin = document.getElementById("screen-login");
  const screenHome = document.getElementById("screen-home");
  const screenChatroom = document.getElementById("screen-chatroom");
  const screenSettings = document.getElementById("screen-settings");

  const btnLogin = document.getElementById("btn-login-submit");
  const btnSignup = document.getElementById("btn-signup-submit");
  const errBox = document.getElementById("auth-error-msg");

  // --- AUTHENTICATION ENGINE ---
  if (btnLogin) {
    btnLogin.addEventListener("click", async () => {
      const email = document.getElementById("login-email").value.trim();
      const pass = document.getElementById("login-pass").value.trim();
      if (errBox) errBox.textContent = "";

      if (!email || !pass) {
        if (errBox) errBox.textContent = "Kripya email aur password dono daalein!";
        return;
      }

      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (error) {
        if (errBox) errBox.textContent = "Login Error: " + error.message;
      }
    });
  }

  if (btnSignup) {
    btnSignup.addEventListener("click", async () => {
      const email = document.getElementById("login-email").value.trim();
      const pass = document.getElementById("login-pass").value.trim();
      if (errBox) errBox.textContent = "";

      if (!email || !pass) {
        if (errBox) errBox.textContent = "Sign up ke liye email aur password zaroori hai!";
        return;
      }

      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
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
        if (errBox) errBox.textContent = "Signup Error: " + error.message;
      }
    });
  }

  // Auth State Observer
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      if (screenLogin) screenLogin.classList.remove("active");
      if (screenHome) screenHome.classList.add("active");
      
      // Check if Master Admin
      if (user.email === MASTER_ADMIN_EMAIL) {
        const adminMenu = document.getElementById("menu-admin");
        const globalNotice = document.getElementById("ix-global-notice");
        if (adminMenu) adminMenu.style.display = "flex";
        if (globalNotice) {
          globalNotice.style.display = "flex";
          globalNotice.innerHTML = `<span>⚡</span> <b>Master Admin Active:</b> Full Monster Privileges Enabled!`;
        }
      }

      // Load User Profile Data in Settings
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          const setName = document.getElementById("set-user-name");
          const setBio = document.getElementById("set-user-bio");
          const setAvatar = document.getElementById("set-avatar-letter");
          if (setName) setName.textContent = uData.name || user.email.split("@")[0];
          if (setBio) setBio.textContent = uData.bio || "Today in emoji... 😎🔥";
          if (setAvatar) setAvatar.textContent = (uData.name || user.email)[0].toUpperCase();
        }
      } catch (e) {
        console.error("Profile load error:", e);
      }

      loadUserDirectory();

    } else {
      currentUser = null;
      if (screenHome) screenHome.classList.remove("active");
      if (screenChatroom) screenChatroom.classList.remove("active");
      if (screenSettings) screenSettings.classList.remove("active");
      if (screenLogin) screenLogin.classList.add("active");
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
      const targetPanel = document.getElementById(`panel-${targetTab}`);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });

  // 3-Dots Dropdown Menu Toggle
  const topMenuBtn = document.getElementById("btn-top-menu");
  const mainMenu = document.getElementById("ix-main-menu");

  if (topMenuBtn && mainMenu) {
    topMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      mainMenu.classList.toggle("open");
    });

    document.addEventListener("click", () => {
      mainMenu.classList.remove("open");
    });
  }

  // Menu Navigation Links
  const menuSettings = document.getElementById("menu-settings");
  const btnSettingsBack = document.getElementById("btn-settings-back");
  const tileLogout = document.getElementById("tile-logout");

  if (menuSettings) {
    menuSettings.addEventListener("click", () => {
      if (screenHome) screenHome.classList.remove("active");
      if (screenSettings) screenSettings.classList.add("active");
    });
  }

  if (btnSettingsBack) {
    btnSettingsBack.addEventListener("click", () => {
      if (screenSettings) screenSettings.classList.remove("active");
      if (screenHome) screenHome.classList.add("active");
    });
  }

  if (tileLogout) {
    tileLogout.addEventListener("click", async () => {
      await signOut(auth);
    });
  }

  // Chat Back & Send Controls
  const btnChatBack = document.getElementById("btn-chat-back");
  if (btnChatBack) {
    btnChatBack.addEventListener("click", () => {
      if (screenChatroom) screenChatroom.classList.remove("active");
      if (screenHome) screenHome.classList.add("active");
      if (unsubscribeMessages) unsubscribeMessages();
    });
  }

  const btnChatSend = document.getElementById("btn-chat-send");
  if (btnChatSend) {
    btnChatSend.addEventListener("click", async () => {
      const input = document.getElementById("chat-msg-input");
      if (!input) return;
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
  }
});

// --- DIRECTORY & USERS LIST ---
function loadUserDirectory() {
  const dirContainer = document.getElementById("list-directory");
  if (!dirContainer) return;

  try {
    const q = query(collection(db, "users"));
    onSnapshot(q, (snapshot) => {
      dirContainer.innerHTML = "";
      snapshot.forEach((docSnap) => {
        const u = docSnap.data();
        if (currentUser && u.uid === currentUser.uid) return;

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

function openChatRoom(recipientUid, recipientName) {
  activeChatId = currentUser.uid < recipientUid ? `${currentUser.uid}_${recipientUid}` : `${recipientUid}_${currentUser.uid}`;
  
  const titleEl = document.getElementById("chat-room-title");
  const subEl = document.getElementById("chat-room-sub");
  const screenHome = document.getElementById("screen-home");
  const screenChatroom = document.getElementById("screen-chatroom");

  if (titleEl) titleEl.textContent = recipientName;
  if (subEl) subEl.textContent = "online";
  
  if (screenHome) screenHome.classList.remove("active");
  if (screenChatroom) screenChatroom.classList.add("active");

  loadMessages(activeChatId);
}

function loadMessages(chatId) {
  const container = document.getElementById("ix-messages-container");
  if (!container) return;
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
        <div>${escapeHtml(msg.text || "")}</div>
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

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatTime(ts) {
  if (!ts) return "Just now";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
