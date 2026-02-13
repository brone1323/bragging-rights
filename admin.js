// Admin page logic
if (!localStorage.getItem('brag_admin')) {
  window.location = 'index.html';
}
const oddsApiForm = document.getElementById('odds-api-form');
const fbLinkForm = document.getElementById('fb-link-form');
const pollForm = document.getElementById('poll-form');
const adminMsg = document.getElementById('admin-message');

// Save/retrieve API key
oddsApiForm.onsubmit = function(e) {
  e.preventDefault();
  const key = document.getElementById('odds-api-key').value;
  localStorage.setItem('brag_odds_api', key);
  adminMsg.textContent = 'API Key saved!';
};
// Save/retrieve FB link
fbLinkForm.onsubmit = function(e) {
  e.preventDefault();
  const link = document.getElementById('fb-link').value;
  localStorage.setItem('brag_fb_link', link);
  adminMsg.textContent = 'Facebook link saved!';
};
// Poll writer
pollForm.onsubmit = function(e) {
  e.preventDefault();
  const q = document.getElementById('poll-question').value;
  const opts = document.getElementById('poll-options').value.split(',').map(s=>s.trim()).filter(Boolean);
  const date = document.getElementById('poll-date').value;
  if (!q || opts.length < 2) {
    adminMsg.textContent = 'Please enter a question and at least two options.';
    return;
  }
  // Demo: just show message
  adminMsg.textContent = `Poll scheduled for ${date||'today'}: "${q}" [${opts.join(', ')}]`;
  pollForm.reset();
};
document.getElementById('logoutAdminBtn').onclick = function() {
  localStorage.removeItem('brag_admin');
  window.location = 'index.html';
};
