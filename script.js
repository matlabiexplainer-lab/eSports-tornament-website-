// Google Sheet Configuration
const SHEET_ID = '1bHcmgOmFT3z9dtWskTr3PI0cpdorwDEVdDfAYLSonBo'; 
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

// Fixed Number with quotes - explicit fix for zero drop issue
const ADMIN_WHATSAPP = '916206792655'; 

// Real-Time Leaderboard Fetch Logic
async function fetchLeaderboard() {
    try {
        const response = await fetch(SHEET_URL);
        const data = await response.text();
        
        const rows = data.split('\n').slice(1);
        const tbody = document.getElementById('leaderboardData');
        tbody.innerHTML = ''; 

        rows.forEach(row => {
            const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim());
            
            if (columns.length >= 6 && columns[0] !== "") {
                const tr = document.createElement('tr');
                const isRankOne = columns[0] === '1' ? 'class="highlight-team"' : '';

                tr.innerHTML = `
                    <td>${columns[0]}</td>
                    <td ${isRankOne}>${columns[1]}</td>
                    <td>${columns[2]}</td>
                    <td>${columns[3]}</td>
                    <td>${columns[4]}</td>
                    <td><strong>${columns[5]}</strong></td>
                `;
                tbody.appendChild(tr);
            }
        });
    } catch (error) {
        console.error("Leaderboard load karne me dikkat aai:", error);
        document.getElementById('leaderboardData').innerHTML = `<tr><td colspan="6" style="color: #ff4655;">Failed to load live scores.</td></tr>`;
    }
}

window.addEventListener('DOMContentLoaded', fetchLeaderboard);

// Registration Form Logic
document.getElementById('registrationForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const selectedGame = document.getElementById('selectGame').value;
    const playerName = document.getElementById('playerName').value;
    const gameId = document.getElementById('gameId').value;
    const whatsapp = document.getElementById('whatsapp').value;

    // WhatsApp Message Design
    const message = `*🔥 NEW REGISTRATION - SK ESPORTS*%0A%0A` +
                    `• *Game Selected:* ${encodeURIComponent(selectedGame)}%0A` +
                    `• *Player Name:* ${encodeURIComponent(playerName)}%0A` +
                    `• *Character UID:* ${encodeURIComponent(gameId)}%0A` +
                    `• *WhatsApp:* ${encodeURIComponent(whatsapp)}%0A%0A` +
                    `Kindly approve my tournament slot! 🏆`;

    document.getElementById('successMessage').classList.remove('hidden');

    const whatsappURL = `https://api.whatsapp.com/send?phone=${ADMIN_WHATSAPP}&text=${message}`;
    
    setTimeout(() => {
        window.open(whatsappURL, '_blank');
        document.getElementById('registrationForm').reset();
        document.getElementById('successMessage').classList.add('hidden');
    }, 1000);
});
