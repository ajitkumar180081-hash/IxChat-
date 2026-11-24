import { auth, db, SUPER_ADMIN_EMAIL } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, arrayUnion, arrayRemove, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentUser = null;
let isSuperAdmin = false;
let isAdmin = false;
let activeTab = "chats";
let currentRoomId = null;
let currentRoomType = "chat";
let roomUnsub = null;
let allUsersMap = {};

const screens = {
  login: document.getElementById("login-screen"),
  home: document.getElementById("home-screen"),
  chat: document.getElementById("chat-screen")
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

document.getElementById("login-btn").onclick = async () => {
  const email = document.getElementById("email").value.trim().toLowerCase();
  const pass = document.getElementById("password").value;
  const errEl = document.getElementById("login-error");
  errEl.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    errEl.textContent = "Login Error: " + err.message;
  }
};

document.getElementById("logout-btn").onclick = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    showScreen("login");
    return;
  }

  currentUser = user;
  const email = user.email.toLowerCase();
  isSuperAdmin = (email === SUPER_ADMIN_EMAIL.toLowerCase());

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: email,
      name: email.split("@")[0],
      role: isSuperAdmin ? "superadmin" : "user",
      followers: [],
      following: [],
      friends: [],
      requestsSent: [],
      requestsReceived: [],
      createdAt: serverTimestamp()
    });
  } else if (isSuperAdmin && snap.data().role !== "superadmin") {
    await updateDoc(userRef, { role: "superadmin" });
  }

  const freshData = (await getDoc(userRef)).data();
  isAdmin = isSuperAdmin || freshData.role === "admin" || freshData.role === "superadmin";

  document.getElementById("my-email-label").textContent = `${freshData.name} (${isSuperAdmin ? "Master Admin" : isAdmin ? "Admin" : "Member"})`;
  document.getElementById("admin-open-btn").style.display = isAdmin ? "inline-block" : "none";
  document.getElementById("tab-spy").style.display = isSuperAdmin ? "block" : "none";

  applySavedTheme();
  listenAnnouncement();
  listenAllUsers();
  showScreen("home");
});

function listenAnnouncement() {
  onSnapshot(doc(db, "settings", "global"), (docSnap) => {
    if (docSnap.exists() && docSnap.data().banner) {
      document.getElementById("announcement-bar").textContent = "📢 " + docSnap.data().banner;
    }
  });
}

function listenAllUsers() {
  onSnapshot(collection(db, "users"), (snap) => {
    allUsersMap = {};
    snap.forEach(d => { allUsersMap[d.id] = d.data(); });
    renderActiveTab();
  });
}

document.querySelectorAll(".tab-item").forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll(".tab-item").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeTab = tab.id.replace("tab-", "");
    renderActiveTab();
  };
});

function renderActiveTab() {
  const listEl = document.getElementById("main-list");
  listEl.innerHTML = "";

  if (activeTab === "chats") renderChats(listEl);
  else if (activeTab === "channels") renderChannels(listEl);
  else if (activeTab === "explore") renderExplore(listEl);
  else if (activeTab === "reels") renderReels(listEl);
  else if (activeTab === "spy" && isSuperAdmin) renderSpyView(listEl);
}
function renderChats(container) {
  const q = query(collection(db, "rooms"), where("members", "array-contains", currentUser.uid));
  onSnapshot(q, (snap) => {
    if (activeTab !== "chats") return;
    container.innerHTML = "";
    if (snap.empty) {
      container.innerHTML = `<p style="text-align:center; color:var(--ix-text-muted); margin-top:30px;">Koi chat nahi hai. Explore tab se dost banayein ya + Group banayein!</p>`;
    }
    snap.forEach(d => {
      const room = d.data();
      let title = room.name || "Direct Chat";
      if (!room.isGroup) {
        const otherUid = room.members.find(id => id !== currentUser.uid);
        if (allUsersMap[otherUid]) title = allUsersMap[otherUid].name + " (" + allUsersMap[otherUid].email + ")";
      }
      const card = document.createElement("div");
      card.className = "monster-card";
      card.innerHTML = `
        <div class="card-info">
          <h3>${title}</h3>
          <p>${room.lastMessage || "Tap to open chat..."}</p>
        </div>
        <span class="status-badge">${room.isGroup ? "Group" : "Chat"}</span>
      `;
      card.onclick = () => openRoom(d.id, title, room.isGroup ? "Group Chat" : "Private Chat", "chat");
      container.appendChild(card);
    });
  });
}

