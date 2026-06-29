// ==========================================================================
// 🛠️ SK ESPORTS OFFICIAL CLIENT ENGINE - PART 1 (CORE CONFIG & AUTH)
// ==========================================================================

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

let currentSelection = { game: "", fee: 0, title: "", currentMatchKey: "", currentMatchInfo: "" };
let currentUserData = null;
let isSignUpMode = false;
let currentActiveTab = "upcoming";

// Real-time collections listeners for instant updates
let databaseGameConfigs = {};
let databaseTournaments = {};

db.collection('gameConfigs').onSnapshot((snapshot) => {
    snapshot.forEach(doc => { databaseGameConfigs[doc.id] = doc.data(); });
    if(currentSelection.game) renderMatchesList();
});

// ⚡ Dynamic single match snapshot connection listener
db.collection('tournaments').onSnapshot((snapshot) => {
    snapshot.forEach(doc => { databaseTournaments[doc.id] = doc.data(); });
    if(currentSelection.game) renderMatchesList();
});

function getDynamicTournaments() {
    const tournaments = [];
    const modes = ["Solo", "Duo", "Squad"];
    let currentId = 1;
    const gameName = currentSelection.game;
    const today = new Date().toISOString().split('T')[0];
    
    for (let hour = 9; hour <= 21; hour++) {
        for (let mins of ["00", "30"]) {
            if (hour === 21 && mins === "30") break;
            
            let displayHour = hour > 12 ? hour - 12 : hour;
            let ampm = hour >= 12 ? "PM" : "AM";
            let matchTime = `${displayHour}:${mins} ${ampm}`;
            
            let currentMode = modes[currentId % 3];
            const uniqueMatchKey = `${gameName.replace(/\s+/g, '')}_match_${today}_${hour}_${mins}`;
            
            // 1. Set Global Default Rates First
            const configKey = `${gameName.replace(/\s+/g, '')}_${currentMode}_Config`;
            const globalConfig = databaseGameConfigs[configKey];

            let fee = currentMode === "Solo" ? 10 : (currentMode === "Duo" ? 15 : 20);
            let perKillReward = "🪙 5 Coins";
            let topRankReward = "🪙 20 Coins";
            let winnerReward = "🪙 100 Coins";
            let maxSlots = gameName === "BGMI" ? 100 : (currentMode === "Solo" ? 50 : (currentMode === "Duo" ? 50 : 48));

            if (globalConfig) {
                fee = globalConfig.fee;
                perKillReward = globalConfig.rewards.perKill;
                topRankReward = globalConfig.rewards.top10;
                winnerReward = globalConfig.rewards.winner;
            }

            // 2. Overwrite with Single Specific Match Configuration (e.g., Free Matches)
            const specificMatch = databaseTournaments[uniqueMatchKey];
            if (specificMatch && specificMatch.fee !== undefined) {
                fee = specificMatch.fee;
                if(specificMatch.rewards) {
                    if(specificMatch.rewards.perKill) perKillReward = specificMatch.rewards.perKill;
                    if(specificMatch.rewards.top10) topRankReward = specificMatch.rewards.top10;
                    if(specificMatch.rewards.winner) winnerReward = specificMatch.rewards.winner;
                }
            }
            
            tournaments.push({
                id: `match_${today}_${hour}_${mins}`,
                time: matchTime,
                hour24: hour,
                minNum: parseInt(mins),
                mode: currentMode,
                fee: fee,
                rewards: { perKill: perKillReward, top10: topRankReward, winner: winnerReward },
                maxSlots: maxSlots
            });
            currentId++;
        }
    }
    return tournaments;
}

