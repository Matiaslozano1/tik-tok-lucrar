// server.js - TikTok Country Battle v2.2
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');
const fs = require('fs');
const path = require('path');
const https = require('https');
const httpMod = require('http');
const { COUNTRIES, NUM_TO_ISO } = require('./countries.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());
app.get('/overlay', (req, res) => res.sendFile(path.join(__dirname, 'public/overlay.html')));
app.get('/panel',   (req, res) => res.sendFile(path.join(__dirname, 'public/panel.html')));

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
const SCORES_FILE = './data/scores.json';
const USERS_FILE  = './data/users.json';

let scores      = {};
let users       = {};  // { uid: { iso, nickname, avatar, likes, pts } }
let multipliers = {};  // { uid: { mult, expires } }
let tiktok      = null;
let battleOver  = false;
let winner      = null;

// COUNTDOWN: configurable desde el panel (default 5 min)
let COUNTDOWN_TOTAL_DYNAMIC = 300;
let countdown     = COUNTDOWN_TOTAL_DYNAMIC;
let countdownInt  = null;
let countdownRun  = false;

let donors = {};

// Avatares recientes por país (últimos 5 con like)
let recentAvatars = {}; // { ISO: [{uid, nickname, avatar, ts}] }

// Top likers: { uid: { nickname, avatar, likes, pts } }
let topLikers = {};

// ─────────────────────────────────────────
// GIFT TIERS
// ─────────────────────────────────────────
const GALAXY_GIFTS = ['galaxy', 'galaxia', 'universe', 'universo'];

function getGiftTier(giftName, diamonds) {
  const name = (giftName || '').toLowerCase();
  if (GALAXY_GIFTS.some(g => name.includes(g))) return 'galaxy';
  if (diamonds >= 3000) return 'large';
  if (diamonds >= 500)  return 'medium';
  return 'small';
}
function getMultFromTier(tier) {
  if (tier === 'large')  return 4;
  if (tier === 'medium') return 3;
  return 2;
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function loadData() {
  Object.keys(COUNTRIES).forEach(iso => {
    scores[iso] = 0;
    recentAvatars[iso] = [];
  });
  if (fs.existsSync(SCORES_FILE)) {
    try { Object.assign(scores, JSON.parse(fs.readFileSync(SCORES_FILE))); } catch(e){}
  }
  if (fs.existsSync(USERS_FILE)) {
    try { users = JSON.parse(fs.readFileSync(USERS_FILE)); } catch(e){}
  }
}

function saveData() {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores));
  fs.writeFileSync(USERS_FILE, JSON.stringify(users));
}

function detectCountryByNumber(comment) {
  const num = parseInt(comment.trim());
  if (!isNaN(num) && NUM_TO_ISO[num]) return NUM_TO_ISO[num];
  return null;
}

function addPoints(iso, pts) {
  if (battleOver) return;
  if (scores[iso] === undefined) scores[iso] = 0;
  scores[iso] += pts;
  if (scores[iso] < 0) scores[iso] = 0;
}

function getUserMultiplier(uid) {
  const m = multipliers[uid];
  if (!m) return 1;
  if (Date.now() > m.expires) { delete multipliers[uid]; return 1; }
  return m.mult;
}

function getRanking() {
  return Object.entries(scores)
    .map(([iso, points]) => ({
      iso, points,
      ...COUNTRIES[iso],
      avatars: (recentAvatars[iso] || []).slice(0, 5)
    }))
    .sort((a, b) => b.points - a.points);
}

function getTopLikers() {
  return Object.entries(topLikers)
    .map(([uid, d]) => ({ uid, ...d }))
    .filter(d => (d.likes || 0) > 0)
    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
    .slice(0, 10);
}

function broadcast() {
  io.emit('update', {
    ranking: getRanking(),
    countdown,
    countdownRun,
    battleOver,
    winner
  });
}

// +1 por segundo a TODOS los países
function startPassiveTick() {
  setInterval(() => {
    if (battleOver) return;
    Object.keys(COUNTRIES).forEach(iso => addPoints(iso, 1));
    broadcast();
    saveData();
  }, 1000);
}

