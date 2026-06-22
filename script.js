// Google Firebase App Configuration Matrix
const firebaseConfig = {
    apiKey: "AIzaSyB-C7Ks_lXWef1RMkUQBcPuhovSy72veXM",
    authDomain: "sk-esports-90bf9.firebaseapp.com",
    projectId: "sk-esports-90bf9",
    storageBucket: "sk-esports-90bf9.appspot.com",
    messagingSenderId: "471222264434",
    appId: "1:471222264434:web:b54a25264d5b2ae70a58eb",
    measurementId: "G-6W6JDGE4TF"
};

firebase.initializeApp(firebaseConfig);


const auth = firebase.auth();
const db = firebase.firestore();
const FORMSPREE_URL = 'https://formspree.io/f/xnjyelpq';

let currentSelection = { game: "", fee: 0, title: "", currentMatchKey: "", currentMatchInfo: "" };
let currentUserData = null;
let isSignUpMode = false;
let currentActiveTab = "upcoming";

// GENERATE SCHEDULE ARRAYS
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
                    perKill: currentMode === "Solo" ? "5 Coins" : "3 Coins",
                    top10: currentMode === "Solo" ? "20 Coins" : "40 Coins",
                    winner: currentMode === "Solo" ? "100 Coins" : (currentMode === "Duo" ? "200 Coins" : "400 Coins")
                },
                maxSlots: currentMode === "Solo" ? 50 : (currentMode === "Duo" ? 50 : 25)
            });
            currentId++;
        }
    }
    return tournaments;
}

// Global Auth Engine State Registry (Crash-Proof Edition)
auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('loginNavBtn');
    const profileHeader = document.getElementById('userProfileHeader');
    
    if (user) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (profileHeader) profileHeader.classList.remove('hidden');
        
        db.collection('users').doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                currentUserData = doc.data();
                const coinEl = document.getElementById('user-coins');
                if (coinEl) coinEl.innerText = currentUserData.coins || 0;
                const modalCoin = document.getElementById('modal-user-coins');
                if (modalCoin) modalCoin.innerText = currentUserData.coins || 0;
                
                // Real-time Passbook Updates
                const historyTableBody = document.getElementById('wallet-history-rows');
                if (historyTableBody) {
                    if (!currentUserData.history || currentUserData.history.length === 0) {
                        historyTableBody.innerHTML = `<tr><td colspan="2" style="padding: 10px; color: #aaa; text-align: center;">No transaction history found.</td></tr>`;
                    } else {
                        let rowsHtml = "";
                        let reversedHistory = [...currentUserData.history].reverse();
                        reversedHistory.forEach(tx => {
                            let typeColor = tx.type === "Deposit" || tx.type === "Won" ? "#2ecc71" : "#ff4655";
                            let prefix = tx.type === "Deposit" || tx.type === "Won" ? "+" : "-";
                            rowsHtml += `
                                <tr style="border-bottom: 1px solid #1c232d;">
                                    <td style="padding: 8px 4px;">
                                        <div style="font-weight: bold; color: #fff;">${tx.title || 'Match Entry'}</div>
                                        <div style="font-size: 10px; color: #666;">${tx.date || ''}</div>
                                    </td>
                                    <td style="padding: 8px 4px; text-align: right; font-weight: bold; color: ${typeColor};">
                                        ${prefix}🪙${tx.amount}
                                    </td>
                                </tr>
                            `;
                        });
                        historyTableBody.innerHTML = rowsHtml;
                    }
                }
            }
        });
    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (profileHeader) profileHeader.classList.add('hidden');
        currentUserData = null;
    }
});

function checkAuthAndSelect(gameName) {
    if (!auth.currentUser) { 
        openAuthModal(); 
        return; 
    }
    currentSelection.game = gameName;
    switchMatchTab('upcoming');
}

function showSection(sectionId) {
    document.querySelectorAll('.interface-section').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(sectionId);
    if (el) el.classList.add('active');
}

