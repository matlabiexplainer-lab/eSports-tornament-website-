// Google Firebase App Configuration Matrix
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

// Global Auth Engine State Registry
auth.onAuthStateChanged((user) => {
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

function checkAuthAndSelect(gameName) {
    if (!auth.currentUser) { openAuthModal(); return; }
    currentSelection.game = gameName;
    switchMatchTab('upcoming'); 
}

function showSection(sectionId) {
    document.querySelectorAll('.interface-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
}

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
    renderMatchesList();
}

// RENDERING LIST LOGIC
function renderMatchesList() {
    const gameName = currentSelection.game;
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

        if (currentActiveTab === "my_joined") {
            // Managed inside callback
        } else if (currentActiveTab !== status) {
            return; 
        }

        const uniqueMatchKey = `${gameName.replace(/\s+/g, '')}_${t.id}`;
        
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
                
                <div id="room-box-${uniqueMatchKey}" class="hidden" style="background:#1e2736; padding:12px; border-radius:6px; margin-top:10px; border:1px dashed #66fcf1; color:#fff; text-align:left;">
                    <h4 style="margin:0 0 5px 0; color:#66fcf1; font-size:14px;">🔑 Official Room Details:</h4>
                    <p style="margin:3px 0; font-size:13px;">Room ID: <span id="roomIdVal-${uniqueMatchKey}" style="font-weight:bold; color:#fff;">Awaiting...</span></p>
                    <p style="margin:3px 0; font-size:13px;">Password: <span id="roomPassVal-${uniqueMatchKey}" style="font-weight:bold; color:#fff;">Awaiting...</span></p>
                </div>

                <div id="result-box-${uniqueMatchKey}" class="hidden" style="background:#111a24; padding:12px; border-radius:6px; margin-top:10px; border:1px solid #2ecc71; color:#fff; text-align:left;">
                    <h4 style="margin:0 0 8px 0; color:#2ecc71; font-size:14px;">🏆 Full Match Leaderboard / Results:</h4>
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
                    <div id="secure-leaderboard-lock-${uniqueMatchKey}" class="hidden" style="padding:4px 0; color:#ff4655; font-size:13px; font-weight:bold;">
                        🔒 Results Locked! Only players who participated in this match can view the scorecard.
                    </div>
                </div>

                <div id="details-${t.id}" class="hidden" style="background:#0d1117; padding:10px; border-radius:6px; margin-top:10px; border-left:3px solid #ff4655;">
                    <p style="margin:4px 0; font-size:13px;">🎯 Winner/Booyah: <strong>${t.rewards.winner}</strong></p>
                    <p style="margin:4px 0; font-size:13px;">🎖️ Top 10 Finisher: <strong>${t.rewards.top10}</strong></p>
                    <p style="margin:4px 0; font-size:13px;">💀 Per Kill Reward: <strong>${t.rewards.perKill}</strong></p>
                </div>
            </div>
            <div id="action_${uniqueMatchKey}"><button class="join-btn" style="background:#444;" disabled>Processing...</button></div>
        `;
        container.appendChild(card);

        db.collection('tournaments').doc(uniqueMatchKey).onSnapshot((doc) => {
            let joinedCount = 0;
            let isUserJoined = false;
            let databaseRoomId = "Awaiting Admin...";
            let databaseRoomPass = "Awaiting Admin...";
            let playerList = [];
            
            if(doc.exists) {
                const docData = doc.data();
                if(docData.players) {
                    playerList = docData.players;
                    joinedCount = playerList.length;
                    if(auth.currentUser) {
                        isUserJoined = playerList.some(p => p.uid === auth.currentUser.uid);
                    }
                }
                if(docData.roomId) databaseRoomId = docData.roomId;
                if(docData.roomPass) databaseRoomPass = docData.roomPass;
            }

            if (currentActiveTab === "my_joined" && !isUserJoined) {
                card.remove();
                return;
            }

            const counterEl = document.getElementById(`count_${uniqueMatchKey}`);
            if(counterEl) counterEl.innerText = `👥 Joined: ${joinedCount}/${t.maxSlots}`;

            // --- 15 MIN ROOM TIMING ENGINE ---
            const matchTotalMinutes = (t.hour24 * 60) + t.minNum;
            const currentTotalMinutes = (now.getHours() * 60) + now.getMinutes();
            const timeDifference = matchTotalMinutes - currentTotalMinutes;

            const roomContainer = document.getElementById(`room-box-${uniqueMatchKey}`);
            if(roomContainer) {
                if (status === "upcoming" && isUserJoined && timeDifference <= 15) {
                    roomContainer.classList.remove('hidden');
                    document.getElementById(`roomIdVal-${uniqueMatchKey}`).innerText = databaseRoomId;
                    document.getElementById(`roomPassVal-${uniqueMatchKey}`).innerText = databaseRoomPass;
                } else {
                    roomContainer.classList.add('hidden');
                }
            }

            // --- SECURE PRIVACY LEADERBOARD ENGINE ---
            const resultContainer = document.getElementById(`result-box-${uniqueMatchKey}`);
            const tbodyEl = document.getElementById(`leaderboard-rows-${uniqueMatchKey}`);
            const tableWrapper = document.getElementById(`secure-leaderboard-view-${uniqueMatchKey}`);
            const lockWrapper = document.getElementById(`secure-leaderboard-lock-${uniqueMatchKey}`);
            
            if(resultContainer && tbodyEl) {
                if (status === "past") {
                    resultContainer.classList.remove('hidden');
                    
                    // SECURITY LOCK: Check user participation logic registry
                    if (!isUserJoined) {
                        if(tableWrapper) tableWrapper.classList.add('hidden');
                        if(lockWrapper) lockWrapper.classList.remove('hidden');
                    } else {
                        if(tableWrapper) tableWrapper.classList.remove('hidden');
                        if(lockWrapper) lockWrapper.classList.add('hidden');
                        
                        if(playerList.length === 0) {
                            tbodyEl.innerHTML = `<tr><td colspan="3" style="padding:6px; color:#aaa;">No one joined this match.</td></tr>`;
                        } else {
                            // Sort by kills descending
                            let sortedPlayers = [...playerList].sort((a, b) => {
                                return (parseInt(b.kills || 0)) - (parseInt(a.kills || 0));
                            });

                            let rowsHtml = "";
                            sortedPlayers.forEach(p => {
                                let pKills = p.kills !== undefined ? p.kills : "0";
                                let pPrize = p.prize !== undefined ? p.prize : "0 Coins";
                                
                                rowsHtml += `
                                    <tr style="border-bottom: 1px solid #222;">
                                        <td style="padding:6px 4px; font-weight:bold; color:#66fcf1;">${p.gameName || 'Unknown'}</td>
                                        <td style="padding:6px 4px; color:#fff;">💀 ${pKills}</td>
                                        <td style="padding:6px 4px; color:#2ecc71; font-weight:bold;">${pPrize}</td>
                                    </tr>
                                `;
                            });
                            tbodyEl.innerHTML = rowsHtml;
                        }
                    }
                } else {
                    resultContainer.classList.add('hidden');
                }
            }

            let actionBtnHtml = "";
            if (status === "past") {
                actionBtnHtml = `<button class="join-btn" style="background:#333; color:#777;" disabled>Match Ended</button>`;
            } else if (status === "live") {
                actionBtnHtml = `<button class="join-btn" style="background:#e74c3c;" disabled>🔴 Live Match</button>`;
            } else if (isUserJoined) {
                actionBtnHtml = `<button class="join-btn" style="background:#2ecc71;" disabled>Joined ✓</button>`;
            } else {
                actionBtnHtml = `<button class="join-btn" onclick="openJoinModal('${uniqueMatchKey}', ${t.fee}, '${t.time} ${t.mode}')">Join Match</button>`;
            }

            const actionContainer = document.getElementById(`action_${uniqueMatchKey}`);
            if(actionContainer) actionContainer.innerHTML = actionBtnHtml;
        });
    });

    showSection('tournament-view');
}

function toggleDetailsBox(id) {
    const el = document.getElementById(`details-${id}`);
    if(el) el.classList.toggle('hidden');
}

function openJoinModal(matchKey, fee, matchInfo) {
    if (!currentUserData) return;
    if (currentUserData.coins < fee) { showSection('wallet-topup'); return; }
    currentSelection.currentMatchKey = matchKey;
    currentSelection.fee = fee;
    currentSelection.currentMatchInfo = matchInfo;
    document.getElementById('playerGameName').value = "";
    document.getElementById('playerGameUID').value = "";
    document.getElementById('joinModal').classList.remove('hidden');
}

function closeJoinModal() { document.getElementById('joinModal').classList.add('hidden'); }

document.getElementById('joinForm').addEventListener('submit', async (e) => {
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

    try {
        await db.collection('tournaments').doc(uniqueMatchKey).set({
            players: firebase.firestore.FieldValue.arrayUnion({ 
                uid: userUID, 
                mobile: userMobile,
                gameName: gameNameInput,
                gameUID: gameUidInput,
                kills: 0,
                prize: "0 Coins"
            })
        }, { merge: true });

        await db.collection('users').doc(userUID).update({ coins: newBalance });
        
        await fetch(FORMSPREE_URL, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ Mobile: userMobile, Match: matchInfo, IGN: gameNameInput, UID: gameUidInput })
        });

        showSection('success-screen');
    } catch (err) { alert("Error: " + err.message); }
});

document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputVal = document.getElementById('authIdentifier').value.trim();
    const pass = document.getElementById('authPassword').value;
    const dynamicEmail = inputVal.includes('@') ? inputVal : `${inputVal}@skesports.com`;

    try {
        if (isSignUpMode) {
            const cred = await auth.createUserWithEmailAndPassword(dynamicEmail, pass);
            await db.collection('users').doc(cred.user.uid).set({ mobile: inputVal, coins: 0 });
            alert("Registered! Balance: 0 Coins.");
        } else {
            await auth.signInWithEmailAndPassword(dynamicEmail, pass);
        }
        closeAuthModal();
    } catch (err) { alert(err.message); }
});

function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? "Signup to SK eSports" : "Login to SK eSports";
    document.getElementById('authSubmitBtn').innerText = isSignUpMode ? "Register Account" : "Login";
}
function logoutUser() { auth.signOut().then(() => location.reload()); }
    


// === ISS CODE KO SCRIPT.JS KE SABSE NICHE (END MEIN) WAPAS PASTE KAREIN ===

// 1. AUTOMATIC REAL-TIME WALLET POPUP SYNC & PASSBOOK RENDERING
auth.onAuthStateChanged((user) => {
    if (user) {
        db.collection('users').doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const modalCoin = document.getElementById('modal-user-coins');
                if(modalCoin) modalCoin.innerText = data.coins || 0;
                
                const historyTableBody = document.getElementById('wallet-history-rows');
                if (historyTableBody) {
                    if (!data.history || data.history.length === 0) {
                        historyTableBody.innerHTML = `<tr><td colspan="2" style="padding: 10px; color: #aaa; text-align: center;">No transaction history found.</td></tr>`;
                    } else {
                        let rowsHtml = "";
                        let reversedHistory = [...data.history].reverse();
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
    }
});

// 2. OPEN & CLOSE WALLET MODAL PANEL
function openWalletModal() {
    if (!auth.currentUser) return;
    const modal = document.getElementById('walletModal');
    if(modal) modal.classList.remove('hidden');
}

// 3. CLOSE WALLET MODAL PANEL
function closeWalletModal() {
    const modal = document.getElementById('walletModal');
    if(modal) modal.classList.add('hidden');
}

// 4. AUTOMATIC HISTORY INJECTOR ON JOINING MATCH
document.getElementById('joinForm').addEventListener('submit', async (e) => {
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

    // Automatic Date Generation for Passbook
    const txDate = new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'});

    try {
        // A. Save player details inside tournament doc
        await db.collection('tournaments').doc(uniqueMatchKey).set({
            players: firebase.firestore.FieldValue.arrayUnion({ 
                uid: userUID, 
                mobile: userMobile,
                gameName: gameNameInput,
                gameUID: gameUidInput,
                kills: 0,
                prize: "0 Coins"
            })
        }, { merge: true });

        // B. AUTOMATICALLY updates balance and injects a transaction map object into history array
        await db.collection('users').doc(userUID).set({ 
            coins: newBalance,
            history: firebase.firestore.FieldValue.arrayUnion({
                title: `${currentSelection.game} (${matchInfo})`,
                amount: tFee,
                type: "Debited",
                date: txDate
            })
        }, { merge: true }); // Merge ensures other data (like mobile) is perfectly safe!
        
        await fetch(FORMSPREE_URL, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ Mobile: userMobile, Match: matchInfo, IGN: gameNameInput, UID: gameUidInput })
        });

        showSection('success-screen');
    } catch (err) { alert("Error: " + err.message); }
});
// === ADD THIS AT THE VERY END OF YOUR SCRIPT.JS ===
function openRulesModal() {
    const modal = document.getElementById('rulesModal');
    if(modal) modal.classList.remove('hidden');
}

function closeRulesModal() {
    const modal = document.getElementById('rulesModal');
    if(modal) modal.classList.add('hidden');
}
