// Google Sheet Configuration
const SHEET_ID = '1bHcmgOmFT3z9dtWskTr3PI0cpdorwDEVdDfAYLSonBo'; 
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

// TODO: Yahan apna asli WhatsApp number dalein (Prefix '91' for India, bina '+' ke)
const ADMIN_WHATSAPP = 'YOUR_PERSONAL_WHATSAPP_NUMBER_HERE'; 

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

// Registration Form Logic via WhatsApp Direct Redirect
document.getElementById('registrationForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const teamName = document.getElementById('teamName').value;
    const leaderName = document.getElementById('leaderName').value;
    const gameId = document.getElementById('gameId').value;
    const whatsapp = document.getElementById('whatsapp').value;

    // WhatsApp Message Format Tyar karna
    const message = `*🔥 NEW REGISTRATION - SK ESPORTS *%0A%0A` +
                    `• *Team/Player Name:* ${encodeURIComponent(teamName)}%0A` +
                    `• *IGL Name:* ${encodeURIComponent(leaderName)}%0A` +
                    `• *Character UID:* ${encodeURIComponent(gameId)}%0A` +
                    `• *WhatsApp:* ${encodeURIComponent(whatsapp)}%0A%0A` +
                    `Kindly approve our squad slot! 🏆`;

    document.getElementById('successMessage').classList.remove('hidden');

    // Official WhatsApp API link banana aur new tab me open karna
    const whatsappURL = `https://api.whatsapp.com/send?phone=${ADMIN_WHATSAPP}&text=${message}`;
    
    setTimeout(() => {
        window.open(whatsappURL, '_blank');
        document.getElementById('registrationForm').reset();
        document.getElementById('successMessage').classList.add('hidden');
    }, 1000);
});
