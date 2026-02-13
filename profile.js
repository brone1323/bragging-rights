// Simulated user data
const currentUser = window.localStorage.getItem('brag_user');
if (!currentUser) {
  window.location = 'index.html';
}

function getUserData(username) {
  // Simulated lookup from users.js
  return bragUsers.find(u => u.username === username) || bragUsers[0];
}

function renderProfile() {
  const user = getUserData(currentUser);
  const summary = document.getElementById('profile-summary');
  summary.innerHTML = `
    <div><b>Username:</b> ${user.username}</div>
    <div><b>Email:</b> ${user.email}</div>
    <div><b>Current Balance:</b> <span style="color:#3fa7ff;">$${user.balance.toLocaleString()}</span></div>
    <div><b>Leaderboard Standing:</b> <span style="color:#3fa7ff;">#${user.rank}</span></div>
    <div><b>Invite Link:</b> <input type="text" value="https://braggingrights.com/invite/${user.username}" readonly style="width:60%" /></div>
  `;
  const wagers = document.getElementById('recent-wagers');
  wagers.innerHTML = user.wagers.slice(0, 5).map(w => `
    <div class="game-card">
      <div class="teams">${w.game}</div>
      <div class="odds">Bet: <span>$${w.amount}</span> on <b>${w.pick}</b> @ <span>${w.odds}</span></div>
      <div>Status: <b>${w.result}</b></div>
    </div>
  `).join('');
}
renderProfile();