function switchMatchTab(tabName) {
    currentActiveTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.background = 'none';
        btn.style.color = '#aaa';
    });
    const activeBtn = document.getElementById(`tab-${tabName}`);
    if (activeBtn) {
        activeBtn.style.background = '#ff4655';
        activeBtn.style.color = '#fff';
    }
    renderMatchesList();
}
// RENDERING TOURNAMENTS LOGIC
function renderMatchesList() {
    const gameName = currentSelection.game;
    const titleEl = document.getElementById('selected-game-title');
    if (titleEl) titleEl.innerText = gameName;
    const container = document.getElementById('tournaments-container');
    if (!container) return;
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

        if (currentActiveTab === "my_joined") {
            // Checked inside async engine callback
        } else if (currentActiveTab !== status) {
            return;
        }

        const todayDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        const uniqueMatchKey = `${gameName.replace(/\s+/g, '')}_${t.id}_${todayDate}`;

        const card = document.createElement('div');
        card.className = "t-card";
        card.id = `card_${uniqueMatchKey}`;
        card.innerHTML = `
            <div class="t-info" onclick="toggleDetailsBox('${t.id}')">
                <h3>⏰ Time: ${t.time} (${t.mode})</h3>
                <p style="font-size:12px; color:#aaa; margin:4px 0;">🗺️ Map: ${mapName} | Tap for Rewards List</p>
                <div class="t-details">
                    <span>🪙 Entry: ${t.fee} Coins</span>
                    <span id="count_${uniqueMatchKey}" style="color:#66fcf1;">👥 Joined: Loading...</span>
                </div>
            </div>

            <div id="room-box-${uniqueMatchKey}" class="hidden" style="background:#1e2736; padding:12px; border-radius:6px; margin-top:10px;">
                <h4 style="margin:0 0 5px 0; color:#66fcf1; font-size:14px;">🔑 Official Room Details:</h4>
                <p style="margin:3px 0; font-size:13px;">>Room ID: <span id="roomIdVal-${uniqueMatchKey}">Awaiting Admin...</span></p>
                <p style="margin:3px 0; font-size:13px;">>Password: <span id="roomPassVal-${uniqueMatchKey}">Awaiting Admin...</span></p>
            </div>

            <div id="result-box-${uniqueMatchKey}" class="hidden" style="background:#111a24; padding:12px; border-radius:6px; margin-top:10px;">
                <h4 style="margin:0 0 5px 0; color:#2ecc71; font-size:14px;">🏆 Full Match Leaderboard / Results:</h4>
                <div id="secure-leaderboard-view-${uniqueMatchKey}">
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
                            <thead>
                                <tr style="border-bottom:2px solid #2ecc71; color:#aaa;">
                                    <th style="padding:4px;">Player (IGN)</th>
                                    <th style="padding:4px;">Kills</th>
                                    <th style="padding:4px;">Prize</th>
                                </tr>
                            </thead>
                            <tbody id="leaderboard-rows-${uniqueMatchKey}">
                                <tr><td colspan="3" style="padding:6px; color:#aaa;">Result processing...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div id="secure-leaderboard-lock-${uniqueMatchKey}" class="hidden" style="padding:4px 0; color:#ff4655;">
                    🔒 Results Locked! Only players who participated in this match can view the scorecard.
                </div>
            </div>

            <div id="details-${t.id}" class="hidden" style="background:#0d1117; padding:10px; border-radius:4px; margin-top:10px; font-size:12px; line-height:1.6;">
                <p style="margin:4px 0;">🥇 Winner/Booyah: <strong>${t.rewards.winner}</strong></p>
                <p style="margin:4px 0;">🎖️ Top 10 Finisher: <strong>${t.rewards.top10}</strong></p>
                <p style="margin:4px 0;">💀 Per Kill Reward: <strong>${t.rewards.perKill}</strong></p>
            </div>

            <!-- ACTIONS BUTTON WRAPPER -->
            <div id="action_${uniqueMatchKey}" style="margin-top:12px;"></div>
        `;

        container.appendChild(card);

        // Real-time Database Snapshot Engine
        db.collection('tournaments').doc(uniqueMatchKey).onSnapshot((doc) => {
            let joinedCount = 0;
            let isUserJoined = false;
            let databaseRoomId = "Awaiting Admin...";
            let databaseRoomPass = "Awaiting Admin...";
            let playerList = [];

            if (doc.exists) {
                const docData = doc.data();
                if (docData.players) {
                    playerList = docData.players;
                    joinedCount = playerList.length;
                    if (auth.currentUser) {
                        isUserJoined = playerList.some(p => p.uid === auth.currentUser.uid || p.uid.startsWith(`${auth.currentUser.uid}_mate_`));
                    }
                }
                if (docData.roomId) databaseRoomId = docData.roomId;
                if (docData.roomPass) databaseRoomPass = docData.roomPass;
            }

            if (currentActiveTab === "my_joined" && !isUserJoined) {
                card.remove();
                return;
            }

            const counterEl = document.getElementById(`count_${uniqueMatchKey}`);
            if (counterEl) counterEl.innerText = `👥 Joined: ${joinedCount}/${t.maxSlots}`;

            // Room display timing validator
            const matchTotalMinutes = (t.hour24 * 60) + t.minNum;
            const currentTotalMinutes = (now.getHours() * 60) + now.getMinutes();
            const timeDifference = matchTotalMinutes - currentTotalMinutes;

            const roomContainer = document.getElementById('room-box-' + uniqueMatchKey);
            if (roomContainer) {
                if (status === "upcoming" && isUserJoined && timeDifference <= 15) {
                    roomContainer.classList.remove('hidden');
                    const rId = document.getElementById(`roomIdVal-${uniqueMatchKey}`);
                    const rPs = document.getElementById(`roomPassVal-${uniqueMatchKey}`);
                    if (rId) rId.innerText = databaseRoomId;
                    if (rPs) rPs.innerText = databaseRoomPass;
                } else {
                    roomContainer.classList.add('hidden');
                }
            }

            // Results Scorecard logic
            const resultContainer = document.getElementById(`result-box-${uniqueMatchKey}`);
            const tbodyEl = document.getElementById(`leaderboard-rows-${uniqueMatchKey}`);
            const tableWrapper = document.getElementById(`secure-leaderboard-view-${uniqueMatchKey}`);
            const lockWrapper = document.getElementById(`secure-leaderboard-lock-${uniqueMatchKey}`);

            if (resultContainer && tbodyEl) {
                if (status === "past") {
                    resultContainer.classList.remove('hidden');
                    if (isUserJoined) {
                        if (tableWrapper) tableWrapper.classList.remove('hidden');
                        if (lockWrapper) lockWrapper.classList.add('hidden');
                    } else {
                        if (tableWrapper) tableWrapper.classList.add('hidden');
                        if (lockWrapper) lockWrapper.classList.remove('hidden');
                    }

                    if (playerList.length === 0) {
                        tbodyEl.innerHTML = `<tr><td colspan="3" style="padding:6px; color:#aaa; text-align:center;">No one joined this match.</td></tr>`;
                    } else {
                        let sortedPlayers = [...playerList].sort((a, b) => parseInt(b.kills || 0) - parseInt(a.kills || 0));
                        let rowsHtml = "";
                        sortedPlayers.forEach(p => {
                            rowsHtml += `
                                <tr style="border-bottom:1px solid #222;">
                                    <td style="padding:6px 4px; font-weight:bold; color:#66fcf1;">${p.gameName || 'Unknown'}</td>
                                    <td style="padding:6px 4px; color:#fff;">💀 ${p.kills || 0}</td>
                                    <td style="padding:6px 4px; color:#2ecc71; font-weight:bold;">${p.prize || '0 Coins'}</td>
                                </tr>
                            `;
                        });
                        tbodyEl.innerHTML = rowsHtml;
                    }
                } else {
                    resultContainer.classList.add('hidden');
                }
            }

            // Action triggers render blocks
            let actionBtnHtml = "";
            if (status === "past") {
                actionBtnHtml = `<button class="join-btn" style="background:#333; color:#777;" disabled>Match Ended</button>`;
            } else if (status === "live") {
                actionBtnHtml = `<button class="join-btn" style="background:#e74c3c;" disabled>🔴 Live Match</button>`;
            } else if (isUserJoined) {
                if (!uniqueMatchKey.includes("Solo")) {
                    actionBtnHtml = `
                        <div style="display:flex; gap:6px; flex-direction:column;">
                            <button class="join-btn" style="background:#2ecc71; margin-bottom:2px;" disabled>Joined ✓</button>
                            <button class="join-btn" style="background:#66fcf1; color:#000; font-weight:bold;" onclick="openTeammateModal('${uniqueMatchKey}', ${t.fee || 10}, '${t.time} (${t.mode})')">➕ Add Teammate (🪙${t.fee || 10})</button>
                        </div>
                    `;
                } else {
                    actionBtnHtml = `<button class="join-btn" style="background:#2ecc71;" disabled>Joined ✓</button>`;
                }
            } else {
                actionBtnHtml = `<button class="join-btn" onclick="openJoinModal('${uniqueMatchKey}', ${t.fee || 10}, '${t.time} (${t.mode})')">Join Match</button>`;
            }

            const actionContainer = document.getElementById(`action_${uniqueMatchKey}`);
            if (actionContainer) actionContainer.innerHTML = actionBtnHtml;
        });

        if (typeof syncDynamicMatchFees === "function") syncDynamicMatchFees(uniqueMatchKey, t.fee || 10);
    });

    showSection('tournament-view');
}

