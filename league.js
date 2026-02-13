/**
 * League detail page - Teams, Standings, Schedule, Scoreboard
 * Fetches from Stats API
 */
(function() {
  var LEAGUE_NAMES = { nba: 'NBA', nfl: 'NFL', nhl: 'NHL', mlb: 'MLB' };

  function getLeagueId() {
    var p = new URLSearchParams(location.search);
    return p.get('league') || 'nba';
  }

  function getStatsBase() {
    var api = localStorage.getItem('brag_stats_api') || (window.BRAG_CONFIG && window.BRAG_CONFIG.statsApiUrl) || '';
    return api.replace(/\/$/, '');
  }

  function fetchJson(url) {
    return fetch(url).then(function(r) {
      if (!r.ok) throw new Error('Fetch failed');
      return r.json();
    }).catch(function() { return null; });
  }

  function fetchData(leagueId, type) {
    var base = getStatsBase();
    if (base) {
      return fetchJson(base + '/api/' + leagueId + '/' + type);
    }
    return fetchJson('./data/' + leagueId + '/' + type + '.json').then(function(p) {
      return p && p.data ? p.data : p;
    });
  }

  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function renderTeams(leagueId, contentEl) {
    contentEl.innerHTML = '<div class="note">Loading teams...</div>';
    fetchData(leagueId, 'teams').then(function(data) {
      var teams = [];
      if (data && data.sports) {
        data.sports.forEach(function(sport) {
          (sport.leagues || []).forEach(function(league) {
            (league.teams || []).forEach(function(item) {
              var t = item.team || item;
              if (t.id) teams.push(t);
            });
          });
        });
      }
      if (!teams.length) {
        contentEl.innerHTML = '<div class="note">No teams found. Run the stats harvester and set Stats API URL in Admin.</div>';
        return;
      }
      var html = '<div class="teams-grid-league">';
      teams.forEach(function(team) {
        var logo = (team.logos && team.logos[0]) ? team.logos[0].href : '';
        var name = team.displayName || team.name || 'Unknown';
        var abbr = team.abbreviation || '';
        html += '<a href="' + (getStatsBase() ? getStatsBase() + '/' + leagueId + '/team/' + team.id : '#') + '" class="team-card-league" target="_blank" rel="noopener">';
        html += '<div class="team-logo-league">';
        if (logo) html += '<img src="' + esc(logo) + '" alt="" width="64" height="64" onerror="this.style.display=\'none\'">';
        else html += '<span class="logo-placeholder">' + (abbr || '?').slice(0, 2) + '</span>';
        html += '</div><div class="team-info-league"><span class="team-name-league">' + esc(name) + '</span><span class="team-abbr-league">' + esc(abbr) + '</span></div></a>';
      });
      html += '</div>';
      contentEl.innerHTML = html;
    }).catch(function() {
      contentEl.innerHTML = '<div class="note">Failed to load. Set Stats API URL in Admin and run python serve.py in the stats folder.</div>';
    });
  }

  function renderStandings(leagueId, contentEl) {
    contentEl.innerHTML = '<div class="note">Loading standings...</div>';
    fetchData(leagueId, 'standings').then(function(data) {
      if (!data) {
        contentEl.innerHTML = '<div class="note">No standings available.</div>';
        return;
      }
      if (data.fullViewLink && !data.children) {
        contentEl.innerHTML = '<div class="note">View full standings at <a href="' + esc(data.fullViewLink.href) + '" target="_blank" rel="noopener" style="color:#3fa7ff;">ESPN</a>.</div>';
        return;
      }
      var children = data.children || [];
      if (!children.length) {
        contentEl.innerHTML = '<div class="note">No standings data. Run the stats harvester.</div>';
        return;
      }
      var html = '';
      children.forEach(function(conf) {
        var name = conf.name || conf.abbreviation || 'Conference';
        html += '<h3 style="color:#3fa7ff;margin:1.5rem 0 0.5rem 0;">' + esc(name) + '</h3>';
        var divs = conf.standings || [conf];
        divs.forEach(function(div) {
          var entries = (div.entries || []).filter(function(e) { return e; });
          if (entries.length) {
            html += '<table class="standings-table"><thead><tr><th>#</th><th>Team</th><th>W-L</th><th>Pct</th></tr></thead><tbody>';
            entries.forEach(function(entry, i) {
              var team = entry.team || entry;
              var rank = entry.rank || i + 1;
              var wins = entry.wins || '-';
              var losses = entry.losses || '-';
              var pct = entry.percentage || entry.winPercent || '-';
              var teamName = (team.displayName || team.name || '—');
              html += '<tr><td>' + rank + '</td><td>' + esc(teamName) + '</td><td>' + wins + '-' + losses + '</td><td>' + pct + '</td></tr>';
            });
            html += '</tbody></table>';
          }
        });
      });
      contentEl.innerHTML = html || '<div class="note">No standings data.</div>';
    }).catch(function() {
      contentEl.innerHTML = '<div class="note">Failed to load standings.</div>';
    });
  }

  function renderSchedule(leagueId, contentEl) {
    contentEl.innerHTML = '<div class="note">Loading schedule...</div>';
    fetchData(leagueId, 'schedule').then(function(data) {
      var events = (data && data.events) || [];
      if (!events.length) {
        contentEl.innerHTML = '<div class="note">No schedule data. The stats harvester may need to run with --types schedule.</div>';
        return;
      }
      var html = '<div class="schedule-list">';
      events.slice(0, 50).forEach(function(ev) {
        var comp = (ev.competitions || [])[0] || {};
        var competitors = (comp.competitors || []).sort(function(a, b) { return (a.homeAway === 'home' ? 1 : 0) - (b.homeAway === 'home' ? 1 : 0); });
        var c0 = competitors[0] || {};
        var c1 = competitors[1] || {};
        var name0 = (c0.team || {}).displayName || '—';
        var name1 = (c1.team || {}).displayName || '—';
        var date = ev.date ? new Date(ev.date).toLocaleDateString() : '';
        html += '<a href="' + (getStatsBase() ? getStatsBase() + '/' + leagueId + '/matchup/' + ev.id : '#') + '" class="schedule-item" target="_blank" rel="noopener">';
        html += '<span class="schedule-date">' + esc(date) + '</span>';
        html += '<span class="schedule-matchup">' + esc(name0) + ' vs ' + esc(name1) + '</span>';
        html += '</a>';
      });
      html += '</div>';
      contentEl.innerHTML = html;
    }).catch(function() {
      contentEl.innerHTML = '<div class="note">Failed to load schedule.</div>';
    });
  }

  function renderScoreboard(leagueId, contentEl) {
    contentEl.innerHTML = '<div class="note">Loading scoreboard...</div>';
    var today = new Date();
    function dateStr(d) { return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }
    function tryNextDate(dayOffset, maxDays, cb) {
      if (dayOffset >= maxDays) { cb(null, null); return; }
      var d = new Date(today);
      d.setDate(d.getDate() + dayOffset);
      var ds = dayOffset === 0 ? null : dateStr(d);
      var url = getStatsBase() ? getStatsBase() + '/api/' + leagueId + '/scoreboard' + (ds ? '?date=' + ds : '') : './data/' + leagueId + '/' + (ds ? 'scoreboard_' + ds : 'scoreboard') + '.json';
      fetchJson(url).then(function(payload) {
        var data = payload && payload.data ? payload.data : payload;
        var events = (data && data.events) ? data.events : (payload && payload.events) ? payload.events : [];
        if (events.length) {
          var label = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          cb(events, label);
        } else {
          tryNextDate(dayOffset + 1, maxDays, cb);
        }
      }).catch(function() { tryNextDate(dayOffset + 1, maxDays, cb); });
    }
    tryNextDate(0, 14, function(events, label) {
      if (!events || !events.length) {
        contentEl.innerHTML = '<div class="note">No games in the next 2 weeks for this league.</div>';
        return;
      }
      var html = (label ? '<div class="sb-date-label" style="font-size:0.9rem;color:#b8c6e0;margin-bottom:0.5rem;font-weight:bold;">' + esc(label) + '</div>' : '') + '<div class="scoreboard-list">';
      events.forEach(function(ev) {
        var comp = (ev.competitions || [])[0] || {};
        var competitors = (comp.competitors || []).sort(function(a, b) { return (a.homeAway === 'home' ? 1 : 0) - (b.homeAway === 'home' ? 1 : 0); });
        var status = ev.status || comp.status || {};
        var statusText = (status.type || {}).shortDetail || (status.type || {}).detail || 'Scheduled';
        var c0 = competitors[0] || {};
        var c1 = competitors[1] || {};
        var name0 = (c0.team || {}).displayName || '—';
        var name1 = (c1.team || {}).displayName || '—';
        var score0 = c0.score || '-';
        var score1 = c1.score || '-';
        html += '<a href="' + (getStatsBase() ? getStatsBase() + '/' + leagueId + '/matchup/' + ev.id : '#') + '" class="scoreboard-item-league" target="_blank" rel="noopener">';
        html += '<div class="sb-status">' + esc(statusText) + '</div>';
        html += '<div class="sb-matchup">' + esc(name0) + ' <span class="sb-scores">' + score0 + ' - ' + score1 + '</span> ' + esc(name1) + '</div>';
        html += '</a>';
      });
      html += '</div>';
      contentEl.innerHTML = html;
    });
  }

  function init() {
    var leagueId = getLeagueId();
    var titleEl = document.getElementById('league-title');
    var contentEl = document.getElementById('league-content');
    if (titleEl) titleEl.textContent = LEAGUE_NAMES[leagueId] || leagueId.toUpperCase();
    document.getElementById('page-title').textContent = (LEAGUE_NAMES[leagueId] || leagueId) + ' - Bragging Rights';

    function switchTab(tab) {
      document.querySelectorAll('.league-tab').forEach(function(t) {
        t.classList.toggle('active', t.getAttribute('data-tab') === tab);
      });
      if (tab === 'teams') renderTeams(leagueId, contentEl);
      else if (tab === 'standings') renderStandings(leagueId, contentEl);
      else if (tab === 'schedule') renderSchedule(leagueId, contentEl);
      else if (tab === 'scoreboard') renderScoreboard(leagueId, contentEl);
    }

    document.querySelectorAll('.league-tab').forEach(function(btn) {
      btn.onclick = function() {
        switchTab(btn.getAttribute('data-tab'));
      };
    });

    var p = new URLSearchParams(location.search);
    var tab = p.get('tab') || 'teams';
    switchTab(tab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
