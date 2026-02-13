// --- Modal logic ---
const modalOverlay = document.getElementById('modal-overlay');
const loginBtn = document.getElementById('login-btn');
const closeModalBtn = document.getElementById('close-modal');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const inviteBtn = document.getElementById('invite-btn');
const inviteModal = document.getElementById('invite-modal');
const closeInviteBtn = document.getElementById('close-invite');
const inviteForm = document.getElementById('invite-form');
const inviteStatus = document.getElementById('invite-status');
const signupStatus = document.getElementById('signup-status');
const parlayModal = document.getElementById('parlay-modal');
const closeParlayBtn = document.getElementById('close-parlay');
const parlayList = document.getElementById('parlay-list');
const parlayForm = document.getElementById('parlay-form');
const parlayStatus = document.getElementById('parlay-status');
const heroNav = document.getElementById('hero-nav');
const gamesNote = document.getElementById('games-note');

let parlaySelections = [];
let isLoggedIn = false;
let currentUser = null;

function updateHeroNav() {
  isLoggedIn = !!localStorage.getItem('brag_user');
  currentUser = localStorage.getItem('brag_user');
  heroNav.innerHTML = '';
  heroNav.innerHTML += '<a href="leagues.html">Leagues</a>';
  heroNav.innerHTML += '<a href="#leaderboard" id="leaderboard-link">Leaderboard</a>';
  heroNav.innerHTML += '<button id="invite-btn">Invite a Friend</button>';
  if (isLoggedIn) {
    heroNav.innerHTML += '<button id="parlay-btn">My Parlay</button>';
    heroNav.innerHTML += '<button id="logout-btn">Logout</button>';
  } else {
    heroNav.innerHTML += '<button id="login-btn">Login / Sign Up</button>';
  }
  // Re-bind events
  document.getElementById('leaderboard-link').onclick = function(e) {
    e.preventDefault();
    window.location = 'leaderboard.html';
  };
  document.getElementById('invite-btn').onclick = function() {
    inviteModal.classList.remove('hidden');
    inviteForm.reset();
    inviteStatus.textContent = '';
  };
  if (isLoggedIn) {
    document.getElementById('logout-btn').onclick = function() {
      localStorage.removeItem('brag_user');
      window.location.reload();
    };
    document.getElementById('parlay-btn').onclick = function() {
      showParlayModal();
    };
    gamesNote.textContent = 'Select games to bet on. Parlay betting available!';
  } else {
    document.getElementById('login-btn').onclick = () => showModal('login');
    gamesNote.textContent = 'Login to bet for bragging rights';
  }
}

function showModal(tab = 'login') {
  modalOverlay.classList.remove('hidden');
  if(tab === 'login') {
    loginForm.style.display = '';
    signupForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    signupForm.style.display = '';
    tabLogin.classList.remove('active');
    tabSignup.classList.add('active');
  }
  loginForm.reset();
  signupForm.reset();
  signupStatus.textContent = '';
}

closeModalBtn.addEventListener('click', () => modalOverlay.classList.add('hidden'));
tabLogin.addEventListener('click', () => showModal('login'));
tabSignup.addEventListener('click', () => showModal('signup'));

window.addEventListener('DOMContentLoaded', function() {
  updateHeroNav();
});

// --- Invite a Friend Modal ---
closeInviteBtn.addEventListener('click', function() {
  inviteModal.classList.add('hidden');
});
inviteForm.onsubmit = function(e) {
  e.preventDefault();
  const email = inviteForm.elements['friend_email'].value;
  const msg = inviteForm.elements['invite_message'].value;
  setTimeout(function() {
    inviteStatus.textContent = 'Invite sent to ' + email + '!';
  }, 600);
  inviteForm.reset();
};