// --- GLOBAL AUTH ENGINE STATE ---
auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('loginNavBtn');
    const profileHeader = document.getElementById('userProfileHeader');
    if (user) {
        if(loginBtn) loginBtn.classList.add('hidden');
        if(profileHeader) profileHeader.classList.remove('hidden');
        db.collection('users').doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                currentUserData = doc.data();
                if(document.getElementById('user-coins')) document.getElementById('user-coins').innerText = currentUserData.coins || 0;
                if(document.getElementById('modal-user-coins')) document.getElementById('modal-user-coins').innerText = currentUserData.coins || 0;
                
                const historyTableBody = document.getElementById('wallet-history-rows');
                if (historyTableBody) {
                    if (!currentUserData.history || currentUserData.history.length === 0) {
                        historyTableBody.innerHTML = `<tr><td colspan="2" style="padding:10px; color:#aaa; text-align:center;">No history.</td></tr>`;
                    } else {
                        let rowsHtml = "";
                        [...currentUserData.history].reverse().forEach(tx => {
                            let typeColor = tx.type === "Deposit" || tx.type === "Won" ? "#2ecc71" : "#ff4655";
                            let prefix = tx.type === "Deposit" || tx.type === "Won" ? "+" : "-";
                            rowsHtml += `<tr style="border-bottom:1px solid #1c232d;"><td style="padding:8px 4px;"><div style="font-weight:bold; color:#fff;">${tx.title}</div><div style="font-size:10px; color:#666;">${tx.date}</div></td><td style="padding:8px 4px; text-align:right; font-weight:bold; color:${typeColor};">${prefix}🪙${tx.amount}</td></tr>`;
                        });
                        historyTableBody.innerHTML = rowsHtml;
                    }
                }
            }
        });
    } else {
        if(loginBtn) loginBtn.classList.remove('hidden');
        if(profileHeader) profileHeader.classList.add('hidden');
        currentUserData = null;
    }
});

function checkAuthAndSelect(gameName) {
    if (!auth.currentUser) { openAuthModal(); return; }
    currentSelection.game = gameName;
    switchMatchTab('upcoming'); 
}
function showSection(sectionId) {
    document.querySelectorAll('.interface-section').forEach(s => s.classList.remove('active'));
    if(document.getElementById(sectionId)) document.getElementById(sectionId).classList.add('active');
}
function switchMatchTab(tabName) {
    currentActiveTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => { btn.style.background = 'none'; btn.style.color = '#aaa'; });
    if(document.getElementById(`tab-${tabName}`)) { document.getElementById(`tab-${tabName}`).style.background = '#ff4655'; document.getElementById(`tab-${tabName}`).style.color = '#fff'; }
    renderMatchesList();
        }
                // ==========================================================================
// 🛠️ SK ESPORTS OFFICIAL CLIENT ENGINE - PART 2 (RENDERING & LOGIC)
// ==========================================================================

