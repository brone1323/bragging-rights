// Admin page extended logic for poll management and impersonation
if (!localStorage.getItem('brag_admin')) {
  window.location = 'index.html';
}

// Site URL for sharing (must be publicly accessible for Facebook to crawl)
const siteUrlForm = document.getElementById('site-url-form');
if (siteUrlForm) {
  siteUrlForm.onsubmit = function(e) {
    e.preventDefault();
    var url = document.getElementById('site-url').value.trim().replace(/\/$/, '');
    localStorage.setItem('brag_site_url', url);
    document.getElementById('admin-status').textContent = 'Site URL saved!';
  };
  var su = document.getElementById('site-url');
  if (su) su.value = localStorage.getItem('brag_site_url') || '';
}

// Stats API URL
const statsApiForm = document.getElementById('stats-api-form');
if (statsApiForm) {
  statsApiForm.onsubmit = function(e) {
    e.preventDefault();
    var url = document.getElementById('stats-api-url');
    if (url) {
      var val = url.value.trim().replace(/\/$/, '');
      localStorage.setItem('brag_stats_api', val);
      document.getElementById('admin-status').textContent = 'Stats API URL saved!';
    }
  };
  var sau = document.getElementById('stats-api-url');
  if (sau) sau.value = localStorage.getItem('brag_stats_api') || '';
}

// Odds API Key
const oddsApiForm = document.getElementById('odds-api-form');
oddsApiForm.onsubmit = function(e) {
  e.preventDefault();
  const key = document.getElementById('odds-api-key').value;
  localStorage.setItem('odds_api_key', key);
  document.getElementById('admin-status').textContent = 'API Key saved!';
};
// Facebook Link and App ID
const fbLinkForm = document.getElementById('fb-link-form');
fbLinkForm.onsubmit = function(e) {
  e.preventDefault();
  const appId = document.getElementById('fb-app-id').value.trim();
  const link = document.getElementById('fb-link').value;
  localStorage.setItem('fb_app_id', appId);
  localStorage.setItem('fb_page_link', link);
  document.getElementById('admin-status').textContent = 'Facebook settings saved!';
};

// --- Facebook Real Sign-In ---
const fbSigninBtn = document.getElementById('fb-signin-btn');
const fbSigninStatus = document.getElementById('fb-signin-status');
let fbSignedIn = false;

// Load Facebook SDK with valid app ID
function loadFacebookSDK(appId, callback) {
  if (window.FB && window.FB.init) {
    if (callback) callback();
    return;
  }
  window.fbAsyncInit = function() {
    FB.init({
      appId      : appId,
      cookie     : true,
      xfbml      : true,
      version    : 'v21.0'
    });
    if (callback) callback();
  };
  if (!document.getElementById('facebook-jssdk')) {
    var js = document.createElement('script');
    js.id = 'facebook-jssdk';
    js.async = true;
    js.defer = true;
    js.crossOrigin = 'anonymous';
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    document.body.appendChild(js);
  } else if (window.fbAsyncInit) {
    window.fbAsyncInit();
  }
}

function checkFbLoginState() {
  if (!window.FB) {
    fbSigninStatus.textContent = 'SDK not loaded.';
    return;
  }
  FB.getLoginStatus(function(response) {
    if (response.status === 'connected') {
      fbSignedIn = true;
      localStorage.setItem('fb_signed_in', 'true');
      fbSigninStatus.textContent = 'Signed in to Facebook.';
    } else {
      fbSignedIn = false;
      localStorage.setItem('fb_signed_in', 'false');
      fbSigninStatus.textContent = 'Not signed in.';
    }
  });
}

