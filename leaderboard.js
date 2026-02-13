// Show top 20 users
function renderLeaderboard() {
  const tbody = document.querySelector('#leaderboard-table tbody');
  tbody.innerHTML = bragUsers.slice(0, 20).map((u, i) => `
    <tr>
      <td style="color:#3fa7ff;font-weight:bold;">${i+1}</td>
      <td>${u.username}</td>
      <td>$${u.balance.toLocaleString()}</td>
      <td>${u.wagers.length}</td>
    </tr>
  `).join('');
}
renderLeaderboard();
