/**
 * Stats integration - scoreboard and matchup modal
 * Fetches from Stats API (brag_stats_api) or ./data/ fallback
 */
(function() {
  var ODDS_TO_LEAGUE = {
    'basketball_nba': 'nba',
    'americanfootball_nfl': 'nfl',
    'icehockey_nhl': 'nhl',
    'baseball_mlb': 'mlb'
  };
  var LEAGUES_ORDER = ['nba', 'nfl', 'nhl', 'mlb'];

  function getStatsBase() {
    var api = localStorage.getItem('brag_stats_api') || '';
    return api.replace(/\/$/, '');
  }

  function fetchJson(url) {
    return fetch(url).then(function(r) {
      if (!r.ok) throw new Error('Fetch failed');
      return r.json();
    }).catch(function() { return null; });
  }

  function fetchScoreboard(leagueId, dateStr) {
    var base = getStatsBase();
    if (base) {
      var url = base + '/api/' + leagueId + '/scoreboard' + (dateStr ? '?date=' + dateStr : '');
      return fetchJson(url);
    }
    var file = dateStr ? './data/' + leagueId + '/scoreboard_' + dateStr + '.json' : './data/' + leagueId + '/scoreboard.json';
    return fetchJson(file).then(function(payload) {
      return payload && payload.data ? payload.data : payload;
    });
  }

  function fetchMatchup(leagueId, eventId) {
    var base = getStatsBase();
    if (!base) return Promise.resolve(null);
    return fetchJson(base + '/api/' + leagueId + '/matchup/' + eventId);
  }

  function renderScoreboard() {
    var el = document.getElementById('scoreboard-list');
    var note = document.getElementById('scoreboard-note');
    if (!el) return;

    function render(eventsByLeague, label) {
      var html = '';
      if (label) {
        html += '<div class="sb-date-label" style="font-size:0.8rem;color:#b8c6e0;margin-bottom:0.5rem;font-weight:bold;">' + label + '</div>';
      }
      var total = 0;
      LEAGUES_ORDER.forEach(function(leagueId) {
        var events = eventsByLeague[leagueId] || [];
        total += events.length;
        events.forEach(function(ev) {
          var comp = (ev.competitions || [])[0] || {};
          var competitors = (comp.competitors || []).sort(function(a, b) {
            return (a.homeAway === 'home' ? 1 : 0) - (b.homeAway === 'home' ? 1 : 0);
          });
          var status = ev.status || comp.status || {};
          var statusType = status.type || {};
          var statusText = statusType.shortDetail || statusType.detail || 'Scheduled';
          var c0 = competitors[0] || {};
          var c1 = competitors[1] || {};
          var t0 = c0.team || {};
          var t1 = c1.team || {};
          var name0 = t0.displayName || t0.abbreviation || '—';
          var name1 = t1.displayName || t1.abbreviation || '—';
          var score0 = c0.score || '-';
          var score1 = c1.score || '-';
          html += '<div class="scoreboard-game" data-league="' + leagueId + '" data-event="' + ev.id + '">';
          html += '<div class="sb-status">' + leagueId.toUpperCase() + ' • ' + statusText + '</div>';
          html += '<div class="sb-teams">';
          html += '<span class="sb-team">' + name0 + '</span>';
          html += '<span class="sb-score">' + score0 + ' - ' + score1 + '</span>';
          html += '<span class="sb-team" style="text-align:right">' + name1 + '</span>';
          html += '</div></div>';
        });
      });
      if (total === 0) {
        el.innerHTML = '<div class="note">No games. Run the stats harvester or check Stats API URL in Admin.</div>';
      } else {
        el.innerHTML = html;
      }
    }

    note.textContent = 'Loading scores...';
    var today = new Date();
    var todayStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
    var base = getStatsBase();
    var promises = LEAGUES_ORDER.map(function(leagueId) {
      return fetchScoreboard(leagueId, null).then(function(data) {
        var events = (data && data.events) ? data.events : [];
        return { leagueId: leagueId, events: events };
      });
    });
    Promise.all(promises).then(function(results) {
      var byLeague = {};
      var totalToday = 0;
      results.forEach(function(r) {
        byLeague[r.leagueId] = r.events;
        totalToday += r.events.length;
      });
      if (totalToday > 0) {
        render(byLeague, 'Today');
      } else {
        var tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        var tomorrowStr = tomorrow.getFullYear() + String(tomorrow.getMonth() + 1).padStart(2, '0') + String(tomorrow.getDate()).padStart(2, '0');
        var tomorrowPromises = LEAGUES_ORDER.map(function(leagueId) {
          return fetchScoreboard(leagueId, tomorrowStr).then(function(data) {
            var events = (data && data.events) ? data.events : [];
            return { leagueId: leagueId, events: events };
          });
        });
        Promise.all(tomorrowPromises).then(function(tomorrowResults) {
          var byLeagueTomorrow = {};
          var totalTomorrow = 0;
          tomorrowResults.forEach(function(r) {
            byLeagueTomorrow[r.leagueId] = r.events;
            totalTomorrow += r.events.length;
          });
          var label = 'Tomorrow (' + tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ')';
          render(byLeagueTomorrow, totalTomorrow > 0 ? label : null);
          if (totalTomorrow === 0) {
            el.innerHTML = '<div class="note">No games today or tomorrow. Run the stats harvester or check Stats API URL in Admin.</div>';
          }
        });
      }
    }).catch(function() {
      el.innerHTML = '<div class="note">Unable to load scores. Set Stats API URL in Admin (run python serve.py in stats folder).</div>';
    });
  }

  function findMatchingEvent(leagueId, teamA, teamB) {
    return fetchScoreboard(leagueId).then(function(data) {
      var events = (data && data.events) || [];
      var a = (teamA || '').toLowerCase().replace(/\s+/g, ' ');
      var b = (teamB || '').toLowerCase().replace(/\s+/g, ' ');
      for (var i = 0; i < events.length; i++) {
        var comp = (events[i].competitions || [])[0] || {};
        var competitors = comp.competitors || [];
        var names = competitors.map(function(c) {
          var t = c.team || {};
          return (t.displayName || t.location + ' ' + t.name || '').toLowerCase();
        }).filter(Boolean);
        var matchA = names.some(function(n) { return n.indexOf(a) >= 0 || a.indexOf(n) >= 0; });
        var matchB = names.some(function(n) { return n.indexOf(b) >= 0 || b.indexOf(n) >= 0; });
        if (matchA && matchB) return { eventId: events[i].id, leagueId: leagueId };
      }
      return null;
    });
  }

  function showMatchupModal(leagueId, eventId) {
    var modal = document.getElementById('stats-modal');
    var content = document.getElementById('stats-modal-content');
    if (!modal || !content) return;
    content.innerHTML = '<div class="note">Loading matchup...</div>';
    modal.classList.remove('hidden');
    fetchMatchup(leagueId, eventId).then(function(data) {
      if (!data || data.error) {
        content.innerHTML = '<div class="note">Matchup data not available.</div>';
        return;
      }
      var ta = data.team_a || {};
      var tb = data.team_b || {};
      var teamA = ta.team || ta;
      var teamB = tb.team || tb;
      var nameA = teamA.displayName || 'Team A';
      var nameB = teamB.displayName || 'Team B';
      var logoA = (teamA.logos && teamA.logos[0]) ? teamA.logos[0].href : (teamA.logo || '');
      var logoB = (teamB.logos && teamB.logos[0]) ? teamB.logos[0].href : (teamB.logo || '');
      var html = '<div class="stats-matchup-header" style="display:flex;align-items:center;justify-content:space-around;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">';
      html += '<div style="text-align:center;"><img src="' + logoA + '" alt="" style="width:60px;height:60px;object-fit:contain;" onerror="this.style.display=\'none\'"><div style="font-weight:bold;margin-top:0.3rem;">' + nameA + '</div></div>';
      html += '<div style="color:#3fa7ff;font-weight:bold;">vs</div>';
      html += '<div style="text-align:center;"><img src="' + logoB + '" alt="" style="width:60px;height:60px;object-fit:contain;" onerror="this.style.display=\'none\'"><div style="font-weight:bold;margin-top:0.3rem;">' + nameB + '</div></div>';
      html += '</div>';
      if (data.comparison && data.comparison.length) {
        html += '<h3 style="color:#3fa7ff;font-size:1rem;margin-top:1rem;">Season Stats</h3>';
        html += '<table style="width:100%;border-collapse:collapse;margin-top:0.5rem;"><thead><tr style="color:#3fa7ff;"><th>Stat</th><th>' + (teamA.abbreviation || 'A') + '</th><th>' + (teamB.abbreviation || 'B') + '</th></tr></thead><tbody>';
        data.comparison.forEach(function(row) {
          html += '<tr><td style="padding:0.3rem 0;">' + row.label + '</td><td>' + row.a + '</td><td>' + row.b + '</td></tr>';
        });
        html += '</tbody></table>';
      }
      if (data.game_comparison && data.game_comparison.length) {
        html += '<h3 style="color:#3fa7ff;font-size:1rem;margin-top:1.2rem;">Game Stats</h3>';
        data.game_comparison.forEach(function(row) {
          html += '<div style="margin:0.5rem 0;"><div style="font-size:0.9rem;color:#b8c6e0;margin-bottom:0.2rem;">' + row.label + '</div>';
          html += '<div style="display:flex;align-items:center;gap:0.5rem;">';
          html += '<span style="min-width:3rem;">' + row.a + '</span>';
          html += '<div style="flex:1;height:8px;background:#18213a;border-radius:4px;overflow:hidden;display:flex;">';
          html += '<div style="width:' + row.pct_a + '%;background:#3fa7ff;"></div>';
          html += '<div style="width:' + row.pct_b + '%;background:#1e2a4a;"></div>';
          html += '</div><span style="min-width:3rem;text-align:right">' + row.b + '</span></div></div>';
        });
      }
      if (!data.comparison || !data.comparison.length) {
        if (!data.game_comparison || !data.game_comparison.length) {
          html += '<div class="note">No comparison data available for this game.</div>';
        }
      }
      content.innerHTML = html;
    }).catch(function() {
      content.innerHTML = '<div class="note">Failed to load matchup. Make sure Stats API is running.</div>';
    });
  }

  window.bragStats = {
    findMatchingEvent: findMatchingEvent,
    showMatchupModal: showMatchupModal,
    oddsToLeague: function(sportKey) { return ODDS_TO_LEAGUE[sportKey] || 'nba'; },
    renderScoreboard: renderScoreboard
  };

  document.getElementById('close-stats') && document.getElementById('close-stats').addEventListener('click', function() {
    document.getElementById('stats-modal').classList.add('hidden');
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      renderScoreboard();
      setInterval(renderScoreboard, 60000);
    });
  } else {
    renderScoreboard();
    setInterval(renderScoreboard, 60000);
  }
})();
