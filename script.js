// Google Firebase Project Configuration (Live Connected Keys)
const firebaseConfig = {
    apiKey: "AIzaSyB-C7Ks_lXWWf1RMKUQ8cPuhov5y7ZveXM",
    authDomain: "sk-esports-90bf9.firebaseapp.com",
    projectId: "sk-esports-90bf9",
    storageBucket: "sk-esports-90bf9.firebasestorage.app",
    messagingSenderId: "471222264434",
    appId: "1:471222264434:web:b54a25264d5b2ae70a58eb",
    measurementId: "G-KW6J0GE4TF"
};

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

// 1. DYNAMIC TOURNAMENT SCHEDULER (9:00 AM to 9:00 PM, Every 30 minutes)
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

// Tab Switching System Layout handler
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

// User Session State Monitor
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

function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? "Signup to SK eSports" : "Login to SK eSports";
    document.getElementById('authSubmitBtn').innerText = isSignUpMode ? "Register Account" : "Login";
}

document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputVal = document.getElementById('authIdentifier').value.trim();
    const pass = document.getElementById('authPassword').value;
    const dynamicEmail = inputVal.includes('@') ? inputVal : `${inputVal}@skesports.com`;

    try {
        if (isSignUpMode) {
            const cred = await auth.createUserWithEmailAndPassword(dynamicEmail, pass);
            await db.collection('users').doc(cred.user.uid).set({ mobile: inputVal, coins: 0 });
            alert("Registered successfully! Default: 0 Coins.");
        } else {
            await auth.signInWithEmailAndPassword(dynamicEmail, pass);
        }
        closeAuthModal();
    } catch (err) { alert("Authentication Error: " + err.message); }
});

function logoutUser() { auth.signOut().then(() => location.reload()); }
function checkAuthAndSelect(gameName) {
    if (!auth.currentUser) { alert("Please Login/Signup to explore matches!"); openAuthModal(); return; }
    selectGame(gameName);
}

function showSection(sectionId) {
    document.querySelectorAll('.interface-section').forEach(s => s.classList.remove('active'));
    const targeted = document.getElementById(sectionId);
    if(targeted) targeted.classList.add('active');
}

// 2. RENDER MATCH CARDS WITH LIVE TIMER & LIVE FIREBASE USER COUNT
function selectGame(gameName) {
    currentSelection.game = gameName;
    document.getElementById('selected-game-title').innerText = `${gameName}`;
    const container = document.getElementById('tournaments-container');
    if(!container) return;
    container.innerHTML = "";
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    const activeMatches = getDynamicTournaments();
    const mapName = gameName === "Free Fire MAX" ? "Bermuda Classic" : "Erangel Classic";

    activeMatches.forEach(t => {
        const parts = t.id.split('_');
        const matchHour = parseInt(parts[1]);
        const matchMin = parseInt(parts[2]);
        
        let status = "upcoming"; 
        
        if (matchHour < currentHour || (matchHour === currentHour && matchMin + 30 <= currentMin)) {
            status = "past";
        } else if (matchHour === currentHour && currentMin >= matchMin && currentMin < matchMin + 30) {
            status = "live";
        }

        const uniqueMatchKey = `${gameName.replace(/\s+/g, '')}_${t.id}`;
        
        db.collection('tournaments').doc(uniqueMatchKey).onSnapshot((doc) => {
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

            if (!shouldRender) {
                const existingCard = document.getElementById(`card_${uniqueMatchKey}`);
                if(existingCard) existingCard.remove();
                return;
            }

            let actionButton = "";
            if (status === "past") {
                actionButton = `<button class="join-btn" style="background:#444; color:#888;" disabled>Match Ended</button>`;
            } else if (status === "live") {
                actionButton = `<button class="join-btn" style="background:#e74c3c; animation: pulse 1.5s infinite;" disabled>🔴 Live Now</button>`;
            } else if (isUserJoined) {
                actionButton = `<button class="join-btn" style="background:#2ecc71; color:#fff;" disabled>Joined ✓</button>`;
            } else {
                actionButton = `<button class="join-btn" onclick="processParticipation('${uniqueMatchKey}', ${t.fee}, '${t.time} ${t.mode}')">Join Match</button>`;
            }

            const cardId = `card_${uniqueMatchKey}`;
            let card = document.getElementById(cardId);
            if(!card) {
                card = document.createElement('div');
                card.id = cardId;
                card.className = "t-card";
                container.appendChild(card);
            }

            card.innerHTML = `
                <div class="t-info" onclick="toggleDetailsBox('${t.id}')">
                    <h3>⏰ Time: ${t.time} (${t.mode})</h3>
                    <p style="font-size:12px; color:#aaa; margin:4px 0;">🗺️ Map: ${mapName} | Tap to view prize details</p>
                    <div class="t-details">
                        <span>🪙 Entry: ${t.fee} Coins</span>
                        <span style="color:#66fcf1; font-weight:bold;">👥 Registered: ${joinedCount}/${t.maxSlots}</span>
                    </div>
                    <div id="details-${t.id}" class="hidden" style="background:#0d1117; padding:12px; border-radius:6px; margin-top:10px; border-left:3px solid #ff4655; text-align:left;">
                        <p style="margin:4px 0; font-size:13px; color:#fff;">🎯 1st Rank (Winner): <strong style="color:#2ecc71;">${t.rewards.winner}</strong></p>
                        <p style="margin:4px 0; font-size:13px; color:#fff;">🎖️ Top 10 Finishers: <strong style="color:#f1c40f;">${t.rewards.top10}</strong></p>
                        <p style="margin:4px 0; font-size:13px; color:#fff;">💀 Per Kill Reward: <strong style="color:#e74c3c;">${t.rewards.perKill}</strong></p>
                    </div>
                </div>
                ${actionButton}
            `;
        });
    });
}

function toggleDetailsBox(id) {
    const el = document.getElementById(`details-${id}`);
    if(el) el.classList.toggle('hidden');
}

// 3. TRANSACTION ENGINE: ATOMIC REGISTRATION AND DEDUCTIONS
async function processParticipation(uniqueMatchKey, tFee, matchInfo) {
    if (!currentUserData) return;
    if (currentUserData.coins < tFee) { showSection('wallet-topup'); return; }

    const userUID = auth.currentUser.uid;
    const userMobile = currentUserData.mobile;
    const newBalance = currentUserData.coins - tFee;

    try {
        await db.collection('tournaments').doc(uniqueMatchKey).set({
            players: firebase.firestore.FieldValue.arrayUnion({ uid: userUID, mobile: userMobile })
        }, { merge: true });

        await db.collection('users').doc(userUID).update({ coins: newBalance });
        
        await fetch(FORMSPREE_URL, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ Status: "REGISTRATION_LOCKED", Game: currentSelection.game, Mobile: userMobile, Match: matchInfo })
        });

        showSection('success-screen');
    } catch (err) { alert("Error: " + err.message); }
}
