// Google Form Configuration
const FORM_ID = '1FAIpQLSc1PwlapdeInrpvskjMK0xi2f9QhGPQOkVXZ6uT6yF0uwYTWQ'; 
const ENTRY_ID = 'entry.72166992'; 

// Live Leaderboard Fetch Logic (From Google Sheet)
const SHEET_ID = '1bHcmgOmFT3z9dtWskTr3PI0cpdorwDEVdDfAYLSonBo'; 
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

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

// Submitting data using hidden HTML form submission to bypass CORS blocks completely
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

    const combinedData = `Game: ${game} | Tournament: ${tournament} | Player: ${name} | UID: ${uid} | Phone: ${phone}`;

    // Ek temporary hidden form banana jo browser background me submit karega
    const hiddenForm = document.createElement('form');
    hiddenForm.method = 'POST';
    hiddenForm.action = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;
    hiddenForm.target = 'hidden_iframe'; // Isse page redirect nahi hoga

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = ENTRY_ID;
    hiddenInput.value = combinedData;

    hiddenForm.appendChild(hiddenInput);
    document.body.appendChild(hiddenForm);

    // Iframe banana takki user ko lagatar website hi dikhe
    let iframe = document.getElementById('hidden_iframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.name = 'hidden_iframe';
        iframe.id = 'hidden_iframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }

    // Form submit karna
    hiddenForm.submit();

    // Cleanup aur success screen dikhana
    setTimeout(() => {
        document.body.removeChild(hiddenForm);
        showSection('success-screen');
        document.getElementById('megaForm').reset();
        btn.innerText = "Complete Registration & Pay";
        btn.disabled = false;
    }, 1500);
});

// Live Leaderboard Loader logic
async function fetchLeaderboard() {
    try {
        const response = await fetch(SHEET_URL);
        const data = await response.text();
        const rows = data.split('\n').slice(1);
        const tbody = document.getElementById('leaderboardData');
        if(tbody) {
            tbody.innerHTML = ''; 
            rows.forEach(row => {
                const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim());
                if (columns.length >= 6 && columns[0] !== "") {
                    const tr = document.createElement('tr');
                    const isRankOne = columns[0] === '1' ? 'class="highlight-team"' : '';
                    tr.innerHTML = `<td>${columns[0]}</td><td ${isRankOne}>${columns[1]}</td><td>${columns[2]}</td><td>${columns[3]}</td><td>${columns[4]}</td><td><strong>${columns[5]}</strong></td>`;
                    tbody.appendChild(tr);
                }
            });
        }
    } catch (error) {
        console.error("Leaderboard loading error:", error);
    }
}
window.addEventListener('DOMContentLoaded', fetchLeaderboard);
