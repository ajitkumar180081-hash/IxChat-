/* ==========================================================================
   IXCHAT MONSTER PRO - ACTIVE CHATS & FILTER ENGINE (ix-chats-engine.js)
   ========================================================================== */

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    initChatsListEngine();
    initFilterChips();
  }
});

function initChatsListEngine() {
  const chatsContainer = document.getElementById("list-chats");
  if (!chatsContainer) return;

  // Listen to users/directory to build active chat previews
  const q = query(collection(db, "users"));
  onSnapshot(q, (snapshot) => {
    chatsContainer.innerHTML = "";
    let count = 0;

    snapshot.forEach((docSnap) => {
      const u = docSnap.data();
      if (currentUser && u.uid === currentUser.uid) return;
      count++;

      const div = document.createElement("div");
      div.className = "ix-chat-item";
      div.innerHTML = `
        <div class="ix-avatar-wrap">
          <div class="ix-avatar">${(u.name || u.email)[0].toUpperCase()}</div>
          ${u.online ? '<div class="ix-online-dot"></div>' : ''}
        </div>
        <div class="ix-chat-info">
          <div class="ix-chat-row-top">
            <span class="ix-chat-name">${escapeText(u.name || u.email)}</span>
            <span class="ix-chat-time">Online</span>
          </div>
          <div class="ix-chat-row-bot">
            <span class="ix-chat-snippet"><span class="tick">✓✓</span> ${escapeText(u.bio || "Tap to chat...")}</span>
            <span class="ix-unread-badge">1</span>
          </div>
        </div>
      `;

      div.addEventListener("click", () => {
        // Trigger opening chat room
        const recipientUid = u.uid;
        const recipientName = u.name || u.email;
        triggerOpenChat(recipientUid, recipientName);
      });

      chatsContainer.appendChild(div);
    });

    if (count === 0) {
      chatsContainer.innerHTML = `<div style="padding:24px; text-align:center; color:var(--ix-text-secondary); font-size:14px;">Koi chat nahi hai. Explore tab se dost banayein!</div>`;
    }
  });
}

function triggerOpenChat(recipientUid, recipientName) {
  // Dispatched helper to match core chat opener
  const chatId = currentUser.uid < recipientUid ? `${currentUser.uid}_${recipientUid}` : `${recipientUid}_${currentUser.uid}`;
  document.getElementById("chat-room-title").textContent = recipientName;
  document.getElementById("chat-room-sub").textContent = "online";
  
  document.getElementById("screen-home").classList.remove("active");
  document.getElementById("screen-chatroom").classList.add("active");
}

function initFilterChips() {
  const chips = document.querySelectorAll(".ix-chip");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
    });
  });
}

function escapeText(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
