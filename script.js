// Google Sheet Configuration (Aapki Real ID Embedded Hai)
const SHEET_ID = '1bHcmgOmFT3z9dtWskTr3PI0cpdorwDEVdDfAYLSonBo'; 
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

// Real-Time Leaderboard Fetch Logic
async function fetchLeaderboard() {
    try {
        const response = await fetch(SHEET_URL);
        const data = await response.text();
        
        const rows = data.split('\n').slice(1); // Header row (Rank, Player Name...) ko skip kiya
        const tbody = document.getElementById('leaderboardData');
        tbody.innerHTML = ''; // Loading text hatane ke liye

        rows.forEach(row => {
            // CSV data ko columns me todne ke liye regex logic
            const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim());
            
            // Check ki row khali na ho aur kam se kam 6 columns ho
            if (columns.length >= 6 && columns[0] !== "") {
                const tr = document.createElement('tr');
                
                // Rank 1 ke player name ko special glow/color dene ke liye style class
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
        document.getElementById('leaderboardData').innerHTML = `<tr><td colspan="6" style="color: #ff4655;">Failed to load live scores. Check internet or Sheet Share access.</td></tr>`;
    }
}

// Jaise hi website open hogi, automatic background me sheet ka data load ho jayega
window.addEventListener('DOMContentLoaded', fetchLeaderboard);

// Registration Form Logic
document.getElementById('registrationForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const teamName = document.getElementById('teamName').value;
    const leaderName = document.getElementById('leaderName').value;
    const gameId = document.getElementById('gameId').value;
    const whatsapp = document.getElementById('whatsapp').value;

    const squadDetails = {
        name: teamName,
        leader: leaderName,
        uid: gameId,
        phone: whatsapp,
        registrationDate: new Date().toLocaleDateString()
    };

    // Browser ke local storage me data backup rakhne ke liye
    let registeredTeams = JSON.parse(localStorage.getItem('esportsTeams')) || [];
    registeredTeams.push(squadDetails);
    localStorage.setItem('esportsTeams', JSON.stringify(registeredTeams));

    document.getElementById('successMessage').classList.remove('hidden');
    document.getElementById('registrationForm').reset();

    alert(`🎉 Registration Successful!\nPlayer/Team: ${teamName}`);
});