// --- Parlay Modal ---
function showParlayModal() {
  renderParlayList();
  parlayModal.classList.remove('hidden');
  parlayStatus.textContent = '';
  parlayForm.reset();
}
closeParlayBtn.addEventListener('click', function() {
  parlayModal.classList.add('hidden');
});
parlayForm.onsubmit = function(e) {
  e.preventDefault();
  if (!isLoggedIn) {
    parlayStatus.textContent = 'You must be logged in to place a parlay bet.';
    return;
  }
  const amount = parseInt(parlayForm.elements['parlay_amount'].value, 10);
  if (!amount || amount < 1) {
    parlayStatus.textContent = 'Enter a valid wager amount.';
    return;
  }
  if (!parlaySelections.length) {
    parlayStatus.textContent = 'Select at least one bet.';
    return;
  }
  // Simulate adding parlay wager to user
  const user = bragUsers.find(u => u.username === currentUser);
  if (!user) {
    parlayStatus.textContent = 'User not found.';
    return;
  }
  if (user.balance < amount) {
    parlayStatus.textContent = 'Insufficient balance.';
    return;
  }
  user.balance -= amount;
  user.wagers.unshift({
    game: parlaySelections.map(sel => sel.teams + ' (' + sel.pick + ' @ ' + sel.odds + ')').join(' + '),
    amount,
    pick: 'Parlay',
    odds: parlaySelections.map(sel => sel.odds).join(' / '),
    result: 'Pending'
  });
  parlaySelections = [];
  parlayStatus.textContent = 'Parlay bet placed!';
  renderParlayList();
  setTimeout(() => {
    parlayModal.classList.add('hidden');
  }, 1200);
}
function renderParlayList() {
  if (!parlaySelections.length) {
    parlayList.innerHTML = '<div class="note">No selections in your parlay yet.</div>';
    return;
  }
  parlayList.innerHTML = parlaySelections.map((sel, i) =>
    `<div style="margin-bottom:0.5rem;">
      <b>${sel.teams}</b> - <span style="color:#3fa7ff;">${sel.pick} @ ${sel.odds}</span>
      <button style="margin-left:1rem;background:#e74c3c;color:#fff;padding:0.2rem 0.7rem;border-radius:4px;" onclick="removeParlaySelection(${i})">Remove</button>
    </div>`
  ).join('');
}
window.removeParlaySelection = function(idx) {
  parlaySelections.splice(idx, 1);
  renderParlayList();
};

