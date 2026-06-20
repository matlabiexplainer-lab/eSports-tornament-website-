// Google Form Configuration (Aapki IDs ke sath)
const FORM_ID = '1FAIpQLSc1PwlapdeInrpvskjMK0xi2f9QhGPQOkVXZ6uT6yF0uwYTWQ'; 
const ENTRY_ID = 'entry.72166992'; 

const TOURNAMENT_DATA = {
    "Free Fire MAX": [
        { id: "ff_t1", title: "FFMAX Solo Clash Squad", fee: "₹20", prize: "₹500", slots: "12/48 Left" },
        { id: "ff_t2", title: "SK Free Fire Daily Cup", fee: "₹50", prize: "₹1500", slots: "30/100 Left" }
    ],
    "BGMI": [
        { id: "bgmi_t1", title: "BGMI Erangel Ultimate Crux", fee: "₹30", prize: "₹1000", slots: "22/100 Left" },
        { id: "bgmi_t2", title: "SK BGMI Sunday Grand Arena", fee: "Free", prize: "₹300", slots: "85/100 Left" }
    ]
};

let currentSelection = { game: "", tournament: "", fee: "" };

function showSection(sectionId) {
    document.querySelectorAll('.interface-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    window.scrollTo(0,0);
}

function selectGame(gameName) {
    currentSelection.game = gameName;
    document.getElementById('selected-game-title').innerText = `${gameName} - Live Tournaments`;
    
    const container = document.getElementById('tournaments-container');
    container.innerHTML = "";
    
    TOURNAMENT_DATA[gameName].forEach(t => {
        const card = document.createElement('div');
        card.className = "t-card";
        card.innerHTML = `
            <div class="t-info">
                <h3>${t.title}</h3>
                <div class="t-details">
                    <span>💰 Entry: ${t.fee}</span>
                    <span>🏆 Prize: ${t.prize}</span>
                    <span>🔥 Slots: ${t.slots}</span>
                </div>
            </div>
            <button class="join-btn" onclick="openRegistrationFlow('${t.title}', '${t.fee}')">Participate</button>
        `;
        container.appendChild(card);
    });
    
    showSection('tournament-view');
}

function openRegistrationFlow(tTitle, tFee) {
    currentSelection.tournament = tTitle;
    currentSelection.fee = tFee;
    document.getElementById('flow-fee').innerText = tFee;
    showSection('registration-flow');
}

// 100% Working Submit Method: Isme browser block nahi karega
document.getElementById('megaForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const btn = document.getElementById('submitFlowBtn');
    btn.innerText = "Processing & Saving Securely...";
    btn.disabled = true;

    const game = currentSelection.game;
    const tournament = currentSelection.tournament;
    const name = document.getElementById('pName').value;
    const uid = document.getElementById('pUid').value;
    const phone = document.getElementById('pPhone').value;

    // Saare data ko ek single text line me format karna
    const combinedData = `Game: ${game} | Tournament: ${tournament} | Player: ${name} | UID: ${uid} | Phone: ${phone}`;

    // Ek hidden image request generator banayein jo background me bina CORS ke form hit karega
    const beacon = new Image();
    beacon.src = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse?${ENTRY_ID}=${encodeURIComponent(combinedData)}&submit=Submit`;

    // 1 second baad screen change kar dein
    setTimeout(() => {
        showSection('success-screen');
        document.getElementById('megaForm').reset();
        btn.innerText = "Complete Registration & Pay";
        btn.disabled = false;
    }, 1200);
});
