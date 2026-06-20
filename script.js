// Google Firebase Premium Configuration (Gaurav's Live Keys Connected)
const firebaseConfig = {
    apiKey: "AIzaSyB-C7Ks_lXWWf1RMKUQ8cPuhov5y7ZveXM",
    authDomain: "sk-esports-90bf9.firebaseapp.com",
    projectId: "sk-esports-90bf9",
    storageBucket: "sk-esports-90bf9.firebasestorage.app",
    messagingSenderId: "471222264434",
    appId: "1:471222264434:web:b54a25264d5b2ae70a58eb",
    measurementId: "G-KW6J0GE4TF"
};

// Initialize Firebase App & Database using Compatibility Layer
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Formspree Backup Database Endpoint URL
const FORMSPREE_URL = 'https://formspree.io/f/xnjyelpq'; 

// Live Static Tournament Structure
const TOURNAMENT_DATA = {
    "Free Fire MAX": [
        { id: "ff_t1", title: "FFMAX Solo Clash Squad", fee: 20, prize: "₹500", slots: "12/48 Left" },
        { id: "ff_t2", title: "SK Free Fire Daily Cup", fee: 50, prize: "₹1500", slots: "30/100 Left" }
    ],
    "BGMI": [
        { id: "bgmi_t1", title: "BGMI Erangel Ultimate Crux", fee: 30, prize: "₹1000", slots: "22/100 Left" },
        { id: "bgmi_t2", title: "SK BGMI Sunday Grand Arena", fee: 0, prize: "₹300", slots: "85/100 Left" }
    ]
};

let currentSelection = { game: "", tournament: "", fee: 0 };
let currentUserData = null;
let isSignUpMode = false;

// Monitor user session status in real-time
auth.onAuthStateChanged(async (user) => {
    const loginBtn = document.getElementById('loginNavBtn');
    const profileHeader = document.getElementById('userProfileHeader');
    
    if (user) {
        if(loginBtn) loginBtn.classList.add('hidden');
        if(profileHeader) profileHeader.classList.remove('hidden');
        
        // Fetch active real-time coins from user profile
        db.collection('users').doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                currentUserData = doc.data();
                const coinEl = document.getElementById('user-coins');
                if(coinEl) coinEl.innerText = currentUserData.coins;
            }
        }, (err) => {
            console.error("Snapshot error:", err);
        });
    } else {
        if(loginBtn) loginBtn.classList.remove('hidden');
        if(profileHeader) profileHeader.classList.add('hidden');
        currentUserData = null;
    }
});

// Navigation & Auth Flow State management
function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? "Signup to SK eSports" : "Login to SK eSports";
    document.getElementById('authSubmitBtn').innerText = isSignUpMode ? "Register Account" : "Login";
}

// Intercept Auth Actions & Process Sign-in
document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputVal = document.getElementById('authIdentifier').value.trim();
    const pass = document.getElementById('authPassword').value;

    // Convert raw mobile number/username safely into internal email strings
    const dynamicEmail = inputVal.includes('@') ? inputVal : `${inputVal}@skesports.com`;

    try {
        if (isSignUpMode) {
            const cred = await auth.createUserWithEmailAndPassword(dynamicEmail, pass);
            // Default 0 coins assigned to every new signup user document
            await db.collection('users').doc(cred.user.uid).set({
                mobile: inputVal,
                coins: 0
            });
            alert("Registration Complete! Default wallet: 0 Coins. Please contact Admin to top up.");
        } else {
            await auth.signInWithEmailAndPassword(dynamicEmail, pass);
        }
        closeAuthModal();
    } catch (err) {
        alert("Authentication Failed: " + err.message);
    }
});

function logoutUser() { auth.signOut().then(() => location.reload()); }

// Security Gatekeeper Layer
function checkAuthAndSelect(gameName) {
    if (!auth.currentUser) {
        alert("Matches dekhne aur participate karne ke liye pehle Login karein!");
        openAuthModal();
        return;
    }
    selectGame(gameName);
}

function showSection(sectionId) {
    document.querySelectorAll('.interface-section').forEach(s => s.classList.remove('active'));
    const targeted = document.getElementById(sectionId);
    if(targeted) targeted.classList.add('active');
}

function selectGame(gameName) {
    currentSelection.game = gameName;
    document.getElementById('selected-game-title').innerText = `${gameName} - Live Tournaments`;
    const container = document.getElementById('tournaments-container');
    if(!container) return;
    container.innerHTML = "";
    
    TOURNAMENT_DATA[gameName].forEach(t => {
        const card = document.createElement('div');
        card.className = "t-card";
        card.innerHTML = `
            <div class="t-info">
                <h3>${t.title}</h3>
                <div class="t-details">
                    <span>🪙 Entry: ${t.fee} Coins</span>
                    <span>🏆 Prize: ${t.prize}</span>
                </div>
            </div>
            <button class="join-btn" onclick="processParticipation('${t.title}', ${t.fee})">Join Now</button>
        `;
        container.appendChild(card);
    });
    showSection('tournament-view');
}

// Transaction Ledger System (Debits Wallet Engine)
async function processParticipation(tTitle, tFee) {
    if (!currentUserData) {
        alert("Error: Profile session missing. Re-login required.");
        return;
    }
    
    // Check wallet capacity limits
    if (currentUserData.coins < tFee) {
        showSection('wallet-topup');
        return;
    }

    const newBalance = currentUserData.coins - tFee;
    const userUID = auth.currentUser.uid;
    const btn = document.querySelector(`button[onclick*="${tTitle}"]`);
    if(btn) btn.disabled = true;

    try {
        // Execute atomic document storage update
        await db.collection('users').doc(userUID).update({ coins: newBalance });
        
        // Push payload metrics safely to backup Formspree console logs
        await fetch(FORMSPREE_URL, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Status: "SUCCESSFUL_DEBIT",
                Player_UID: userUID,
                User_Mobile: currentUserData.mobile,
                Target_Game: currentSelection.game,
                Target_Tournament: tTitle,
                Fee_Deducted: tFee,
                Remaining_Balance: newBalance
            })
        });

        showSection('success-screen');
    } catch (err) {
        alert("Transaction Aborted: " + err.message);
    } finally {
        if(btn) btn.disabled = false;
    }
}
