const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Middleware de logs
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

// -------------------------------------------------------------------
// LISTE DE SECOURS FIABLE (universeIds connus, mis à jour manuellement)
// Les noms sont fictifs, ils seront remplacés par les vrais via /api/details
// -------------------------------------------------------------------
const FALLBACK_UNIVERSE_IDS = [
    2303188151,  // Adopt Me!
    1680985200,  // Brookhaven 🏡RP
    3231531487,  // Blox Fruits
    3472719646,  // Murder Mystery 2
    3521557827,  // Pet Simulator X
    3012275601,  // Doors
    4119944639,  // Rainbow Friends
    3566497282,  // Arsenal
    2868479058,  // Tower of Hell
    1962086868,  // MeepCity
    4483381587,  // Livetopia
    5436997384,  // Blade Ball
    4925175923,  // Brookhaven RP (original)
    5377167748,  // Dress to Impress
    3413599203,  // Piggy
];

// Cache pour éviter de surcharger l'API Roblox
let cachedGames = null;
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// -------------------------------------------------------------------
// 1. RÉCUPÉRATION DES JEUX POPULAIRES (stratégies multiples)
// -------------------------------------------------------------------
async function fetchPopularGames() {
    // Vérifier le cache
    if (cachedGames && Date.now() - lastFetch < CACHE_DURATION) {
        console.log('📦 Utilisation du cache');
        return cachedGames;
    }

    console.log('🎯 Tentative de récupération des jeux populaires...');

    // Stratégie 1 : API de recommandations (souvent fonctionnelle)
    try {
        const recUrl = 'https://games.roblox.com/v1/games/recommendations/play?algorithm=HomePagePopular&maxRows=30';
        const resp = await axios.get(recUrl, { headers, timeout: 8000 });
        if (resp.data && resp.data.games && resp.data.games.length > 0) {
            console.log(`✅ Stratégie 1 OK : ${resp.data.games.length} jeux`);
            cachedGames = resp.data.games;
            lastFetch = Date.now();
            return cachedGames;
        }
    } catch (e) {
        console.log('❌ Stratégie 1 échouée');
    }

    // Stratégie 2 : API de liste avec un token de tri plus moderne
    try {
        const listUrl = 'https://games.roblox.com/v1/games/list?model.sortToken=HomePagePopular&model.gameSetTypeId=2&model.maxRows=30&model.startRows=0';
        const resp = await axios.get(listUrl, { headers, timeout: 8000 });
        if (resp.data && resp.data.games && resp.data.games.length > 0) {
            console.log(`✅ Stratégie 2 OK : ${resp.data.games.length} jeux`);
            cachedGames = resp.data.games;
            lastFetch = Date.now();
            return cachedGames;
        }
    } catch (e) {
        console.log('❌ Stratégie 2 échouée');
    }

    // Stratégie 3 : L'URL exacte utilisée par la page Discover
    try {
        const discoverUrl = 'https://games.roblox.com/v1/games/list?model.gameSetTypeId=2&model.maxRows=30&model.sortToken=Popular&model.startRows=0&model.keyword=';
        const resp = await axios.get(discoverUrl, { headers, timeout: 8000 });
        if (resp.data && resp.data.games && resp.data.games.length > 0) {
            console.log(`✅ Stratégie 3 OK : ${resp.data.games.length} jeux`);
            cachedGames = resp.data.games;
            lastFetch = Date.now();
            return cachedGames;
        }
    } catch (e) {
        console.log('❌ Stratégie 3 échouée');
    }

    // Si tout échoue, on utilise le fallback
    console.log('⚠️ Aucune API disponible, utilisation du fallback.');
    const fallbackGames = FALLBACK_UNIVERSE_IDS.map(id => ({
        universeId: id,
        // Ces champs seront enrichis plus tard par le front via /api/details
        name: 'Chargement...',
        placeId: 0,
        playing: 0,
        visits: 0,
        upVotes: 0,
        downVotes: 0,
        updated: new Date().toISOString(),
        rootPlaceId: 0
    }));
    cachedGames = fallbackGames;
    lastFetch = Date.now();
    return fallbackGames;
}

// -------------------------------------------------------------------
// 2. ROUTE /api/games
// -------------------------------------------------------------------
app.get('/api/games', async (req, res) => {
    try {
        const games = await fetchPopularGames();
        const fromFallback = !games[0]?.placeId; // Si placeId est 0, c'est un fallback
        res.json({ games, fromFallback: fromFallback || false });
    } catch (error) {
        console.error('💥 Erreur /api/games :', error.message);
        const fallback = FALLBACK_UNIVERSE_IDS.map(id => ({ universeId: id, name: 'Chargement...', placeId: 0 }));
        res.json({ games: fallback, fromFallback: true, error: error.message });
    }
});

// -------------------------------------------------------------------
// 3. DÉTAILS (fonctionne toujours)
// -------------------------------------------------------------------
app.get('/api/details', async (req, res) => {
    try {
        const { ids } = req.query;
        if (!ids) return res.status(400).json({ error: 'Paramètre ids requis' });
        const url = `https://games.roblox.com/v1/games?universeIds=${ids}`;
        const resp = await axios.get(url, { headers, timeout: 10000 });
        res.json(resp.data);
    } catch (error) {
        console.error('Erreur /api/details:', error.message);
        res.status(500).json({ error: error.message, data: [] });
    }
});

// -------------------------------------------------------------------
// 4. MINIATURES (fonctionne toujours)
// -------------------------------------------------------------------
app.get('/api/thumbnails', async (req, res) => {
    try {
        const { ids } = req.query;
        if (!ids) return res.status(400).json({ error: 'Paramètre ids requis' });
        const url = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`;
        const resp = await axios.get(url, { headers, timeout: 10000 });
        res.json(resp.data);
    } catch (error) {
        console.error('Erreur /api/thumbnails:', error.message);
        res.status(500).json({ error: error.message, data: [] });
    }
});

// -------------------------------------------------------------------
// 5. ROUTE DE TEST (pour déboguer)
// -------------------------------------------------------------------
app.get('/api/test', async (req, res) => {
    const results = {};
    // Teste plusieurs endpoints et renvoie les statuts
    const tests = [
        { name: 'recommandations', url: 'https://games.roblox.com/v1/games/recommendations/play?algorithm=HomePagePopular&maxRows=5' },
        { name: 'list Popular', url: 'https://games.roblox.com/v1/games/list?model.sortToken=Popular&model.maxRows=5' },
        { name: 'details (test)', url: 'https://games.roblox.com/v1/games?universeIds=2303188151' },
        { name: 'thumbnails (test)', url: 'https://thumbnails.roblox.com/v1/games/icons?universeIds=2303188151&size=150x150&format=Png' }
    ];
    for (const test of tests) {
        try {
            const resp = await axios.get(test.url, { headers, timeout: 5000 });
            results[test.name] = { status: resp.status, ok: true };
        } catch (err) {
            results[test.name] = { status: err.response?.status || 'error', ok: false };
        }
    }
    res.json(results);
});

// -------------------------------------------------------------------
// 6. PAGE D'ACCUEIL
// -------------------------------------------------------------------
app.get('/', (req, res) => {
    res.send(`
        <h1>✅ Proxy Roblox actif</h1>
        <p>Routes disponibles : /api/games, /api/details, /api/thumbnails, /api/test</p>
    `);
});

// -------------------------------------------------------------------
// DÉMARRAGE
// -------------------------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur prêt sur le port ${PORT}`);
    console.log('📋 Listes de jeux de secours intégrée.');
});
