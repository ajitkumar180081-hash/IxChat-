/* ==========================================================================
   IXCHAT MONSTER PRO - SETTINGS, PROFILE & APPEARANCE ENGINE
   ========================================================================== */

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();
let activeUser = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    activeUser = user;
    initSettingsControls();
    applySavedTheme();
  }
});

function initSettingsControls() {
  // 1. Edit Profile (Name & Emoji Status)
  const editProfileBtn = document.getElementById("btn-edit-profile");
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", async () => {
      if (!activeUser) return;
      const snap = await getDoc(doc(db, "users", activeUser.uid));
      const data = snap.exists() ? snap.data() : {};

      openSettingsModal("Edit Profile", `
        <label style="font-size:12px; color:var(--ix-text-secondary);">Display Name</label>
        <input id="edit-prof-name" class="ix-auth-input" value="${data.name || ''}" placeholder="Apna naam likhein">
        <label style="font-size:12px; color:var(--ix-text-secondary);">Today in emoji / Bio</label>
        <input id="edit-prof-bio" class="ix-auth-input" value="${data.bio || 'Today in emoji... 😎🔥'}" placeholder="Apna status likhein">
        <div style="display:flex; gap:10px; margin-top:14px;">
          <button id="btn-set-cancel" class="ix-btn-primary" style="background:var(--ix-bg-main); color:#fff;">Cancel</button>
          <button id="btn-set-save" class="ix-btn-primary">Save Profile</button>
        </div>
      `, async () => {
        const newName = document.getElementById("edit-prof-name").value.trim();
        const newBio = document.getElementById("edit-prof-bio").value.trim();
        if (!newName) return;

        await updateDoc(doc(db, "users", activeUser.uid), {
          name: newName,
          bio: newBio || "Available"
        });

        document.getElementById("set-user-name").textContent = newName;
        document.getElementById("set-user-bio").textContent = newBio;
        document.getElementById("set-avatar-letter").textContent = newName[0].toUpperCase();
      });
    });
  }

  // 2. Appearance (Accent Color & Chat Wallpaper)
  const appearanceTile = document.getElementById("tile-appearance");
  if (appearanceTile) {
    appearanceTile.addEventListener("click", () => {
      openSettingsModal("Appearance & Theme", `
        <p style="font-size:13px; color:var(--ix-text-secondary); margin-bottom:12px;">App ka primary accent color chunein:</p>
        <div style="display:flex; gap:12px; margin-bottom:18px;">
          <button class="ix-theme-swatch" data-primary="#00a884" data-dark="#005c4b" style="width:38px; height:38px; border-radius:50%; background:#00a884; border:2px solid #fff; cursor:pointer;"></button>
          <button class="ix-theme-swatch" data-primary="#3b82f6" data-dark="#1d4ed8" style="width:38px; height:38px; border-radius:50%; background:#3b82f6; border:none; cursor:pointer;"></button>
          <button class="ix-theme-swatch" data-primary="#a855f7" data-dark="#6b21a8" style="width:38px; height:38px; border-radius:50%; background:#a855f7; border:none; cursor:pointer;"></button>
          <button class="ix-theme-swatch" data-primary="#ec4899" data-dark="#9d174d" style="width:38px; height:38px; border-radius:50%; background:#ec4899; border:none; cursor:pointer;"></button>
        </div>
        <p style="font-size:13px; color:var(--ix-text-secondary); margin-bottom:10px;">Chat Room Wallpaper:</p>
        <div style="display:flex; gap:10px; margin-bottom:16px;">
          <button class="ix-wall-swatch" data-wall="#0b141a" style="flex:1; padding:10px; border-radius:10px; background:#0b141a; color:#fff; border:1px solid var(--ix-border); cursor:pointer;">Default Dark</button>
          <button class="ix-wall-swatch" data-wall="linear-gradient(135deg, #0f172a, #1e1b4b)" style="flex:1; padding:10px; border-radius:10px; background:linear-gradient(135deg, #0f172a, #1e1b4b); color:#fff; border:1px solid var(--ix-border); cursor:pointer;">Midnight</button>
        </div>
        <button id="btn-set-cancel" class="ix-btn-primary">Done</button>
      `, null);

      const body = document.getElementById("modal-generic-body");
      body.querySelectorAll(".ix-theme-swatch").forEach(btn => {
        btn.addEventListener("click", () => {
          const p = btn.getAttribute("data-primary");
          const d = btn.getAttribute("data-dark");
          document.documentElement.style.setProperty("--ix-primary", p);
          document.documentElement.style.setProperty("--ix-primary-dark", d);
          localStorage.setItem("ix_theme_primary", p);
          localStorage.setItem("ix_theme_dark", d);
        });
      });

      body.querySelectorAll(".ix-wall-swatch").forEach(btn => {
        btn.addEventListener("click", () => {
          const w = btn.getAttribute("data-wall");
          const msgBox = document.getElementById("ix-messages-container");
          if (msgBox) msgBox.style.background = w;
          localStorage.setItem("ix_chat_wall", w);
        });
      });
    });
  }

  // 3. Privacy Controls
  const privacyTile = document.getElementById("tile-privacy");
  if (privacyTile) {
    privacyTile.addEventListener("click", () => {
      openSettingsModal("Privacy Settings", `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--ix-border);">
          <span>Last Seen & Online</span>
          <span style="color:var(--ix-primary); font-weight:600;">Everyone</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--ix-border);">
          <span>Read Receipts (Blue Ticks)</span>
          <span style="color:var(--ix-primary); font-weight:600;">Enabled</span>
        </div>
        <button id="btn-set-cancel" class="ix-btn-primary" style="margin-top:14px;">Close</button>
      `, null);
    });
  }
}

function applySavedTheme() {
  const p = localStorage.getItem("ix_theme_primary");
  const d = localStorage.getItem("ix_theme_dark");
  const w = localStorage.getItem("ix_chat_wall");
  if (p) document.documentElement.style.setProperty("--ix-primary", p);
  if (d) document.documentElement.style.setProperty("--ix-primary-dark", d);
  if (w) {
    const msgBox = document.getElementById("ix-messages-container");
    if (msgBox) msgBox.style.background = w;
  }
}

function openSettingsModal(title, htmlContent, onSave) {
  const modal = document.getElementById("modal-generic");
  const body = document.getElementById("modal-generic-body");
  body.style.background = "var(--ix-bg-elevated)";
  body.innerHTML = `<h3 style="margin-bottom:12px; font-size:18px;">${title}</h3>` + htmlContent;

  const cancelBtn = document.getElementById("btn-set-cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", () => modal.classList.remove("open"));

  const saveBtn = document.getElementById("btn-set-save");
  if (saveBtn && onSave) {
    saveBtn.addEventListener("click", async () => {
      await onSave();
      modal.classList.remove("open");
    });
  }

  modal.classList.add("open");
}