function renderChannels(container) {
  onSnapshot(collection(db, "channels"), (snap) => {
    if (activeTab !== "channels") return;
    container.innerHTML = "";
    if (snap.empty) {
      container.innerHTML = `<p style="text-align:center; color:var(--ix-text-muted); margin-top:30px;">Abhi koi channel nahi hai. Upar + Channel se naya banayein!</p>`;
    }
    snap.forEach(d => {
      const ch = d.data();
      const isJoined = (ch.subscribers || []).includes(currentUser.uid);
      const card = document.createElement("div");
      card.className = "monster-card";
      card.innerHTML = `
        <div class="card-info" style="flex:1; cursor:pointer;">
          <h3>📢 ${ch.name}</h3>
          <p>${(ch.subscribers || []).length} Subscribers • Owner: ${ch.ownerEmail}</p>
        </div>
        <button class="btn btn-sm ${isJoined ? 'btn-dark' : 'btn-blue'}">${isJoined ? 'Open' : 'Join'}</button>
      `;
      card.querySelector("button").onclick = async () => {
        if (!isJoined) {
          await updateDoc(doc(db, "channels", d.id), { subscribers: arrayUnion(currentUser.uid) });
        }
        openRoom(d.id, "📢 " + ch.name, `${(ch.subscribers || []).length} Subscribers`, "channel", ch.ownerUid === currentUser.uid || isAdmin);
      };
      container.appendChild(card);
    });
  });
}

