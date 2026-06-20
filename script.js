// Firebase Live Global Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB-C7Ks_lXWWf1RMKUQ8cPuhov5y7ZveXM",
    authDomain: "sk-esports-90bf9.firebaseapp.com",
    projectId: "sk-esports-90bf9",
    storageBucket: "sk-esports-90bf9.firebasestorage.app",
    messagingSenderId: "471222264434",
    appId: "1:471222264434:web:b54a25264d5b2ae70a58eb",
    measurementId: "G-KW6J0GE4TF"
};

// Safe Initialization
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
const FORMSPREE_URL = 'https://formspree.io/f/xnjyelpq'; 

let currentSelection = { game: "", tournamentId: "", fee: 0, title: "" };
let currentUserData = null;
let isSignUpMode = false;
let currentActiveTab = "upcoming";

// 1. STABLE TIME SCHEDULER ENGINE (9:00 AM to 9:00 PM)
function getDynamicTournaments() {
    const tournaments = [];
    const modes = ["Solo", "Duo", "Squad"];
    let currentId = 1;
    
    for (let hour = 9; hour <= 21; hour++) {
        for (let mins of ["00", "30"]) {
            if (hour === 21 && mins === "30") break;
            
            let displayHour = hour > 12 ? hour - 12 : hour;
            let ampm = hour >= 12 ? "PM" : "AM";
            let matchTime = `${displayHour}:${mins} ${ampm}`;
            
            let modeIndex = currentId % 3;
            let currentMode = modes[modeIndex];
            
            tournaments.push({
                id: `match_${hour}_${mins}`,
                time: matchTime,
                hour24: hour,
                minNum: parseInt(mins),
                mode: currentMode,
                fee: currentMode === "Solo" ? 10 : (currentMode === "Duo" ? 20 : 40),
                rewards: {
                    perKill: currentMode === "Solo" ? "🪙 5 Coins" : "🪙 3 Coins",
                    top10: currentMode === "Solo" ? "🪙 20 Coins" : "🪙 40 Coins",
                    winner: currentMode === "Solo" ? "🪙 100 Coins" : (currentMode === "Duo" ? "🪙 200 Coins" : "🪙 400 Coins")
                },
                maxSlots: currentMode === "Solo" ? 50 : (currentMode === "Duo" ? 50 : 25)
            });
            currentId++;
        }
    }
    return tournaments;
}

// Real-time Auth Tracker
auth.onAuthStateChanged(async (user) => {
    const loginBtn = document.getElementById('loginNavBtn');
    const profileHeader = document.getElementById('userProfileHeader');
    if (user) {
        if(loginBtn) loginBtn.classList.add('hidden');
        if(profileHeader) profileHeader.classList.remove('hidden');
        db.collection('users').doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                currentUserData = doc.data();
                const coinEl = document.getElementById('user-coins');
                if(coinEl) coinEl.innerText = currentUserData.coins;
            }
        });
    } else {
        if(loginBtn) loginBtn.classList.remove('hidden');
        if(profileHeader) profileHeader.classList.add('hidden');
        currentUserData = null;
    }
});

// Category Tabs UI Switcher
function switchMatchTab(tabName) {
    currentActiveTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.background = 'none';
        btn.style.color = '#aaa';
    });
    const activeBtn = document.getElementById(`tab-${tabName}`);
    if(activeBtn) {
        activeBtn.style.background = '#ff4655';
        activeBtn.style.color = '#fff';
    }
    if(currentSelection.game) {
        selectGame(currentSelection.game);
    }
}