function toggleDetailsBox(id) {
    const el = document.getElementById(`details-${id}`);
    if (el) el.classList.toggle('hidden');
}

// OPEN/CLOSE SYSTEM MODALS
function openWalletModal() { if(auth.currentUser) { const m = document.getElementById('walletModal'); if(m) m.classList.remove('hidden'); } }
function closeWalletModal() { const m = document.getElementById('walletModal'); if(m) m.classList.add('hidden'); }
function openRulesModal() { const m = document.getElementById('rulesModal'); if(m) m.classList.remove('hidden'); }
function closeRulesModal() { const m = document.getElementById('rulesModal'); if(m) m.classList.add('hidden'); }
function closeJoinModal() { const m = document.getElementById('joinModal'); if(m) m.classList.add('hidden'); }
function openAuthModal() { const m = document.getElementById('authModal'); if(m) m.classList.remove('hidden'); }
function closeAuthModal() { const m = document.getElementById('authModal'); if(m) m.classList.add('hidden'); }
function closeTeammateModal() { const m = document.getElementById('addTeammateModal'); if(m) m.classList.add('hidden'); }

// OPEN MAIN JOIN ENTRY MODALS
function openJoinModal(matchKey, defaultFee, matchInfo) {
    if (!currentUserData) return;
    currentSelection.currentMatchKey = matchKey;
    currentSelection.fee = defaultFee;
    currentSelection.currentMatchInfo = matchInfo;

    db.collection('tournaments').doc(matchKey).get().then((doc) => {
        let finalFee = defaultFee;
        if (doc.exists && doc.data().entryFee !== undefined) finalFee = doc.data().entryFee;
        currentSelection.fee = finalFee;

        if (currentUserData.coins < finalFee) { showSection('wallet-topup'); return; }
        const nameField = document.getElementById('playerGameName');
        const uidField = document.getElementById('playerGameUID');
        const modalEl = document.getElementById('joinModal');
        if (nameField) nameField.value = "";
        if (uidField) uidField.value = "";
        if (modalEl) modalEl.classList.remove('hidden');
    }).catch(() => {
        if (currentUserData.coins < defaultFee) { showSection('wallet-topup'); return; }
        const modalEl = document.getElementById('joinModal');
        if (modalEl) modalEl.classList.remove('hidden');
    });
}