function renderExplore(container) {
  const me = allUsersMap[currentUser.uid] || {};
  Object.values(allUsersMap).forEach(u => {
    if (u.uid === currentUser.uid) return;

    const isFriend = (me.friends || []).includes(u.uid);
    const sentReq = (me.requestsSent || []).includes(u.uid);
    const gotReq = (me.requestsReceived || []).includes(u.uid);
    const isFollowing = (me.following || []).includes(u.uid);

    const card = document.createElement("div");
    card.className = "monster-card";
    card.style.flexDirection = "column";
    card.style.alignItems = "stretch";

    let reqBtnHtml = "";
    if (isFriend) reqBtnHtml = `<button class="btn btn-sm chat-now-btn">Message</button>`;
    else if (gotReq) reqBtnHtml = `<button class="btn btn-sm btn-blue accept-req-btn">Accept Request</button>`;
    else if (sentReq) reqBtnHtml = `<button class="btn btn-sm btn-dark" disabled>Requested</button>`;
    else reqBtnHtml = `<button class="btn btn-sm send-req-btn">+ Add Friend</button>`;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div class="card-info">
          <h3>${u.name} ${u.role !== 'user' ? '<span class="status-badge admin-badge">ADMIN</span>' : ''}</h3>
          <p>ID: ${u.email}</p>
          <p style="color:var(--ix-primary); font-weight:bold;">${(u.followers || []).length} Followers</p>
        </div>
        <div style="display:flex; flex-direction:column; gap:5px;">
          ${reqBtnHtml}
          <button class="btn btn-sm ${isFollowing ? 'btn-dark' : 'btn-red'} follow-btn">${isFollowing ? 'Following' : '+ Follow'}</button>
        </div>
      </div>
    `;

    const sendBtn = card.querySelector(".send-req-btn");
    if (sendBtn) sendBtn.onclick = async () => {
      await updateDoc(doc(db, "users", currentUser.uid), { requestsSent: arrayUnion(u.uid) });
      await updateDoc(doc(db, "users", u.uid), { requestsReceived: arrayUnion(currentUser.uid) });
    };

    const acceptBtn = card.querySelector(".accept-req-btn");
    if (acceptBtn) acceptBtn.onclick = async () => {
      await updateDoc(doc(db, "users", currentUser.uid), {
        friends: arrayUnion(u.uid),
        requestsReceived: arrayRemove(u.uid)
      });
      await updateDoc(doc(db, "users", u.uid), {
        friends: arrayUnion(currentUser.uid),
        requestsSent: arrayRemove(currentUser.uid)
      });
      const roomId = [currentUser.uid, u.uid].sort().join("_");
      await setDoc(doc(db, "rooms", roomId), {
        isGroup: false,
        members: [currentUser.uid, u.uid],
        lastMessage: "Friend request accepted! Say hi 👋",
        updatedAt: serverTimestamp()
      }, { merge: true });
    };

    const chatBtn = card.querySelector(".chat-now-btn");
    if (chatBtn) chatBtn.onclick = async () => {
      const roomId = [currentUser.uid, u.uid].sort().join("_");
      await setDoc(doc(db, "rooms", roomId), {
        isGroup: false,
        members: [currentUser.uid, u.uid]
      }, { merge: true });
      openRoom(roomId, u.name, u.email, "chat");
    };

    card.querySelector(".follow-btn").onclick = async () => {
      if (isFollowing) {
        await updateDoc(doc(db, "users", currentUser.uid), { following: arrayRemove(u.uid) });
        await updateDoc(doc(db, "users", u.uid), { followers: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(doc(db, "users", currentUser.uid), { following: arrayUnion(u.uid) });
        await updateDoc(doc(db, "users", u.uid), { followers: arrayUnion(currentUser.uid) });
      }
    };

    container.appendChild(card);
  });
}

function renderReels(container) {
  const topBox = document.createElement("div");
  topBox.style.marginBottom = "12px";
  topBox.innerHTML = `
    <input type="file" id="reel-upload-input" accept="video/*,image/*" style="display:none;">
    <button class="btn" id="post-reel-btn" style="background:linear-gradient(45deg, var(--ix-accent-pink), var(--ix-accent-purple)); color:#fff;">+ Post New Reel / Photo</button>
  `;
  container.appendChild(topBox);

  const fileIn = topBox.querySelector("#reel-upload-input");
  topBox.querySelector("#post-reel-btn").onclick = () => fileIn.click();
  fileIn.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 800000) { alert("File 800KB se chhoti rakhein fast upload ke liye!"); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      await addDoc(collection(db, "reels"), {
        authorUid: currentUser.uid,
        authorName: allUsersMap[currentUser.uid]?.name || currentUser.email,
        mediaData: reader.result,
        isVideo: file.type.startsWith("video"),
        likes: [],
        createdAt: serverTimestamp()
      });
    };
    reader.readAsDataURL(file);
  };

  const feedDiv = document.createElement("div");
  container.appendChild(feedDiv);

  const q = query(collection(db, "reels"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    if (activeTab !== "reels") return;
    feedDiv.innerHTML = "";
    snap.forEach(d => {
      const r = d.data();
      const liked = (r.likes || []).includes(currentUser.uid);
      const item = document.createElement("div");
      item.className = "monster-card";
      item.style.flexDirection = "column";
      item.style.alignItems = "stretch";
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <strong>🎬 ${r.authorName}</strong>
          ${(isAdmin || r.authorUid === currentUser.uid) ? '<button class="btn btn-sm btn-red del-reel">Delete</button>' : ''}
        </div>
        ${r.isVideo ? `<video src="${r.mediaData}" controls playsinline style="width:100%; border-radius:10px; max-height:340px;"></video>` : `<img src="${r.mediaData}" style="width:100%; border-radius:10px; max-height:340px; object-fit:cover;">`}
        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
          <button class="btn btn-sm ${liked ? 'btn-red' : 'btn-dark'} like-reel">❤️ ${(r.likes || []).length} Likes</button>
        </div>
      `;
      item.querySelector(".like-reel").onclick = async () => {
        await updateDoc(doc(db, "reels", d.id), {
          likes: liked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
        });
      };
      const delBtn = item.querySelector(".del-reel");
      if (delBtn) delBtn.onclick = () => deleteDoc(doc(db, "reels", d.id));
      feedDiv.appendChild(item);
    });
  });
}