function renderMatchesList() {
    const gameName = currentSelection.game;
    if(document.getElementById('selected-game-title')) document.getElementById('selected-game-title').innerText = gameName;
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
        if (t.hour24 < currentHour || (t.hour24 === currentHour && t.minNum + 30 <= currentMin)) status = "past";
        else if (t.hour24 === currentHour && currentMin >= t.minNum && currentMin < t.minNum + 30) status = "live";

        if (currentActiveTab === "my_joined") {} 
        else if (currentActiveTab !== status) return; 

        const uniqueMatchKey = `${gameName.replace(/\s+/g, '')}_${t.id}`;
        let playerList = databaseTournaments[uniqueMatchKey]?.players || [];
        let isUserJoined = auth.currentUser ? playerList.some(p => p.uid === auth.currentUser.uid || p.uid.startsWith(`${auth.currentUser.uid}_mate_`)) : false;

        if (currentActiveTab === "my_joined" && !isUserJoined) return;

        const card = document.createElement('div');
        card.className = "t-card";
        card.id = `card_${uniqueMatchKey}`;
        card.innerHTML = `
            <div class="t-info" onclick="toggleDetailsBox('${t.id}')">
                <h3>⏰ Time: ${t.time} (${t.mode})</h3>
                <p style="font-size:12px; color:#aaa; margin:4px 0;">🗺️ Map: ${mapName} | Tap for Rewards List</p>
                <div class="t-details">
                    <span>🪙 Entry: ${t.fee === 0 ? "FREE" : t.fee + " Coins"}</span>
                    <span style="color:#66fcf1;">👥 Joined: ${playerList.length}/${t.maxSlots}</span>
                </div>
                
                <div id="room-box-${uniqueMatchKey}" class="hidden" style="background:#1e2736; padding:12px; border-radius:6px; margin-top:10px; border:1px dashed #66fcf1; color:#fff;">
                    <h4>🔑 Official Room Details:</h4>
                    <p>Room ID: <strong>${databaseTournaments[uniqueMatchKey]?.roomId || "Awaiting..."}</strong></p>
                    <p>Password: <strong>${databaseTournaments[uniqueMatchKey]?.roomPass || "Awaiting..."}</strong></p>
                </div>

                <div id="result-box-${uniqueMatchKey}" class="hidden" style="background:#111a24; padding:12px; border-radius:6px; margin-top:10px; border:1px solid #2ecc71;">
                    <h4 style="color:#2ecc71;">🏆 Match Results Leaderboard:</h4>
                    <div id="table_${uniqueMatchKey}">
                        <table style="width:100%; border-collapse:collapse; font-size:12px;">
                            <thead><tr style="color:#aaa;"><th style="padding:4px;">IGN</th><th style="padding:4px;">Kills</th><th style="padding:4px;">Prize</th></tr></thead>
                            <tbody id="rows_${uniqueMatchKey}"></tbody>
                        </table>
                    </div>
                    <div id="lock_${uniqueMatchKey}" class="hidden" style="color:#ff4655; font-weight:bold;">🔒 Scorecard locked for non-participants.</div>
                </div>

                <div id="details-${t.id}" class="hidden" style="background:#0d1117; padding:10px; border-radius:6px; margin-top:10px; border-left:3px solid #ff4655;">
                    <p>🎯 Winner/Booyah: <strong>${t.rewards.winner}</strong></p>
                    <p>🎖️ Top Rank Reward: <strong>${t.rewards.top10}</strong></p>
                    <p>💀 Per Kill Reward: <strong>${t.rewards.perKill}</strong></p>
                </div>
            </div>
            <div id="action_${uniqueMatchKey}"></div>
        `;
        container.appendChild(card);

        // Render dynamic inner elements statuses
        const roomBox = document.getElementById(`room-box-${uniqueMatchKey}`);
        const totalMinutes = (t.hour24 * 60) + t.minNum;
        const currentMinutes = (now.getHours() * 60) + now.getMinutes();
        if (roomBox && status === "upcoming" && isUserJoined && (totalMinutes - currentMinutes <= 15)) roomBox.classList.remove('hidden');

        if (status === "past") {
            document.getElementById(`result-box-${uniqueMatchKey}`).classList.remove('hidden');
            if (!isUserJoined) document.getElementById(`lock_${uniqueMatchKey}`).classList.remove('hidden');
            else {
                let tbody = document.getElementById(`rows_${uniqueMatchKey}`);
                let sorted = [...playerList].sort((a,b) => b.kills - a.kills);
                tbody.innerHTML = sorted.length ? sorted.map(p => `<tr><td style="color:#66fcf1; padding:4px;">${p.gameName}</td><td>💀 ${p.kills}</td><td style="color:#2ecc71;">${p.prize}</td></tr>`).join('') : `<tr><td colspan="3">Processing results...</td></tr>`;
            }
        }

        let actionBtnHtml = "";
        if (status === "past") actionBtnHtml = `<button class="join-btn" style="background:#333; color:#777;" disabled>Match Ended</button>`;
        else if (status === "live") actionBtnHtml = `<button class="join-btn" style="background:#e74c3c;" disabled>🔴 Live Match</button>`;
        else if (isUserJoined) {
            actionBtnHtml = !uniqueMatchKey.includes("Solo") ? `<div style="display:flex; flex-direction:column; gap:4px;"><button class="join-btn" style="background:#2ecc71;" disabled>Joined ✓</button><button class="join-btn" style="background:#66fcf1; color:#000;" onclick="openTeammateModal('${uniqueMatchKey}', ${t.fee}, '${t.time}')">➕ Add Mate</button></div>` : `<button class="join-btn" style="background:#2ecc71;" disabled>Joined ✓</button>`;
        } else {
            actionBtnHtml = `<button class="join-btn" onclick="openJoinModal('${uniqueMatchKey}', ${t.fee}, '${t.time} ${t.mode}')">Join Match</button>`;
        }
        document.getElementById(`action_${uniqueMatchKey}`).innerHTML = actionBtnHtml;
    });
    showSection('tournament-view');
}

