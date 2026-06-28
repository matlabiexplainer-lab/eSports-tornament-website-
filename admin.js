// ==========================================================================
// 🛠️ SK ESPORTS OFFICIAL CLIENT ENGINE - ADMIN MODULE
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
const db = firebase.firestore();
let loadedPlayers = [];

// --- 1. REALTIME COIN & PASSBOOK MANAGER ---
async function updateUserCoins(actionType) {
    const uid = document.getElementById('manageUserUID').value.trim();
    const amount = parseInt(document.getElementById('coinAmount').value);
    const title = document.getElementById('txTitle').value.trim();
    const txDate = new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'});

    if(!uid || !amount || !title) {
        Swal.fire('Error', 'Please fill all coin management fields.', 'error');
        return;
    }

    const userRef = db.collection('users').doc(uid);
    
    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) { throw "User does not exist in database!"; }
            
            let currentCoins = userDoc.data().coins || 0;
            let newBalance = actionType === 'Deposit' ? currentCoins + amount : currentCoins - amount;
            
            if(newBalance < 0) { throw "User has insufficient coins balance!"; }

            transaction.update(userRef, {
                coins: newBalance,
                history: firebase.firestore.FieldValue.arrayUnion({
                    title: title,
                    amount: amount,
                    type: actionType,
                    date: txDate
                })
            });
        });
        Swal.fire('Success', `Coins transaction completed successfully!`, 'success');
    } catch (err) {
        Swal.fire('Transaction Failed', err.toString(), 'error');
    }
}

// --- 2. ROOM ID & PASSWORD BROADCASTER ---
async function updateRoomDetails() {
    const matchKey = document.getElementById('roomMatchKey').value.trim();
    const roomId = document.getElementById('adminRoomId').value.trim();
    const roomPass = document.getElementById('adminRoomPass').value.trim();

    if(!matchKey || !roomId || !roomPass) {
        Swal.fire('Error', 'Please enter match key, Room ID, and Password.', 'error');
        return;
    }

    try {
        await db.collection('tournaments').doc(matchKey).set({
            roomId: roomId,
            roomPass: roomPass
        }, { merge: true });
        Swal.fire('Broadcasted!', 'Room ID and Password are now visible to joined players.', 'success');
    } catch(err) {
        Swal.fire('Error', err.message, 'error');
    }
}

// --- 3. TOURNAMENT SCORECARD & RESULTS ENGINE ---
async function loadMatchPlayers() {
    const matchKey = document.getElementById('resultMatchKey').value.trim();
    const tbody = document.getElementById('admin-player-rows');
    if(!matchKey) { Swal.fire('Error', 'Enter a valid tournament key.', 'error'); return; }

    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#fff;">Fetching tournament registry...</td></tr>`;

    try {
        const doc = await db.collection('tournaments').doc(matchKey).get();
        if(!doc.exists || !doc.data().players || doc.data().players.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ff4655;">No players have joined this match yet.</td></tr>`;
            return;
        }

        loadedPlayers = doc.data().players;
        let html = "";
        loadedPlayers.forEach((p, index) => {
            html += `
                <tr>
                    <td style="color:#66fcf1; font-weight:bold;">${p.gameName}</td>
                    <td style="font-size:11px; color:#aaa;">${p.uid}</td>
                    <td><input type="number" id="kill_${index}" value="${p.kills || 0}" style="width:70px; margin:0; padding:4px;"></td>
                    <td><input type="text" id="prize_${index}" value="${p.prize || '0 Coins'}" style="width:100px; margin:0; padding:4px;"></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch(err) {
        Swal.fire('Error Loading', err.message, 'error');
    }
}

async function saveMatchResults() {
    const matchKey = document.getElementById('resultMatchKey').value.trim();
    if(!matchKey || loadedPlayers.length === 0) { Swal.fire('Error', 'No data to save.', 'error'); return; }

    // Read values from inputs dynamically
    const updatedPlayers = loadedPlayers.map((p, index) => {
        return {
            ...p,
            kills: parseInt(document.getElementById(`kill_${index}`).value) || 0,
            prize: document.getElementById(`prize_${index}`).value.trim()
        };
    });

    try {
        await db.collection('tournaments').doc(matchKey).update({
            players: updatedPlayers
        });
        Swal.fire('Scores Updated!', 'Scorecard updated. Winners can now view their prizes.', 'success');
    } catch(err) {
        Swal.fire('Error Saving', err.message, 'error');
    }
}