// ─────────────────────────────────────────
// COUNTDOWN
// ─────────────────────────────────────────
function startCountdown() {
  if (countdownInt) clearInterval(countdownInt);
  countdownRun = true;
  countdownInt = setInterval(() => {
    if (battleOver) return;
    countdown--;
    io.emit('countdown', { seconds: countdown });
    if (countdown <= 0) {
      clearInterval(countdownInt);
      countdownRun = false;
      triggerTimeUp();
    }
  }, 1000);
}

function stopCountdown()  { clearInterval(countdownInt); countdownRun = false; }
function resetCountdown() { countdown = COUNTDOWN_TOTAL_DYNAMIC; io.emit('countdown', { seconds: countdown }); }

function triggerTimeUp() {
  const rank = getRanking();
  const winCountry = rank[0];
  battleOver = true;
  winner = {
    iso: winCountry.iso,
    flag: winCountry.flag,
    name: winCountry.name,
    nickname: 'tiempo',
    byTime: true
  };
  const tl = getTopLikers();
  console.log(`⏰ TimeUp! topLikers (${tl.length}):`, JSON.stringify(tl));
  io.emit('timeUp', {
    winner,
    topLikers: tl,
    ranking: rank
  });
  broadcast();
  saveData();
}

// ─────────────────────────────────────────
// GALAXY WIN
// ─────────────────────────────────────────
function triggerGalaxyWin(iso, nickname) {
  battleOver = true;
  winner = { iso, nickname, flag: COUNTRIES[iso]?.flag, name: COUNTRIES[iso]?.name };
  stopCountdown();
  io.emit('galaxyWin', { winner, topLikers: getTopLikers(), ranking: getRanking() });
  broadcast();
  saveData();
}