// --- Games (API or Simulated) ---
function getApiKey() {
  return localStorage.getItem('odds_api_key') || (window.BRAG_CONFIG && window.BRAG_CONFIG.oddsApiKey) || '';
}
function fetchGamesFromApi() {
  const apiKey = getApiKey();
  if(!apiKey) return Promise.resolve(null);
  const sports = ['basketball_nba','icehockey_nhl','baseball_mlb','americanfootball_nfl','boxing','mma_mixed_martial_arts'];
  const promises = sports.map(sport =>
    fetch(`https://api.the-odds-api.com/v4/sports/${sport}/odds/?regions=us&markets=h2h,spreads,totals&apiKey=${apiKey}`)
      .then(r => r.ok ? r.json() : [])
      .catch(() => [])
  );
  return Promise.all(promises).then(results => results.flat());
}
function getRandomOdds() {
  const odds = Math.random() > 0.5 ? Math.floor(Math.random() * 200 + 100) : -Math.floor(Math.random() * 200 + 100);
  return odds > 0 ? `+${odds}` : `${odds}`;
}
const sampleGames = [
  { teams: 'New York Knights vs. Chicago Blaze', time: '7:00 PM', odds: [getRandomOdds(), getRandomOdds()] },
  { teams: 'LA Waves vs. Miami Sharks', time: '8:30 PM', odds: [getRandomOdds(), getRandomOdds()] },
  { teams: 'Dallas Bulls vs. Seattle Storm', time: '9:00 PM', odds: [getRandomOdds(), getRandomOdds()] },
  { teams: 'Boston Titans vs. Denver Eagles', time: '6:00 PM', odds: [getRandomOdds(), getRandomOdds()] },
];
let lastGames = [];
function renderGames(games) {
  const gamesList = document.getElementById('games-list');
  gamesList.innerHTML = '';
  lastGames = [];
  if(games && games.length) {
    games.slice(0, 10).forEach((game, idx) => {
      let teams = game.home_team && game.away_team ? `${game.home_team} vs. ${game.away_team}` : (game.teams || 'Matchup');
      let odds = ['+100','-110'];
      if(game.bookmakers && game.bookmakers.length) {
        const market = game.bookmakers[0].markets.find(m => m.key === 'h2h');
        if(market && market.outcomes.length >= 2) {
          odds = market.outcomes.map(o => o.price > 0 ? `+${o.price}` : `${o.price}`);
        }
      } else if(game.odds) {
        odds = game.odds;
      }
      const time = game.commence_time ? new Date(game.commence_time).toLocaleString() : (game.time || '');
      const teamParts = teams.split(' vs. ');
      const sportKey = game.sport_key || 'basketball_nba';
      lastGames.push({ teams, odds, time, sportKey, home_team: game.home_team || teamParts[0], away_team: game.away_team || teamParts[1] });
      const div = document.createElement('div');
      div.className = 'game-card';
      div.innerHTML = `
        <div class="teams">${teams}</div>
        <div class="odds">Odds: <span>${odds[0]}</span> / <span>${odds[1]}</span></div>
        <div class="note">${time}</div>
        <div style="margin-top:0.7rem;">
          <button data-game="${idx}" data-pick="0">Bet ${teamParts[0]} (${odds[0]})</button>
          <button data-game="${idx}" data-pick="1">Bet ${teamParts[1]} (${odds[1]})</button>
          <button data-game="${idx}" data-parlay="1">Add to Parlay</button>
          <button data-game="${idx}" data-stats="1" class="stats-btn">Stats</button>
        </div>
      `;
      gamesList.appendChild(div);
    });
  } else {
    sampleGames.forEach((game, idx) => {
      const teamParts = game.teams.split(' vs. ');
      lastGames.push({ teams: game.teams, odds: game.odds, time: game.time, sportKey: 'basketball_nba', home_team: teamParts[0], away_team: teamParts[1] });
      const div = document.createElement('div');
      div.className = 'game-card';
      div.innerHTML = `
        <div class="teams">${game.teams}</div>
        <div class="odds">Odds: <span>${game.odds[0]}</span> / <span>${game.odds[1]}</span></div>
        <div style="margin-top:0.7rem;">
          <button data-game="${idx}" data-pick="0">Bet ${teamParts[0]} (${game.odds[0]})</button>
          <button data-game="${idx}" data-pick="1">Bet ${teamParts[1]} (${game.odds[1]})</button>
          <button data-game="${idx}" data-parlay="1">Add to Parlay</button>
          <button data-game="${idx}" data-stats="1" class="stats-btn">Stats</button>
        </div>
      `;
      gamesList.appendChild(div);
    });
  }
  // Bind bet buttons
  document.querySelectorAll('.game-card button[data-pick]').forEach(btn => {
    btn.onclick = function() {
      if (!isLoggedIn) {
        showModal('login');
        return;
      }
      const idx = +btn.getAttribute('data-game');
      const pickIdx = +btn.getAttribute('data-pick');
      const game = lastGames[idx];
      const pick = game.teams.split(' vs. ')[pickIdx];
      const odds = game.odds[pickIdx];
      const amount = prompt(`How much do you want to bet on ${pick} @ ${odds}?`, '100');
      if (!amount || isNaN(amount) || +amount < 1) return;
      const user = bragUsers.find(u => u.username === currentUser);
      if (!user) return alert('User not found.');
      if (user.balance < +amount) return alert('Insufficient balance.');
      user.balance -= +amount;
      user.wagers.unshift({
        game: game.teams,
        amount: +amount,
        pick,
        odds,
        result: 'Pending'
      });
      alert('Bet placed!');
    };
  });
  // Bind Stats buttons
  document.querySelectorAll('.game-card button[data-stats]').forEach(btn => {
    btn.onclick = function() {
      const idx = +btn.getAttribute('data-game');
      const game = lastGames[idx];
      if (!game || !window.bragStats) return;
      const leagueId = window.bragStats.oddsToLeague(game.sportKey);
      window.bragStats.findMatchingEvent(leagueId, game.home_team, game.away_team).then(function(match) {
        if (match) {
          window.bragStats.showMatchupModal(match.leagueId, match.eventId);
        } else {
          alert('No matching game found in scoreboard. The stats server may need to harvest today\'s games.');
        }
      });
    };
  });
  // Bind Stats buttons
  document.querySelectorAll('.game-card button[data-stats]').forEach(btn => {
    btn.onclick = function() {
      const idx = +btn.getAttribute('data-game');
      const game = lastGames[idx];
      if (!game || !window.bragStats) return;
      const leagueId = window.bragStats.oddsToLeague(game.sportKey);
      window.bragStats.findMatchingEvent(leagueId, game.home_team, game.away_team).then(function(match) {
        if (match) {
          window.bragStats.showMatchupModal(match.leagueId, match.eventId);
        } else {
          alert('No matching game found in scoreboard. The stats server may need to harvest today\'s games.');
        }
      });
    };
  });
  // Bind parlay add buttons
  document.querySelectorAll('.game-card button[data-parlay]').forEach(btn => {
    btn.onclick = function() {
      if (!isLoggedIn) {
        showModal('login');
        return;
      }
      const idx = +btn.getAttribute('data-game');
      const game = lastGames[idx];
      // Ask which team
      const teams = game.teams.split(' vs. ');
      const pick = prompt(`Add to parlay: Pick a team:\n1. ${teams[0]} (${game.odds[0]})\n2. ${teams[1]} (${game.odds[1]})`, '1');
      if (pick !== '1' && pick !== '2') return;
      const pickIdx = pick === '1' ? 0 : 1;
      parlaySelections.push({
        teams: game.teams,
        pick: teams[pickIdx],
        odds: game.odds[pickIdx]
      });
      alert('Added to parlay!');
    };
  });
}
fetchGamesFromApi().then(games => renderGames(games));