fbSigninBtn.onclick = function(e) {
  e.preventDefault();
  const appIdInput = document.getElementById('fb-app-id');
  const appId = (appIdInput ? appIdInput.value.trim() : '') || localStorage.getItem('fb_app_id') || '';
  const pageLink = localStorage.getItem('fb_page_link') || '';
  if (!appId) {
    fbSigninStatus.textContent = 'Enter Facebook App ID and save, then try again.';
    document.getElementById('admin-status').textContent = 'Enter your Facebook App ID (from developers.facebook.com) and click Save, then sign in.';
    return;
  }
  if (!pageLink) {
    fbSigninStatus.textContent = 'Enter Facebook Page address and save.';
    document.getElementById('admin-status').textContent = 'Enter your Facebook Page address and click Save.';
    return;
  }
  if (appIdInput) localStorage.setItem('fb_app_id', appId);
  fbSigninStatus.textContent = 'Connecting...';
  loadFacebookSDK(appId, function() {
    let tries = 0;
    function attemptLogin() {
      if (!window.FB) {
        tries++;
        if (tries > 25) {
          fbSigninStatus.textContent = 'SDK failed to load.';
          document.getElementById('admin-status').textContent = 'Facebook SDK failed to load. Check your connection and try again.';
          return;
        }
        setTimeout(attemptLogin, 200);
        return;
      }
      FB.login(function(response) {
        if (response.authResponse) {
          fbSignedIn = true;
          localStorage.setItem('fb_signed_in', 'true');
          fbSigninStatus.textContent = 'Signed in to Facebook.';
          document.getElementById('admin-status').textContent = 'Facebook sign-in successful! You can now post polls to your page.';
        } else {
          fbSignedIn = false;
          localStorage.setItem('fb_signed_in', 'false');
          fbSigninStatus.textContent = 'Not signed in.';
          var msg = 'Sign-in failed or cancelled.';
          if (response && response.error_message) msg += ' ' + response.error_message;
          document.getElementById('admin-status').textContent = msg;
        }
      }, {scope: 'pages_manage_posts,pages_read_engagement,pages_show_list,pages_manage_metadata,pages_read_user_content,email,public_profile'});
    }
    attemptLogin();
  });
};

// On load: populate saved values and check FB login state if we have app ID
window.addEventListener('DOMContentLoaded', function() {
  const appIdInput = document.getElementById('fb-app-id');
  if (appIdInput) appIdInput.value = localStorage.getItem('fb_app_id') || '';
  const appId = localStorage.getItem('fb_app_id') || '';
  if (appId) {
    loadFacebookSDK(appId, function() {
      setTimeout(checkFbLoginState, 800);
    });
  }
});

// Poll Writer
const pollWriterForm = document.getElementById('poll-writer-form');
pollWriterForm.onsubmit = function(e) {
  e.preventDefault();
  const q = document.getElementById('poll-question').value;
  const opts = document.getElementById('poll-options').value.split(',').map(s=>s.trim()).filter(Boolean);
  const sched = document.getElementById('poll-schedule').value;
  if(q && opts.length>1) {
    let polls = JSON.parse(localStorage.getItem('brag_polls')||'[]');
    polls.unshift({
      question: q,
      options: opts,
      votes: opts.map(()=>0),
      comments: [],
      schedule: sched || null,
      posted: false
    });
    localStorage.setItem('brag_polls', JSON.stringify(polls));
    document.getElementById('admin-status').textContent = 'Poll added!';
    renderAdminPolls();
    // Post to Facebook if signed in and page address is set
    if (fbSignedIn && (localStorage.getItem('fb_page_link')||'').length > 0 && window.FB) {
      FB.api('/me/accounts', function(response) {
        if (response && response.data && response.data.length) {
          // Try to match the page by link
          const pageLink = localStorage.getItem('fb_page_link') || '';
          let page = response.data.find(pg => pageLink.includes(pg.id) || (pg.link && pageLink.includes(pg.link)));
          if (!page) page = response.data[0]; // fallback to first page
          const pageId = page.id;
          const pageAccessToken = page.access_token;
          FB.api(
            `/${pageId}/feed`,
            'POST',
            {
              message: `New Poll: ${q}\nOptions: ${opts.join(', ')}`,
              access_token: pageAccessToken
            },
            function(resp) {
              if (!resp || resp.error) {
                document.getElementById('admin-status').textContent += ' (Failed to post to Facebook page)';
              } else {
                document.getElementById('admin-status').textContent += ' Poll posted to Facebook page.';
              }
            }
          );
        } else {
          document.getElementById('admin-status').textContent += ' (No Facebook page found or permission denied)';
        }
      });
    }
  } else {
    document.getElementById('admin-status').textContent = 'Please enter a question and at least 2 options.';
  }
};

