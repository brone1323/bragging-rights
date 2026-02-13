// Simulated 9321 users with betting history
// This file is auto-generated for demo purposes
// Each user has a unique username, email, balance, rank, and 3 months of wagers

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const cityNames = [
  'NYC', 'Chicago', 'LA', 'Miami', 'Dallas', 'Boston', 'Denver', 'Seattle', 'Houston', 'Phoenix',
  'Atlanta', 'Detroit', 'Orlando', 'SanFran', 'Philly', 'Cleveland', 'Portland', 'Vegas', 'Charlotte', 'Nashville',
  'KC', 'Baltimore', 'Minneapolis', 'Tampa', 'NewOrleans', 'Pittsburgh', 'Cincy', 'Indy', 'SanDiego', 'SaltLake',
  'Buffalo', 'Milwaukee', 'StLouis', 'Oakland', 'Sacramento', 'Raleigh', 'Columbus', 'Austin', 'ElPaso', 'Memphis',
  'Louisville', 'Oklahoma', 'Albuquerque', 'Tucson', 'Fresno', 'Mesa', 'Omaha', 'Colorado', 'Tulsa', 'Arlington',
  'Wichita', 'Bakersfield', 'Cleveland', 'Aurora', 'Anaheim', 'Honolulu', 'Lexington', 'Stockton', 'Corpus', 'Henderson',
  'Riverside', 'Newark', 'Toledo', 'Greensboro', 'Plano', 'Lincoln', 'Buffalo', 'FortWayne', 'Jersey', 'StPaul',
  'Cincinnati', 'Anchorage', 'Irvine', 'Orlando', 'Laredo', 'ChulaVista', 'Madison', 'Durham', 'Lubbock', 'Chandler',
  'Scottsdale', 'Glendale', 'Reno', 'Norfolk', 'Winston', 'NorthLasVegas', 'Irving', 'Chesapeake', 'Gilbert', 'Hialeah',
  'Garland', 'Fremont', 'Richmond', 'Boise', 'BatonRouge', 'DesMoines', 'Spokane', 'SanBernardino', 'Modesto', 'Fontana'
];
const teamNames = [
  'Knights', 'Blaze', 'Waves', 'Sharks', 'Bulls', 'Storm', 'Titans', 'Eagles', 'Rockets', 'Falcons',
  'Lions', 'Panthers', 'Tigers', 'Bears', 'Wolves', 'Dragons', 'Hawks', 'Cubs', 'Kings', 'Giants',
  'Jets', 'Stars', 'Raiders', 'Rangers', 'Suns', 'Heat', 'Magic', 'Thunder', 'Pelicans', 'Hornets',
  'Spurs', 'Mavericks', 'Nets', 'Warriors', 'Clippers', 'Celtics', 'Sixers', 'Bucks', 'Jazz', 'Grizzlies',
  'Pacers', 'Pistons', 'Suns', 'Wizards', 'Timberwolves', 'Trailblazers', 'Cavaliers', 'Knicks', 'Lakers', 'Kings'
];
const areaCodes = [
  '212','312','213','305','214','617','303','206','713','602','404','313','407','415','215','216','503','702','704','615',
  '816','410','612','813','504','412','513','317','619','801','716','414','314','510','916','919','614','512','915','901',
  '502','405','505','520','559','480','402','303','918','817','316','661','216','303','808','859','209','361','702','951',
  '973','419','336','972','402','716','260','201','651','513','907','949','407','956','619','608','919','806','480','480',
  '775','757','336','702','972','757','480','305','972','510','804','208','225','515','509','909','209','909'
];

const gamesList = [
  'New York Knights vs. Chicago Blaze',
  'LA Waves vs. Miami Sharks',
  'Dallas Bulls vs. Seattle Storm',
  'Boston Titans vs. Denver Eagles',
  'Houston Rockets vs. Phoenix Falcons',
  'Atlanta Lions vs. Detroit Panthers',
  'Orlando Tigers vs. SanFran Bears',
  'Philly Wolves vs. Cleveland Dragons',
  'Portland Hawks vs. Vegas Cubs',
  'Charlotte Kings vs. Nashville Giants',
  'KC Jets vs. Baltimore Stars',
  'Minneapolis Raiders vs. Tampa Rangers',
  'NewOrleans Suns vs. Pittsburgh Heat',
  'Cincy Magic vs. Indy Thunder',
  'SanDiego Pelicans vs. SaltLake Hornets',
  'Buffalo Spurs vs. Milwaukee Mavericks',
  'StLouis Nets vs. Oakland Warriors',
  'Sacramento Clippers vs. Raleigh Celtics',
  'Columbus Sixers vs. Austin Bucks',
  'ElPaso Jazz vs. Memphis Grizzlies'
];

function randomUsername() {
  const city = cityNames[randomInt(0, cityNames.length-1)];
  const team = teamNames[randomInt(0, teamNames.length-1)];
  const code = areaCodes[randomInt(0, areaCodes.length-1)];
  return `${city}_${team}_${code}`;
}

function randomEmail(username) {
  return username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + '@bragmail.com';
}

function randomWager(game) {
  const picks = game.split(' vs. ');
  const pick = picks[randomInt(0,1)];
  const odds = randomInt(0,1) ? `+${randomInt(100,250)}` : `-${randomInt(100,150)}`;
  const amount = randomInt(50, 1000);
  const result = ['Win','Loss','Push'][randomInt(0,2)];
  return {
    game,
    amount,
    pick,
    odds,
    result
  };
}

const bragUsers = [];
const usernamesSet = new Set();
for(let i=0; i<9321; i++) {
  let username;
  // Ensure uniqueness
  do {
    username = randomUsername();
  } while(usernamesSet.has(username));
  usernamesSet.add(username);
  const email = randomEmail(username);
  // Simulate 3 months of wagers (about 30-90 per user)
  const numWagers = randomInt(30, 90);
  const wagers = [];
  let balance = 10000;
  for(let w=0; w<numWagers; w++) {
    const game = gamesList[randomInt(0, gamesList.length-1)];
    const wager = randomWager(game);
    // Simulate balance change
    if(wager.result === 'Win') balance += Math.round(wager.amount * (Math.abs(parseInt(wager.odds)) / 100));
    else if(wager.result === 'Loss') balance -= wager.amount;
    wagers.push(wager);
  }
  if(balance < 0) balance = randomInt(100, 5000);
  bragUsers.push({
    username,
    email,
    balance,
    wagers
  });
}
// Sort by balance descending and assign rank
bragUsers.sort((a,b) => b.balance - a.balance);
bragUsers.forEach((u, i) => u.rank = i+1);