// ─────────────────────────────────────────
// TIKTOK
// ─────────────────────────────────────────
function connectTikTok(username) {
  if (tiktok) { try { tiktok.disconnect(); } catch(e){} }
  tiktok = new WebcastPushConnection(username, {
    processInitialData: false,
    enableExtendedGiftInfo: true,
    enableWebsocketUpgrade: true,
    requestPollingIntervalMs: 2000,
  });

  tiktok.connect().then(() => {
    console.log(`✅ Conectado a @${username}`);
    io.emit('status', { connected: true, username });
    if (!countdownRun) startCountdown();
  }).catch(err => {
    console.error('❌ Error:', err.message);
    io.emit('status', { connected: false, error: err.message });
  });

  // CHAT → asignación por número
  tiktok.on('chat', data => {
    const uid = data.uniqueId;
    if (battleOver) return;
    if (!users[uid]) {
      const iso = detectCountryByNumber(data.comment || '');
      if (iso) {
        users[uid] = { iso, nickname: data.nickname, avatar: data.profilePictureUrl, likes: 0, pts: 0 };
        addPoints(iso, 1);
        saveData();
        io.emit('join', {
          uid, nickname: data.nickname, iso,
          flag: COUNTRIES[iso].flag, num: COUNTRIES[iso].num,
          avatar: data.profilePictureUrl
        });
        broadcast();
      }
    }
  });

  // LIKE
  tiktok.on('like', data => {
    if (battleOver) return;
    const uid = data.uniqueId;
    const userInfo = users[uid];
    const likeDelta = data.likeCount || 1;

    // Registrar en topLikers aunque no tenga país asignado
    const iso = userInfo?.iso || null;
    const mult = iso ? getUserMultiplier(uid) : 1;
    const pts = iso ? Math.round(likeDelta * mult) : 0;

    if (iso) addPoints(iso, pts);

    // Actualizar top liker
    if (!topLikers[uid]) topLikers[uid] = { nickname: data.nickname || uid, avatar: data.profilePictureUrl || '', iso, likes: 0, pts: 0 };
    topLikers[uid].likes += likeDelta;
    if (pts > 0) topLikers[uid].pts += pts;
    console.log(`👍 Like: ${data.nickname} | likes=${topLikers[uid].likes} pts=${topLikers[uid].pts} iso=${iso}`);

    // Actualizar avatares recientes del país
    if (iso) {
      if (!recentAvatars[iso]) recentAvatars[iso] = [];
      recentAvatars[iso] = recentAvatars[iso].filter(u => u.uid !== uid);
      recentAvatars[iso].unshift({ uid, nickname: topLikers[uid].nickname, avatar: topLikers[uid].avatar, ts: Date.now() });
      if (recentAvatars[iso].length > 5) recentAvatars[iso].pop();
    }

    if (pts > 0) {
      io.emit('like', {
        uid, iso, pts, mult,
        nickname: topLikers[uid].nickname,
        avatar: topLikers[uid].avatar
      });
      broadcast();
      saveData();
    }
  });

  // GIFT
  tiktok.on('gift', data => {
    if (data.giftType !== 1 || !data.repeatEnd) return;
    const uid = data.uniqueId;
    const userInfo = users[uid];
    const iso = userInfo?.iso;
    const diamonds = (data.diamondCount || 1) * (data.repeatCount || 1);
    const tier = getGiftTier(data.giftName, diamonds);

    if (!donors[uid]) donors[uid] = { nickname: data.nickname, diamonds: 0 };
    donors[uid].diamonds += diamonds;

    if (tier === 'galaxy') {
      const winIso = iso || Object.keys(COUNTRIES)[0];
      triggerGalaxyWin(winIso, data.nickname);
    } else {
      const mult = getMultFromTier(tier);
      multipliers[uid] = { mult, expires: Date.now() + 60000 };
      const tierBonus = { small: 100, medium: 400, large: 700 };
      const pts = (diamonds * 10) + (tierBonus[tier] || 0);
      if (iso) addPoints(iso, pts);

      io.emit('gift', {
        uid, nickname: data.nickname, iso,
        giftName: data.giftName, diamonds, pts, tier, mult,
        bonus: tierBonus[tier] || 0,
        avatar: data.profilePictureUrl
      });
      broadcast();
      saveData();
    }
  });

  // MEMBER → alguien entra al LIVE
  tiktok.on('member', data => {
    io.emit('member', {
      nickname: data.nickname,
      avatar:   data.profilePictureUrl,
      uid:      data.uniqueId
    });
  });

  tiktok.on('disconnected', () => {
    console.log('❌ Desconectado');
    io.emit('status', { connected: false });
  });
}

// ─────────────────────────────────────────
// API
// ─────────────────────────────────────────
const ADMIN_KEY = process.env.ADMIN_KEY || 'battle2024';

app.get('/connect', (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  if (!req.query.username) return res.status(400).json({ error: 'username required' });
  connectTikTok(req.query.username);
  res.json({ ok: true });
});

app.get('/reset', (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  Object.keys(COUNTRIES).forEach(iso => { scores[iso] = 0; recentAvatars[iso] = []; });
  users = {}; donors = {}; multipliers = {}; topLikers = {};
  countdown = COUNTDOWN_TOTAL_DYNAMIC; battleOver = false; winner = null;
  stopCountdown();
  saveData(); broadcast();
  io.emit('fullReset', { countdown: COUNTDOWN_TOTAL_DYNAMIC });
  // Rearrancar countdown automáticamente
  setTimeout(() => startCountdown(), 500);
  res.json({ ok: true });
});

app.get('/add', (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  const { iso, points } = req.query;
  if (!iso || !points) return res.status(400).json({ error: 'Faltan parámetros' });
  addPoints(iso.toUpperCase(), parseInt(points));
  saveData(); broadcast();
  res.json({ ok: true });
});

app.get('/timer/duration', (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  const min = parseInt(req.query.minutes);
  if (!min || min < 1 || min > 120) return res.status(400).json({ error: 'Minutos inválidos (1-120)' });
  COUNTDOWN_TOTAL_DYNAMIC = min * 60;
  countdown = COUNTDOWN_TOTAL_DYNAMIC;
  io.emit('countdown', { seconds: countdown });
  console.log(`⚙️ Duración cambiada a ${min} min (${COUNTDOWN_TOTAL_DYNAMIC}s)`);
  res.json({ ok: true, seconds: COUNTDOWN_TOTAL_DYNAMIC });
});

