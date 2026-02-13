// This script will load all necessary JS files for Bragging Rights
(function() {
  var scripts = [
    'users.js',
    'main.js'
  ];
  if (window.location.pathname.endsWith('profile.html')) {
    scripts = ['users.js', 'profile.js'];
  } else if (window.location.pathname.endsWith('leaderboard.html')) {
    scripts = ['users.js', 'leaderboard.js'];
  } else if (window.location.pathname.endsWith('admin.html')) {
    // admin.html has inline script, but if you want to use admin.js, uncomment below
    // scripts = ['admin.js'];
  }
  scripts.forEach(function(src) {
    var s = document.createElement('script');
    s.src = src;
    document.body.appendChild(s);
  });
})();