// --- Polls (Simulated + Admin Added) ---
function getPolls() {
  let polls = [];
  try {
    polls = JSON.parse(localStorage.getItem('brag_polls')||'[]');
  } catch(e) { polls = []; }
  polls = polls.filter(p => {
    if (!p.question) return false;
    const q = p.question.toLowerCase();
    if (q.includes('template') || q.includes('test') || q.includes('tester')) return false;
    return true;
  });
  localStorage.setItem('brag_polls', JSON.stringify(polls));
  return polls;
}
function savePolls(polls) {
  localStorage.setItem('brag_polls', JSON.stringify(polls));
}
function renderPolls() {
  let polls = getPolls();
  const now = new Date();
  polls = polls.filter(p => !p.schedule || new Date(p.schedule) <= now);
  const pollsList = document.getElementById('polls-list');
  pollsList.innerHTML = '';
  if (!polls.length) {
    pollsList.innerHTML = '<div class="note">No polls available at the moment. Check back soon!</div>';
    return;
  }
  polls.forEach((poll, idx) => {
    const div = document.createElement('div');
    div.className = 'poll-card';
    const shareUrl = (() => {
      var base = localStorage.getItem('brag_site_url') || '';
      if (!base) base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
      base = base.replace(/\/$/, '');
      return base + (base ? '/' : '') + 'poll.html?question=' + encodeURIComponent(poll.question) + '&opts=' + encodeURIComponent((poll.options || []).join(', '));
    })();
    div.innerHTML = `
      <div class="poll-question">${poll.question}</div>
      <div class="poll-options">
        ${poll.options.map((opt, i) => `<button data-poll="${idx}" data-opt="${i}">${opt} (${poll.votes && poll.votes[i] ? poll.votes[i] : 0})</button>`).join(' ')}
      </div>
      <button class="poll-share-btn" data-share-url="${shareUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" title="Share on Facebook">Share on Facebook</button>
      <div class="comments">
        ${(poll.comments||[]).map(c => `<div class="comment"><b>${c.user}:</b> ${c.text}</div>`).join('')}
        <div class="add-comment">
          <input type="text" placeholder="Add a comment..." data-poll="${idx}" />
          <button data-poll="${idx}">Send</button>
        </div>
      </div>
    `;
    pollsList.appendChild(div);
  });
  document.querySelectorAll('.poll-options button').forEach(btn => {
    btn.onclick = function() {
      const pollIdx = +btn.getAttribute('data-poll');
      const optIdx = +btn.getAttribute('data-opt');
      let polls = getPolls();
      if (!polls[pollIdx].votes) polls[pollIdx].votes = polls[pollIdx].options.map(()=>0);
      polls[pollIdx].votes[optIdx]++;
      savePolls(polls);
      renderPolls();
    };
  });
  document.querySelectorAll('.add-comment button').forEach(btn => {
    btn.onclick = function() {
      const pollIdx = +btn.getAttribute('data-poll');
      const input = document.querySelector(`.add-comment input[data-poll="${pollIdx}"]`);
      if (input.value.trim()) {
        let polls = getPolls();
        if (!polls[pollIdx].comments) polls[pollIdx].comments = [];
        polls[pollIdx].comments.push({ user: localStorage.getItem('brag_user') || 'Guest', text: input.value });
        savePolls(polls);
        input.value = '';
        renderPolls();
      }
    };
  });
  document.querySelectorAll('.poll-share-btn').forEach(btn => {
    btn.onclick = function() {
      const url = btn.getAttribute('data-share-url');
      if (url) {
        const fbShare = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
        window.open(fbShare, 'facebook-share', 'width=600,height=400,scrollbars=no');
      }
    };
  });
}
function checkAndPostPollsToFacebook() {
  let polls = [];
  try { polls = JSON.parse(localStorage.getItem('brag_polls')||'[]'); } catch(e) { polls = []; }
  if (!polls.length) return;
  const now = new Date();
  let changed = false;
  polls.forEach((poll, idx) => {
    if (!poll.posted && (!poll.schedule || new Date(poll.schedule) <= now)) {
      const fbLink = localStorage.getItem('fb_page_link') || '';
      if (fbLink) {
        console.log(`[Bragging Rights] Poll posted to Facebook: ${poll.question} (see ${fbLink})`);
      }
      poll.posted = true;
      changed = true;
    }
  });
  if (changed) localStorage.setItem('brag_polls', JSON.stringify(polls));
}
setInterval(checkAndPostPollsToFacebook, 10000);
renderPolls();

