/* ==========================================================================
   IXCHAT MONSTER PRO - STATUS STORIES & CHANNELS ENGINE (ix-stories.js)
   ========================================================================== */

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

let activeUser = null;
let allStories = [];
let storyTimer = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    activeUser = user;
    initStoriesEngine();
    initChannelsEngine();
  }
});

// ==========================================================================
// 1. 24-HOUR STATUS STORIES ENGINE
// ==========================================================================
function initStoriesEngine() {
  const statusContainer = document.getElementById("list-status");
  if (!statusContainer) return;

  const q = query(collection(db, "stories"), orderBy("createdAt", "desc"));
  
  onSnapshot(q, (snapshot) => {
    allStories = [];
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const createdMs = data.createdAt?.toMillis ? data.createdAt.toMillis() : data.timestamp || now;
      if (now - createdMs < twentyFourHours) {
        allStories.push({ id: docSnap.id, ...data });
      }
    });

    renderStatusCarousel(statusContainer);
  });
}

function renderStatusCarousel(container) {
  container.innerHTML = "";

  // "Add Status" Card (First Item)
  const myAddCard = document.createElement("div");
  myAddCard.className = "ix-status-card";
  myAddCard.innerHTML = `
    <div class="ix-status-ring" style="border-style:dashed; border-color:var(--ix-primary);">
      <div class="ix-avatar" style="font-size:24px; color:var(--ix-primary);">+</div>
    </div>
    <span class="ix-status-name">Add status</span>
  `;
  myAddCard.addEventListener("click", openCreateStatusModal);
  container.appendChild(myAddCard);

  // Render Active Stories
  allStories.forEach((story, idx) => {
    const isSeen = story.viewers && activeUser && story.viewers.includes(activeUser.uid);
    const card = document.createElement("div");
    card.className = "ix-status-card";
    card.innerHTML = `
      <div class="ix-status-ring ${isSeen ? 'seen' : ''}">
        <div class="ix-avatar" style="background:${story.bgColor || '#005c4b'}; color:#fff; font-size:14px;">
          ${(story.authorName || "U")[0].toUpperCase()}
        </div>
      </div>
      <span class="ix-status-name">${escapeText(story.authorName || "User")}</span>
    `;
    card.addEventListener("click", () => openStoryViewer(idx));
    container.appendChild(card);
  });
}

// Create New Text/Color Status Modal
function openCreateStatusModal() {
  const modal = document.getElementById("modal-generic");
  const body = document.getElementById("modal-generic-body");
  
  body.innerHTML = `
    <h3 style="margin-bottom:12px; color:var(--ix-text-primary);">Post New Status</h3>
    <textarea id="ix-story-text" rows="4" placeholder="Type a status update..." 
      style="width:100%; padding:12px; border-radius:12px; background:var(--ix-bg-main); color:#fff; border:1px solid var(--ix-border); outline:none; font-size:15px;"></textarea>
    <div style="display:flex; gap:10px; margin:12px 0;">
      <button class="ix-color-pick" data-color="#005c4b" style="width:32px; height:32px; border-radius:50%; background:#005c4b; border:2px solid #fff; cursor:pointer;"></button>
      <button class="ix-color-pick" data-color="#7c3aed" style="width:32px; height:32px; border-radius:50%; background:#7c3aed; border:none; cursor:pointer;"></button>
      <button class="ix-color-pick" data-color="#db2777" style="width:32px; height:32px; border-radius:50%; background:#db2777; border:none; cursor:pointer;"></button>
      <button class="ix-color-pick" data-color="#0284c7" style="width:32px; height:32px; border-radius:50%; background:#0284c7; border:none; cursor:pointer;"></button>
    </div>
    <div style="display:flex; gap:10px; margin-top:14px;">
      <button id="btn-cancel-story" class="ix-btn-primary" style="background:var(--ix-bg-main); color:#fff;">Cancel</button>
      <button id="btn-post-story" class="ix-btn-primary">Post Status</button>
    </div>
  `;

  let selectedColor = "#005c4b";
  body.querySelectorAll(".ix-color-pick").forEach(btn => {
    btn.addEventListener("click", () => {
      body.querySelectorAll(".ix-color-pick").forEach(b => b.style.border = "none");
      btn.style.border = "2px solid #fff";
      selectedColor = btn.getAttribute("data-color");
    });
  });

  document.getElementById("btn-cancel-story").addEventListener("click", () => modal.classList.remove("open"));
  
  document.getElementById("btn-post-story").addEventListener("click", async () => {
    const text = document.getElementById("ix-story-text").value.trim();
    if (!text || !activeUser) return;

    await addDoc(collection(db, "stories"), {
      authorId: activeUser.uid,
      authorName: activeUser.email.split("@")[0],
      text: text,
      bgColor: selectedColor,
      viewers: [activeUser.uid],
      createdAt: serverTimestamp(),
      timestamp: Date.now()
    });
    modal.classList.remove("open");
  });

  modal.classList.add("open");
}