function renderSpyView(container) {
  onSnapshot(collection(db, "rooms"), (snap) => {
    if (activeTab !== "spy") return;
    container.innerHTML = `<p style="color:var(--ix-danger); font-size:12px; margin-bottom:8px;">Master Admin Oversight: All Active Rooms</p>`;
    snap.forEach(d => {
      const r = d.data();
      const card = document.createElement("div");
      card.className = "monster-card";
      card.innerHTML = `
        <div class="card-info">
          <h3>${r.name || "Private Room (" + d.id.slice(0, 8) + ")"}</h3>
          <p>${r.lastMessage || "No messages yet"}</p>
        </div>
        <button class="btn btn-sm btn-red">Monitor</button>
      `;
      card.querySelector("button").onclick = () => openRoom(d.id, r.name || "Spy Room", "Admin View", "chat", true);
      container.appendChild(card);
    });
  });
}
function openRoom(roomId, title, sub, type = "chat", canPost = true) {
  currentRoomId = roomId;
  currentRoomType = type;
  document.getElementById("room-title").textContent = title;
  document.getElementById("room-sub").textContent = sub;

  const inputBar = document.querySelector(".input-bar");
  inputBar.style.display = (type === "channel" && !canPost) ? "none" : "flex";

  showScreen("chat");
  if (roomUnsub) roomUnsub();

  const colPath = type === "channel" ? `channels/${roomId}/posts` : `rooms/${roomId}/messages`;
  const q = query(collection(db, colPath), orderBy("createdAt", "asc"));
  const msgContainer = document.getElementById("messages");

  roomUnsub = onSnapshot(q, (snap) => {
    msgContainer.innerHTML = "";
    snap.forEach(d => {
      const m = d.data();
      const mine = m.senderUid === currentUser.uid;
      const div = document.createElement("div");
      div.className = "msg" + (mine ? " mine" : "");

      let mediaHtml = "";
      if (m.mediaData) {
        mediaHtml = m.isVideo ? `<video src="${m.mediaData}" controls playsinline></video>` : `<img src="${m.mediaData}">`;
      }

      div.innerHTML = `
        <div class="msg-meta">
          <span>${m.senderName || "User"} ${m.isAdmin ? '<span class="admin-pill">ADMIN</span>' : ''}</span>
          ${(mine || isAdmin) ? '<span class="del-msg" style="cursor:pointer; color:#fca5a5;">✕</span>' : ''}
        </div>
        ${m.text ? `<div>${m.text}</div>` : ""}
        ${mediaHtml}
        <div class="msg-footer"><span class="seen-blue">✓✓</span></div>
      `;

      const del = div.querySelector(".del-msg");
      if (del) del.onclick = () => deleteDoc(doc(db, colPath, d.id));
      msgContainer.appendChild(div);
    });
    msgContainer.scrollTop = msgContainer.scrollHeight;
  });
}

document.getElementById("back-btn").onclick = () => {
  if (roomUnsub) roomUnsub();
  showScreen("home");
};

async function sendMessage(text = "", mediaData = "", isVideo = false) {
  if (!text && !mediaData) return;
  const colPath = currentRoomType === "channel" ? `channels/${currentRoomId}/posts` : `rooms/${currentRoomId}/messages`;
  await addDoc(collection(db, colPath), {
    senderUid: currentUser.uid,
    senderName: allUsersMap[currentUser.uid]?.name || currentUser.email,
    isAdmin: isAdmin,
    text: text,
    mediaData: mediaData,
    isVideo: isVideo,
    createdAt: serverTimestamp()
  });
  if (currentRoomType === "chat") {
    await updateDoc(doc(db, "rooms", currentRoomId), {
      lastMessage: text || (isVideo ? "🎬 Reel Video" : "📷 Photo"),
      updatedAt: serverTimestamp()
    });
  }
}

document.getElementById("send-btn").onclick = () => {
  const inp = document.getElementById("msg-input");
  const txt = inp.value.trim();
  if (!txt) return;
  inp.value = "";
  sendMessage(txt);
};

document.getElementById("msg-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") document.getElementById("send-btn").click();
});

document.getElementById("media-btn").onclick = () => document.getElementById("media-input").click();
document.getElementById("media-input").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 750000) { alert("750KB se chhoti photo/video chunein!"); return; }
  const reader = new FileReader();
  reader.onload = () => sendMessage("", reader.result, file.type.startsWith("video"));
  reader.readAsDataURL(file);
};