app.get('/countdown/start', (req, res) => { if(req.query.key!==ADMIN_KEY) return res.status(403).json({error:'Forbidden'}); startCountdown(); res.json({ok:true}); });
app.get('/countdown/stop',  (req, res) => { if(req.query.key!==ADMIN_KEY) return res.status(403).json({error:'Forbidden'}); stopCountdown();  res.json({ok:true}); });
app.get('/countdown/reset', (req, res) => { if(req.query.key!==ADMIN_KEY) return res.status(403).json({error:'Forbidden'}); resetCountdown(); res.json({ok:true}); });

// Mantener compatibilidad con rutas de timer antiguas
app.get('/timer/start', (req, res) => { if(req.query.key!==ADMIN_KEY) return res.status(403).json({error:'Forbidden'}); startCountdown(); res.json({ok:true}); });
app.get('/timer/stop',  (req, res) => { if(req.query.key!==ADMIN_KEY) return res.status(403).json({error:'Forbidden'}); stopCountdown();  res.json({ok:true}); });
app.get('/timer/reset', (req, res) => { if(req.query.key!==ADMIN_KEY) return res.status(403).json({error:'Forbidden'}); resetCountdown(); res.json({ok:true}); });

// Proxy de avatares TikTok (evita bloqueo anti-hotlink)
app.get('/avatar', (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) return res.status(400).end();
  const mod = url.startsWith('https') ? https : httpMod;
  const request = mod.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'https://www.tiktok.com/'
    }
  }, (proxied) => {
    res.setHeader('Content-Type', proxied.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    proxied.pipe(res);
  });
  request.on('error', () => res.status(500).end());
});

// Endpoint de prueba: simula un timeUp con datos falsos para verificar el overlay
app.get('/test-end', (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  const fakeWinner = { iso: 'MX', flag: '🇲🇽', name: 'México', nickname: 'tiempo', byTime: true };
  const fakeLikers = [
    { uid: 'u1', nickname: 'JuanTest',   avatar: '', iso: 'MX', likes: 120, pts: 240 },
    { uid: 'u2', nickname: 'Maria123',   avatar: '', iso: 'BR', likes: 85,  pts: 170 },
    { uid: 'u3', nickname: 'PedroTK',    avatar: '', iso: 'MX', likes: 60,  pts: 120 },
    { uid: 'u4', nickname: 'LuisGamer',  avatar: '', iso: 'CO', likes: 40,  pts: 80  },
    { uid: 'u5', nickname: 'AnaTikTok',  avatar: '', iso: 'AR', likes: 20,  pts: 40  },
  ];
  io.emit('timeUp', { winner: fakeWinner, topLikers: fakeLikers, ranking: getRanking() });
  res.json({ ok: true, likers: fakeLikers.length });
});

app.get('/state', (req, res) => res.json({ ranking: getRanking(), countdown, battleOver, winner, topLikers: getTopLikers() }));
app.get('/countries', (req, res) => res.json(Object.entries(COUNTRIES).map(([iso,d])=>({iso,num:d.num,name:d.name,flag:d.flag}))));

// ─────────────────────────────────────────
// SOCKET
// ─────────────────────────────────────────
io.on('connection', socket => {
  socket.emit('init', {
    ranking: getRanking(),
    countdown,
    countdownRun,
    battleOver,
    winner,
    countries: COUNTRIES
  });
  socket.on('setVolume', vol => socket.broadcast.emit('setVolume', vol));
});

// ─────────────────────────────────────────
// START
// ─────────────────────────────────────────
loadData();
startPassiveTick();
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 TikTok Battle v2.2 → http://localhost:${PORT}`);
  console.log(`📺 Overlay : http://localhost:${PORT}/overlay`);
  console.log(`🎛️  Panel   : http://localhost:${PORT}/panel`);
});