function toggleDetailsBox(id) { const el = document.getElementById(`details-${id}`); if(el) el.classList.toggle('hidden'); }
function openWalletModal() { if(auth.currentUser) document.getElementById('walletModal')?.classList.remove('hidden'); }
function closeWalletModal() { document.getElementById('walletModal')?.classList.add('hidden'); }
function openRulesModal() { document.getElementById('rulesModal')?.classList.remove('hidden'); }
function closeRulesModal() { document.getElementById('rulesModal')?.classList.add('hidden'); }
function closeJoinModal() { document.getElementById('joinModal').classList.add('hidden'); }
function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }
if(document.getElementById('addTeammateModal')) { function closeTeammateModal() { document.getElementById('addTeammateModal').classList.add('hidden'); } }

function openJoinModal(matchKey, fee, matchInfo) {
    if (!auth.currentUser || !currentUserData) { openAuthModal(); return; }
    if (currentUserData.coins < fee) { showSection('wallet-topup'); return; }
    currentSelection.currentMatchKey = matchKey; currentSelection.fee = fee; currentSelection.currentMatchInfo = matchInfo;
    document.getElementById('playerGameName').value = ""; document.getElementById('playerGameUID').value = "";
    document.getElementById('joinModal').classList.remove('hidden');
}

function openTeammateModal(matchKey, fee, matchInfo) {
    if (!auth.currentUser || !currentUserData) { openAuthModal(); return; }
    if (currentUserData.coins < fee) { showSection('wallet-topup'); return; }
    currentSelection.currentMatchKey = matchKey; currentSelection.fee = fee; currentSelection.currentMatchInfo = matchInfo;
    document.getElementById('mateGameName').value = ""; document.getElementById('mateGameUID').value = "";
    document.getElementById('addTeammateModal').classList.remove('hidden');
}

document.getElementById('joinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ign = document.getElementById('playerGameName').value.trim();
    const guid = document.getElementById('playerGameUID').value.trim();
    closeJoinModal();

    const uniqueMatchKey = currentSelection.currentMatchKey;
    const tFee = currentSelection.fee;
    const userUID = auth.currentUser.uid;
    const userMobile = currentUserData.mobile;
    const newBalance = currentUserData.coins - tFee;
    const txDate = new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'});

    try {
        await db.collection('tournaments').doc(uniqueMatchKey).set({
            players: firebase.firestore.FieldValue.arrayUnion({ uid: userUID, mobile: userMobile, gameName: ign, gameUID: guid, kills: 0, prize: "0 Coins" })
        }, { merge: true });

        await db.collection('users').doc(userUID).update({ 
            coins: newBalance,
            history: firebase.firestore.FieldValue.arrayUnion({ title: `${currentSelection.game} (${currentSelection.currentMatchInfo})`, amount: tFee, type: "Debited", date: txDate })
        });
        
        await fetch(FORMSPREE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Mobile: userMobile, Match: currentSelection.currentMatchInfo, IGN: ign, UID: guid }) });
        showSection('success-screen');
    } catch (err) { alert(err.message); }
});

document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('authIdentifier').value.trim();
    const pass = document.getElementById('authPassword').value;
    const dynamicEmail = idVal.includes('@') ? idVal : `${idVal}@skesports.com`;

    Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }, background: '#141a24', color: '#fff' });

    try {
        if (isSignUpMode) {
            const cred = await auth.createUserWithEmailAndPassword(dynamicEmail, pass);
            await db.collection('users').doc(cred.user.uid).set({ mobile: idVal, coins: 0, history: [] });
            Swal.fire({ icon: 'success', title: 'Welcome! 🎉', background: '#141a24', color: '#fff' });
        } else {
            await auth.signInWithEmailAndPassword(dynamicEmail, pass);
            Swal.close(); 
        }
        closeAuthModal();
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Failed', text: err.message, background: '#141a24', color: '#fff' });
    }
});

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? "Signup to SK eSports" : "Login to SK eSports";
    document.getElementById('authSubmitBtn').innerText = isSignUpMode ? "Register" : "Login";
}
function logoutUser() { auth.signOut().then(() => location.reload()); }