// 2. RENDER ENGINE WITH CRASH PROTECTION
function selectGame(gameName) {
    currentSelection.game = gameName;
    document.getElementById('selected-game-title').innerText = gameName;
    const container = document.getElementById('tournaments-container');
    if(!container) return;
    container.innerHTML = "";
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    const activeMatches = getDynamicTournaments();
    const mapName = gameName === "Free Fire MAX" ? "Bermuda Classic" : "Erangel Classic";

    activeMatches.forEach(t => {
        let status = "upcoming"; 
        if (t.hour24 < currentHour || (t.hour24 === currentHour && t.minNum + 30 <= currentMin)) {
            status = "past";
        } else if (t.hour24 === currentHour && currentMin >= t.minNum && currentMin < t.minNum + 30) {
            status = "live";
        }

        const uniqueMatchKey = `${gameName.replace(/\s+/g, '')}_${t.id}`;
        
        db.collection('tournaments').doc(uniqueMatchKey).get().then((doc) => {
            let joinedCount = 0;
            let isUserJoined = false;
            
            if(doc.exists && doc.data().players) {
                const plist = doc.data().players;
                joinedCount = plist.length;
                if(auth.currentUser) {
                    isUserJoined = plist.some(p => p.uid === auth.currentUser.uid);
                }
            }
            
            let shouldRender = false;
            if (currentActiveTab === status) {
                shouldRender = true;
            } else if (currentActiveTab === "my_joined" && isUserJoined) {
                shouldRender = true;
            }

            if (!shouldRender) return;

            let actionButton = "";
            if (status === "past") {
                actionButton = `<button class="join-btn" style="background:#333; color:#777;" disabled>Match Ended</button>`;
            } else if (status === "live") {
                actionButton = `<button class="join-btn" style="background:#e74c3c;" disabled>🔴 Live Match</button>`;
            } else if (isUserJoined) {
                actionButton = `<button class="join-btn" style="background:#2ecc71;" disabled>Joined ✓</button>`;
            } else {
                actionButton = `<button class="join-btn" onclick="processParticipation('${uniqueMatchKey}', ${t.fee}, '${t.time} ${t.mode}')">Join Match</button>`;
            }

            const card = document.createElement('div');
            card.className = "t-card";
            card.innerHTML = `
                <div class="t-info" onclick="toggleDetailsBox('${t.id}')">
                    <h3>⏰ Time: ${t.time} (${t.mode})</h3>
                    <p style="font-size:12px; color:#aaa; margin:4px 0;">🗺️ Map: ${mapName} | Click for Rewards List</p>
                    <div class="t-details">
                        <span>🪙 Entry: ${t.fee} Coins</span>
                        <span style="color:#66fcf1;">👥 Joined: ${joinedCount}/${t.maxSlots}</span>
                    </div>
                    <div id="details-${t.id}" class="hidden" style="background:#0d1117; padding:10px; border-radius:6px; margin-top:10px; border-left:3px solid #ff4655;">
                        <p style="margin:4px 0; font-size:13px;">🎯 Winner/Booyah: <strong>${t.rewards.winner}</strong></p>
                        <p style="margin:4px 0; font-size:13px;">🎖️ Top 10 Finisher: <strong>${t.rewards.top10}</strong></p>
                        <p style="margin:4px 0; font-size:13px;">💀 Per Kill Reward: <strong>${t.rewards.perKill}</strong></p>
                    </div>
                </div>
                ${actionButton}
            `;
            container.appendChild(card);
        }).catch(err => console.log("Fetch clear"));
    });
    showSection('tournament-view');
}

function toggleDetailsBox(id) {
    const el = document.getElementById(`details-${id}`);
    if(el) el.classList.toggle('hidden');
}

// 3. SECURE TRANSACTION ENGINE: ASKS FOR GAME UID & NAME
async function processParticipation(uniqueMatchKey, tFee, matchInfo) {
    if (!currentUserData) return;
    
    // Check Coins first
    if (currentUserData.coins < tFee) { 
        showSection('wallet-topup'); 
        return; 
    }

    // Ask for In-Game Name (IGN)
    const gameNameInput = prompt("Apna In-Game Name (IGN) enter karein:");
    if (!gameNameInput || gameNameInput.trim() === "") {
        alert("Registration cancelled! Game name zaroori hai.");
        return;
    }

    // Ask for Game Character UID
    const gameUidInput = prompt("Apni Game Character UID enter karein:");
    if (!gameUidInput || gameUidInput.trim() === "") {
        alert("Registration cancelled! Game UID zaroori hai.");
        return;
    }

    const userUID = auth.currentUser.uid;
    const userMobile = currentUserData.mobile;
    const newBalance = currentUserData.coins - tFee;

    try {
        // Save Player Details inside Firestore Tournament Collection
        await db.collection('tournaments').doc(uniqueMatchKey).set({
            players: firebase.firestore.FieldValue.arrayUnion({ 
                uid: userUID, 
                mobile: userMobile,
                gameName: gameNameInput.trim(),
                gameUID: gameUidInput.trim()
            })
        }, { merge: true });

        // Deduct Coins from User Balance
        await db.collection('users').doc(userUID).update({ coins: newBalance });
        
        // Send Backup Notification Log to Formspree
        await fetch(FORMSPREE_URL, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                Status: "MATCH_JOINED",
                Mobile: userMobile, 
                Match: matchInfo,
                GamePlayerName: gameNameInput.trim(),
                GameUID: gameUidInput.trim(),
                CoinsDeducted: tFee
            })
        });

        showSection('success-screen');
    } catch (err) { 
        alert("Error: " + err.message); 
    }
}

// Authentication Logic
document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputVal = document.getElementById('authIdentifier').value.trim();
    const pass = document.getElementById('authPassword').value;
    const dynamicEmail = inputVal.includes('@') ? inputVal : `${inputVal}@skesports.com`;

    try {
        if (isSignUpMode) {
            const cred = await auth.createUserWithEmailAndPassword(dynamicEmail, pass);
            await db.collection('users').doc(cred.user.uid).set({ mobile: inputVal, coins: 0 });
            alert("Registered! Wallet: 0 Coins.");
        } else {
            await auth.signInWithEmailAndPassword(dynamicEmail, pass);
        }
        closeAuthModal();
    } catch (err) { alert(err.message); }
});

function logoutUser() { auth.signOut().then(() => location.reload()); }
function checkAuthAndSelect(gameName) {
    if (!auth.currentUser) { openAuthModal(); return; }
    selectGame(gameName);
}
function showSection(sectionId) {
    document.querySelectorAll('.interface-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
}