// --- Polls Management ---
function getPolls() {
  let polls = [];
  try {
    polls = JSON.parse(localStorage.getItem('brag_polls')||'[]');
  } catch(e) { polls = []; }
  return polls;
}
function savePolls(polls) {
  localStorage.setItem('brag_polls', JSON.stringify(polls));
}

// --- Impersonation Dropdown ---
function populateImpersonateDropdown() {
  const sel = document.getElementById('admin-impersonate-user');
  sel.innerHTML = bragUsers.slice(0,200).map(u => `<option value="${u.username}">${u.username}</option>`).join('');
  // Default to first user
  sel.value = bragUsers[0].username;
}

// --- Render All Polls ---
function renderAdminPolls() {
  const polls = getPolls();
  const pollsList = document.getElementById('admin-polls-list');
  const impersonateUser = document.getElementById('admin-impersonate-user').value;
  pollsList.innerHTML = '';
  if (!polls.length) {
    pollsList.innerHTML = '<div class="note">No polls found.</div>';
    return;
  }
  polls.forEach((poll, idx) => {
    const shareUrl = (() => {
      var base = localStorage.getItem('brag_site_url') || '';
      if (!base) base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
      base = base.replace(/\/$/, '');
      return base + (base ? '/' : '') + 'poll.html?question=' + encodeURIComponent(poll.question) + '&opts=' + encodeURIComponent((poll.options || []).join(', '));
    })();
    const div = document.createElement('div');
    div.className = 'poll-card';
    div.innerHTML = `
      <div class="poll-question">${poll.question}</div>
      <div class="poll-options">
        ${poll.options.map((opt, i) => `<button data-poll="${idx}" data-opt="${i}">${opt} (${poll.votes && poll.votes[i] ? poll.votes[i] : 0})</button>`).join(' ')}
      </div>
      <button class="poll-share-btn" data-share-url="${shareUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" title="Share on Facebook">Share on Facebook</button>
      <div class="comments">
        ${(poll.comments||[]).map(c => `<div class="comment"><b>${c.user}:</b> ${c.text}</div>`).join('')}
        <div class="add-comment">
          <input type="text" placeholder="Add a comment as ${impersonateUser}..." data-poll="${idx}" />
          <button data-poll="${idx}">Send</button>
        </div>
      </div>
      <button class="delete-poll-btn" data-poll="${idx}" style="background:#e74c3c;color:#fff;margin-top:0.7rem;">Delete Poll</button>
    `;
    pollsList.appendChild(div);
  });
  // Voting as impersonated user
  document.querySelectorAll('.poll-options button').forEach(btn => {
    btn.onclick = function() {
      const pollIdx = +btn.getAttribute('data-poll');
      const optIdx = +btn.getAttribute('data-opt');
      let polls = getPolls();
      if (!polls[pollIdx].votes) polls[pollIdx].votes = polls[pollIdx].options.map(()=>0);
      polls[pollIdx].votes[optIdx]++;
      savePolls(polls);
      renderAdminPolls();
    };
  });
  // Add comment as impersonated user
  document.querySelectorAll('.add-comment button').forEach(btn => {
    btn.onclick = function() {
      const pollIdx = +btn.getAttribute('data-poll');
      const input = document.querySelector(`.add-comment input[data-poll="${pollIdx}"]`);
      if (input.value.trim()) {
        let polls = getPolls();
        if (!polls[pollIdx].comments) polls[pollIdx].comments = [];
        polls[pollIdx].comments.push({ user: impersonateUser, text: input.value });
        savePolls(polls);
        input.value = '';
        renderAdminPolls();
      }
    };
  });
  // Share on Facebook
  document.querySelectorAll('.poll-share-btn').forEach(btn => {
    btn.onclick = function() {
      const url = btn.getAttribute('data-share-url');
      if (url) window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), 'facebook-share', 'width=600,height=400,scrollbars=no');
    };
  });
  // Delete poll
  document.querySelectorAll('.delete-poll-btn').forEach(btn => {
    btn.onclick = function() {
      const pollIdx = +btn.getAttribute('data-poll');
      if (confirm('Delete this poll?')) {
        let polls = getPolls();
        polls.splice(pollIdx,1);
        savePolls(polls);
        renderAdminPolls();
      }
    };
  });
}

// --- On load ---
populateImpersonateDropdown();
renderAdminPolls();
document.getElementById('admin-impersonate-user').onchange = renderAdminPolls;