// --- Auth logic (Simulated) ---
loginForm.onsubmit = function(e) {
  e.preventDefault();
  const username = loginForm.elements['username'].value;
  const password = loginForm.elements['password'].value;
  if (username === 'SolarBrone' && password === '1323Ford') {
    localStorage.setItem('brag_admin', 'true');
    modalOverlay.classList.add('hidden');
    window.location = 'admin.html';
    return;
  }
  if (typeof bragUsers !== 'undefined') {
    const user = bragUsers.find(u => u.username === username);
    if (user) {
      localStorage.setItem('brag_user', user.username);
      modalOverlay.classList.add('hidden');
      window.location = 'profile.html';
      return;
    }
  }
  alert('Invalid login. Please check your credentials.');
};
signupForm.onsubmit = function(e) {
  e.preventDefault();
  const username = signupForm.elements['username'].value;
  const password = signupForm.elements['password'].value;
  const email = signupForm.elements['email'].value;
  if (typeof bragUsers !== 'undefined') {
    if (bragUsers.find(u => u.username === username)) {
      signupStatus.textContent = 'Username already exists. Please choose another.';
      return;
    }
    if (bragUsers.find(u => u.email === email)) {
      signupStatus.textContent = 'Email already registered. Please login or use another.';
      return;
    }
  }
  // Simulate email verification (show message, not real email)
  signupStatus.textContent = 'Verification email sent to ' + email + '. Please check your inbox.';
  setTimeout(function() {
    bragUsers.push({
      username: username,
      email: email,
      balance: 10000,
      wagers: [],
      rank: bragUsers.length + 1
    });
    localStorage.setItem('brag_user', username);
    modalOverlay.classList.add('hidden');
    window.location = 'profile.html';
  }, 1200);
};