function openTeammateModal(matchKey, fee, matchInfo) {
    if (!currentUserData) return;
    if (currentUserData.coins < fee) { showSection('wallet-topup'); return; }
    currentSelection.currentMatchKey = matchKey;
    currentSelection.fee = fee;
    currentSelection.currentMatchInfo = matchInfo;

    const nameField = document.getElementById('mateGameName');
    const uidField = document.getElementById('mateGameUID');
    const modalEl = document.getElementById('addTeammateModal');
    if (nameField) nameField.value = "";
    if (uidField) uidField.value = "";
    if (modalEl) modalEl.classList.remove('hidden');
}

// CONSOLE REAL-TIME FEE SYNCHRONIZATION
function syncDynamicMatchFees(uniqueMatchKey, defaultFee) {
    db.collection('tournaments').doc(uniqueMatchKey).onSnapshot((doc) => {
        if (doc.exists && doc.data().entryFee !== undefined) {
            const updatedFee = doc.data().entryFee;
            const cardEl = document.getElementById(`card_${uniqueMatchKey}`);
            if (cardEl) {
                const feeSpan = cardEl.querySelector('.t-details span:first-child');
                if (feeSpan) feeSpan.innerHTML = `🪙 Entry: ${updatedFee} Coins`;
            }
            if (currentSelection.currentMatchKey === uniqueMatchKey) currentSelection.fee = updatedFee;
        }
    });
}