// Full-Screen Story Viewer
function openStoryViewer(index) {
  if (index >= allStories.length) {
    document.getElementById("modal-generic").classList.remove("open");
    return;
  }

  const story = allStories[index];
  const modal = document.getElementById("modal-generic");
  const body = document.getElementById("modal-generic-body");

  // Mark as viewed
  if (activeUser && (!story.viewers || !story.viewers.includes(activeUser.uid))) {
    updateDoc(doc(db, "stories", story.id), {
      viewers: arrayUnion(activeUser.uid)
    }).catch(() => {});
  }

  body.style.background = story.bgColor || "#005c4b";
  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <div>
        <strong style="color:#fff; font-size:15px;">${escapeText(story.authorName)}</strong>
        <div style="font-size:11px; color:rgba(255,255,255,0.75);">Views: ${story.viewers ? story.viewers.length : 1}</div>
      </div>
      <button id="btn-close-viewer" style="background:none; border:none; color:#fff; font-size:22px; cursor:pointer;">✕</button>
    </div>
    <div style="min-height:240px; display:flex; align-items:center; justify-content:center; text-align:center; padding:20px; font-size:20px; font-weight:600; color:#fff;">
      ${escapeText(story.text)}
    </div>
    <div style="display:flex; justify-content:space-between; margin-top:16px;">
      <button id="btn-prev-story" class="ix-btn-follow" style="background:rgba(0,0,0,0.3); color:#fff;">‹ Prev</button>
      <button id="btn-next-story" class="ix-btn-follow" style="background:rgba(0,0,0,0.3); color:#fff;">Next ›</button>
    </div>
  `;

  clearTimeout(storyTimer);
  storyTimer = setTimeout(() => openStoryViewer(index + 1), 5000);

  document.getElementById("btn-close-viewer").addEventListener("click", () => {
    clearTimeout(storyTimer);
    body.style.background = "var(--ix-bg-elevated)";
    modal.classList.remove("open");
  });

  document.getElementById("btn-prev-story").addEventListener("click", () => {
    clearTimeout(storyTimer);
    openStoryViewer(Math.max(0, index - 1));
  });

  document.getElementById("btn-next-story").addEventListener("click", () => {
    clearTimeout(storyTimer);
    openStoryViewer(index + 1);
  });

  modal.classList.add("open");
}

// ==========================================================================
// 2. TELEGRAM-STYLE BROADCAST CHANNELS ENGINE
// ==========================================================================
function initChannelsEngine() {
  const chContainer = document.getElementById("list-channels");
  const createBtn = document.getElementById("btn-new-channel");
  if (!chContainer) return;

  if (createBtn) {
    createBtn.addEventListener("click", () => {
      const modal = document.getElementById("modal-generic");
      const body = document.getElementById("modal-generic-body");
      body.style.background = "var(--ix-bg-elevated)";
      body.innerHTML = `
        <h3 style="margin-bottom:12px;">Create New Channel</h3>
        <input id="ix-ch-name" class="ix-auth-input" placeholder="Channel Name (e.g. Gaming Army)">
        <input id="ix-ch-desc" class="ix-auth-input" placeholder="Description">
        <div style="display:flex; gap:10px; margin-top:12px;">
          <button id="btn-ch-cancel" class="ix-btn-primary" style="background:var(--ix-bg-main); color:#fff;">Cancel</button>
          <button id="btn-ch-save" class="ix-btn-primary">Create</button>
        </div>
      `;
      document.getElementById("btn-ch-cancel").addEventListener("click", () => modal.classList.remove("open"));
      document.getElementById("btn-ch-save").addEventListener("click", async () => {
        const name = document.getElementById("ix-ch-name").value.trim();
        const desc = document.getElementById("ix-ch-desc").value.trim();
        if (!name || !activeUser) return;
        await addDoc(collection(db, "channels"), {
          name,
          desc: desc || "Official IxChat Channel",
          ownerId: activeUser.uid,
          followers: [activeUser.uid],
          createdAt: serverTimestamp()
        });
        modal.classList.remove("open");
      });
      modal.classList.add("open");
    });
  }

  onSnapshot(collection(db, "channels"), (snap) => {
    chContainer.innerHTML = "";
    snap.forEach((docSnap) => {
      const ch = docSnap.data();
      const isFollowing = ch.followers && activeUser && ch.followers.includes(activeUser.uid);

      const item = document.createElement("div");
      item.className = "ix-channel-item";
      item.innerHTML = `
        <div class="ix-channel-left">
          <div class="ix-avatar" style="width:46px; height:46px; background:var(--ix-pill-active); color:var(--ix-primary);">📢</div>
          <div>
            <div style="font-weight:600; font-size:15px;">${escapeText(ch.name)}</div>
            <div style="font-size:12px; color:var(--ix-text-secondary);">${ch.followers ? ch.followers.length : 1} followers</div>
          </div>
        </div>
        <button class="ix-btn-follow ${isFollowing ? 'following' : ''}">${isFollowing ? 'Following' : 'Follow'}</button>
      `;

      item.querySelector("button").addEventListener("click", async () => {
        if (!activeUser) return;
        await updateDoc(doc(db, "channels", docSnap.id), {
          followers: arrayUnion(activeUser.uid)
        });
      });

      chContainer.appendChild(item);
    });
  });
}

function escapeText(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
