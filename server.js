const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://www.roblox.com/',
  'Origin': 'https://www.roblox.com'
};

// ------------------------------------------
// 1. Récupération des jeux populaires (nouvelle méthode + fallback)
// ------------------------------------------
const FALLBACK_UNIVERSE_IDS = [
  2303188151, // Adopt Me!
  1680985200, // Brookhaven 🏡RP
  3231531487, // Blox Fruits
  3472719646, // Murder Mystery 2
  3521557827, // Pet Simulator X
  3012275601, // Doors
  4119944639, // Rainbow Friends
  3566497282, // Arsenal
  2868479058, // Tower of Hell
  1962086868, // MeepCity
];

app.get('/api/games', async (req, res) => {
  try {
    console.log('🎯 Récupération des jeux populaires...');
    // Méthode actuelle qui fonctionne chez la plupart : HomeSorts
    const sortsUrl = 'https://games.roblox.com/v1/games/sorts?gameSortsContext=HomeSorts';
    const sortsResp = await axios.get(sortsUrl, { headers, timeout: 8000 });
    
    let games = [];
    if (sortsResp.data && sortsResp.data.sorts) {
      // Chercher le tri "HomePagePopular" (ou "Popular")
      const popularSort = sortsResp.data.sorts.find(
        s => s.sortToken === 'HomePagePopular' || s.sortToken === 'Popular'
      );
      if (popularSort && popularSort.games) {
        games = popularSort.games;
        console.log(`✅ ${games.length} jeux récupérés depuis HomeSorts`);
      }
    }

    // Si vide, fallback solide
    if (!games || games.length === 0) {
      console.log('⚠️ Aucun jeu trouvé via API, utilisation du fallback.');
      // On renvoie une liste d'objets avec universeId (le minimum pour que le front puisse charger les détails)
      games = FALLBACK_UNIVERSE_IDS.map(id => ({ universeId: id, name: 'Chargement...' }));
      return res.json({ games, fromFallback: true });
    }

    res.json({ games });
  } catch (error) {
    console.error('💥 Erreur /api/games :', error.message);
    // En cas d'erreur, fallback
    const games = FALLBACK_UNIVERSE_IDS.map(id => ({ universeId: id, name: 'Chargement...' }));
    res.json({ games, fromFallback: true, error: error.message });
  }
});

// ------------------------------------------
// 2. Détails (inchangé, fonctionne toujours)
// ------------------------------------------
app.get('/api/details', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: 'Paramètre ids requis' });
    const url = `https://games.roblox.com/v1/games?universeIds=${ids}`;
    const resp = await axios.get(url, { headers, timeout: 10000 });
    res.json(resp.data);
  } catch (error) {
    res.status(500).json({ error: error.message, data: [] });
  }
});

// ------------------------------------------
// 3. Miniatures (inchangé, fonctionne toujours)
// ------------------------------------------
app.get('/api/thumbnails', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: 'Paramètre ids requis' });
    const url = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`;
    const resp = await axios.get(url, { headers, timeout: 10000 });
    res.json(resp.data);
  } catch (error) {
    res.status(500).json({ error: error.message, data: [] });
  }
});

// ------------------------------------------
// Route test pratique
// ------------------------------------------
app.get('/api/test-raw', async (req, res) => {
  try {
    const url = 'https://games.roblox.com/v1/games/sorts?gameSortsContext=HomeSorts';
    const resp = await axios.get(url, { headers });
    res.json({ status: resp.status, data: resp.data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('✅ Proxy Roblox actif.'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Serveur prêt sur le port ${PORT}`));