// FORM SUBMISSIONS WITH NULL CHECKS
const jForm = document.getElementById('joinForm');
if (jForm) {
    jForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const gameNameInput = document.getElementById('playerGameName').value.trim();
        const gameUidInput = document.getElementById('playerGameUID').value.trim();
        closeJoinModal();

        const uniqueMatchKey = currentSelection.currentMatchKey;
        const tFee = currentSelection.fee;
        const matchInfo = currentSelection.currentMatchInfo;
        const userUID = auth.currentUser.uid;
        const userMobile = currentUserData.mobile;
        const newBalance = currentUserData.coins - tFee;
        const txDate = new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'});

        try {
            await db.collection('tournaments').doc(uniqueMatchKey).set({
                players: firebase.firestore.FieldValue.arrayUnion({ 
                    uid: userUID, mobile: userMobile, gameName: gameNameInput, gameUID: gameUidInput, kills: 0, prize: "0 Coins"
                })
            }, { merge: true });

            await db.collection('users').doc(userUID).set({ 
                coins: newBalance,
                history: firebase.firestore.FieldValue.arrayUnion({
                    title: `${currentSelection.game} (${matchInfo})`, amount: tFee, type: "Debited", date: txDate
                })
            }, { merge: true });
            
            await fetch(FORMSPREE_URL, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ Mobile: userMobile, Match: matchInfo, IGN: gameNameInput, UID: gameUidInput })
            });
            showSection('success-screen');
        } catch (err) { alert("Error: " + err.message); }
    });
}

const tForm = document.getElementById('addTeammateForm');
if (tForm) {
    tForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mateNameInput = document.getElementById('mateGameName').value.trim();
        const mateUidInput = document.getElementById('mateGameUID').value.trim();
        closeTeammateModal();

        const uniqueMatchKey = currentSelection.currentMatchKey;
        const tFee = currentSelection.fee;
        const matchInfo = currentSelection.currentMatchInfo;
        const leaderUID = auth.currentUser.uid;
        const leaderMobile = currentUserData.mobile;
        const newLeaderBalance = currentUserData.coins - tFee;
        const txDate = new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'});

        try {
            await db.collection('tournaments').doc(uniqueMatchKey).set({
                players: firebase.firestore.FieldValue.arrayUnion({ 
                    uid: `${leaderUID}_mate_${Date.now()}`, mobile: leaderMobile, gameName: mateNameInput, gameUID: mateUidInput, kills: 0, prize: "0 Coins"
                })
            }, { merge: true });

            await db.collection('users').doc(leaderUID).set({ 
                coins: newLeaderBalance,
                history: firebase.firestore.FieldValue.arrayUnion({
                    title: `Teammate: ${mateNameInput} (${matchInfo})`, amount: tFee, type: "Debited", date: txDate
                })
            }, { merge: true });
            
            await fetch(FORMSPREE_URL, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ Mobile: leaderMobile, Match: `${matchInfo} [Teammate]`, IGN: mateNameInput, UID: mateUidInput })
            });
            showSection('success-screen');
        } catch (err) { alert("Error: " + err.message); }
    });
}

// AUTH FLOW CONTROLS
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    const aTitle = document.getElementById('auth-title');
    const aBtn = document.getElementById('authSubmitBtn');
    const toggleTxt = document.querySelector('.toggle-auth-text');
    
    if (aTitle) aTitle.innerText = isSignUpMode ? "Register on SK eSports" : "Login to SK eSports";
    if (aBtn) aBtn.innerText = isSignUpMode ? "Register Account" : "Login";
    if (toggleTxt) {
        toggleTxt.innerHTML = isSignUpMode ? 
            `Pehle se account hai? <a href="#" onclick="toggleAuthMode()">Login Karein</a>` : 
            `Account nahi hai? <a href="#" onclick="toggleAuthMode()">Signup/Register Karein</a>`;
    }
}

const aForm = document.getElementById('authForm');
if (aForm) {
    aForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputVal = document.getElementById('authIdentifier').value.trim();
        const pass = document.getElementById('authPassword').value;
        const dynamicEmail = inputVal.includes('@') ? inputVal : `${inputVal}@skesports.com`;
        closeAuthModal();

        try {
            if (isSignUpMode) {
                const cred = await auth.createUserWithEmailAndPassword(dynamicEmail, pass);
                await db.collection('users').doc(cred.user.uid).set({ mobile: inputVal, coins: 0, history: [] });
                alert("Registered Successfully! Balance: 0 Coins.");
            } else {
                await auth.signInWithEmailAndPassword(dynamicEmail, pass);
            }
        } catch (err) { alert("Auth Error: " + err.message); }
    });
}

function logoutUser() { auth.signOut().then(() => location.reload()); }
