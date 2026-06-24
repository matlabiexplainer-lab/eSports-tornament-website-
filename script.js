// --- SK ESPORTS OFFICIAL CLIENT ENGINE ---
const firebaseConfig = {
    apiKey: "AIzaSyB-C7Ks_lXwVf1RNkUQCpUhov5y7ZveXN",
    authDomain: "sk-esports-90bf9.firebaseapp.com",
    projectId: "sk-esports-90bf9",
    storageBucket: "sk-esports-90bf9.appspot.com",
    messagingSenderId: "471222264434",
    appId: "1:471222264434:web:b54e25264d5b2ae70a58eb",
    measurementId: "G-KM0J0GE4TF"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const FORMSPREE_URL = 'https://formspree.io/f/xnjyelpq';

let currentSelection = { game: "", fee: 0, title: "", currentMatchKey: "", currentMatchInfo: "" };
let currentUserData = null;
let isSignUpMode = false;

// --- MODAL & UI FUNCTIONS ---
function openWalletModal() { if(auth.currentUser) { const m = document.getElementById('walletModal'); if(m) m.classList.remove('hidden'); } }
function closeWalletModal() { const m = document.getElementById('walletModal'); if(m) m.classList.add('hidden'); }
function openRulesModal() { const m = document.getElementById('rulesModal'); if(m) m.classList.remove('hidden'); }
function closeRulesModal() { const m = document.getElementById('rulesModal'); if(m) m.classList.add('hidden'); }
function closeJoinModal() { const m = document.getElementById('joinModal'); if(m) m.classList.add('hidden'); }
function openAuthModal() { const m = document.getElementById('authModal'); if(m) m.classList.remove('hidden'); }
function closeAuthModal() { const m = document.getElementById('authModal'); if(m) m.classList.add('hidden'); }
function closeTeammateModal() { const m = document.getElementById('addTeammateModal'); if(m) m.classList.add('hidden'); }

function openJoinModal(matchKey, fee, matchInfo) {
    if (!auth.currentUser || !currentUserData) { openAuthModal(); return; }
    if (currentUserData.coins < fee) { showSection('wallet-topup'); return; }
    currentSelection.currentMatchKey = matchKey;
    currentSelection.fee = fee;
    currentSelection.currentMatchInfo = matchInfo;
    document.getElementById('playerGameName').value = "";
    document.getElementById('playerGameUID').value = "";
    const m = document.getElementById('joinModal');
    if(m) m.classList.remove('hidden');
}

function openTeammateModal(matchKey, fee, matchInfo) {
    if (!auth.currentUser || !currentUserData) { openAuthModal(); return; }
    if (currentUserData.coins < fee) { showSection('wallet-topup'); return; }
    currentSelection.currentMatchKey = matchKey;
    currentSelection.fee = fee;
    currentSelection.currentMatchInfo = matchInfo;
    document.getElementById('mateGameName').value = "";
    document.getElementById('mateGameUID').value = "";
    const m = document.getElementById('addTeammateModal');
    if(m) m.classList.remove('hidden');
}

// --- TOURNAMENT ENGINE ---
function getDynamicTournaments(gameName) {
    let tournaments = [];
    let modes = ["Solo", "Duo", "Squad"];
    let currentId = 1;
    for (let hour = 9; hour <= 21; hour++) {
        for (let mins of ["00", "30"]) {
            if (hour === 21 && mins === "30") break;
            let displayHour = hour > 12 ? hour - 12 : hour;
            let ampm = hour >= 12 ? "PM" : "AM";
            let matchTime = `${displayHour}:${mins} ${ampm}`;
            let currentMode = modes[currentId % 3];
            
            let maxSlots = (currentMode === "Solo") ? ((currentId % 2 === 0) ? 30 : 50) : ((currentMode === "Duo") ? 50 : 48);
            let fee = 10, perKillReward = "", topRankReward = "", winnerReward = "";

            if (gameName === "Free Fire MAX") {
                if (currentMode === "Solo") { fee = 10; perKillReward = (maxSlots === 50) ? "🪙 3 Coins" : "🪙 2 Coins"; topRankReward = "🪙 10 Coins"; winnerReward = "🪙 100 Coins"; }
                else if (currentMode === "Duo") { fee = 15; perKillReward = "🪙 5 Coins"; topRankReward = "🪙 20 Coins"; winnerReward = "🪙 200 Coins"; }
                else { fee = 20; perKillReward = "🪙 5 Coins"; topRankReward = "🪙 20 Coins"; winnerReward = "🪙 400 Coins"; }
            } else {
                if (currentMode === "Solo") { fee = 15; perKillReward = "🪙 10 Coins"; topRankReward = "🪙 100 Coins"; winnerReward = "🪙 500 Coins"; }
                else if (currentMode === "Duo") { fee = 20; perKillReward = "🪙 10 Coins"; topRankReward = "🪙 200 Coins"; winnerReward = "🪙 800 Coins"; }
                else { fee = 25; perKillReward = "🪙 10 Coins"; topRankReward = "🪙 300 Coins"; winnerReward = "🪙 1200 Coins"; }
            }

            tournaments.push({ id: `match_${hour}_${mins}`, time: matchTime, mode: currentMode, fee: fee, rewards: { perKill: perKillReward, top10: topRankReward, winner: winnerReward }, maxSlots: maxSlots });
            currentId++;
        }
    }
    return tournaments;
}

// --- AUTH HANDLER ---
document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputVal = document.getElementById('authIdentifier').value.trim();
    const pass = document.getElementById('authPassword').value;
    const dynamicEmail = inputVal.includes('@') ? inputVal : `${inputVal}@skesports.com`;

    Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }, background: '#141a24', color: '#fff' });

    try {
        if (isSignUpMode) {
            const cred = await auth.createUserWithEmailAndPassword(dynamicEmail, pass);
            await db.collection('users').doc(cred.user.uid).set({ mobile: inputVal, coins: 0, history: [] });
            Swal.fire({ icon: 'success', title: 'Welcome! 🎉', html: 'Registered Successfully!', background: '#141a24', color: '#fff' });
        } else {
            await auth.signInWithEmailAndPassword(dynamicEmail, pass);
            Swal.close();
        }
        closeAuthModal();
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Failed', text: "Invalid Details, please try again.", background: '#141a24', color: '#fff', confirmButtonColor: '#ff4655' });
    }
});
