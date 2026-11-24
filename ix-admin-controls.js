/* ==========================================================================
   IXCHAT MONSTER PRO - MASTER ADMIN CONTROLS (ix-admin-controls.js)
   ========================================================================== */

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();
const MASTER_ADMIN_EMAIL = "ajitkumar180081@gmail.com";

onAuthStateChanged(auth, (user) => {
  if (user && user.email === MASTER_ADMIN_EMAIL) {
    initAdminPanelFeature();
  }
});

function initAdminPanelFeature() {
  const adminMenuBtn = document.getElementById("menu-admin");
  if (!adminMenuBtn) return;

  adminMenuBtn.addEventListener("click", () => {
    document.getElementById("ix-main-menu").classList.remove("open");
    openAdminDashboard();
  });
}

function openAdminDashboard() {
  const modal = document.getElementById("modal-generic");
  const body = document.getElementById("modal-generic-body");

  body.style.background = "var(--ix-bg-elevated)";
  body.innerHTML = `
    <h3 style="margin-bottom:12px; color:var(--ix-primary);">⚡ Master Admin Control Panel</h3>
    <p style="font-size:13px; color:var(--ix-text-secondary); margin-bottom:14px;">App-wide broadcasts aur system announcements manage karein.</p>
    
    <label style="font-size:12px; font-weight:600; color:var(--ix-text-primary);">Global Notice / Banner Text:</label>
    <textarea id="admin-notice-input" rows="3" placeholder="Enter urgent announcement for all users..." 
      style="width:100%; padding:10px; border-radius:10px; background:var(--ix-bg-main); color:#fff; border:1px solid var(--ix-border); margin:6px 0 14px 0; outline:none; font-size:14px;"></textarea>
    
    <div style="display:flex; gap:10px;">
      <button id="btn-admin-close" class="ix-btn-primary" style="background:var(--ix-bg-main); color:#fff;">Close</button>
      <button id="btn-admin-broadcast" class="ix-btn-primary">Push Notice</button>
    </div>
  `;

  document.getElementById("btn-admin-close").addEventListener("click", () => {
    modal.classList.remove("open");
  });

  document.getElementById("btn-admin-broadcast").addEventListener("click", async () => {
    const noticeText = document.getElementById("admin-notice-input").value.trim();
    if (!noticeText) return;

    try {
      // Save global notice in Firestore system collection
      await setDoc(doc(db, "system", "global_notice"), {
        text: noticeText,
        updatedAt: Date.now()
      });
      alert("Global notice successfully broadcasted to all users!");
      modal.classList.remove("open");
    } catch (err) {
      console.error("Admin broadcast error:", err);
    }
  });

  modal.classList.add("open");
}
