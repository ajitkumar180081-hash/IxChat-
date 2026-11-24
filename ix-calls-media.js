/* ==========================================================================
   IXCHAT MONSTER PRO - CALLS LOG & MEDIA ATTACHMENTS (ix-calls-media.js)
   ========================================================================== */

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();
let activeUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    activeUser = user;
    initCallsEngine();
    initMediaAttachmentEngine();
  }
});

// ==========================================================================
// 1. RECENT CALLS ENGINE
// ==========================================================================
function initCallsEngine() {
  const callsContainer = document.getElementById("list-calls");
  if (!callsContainer) return;

  const q = query(collection(db, "calls"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    callsContainer.innerHTML = "";
    let count = 0;

    snapshot.forEach((docSnap) => {
      const call = docSnap.data();
      count++;

      const div = document.createElement("div");
      div.className = "ix-call-item";
      div.innerHTML = `
        <div class="ix-call-left">
          <div class="ix-avatar" style="width:48px; height:48px;">${(call.callerName || "U")[0].toUpperCase()}</div>
          <div class="ix-call-details">
            <h4 style="font-size:16px; font-weight:600; color:var(--ix-text-primary);">${escapeHtml(call.callerName || "User")}</h4>
            <p class="${call.type || 'incoming'}">
              <span>${call.type === 'outgoing' ? '↗' : '↙'}</span> ${call.type === 'outgoing' ? 'Outgoing call' : 'Incoming call'} • ${formatCallTime(call.timestamp)}
            </p>
          </div>
        </div>
        <button class="ix-call-action-btn" title="Call Back">📞</button>
      `;

      div.querySelector("button").addEventListener("click", async () => {
        alert(`Connecting call to ${call.callerName}...`);
        if (activeUser) {
          await addDoc(collection(db, "calls"), {
            callerId: activeUser.uid,
            callerName: activeUser.email.split("@")[0],
            targetName: call.callerName,
            type: "outgoing",
            timestamp: serverTimestamp()
          });
        }
      });

      callsContainer.appendChild(div);
    });

    if (count === 0) {
      callsContainer.innerHTML = `<div style="padding:16px; text-align:center; color:var(--ix-text-secondary); font-size:13px;">Koi recent call nahi hai.</div>`;
    }
  });

  // Top bar camera & video triggers
  const topCam = document.getElementById("btn-top-cam");
  if (topCam) {
    topCam.addEventListener("click", () => {
      alert("Camera scanner / Status capture active!");
    });
  }
}

// ==========================================================================
// 2. MEDIA ATTACHMENTS ENGINE (Images / Gallery)
// ==========================================================================
function initMediaAttachmentEngine() {
  const attachBtn = document.getElementById("btn-chat-attach");
  const fileInput = document.getElementById("chat-media-file");

  if (attachBtn && fileInput) {
    attachBtn.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async function(uploadEvent) {
        const base64Data = uploadEvent.target.result;
        // Send image message to active chat
        // Note: activeChatId is handled globally in core engine
        alert("Media selected successfully! Ready to send in chat.");
      };
      reader.readAsDataURL(file);
    });
  }
}

function formatCallTime(ts) {
  if (!ts) return "Just now";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString() + ", " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
