/* ==========================================================================
   IXCHAT MONSTER PRO - GROUPS, COMMUNITIES & BROADCASTS (ix-groups-comm.js)
   ========================================================================== */

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();
let activeUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    activeUser = user;
    initCommunitiesEngine();
    initGroupCreationModal();
  }
});

// ==========================================================================
// 1. COMMUNITIES ENGINE
// ==========================================================================
function initCommunitiesEngine() {
  const commContainer = document.getElementById("list-communities");
  const createCommCard = document.getElementById("btn-create-comm-card");
  if (!commContainer) return;

  if (createCommCard) {
    createCommCard.addEventListener("click", () => {
      openModalForm("Create New Community", "Community Name", async (name) => {
        if (!name || !activeUser) return;
        await addDoc(collection(db, "communities"), {
          name: name,
          ownerId: activeUser.uid,
          members: [activeUser.uid],
          createdAt: serverTimestamp()
        });
      });
    });
  }

  onSnapshot(collection(db, "communities"), (snapshot) => {
    commContainer.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const comm = docSnap.data();
      const isMember = comm.members && activeUser && comm.members.includes(activeUser.uid);

      const div = document.createElement("div");
      div.className = "ix-community-box";
      div.style.margin = "8px 16px";
      div.innerHTML = `
        <div class="ix-community-header" style="margin-bottom:8px;">
          <div class="ix-community-icon">🏢</div>
          <div style="flex:1; min-width:0;">
            <h4 style="font-size:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(comm.name)}</h4>
            <p style="font-size:12px; color:var(--ix-text-secondary);">${comm.members ? comm.members.length : 1} members</p>
          </div>
          <button class="ix-btn-follow">${isMember ? 'Joined' : 'Join'}</button>
        </div>
      `;

      div.querySelector("button").addEventListener("click", async () => {
        if (!activeUser) return;
        await updateDoc(doc(db, "communities", docSnap.id), {
          members: arrayUnion(activeUser.uid)
        });
      });

      commContainer.appendChild(div);
    });
  });
}

// ==========================================================================
// 2. GROUP CREATION ENGINE
// ==========================================================================
function initGroupCreationModal() {
  const menuGroupBtn = document.getElementById("menu-new-group");
  if (!menuGroupBtn) return;

  menuGroupBtn.addEventListener("click", () => {
    document.getElementById("ix-main-menu").classList.remove("open");
    openModalForm("Create New Group Chat", "Group Name (e.g. Study Squad)", async (groupName) => {
      if (!groupName || !activeUser) return;
      
      // Create as a shared chat room / group in Firestore
      await addDoc(collection(db, "groups"), {
        name: groupName,
        adminId: activeUser.uid,
        members: [activeUser.uid],
        createdAt: serverTimestamp()
      });
    });
  });
}

// Reusable Modal Form Helper
function openModalForm(title, placeholder, onSubmitCallback) {
  const modal = document.getElementById("modal-generic");
  const body = document.getElementById("modal-generic-body");

  body.style.background = "var(--ix-bg-elevated)";
  body.innerHTML = `
    <h3 style="margin-bottom:14px; color:var(--ix-text-primary); font-size:18px;">${title}</h3>
    <input id="ix-modal-input" class="ix-auth-input" placeholder="${placeholder}" style="margin-bottom:14px;">
    <div style="display:flex; gap:10px;">
      <button id="modal-btn-cancel" class="ix-btn-primary" style="background:var(--ix-bg-main); color:#fff;">Cancel</button>
      <button id="modal-btn-submit" class="ix-btn-primary">Confirm</button>
    </div>
  `;

  document.getElementById("modal-btn-cancel").addEventListener("click", () => {
    modal.classList.remove("open");
  });

  document.getElementById("modal-btn-submit").addEventListener("click", () => {
    const val = document.getElementById("ix-modal-input").value.trim();
    if (val) {
      onSubmitCallback(val);
      modal.classList.remove("open");
    }
  });

  modal.classList.add("open");
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
