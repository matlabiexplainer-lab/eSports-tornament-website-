// Google Firebase Project Configuration
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

// 1. DYNAMIC TOURNAMENT GENERATOR (9 AM to 9 PM, every 30 mins)
function getDynamicTournaments() {
    const tournaments = [];
    const modes = ["Solo", "Duo", "Squad"];
    const maps = ["Bermuda Classic", "Erangel Classic"];
    
    let currentId = 1;
    
    // Subah 9 baje se raat 9 baje tak loops (Total 24 slots of 30 mins each)
    for (let hour = 9; hour <= 21; hour++) {
        for (let mins of ["00", "30"]) {
            if (hour === 21 && mins === "30") break; // Raat 9:00 baje aakhiri match setup hai
            
            let displayHour = hour > 12 ? hour - 12 : hour;
            let ampm = hour >= 12 ? "PM" : "AM";
            let matchTime = `${displayHour}:${mins} ${ampm}`;
            
            // Alternating modes and setups logically
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
                maxSlots: currentMode === "Solo" ? 50 : (currentMode === "Duo" ? 50 : 25) // 25 Teams for squad
            });
            currentId++;
        }
    }
    return tournaments;
}

// Session Monitor
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
            alert("Registered successfully! Wallet: 0 Coins.");
        } else {
            await auth.signInWithEmailAndPassword(dynamicEmail, pass);
        }
        closeAuthModal();
    } catch (err) { alert("Error: " + err.message); }
});

function logoutUser() { auth.signOut().then(() => location.reload()); }
function checkAuthAndSelect(gameName) {
    if (!auth.currentUser) { alert("Please Login first!"); openAuthModal(); return; }
    selectGame(gameName);
}

function showSection(sectionId) {
    document.querySelectorAll('.interface-section').forEach(s => s.classList.remove('active'));
    const targeted = document.getElementById(sectionId);
    if(targeted) targeted.classList.add('active');
}

// 2. RENDER MATCHES & REAL-TIME JOINED COUNTERS
function selectGame(gameName) {
    currentSelection.game = gameName;
    document.getElementById('selected-game-title').innerText = `${gameName} - Live Schedule`;
    const container = document.getElementById('tournaments-container');
    if(!container) return;
    container.innerHTML = "";
    
    const activeMatches = getDynamicTournaments();
    const mapName = gameName === "Free Fire MAX" ? "Bermuda Classic" : "Erangel Classic";
    
    activeMatches.forEach(t => {
        const uniqueMatchKey = `${gameName.replace(/\s+/g, '')}_${t.id}`;
        const card = document.createElement('div');
        card.className = "t-card";
        card.style.cursor = "pointer";
        
        // Real-time counter fetch from Firestore
        db.collection('tournaments').doc(uniqueMatchKey).onSnapshot((doc) => {
            let joinedCount = 0;
            if(doc.exists && doc.data().players) {
                joinedCount = doc.data().players.length;
            }
            
            card.innerHTML = `
                <div class="t-info" onclick="toggleDetailsBox('${t.id}')">
                    <h3>⏰ Time: ${t.time} (${t.mode})</h3>
                    <p style="font-size:12px; color:#aaa; margin:4px 0;">🗺️ Map: ${mapName} | Click for Rewards Breakdown</p>
                    <div class="t-details">
                        <span>🪙 Entry: ${t.fee} Coins</span>
                        <span style="color:#66fcf1;">👥 Joined: ${joinedCount}/${t.maxSlots}</span>
                    </div>
                    <!-- REWARDS HIDDEN BREAKDOWN PANEL -->
                    <div id="details-${t.id}" class="hidden" style="background:#111; padding:10px; border-radius:4px; margin-top:10px; border-left:3px solid #ff4655; text-align:left;">
                        <p style="margin:2px 0; font-size:13px;">🎯 Booyah/Chicken Dinner: <strong>${t.rewards.winner}</strong></p>
                        <p style="margin:2px 0; font-size:13px;">🎖️ Top 10 Finishers: <strong>${t.rewards.top10}</strong></p>
                        <p style="margin:2px 0; font-size:13px;">💀 Per Kill Reward: <strong>${t.rewards.perKill}</strong></p>
                    </div>
                </div>
                <button class="join-btn" onclick="processParticipation('${uniqueMatchKey}', ${t.fee}, '${t.time} ${t.mode}')">Join Match</button>
            `;
        });
        
        container.appendChild(card);
    });
    showSection('tournament-view');
}

function toggleDetailsBox(id) {
    const el = document.getElementById(`details-${id}`);
    if(el) el.classList.toggle('hidden');
}

// 3. SECURE JOINING ENGINE WITH FIREBASE ARRAYS
async function processParticipation(uniqueMatchKey, tFee, matchInfo) {
    if (!currentUserData) return;
    if (currentUserData.coins < tFee) { showSection('wallet-topup'); return; }

    const userUID = auth.currentUser.uid;
    const userMobile = currentUserData.mobile;
    const newBalance = currentUserData.coins - tFee;

    try {
        // Atomic push player into the match array registry
        await db.collection('tournaments').doc(uniqueMatchKey).set({
            players: firebase.firestore.FieldValue.arrayUnion({ uid: userUID, mobile: userMobile })
        }, { merge: true });

        // Debit User Balance
        await db.collection('users').doc(userUID).update({ coins: newBalance });
        
        // Backup Logs to Formspree
        await fetch(FORMSPREE_URL, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ Status: "MATCH_JOINED", Mobile: userMobile, Details: matchInfo, MatchKey: uniqueMatchKey })
        });

        showSection('success-screen');
    } catch (err) { alert("Error joining tournament: " + err.message); }
}