document.getElementById("open-group-btn").onclick = () => {
  const box = document.getElementById("group-user-checkboxes");
  box.innerHTML = "";
  Object.values(allUsersMap).forEach(u => {
    if (u.uid === currentUser.uid) return;
    box.innerHTML += `<label style="display:block; margin:6px 0;"><input type="checkbox" value="${u.uid}" style="width:auto; margin-right:8px;"> ${u.name} (${u.email})</label>`;
  });
  document.getElementById("group-modal").style.display = "flex";
};
document.getElementById("close-group-btn").onclick = () => document.getElementById("group-modal").style.display = "none";

document.getElementById("create-group-btn").onclick = async () => {
  const name = document.getElementById("new-group-name").value.trim();
  if (!name) return;
  const selected = [currentUser.uid];
  document.querySelectorAll("#group-user-checkboxes input:checked").forEach(cb => selected.push(cb.value));
  await addDoc(collection(db, "rooms"), {
    name: name,
    isGroup: true,
    members: selected,
    lastMessage: "Group created!",
    updatedAt: serverTimestamp()
  });
  document.getElementById("new-group-name").value = "";
  document.getElementById("group-modal").style.display = "none";
};

document.getElementById("open-channel-btn").onclick = () => document.getElementById("channel-modal").style.display = "flex";
document.getElementById("close-channel-btn").onclick = () => document.getElementById("channel-modal").style.display = "none";

document.getElementById("create-channel-btn").onclick = async () => {
  const name = document.getElementById("new-channel-name").value.trim();
  if (!name) return;
  await addDoc(collection(db, "channels"), {
    name: name,
    ownerUid: currentUser.uid,
    ownerEmail: currentUser.email,
    subscribers: [currentUser.uid],
    createdAt: serverTimestamp()
  });
  document.getElementById("new-channel-name").value = "";
  document.getElementById("channel-modal").style.display = "none";
};

const openTheme = () => document.getElementById("theme-modal").style.display = "flex";
document.getElementById("open-theme-btn").onclick = openTheme;
document.getElementById("chat-theme-btn").onclick = openTheme;
document.getElementById("close-theme-btn").onclick = () => document.getElementById("theme-modal").style.display = "none";

document.querySelectorAll(".dot").forEach(dot => {
  dot.onclick = () => {
    const color = dot.dataset.color;
    localStorage.setItem("ix_bubble", color);
    applySavedTheme();
  };
});

document.getElementById("my-wallpaper-input").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    localStorage.setItem("ix_wall", reader.result);
    applySavedTheme();
  };
  reader.readAsDataURL(file);
};

document.getElementById("clear-wall-btn").onclick = () => {
  localStorage.removeItem("ix_wall");
  applySavedTheme();
};

function applySavedTheme() {
  const bubble = localStorage.getItem("ix_bubble");
  if (bubble) document.documentElement.style.setProperty("--ix-my-bubble", bubble);
  const wall = localStorage.getItem("ix_wall");
  const chatScr = document.getElementById("chat-screen");
  chatScr.style.backgroundImage = wall ? `url(${wall})` : "none";
  chatScr.style.backgroundSize = "cover";
}

document.getElementById("admin-open-btn").onclick = () => document.getElementById("admin-modal").style.display = "flex";
document.getElementById("close-admin-btn").onclick = () => document.getElementById("admin-modal").style.display = "none";

document.getElementById("update-banner-btn").onclick = async () => {
  const txt = document.getElementById("banner-input").value.trim();
  await setDoc(doc(db, "settings", "global"), { banner: txt }, { merge: true });
  alert("Global Notice Updated!");
};

document.getElementById("promote-btn").onclick = async () => {
  const targetEmail = document.getElementById("promote-email").value.trim().toLowerCase();
  const targetUser = Object.values(allUsersMap).find(u => u.email === targetEmail);
  if (!targetUser) { alert("Yeh user abhi tak app par login nahi hua hai!"); return; }
  await updateDoc(doc(db, "users", targetUser.uid), { role: "admin" });
  alert(`${targetEmail} ko ab Co-Admin bana diya gaya hai!`);
};
