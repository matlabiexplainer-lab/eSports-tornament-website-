document.getElementById('registrationForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Page reload hone se rokne ke liye

    // Inputs se data nikalna
    const teamName = document.getElementById('teamName').value;
    const leaderName = document.getElementById('leaderName').value;
    const gameId = document.getElementById('gameId').value;
    const whatsapp = document.getElementById('whatsapp').value;

    // Ek object me data save karna
    const squadDetails = {
        team: teamName,
        leader: leaderName,
        uid: gameId,
        phone: whatsapp,
        registrationDate: new Date().toLocaleDateString()
    };

    // LocalStorage me data save karna (Taki browser band hone par bhi data rahe)
    let registeredTeams = JSON.parse(localStorage.getItem('esportsTeams')) || [];
    registeredTeams.push(squadDetails);
    localStorage.setItem('esportsTeams', JSON.stringify(registeredTeams));

    // Success Message dikhana
    document.getElementById('successMessage').classList.remove('hidden');
    
    // Form ko khali karna
    document.getElementById('registrationForm').reset();

    // Alert me data dikhana (Testing ke liye)
    alert(`Thank you ${leaderName}! Team "${teamName}" has been successfully registered.`);
    
    console.log("All Registered Teams:", registeredTeams);
});
