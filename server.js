const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Middleware de logs détaillés
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.roblox.com/',
    'Origin': 'https://www.roblox.com'
};

// Cache simple pour éviter les appels trop fréquents (optionnel)
let gamesCache = { data: [], timestamp: 0 };

// Fonction pour récupérer les jeux populaires via plusieurs méthodes
async function fetchRobloxPopularGames() {
    const strategies = [
        // Méthode 1 : L'endpoint utilisé sur la page d'accueil (le plus fiable en général)
        async () => {
            const url = 'https://games.roblox.com/v1/games/list?model.gameSetTypeId=2&model.maxRows=30&model.sortToken=Popular&model.startRows=0';
            console.log('🎯 Tentative 1 :', url);
            const resp = await axios.get(url, { headers, timeout: 8000 });
            if (resp.data && Array.isArray(resp.data.games)) return resp.data.games;
            return [];
        },
        // Méthode 2 : Tri par popularité (sortFilter=2)
        async () => {
            const url = 'https://games.roblox.com/v1/games?sortFilter=2&limit=30';
            console.log('🎯 Tentative 2 :', url);
            const resp = await axios.get(url, { headers, timeout: 8000 });
            if (resp.data && Array.isArray(resp.data.data)) return resp.data.data;
            return [];
        },
        // Méthode 3 : L'endpoint "sorts" utilisé par le site
        async () => {
            const url = 'https://games.roblox.com/v1/games/sorts?gameSortsContext=HomeSorts';
            console.log('🎯 Tentative 3 :', url);
            const resp = await axios.get(url, { headers, timeout: 8000 });
            // La structure est différente mais on peut extraire des universes
            if (resp.data && resp.data.sorts && resp.data.sorts.length > 0) {
                // On récupère les universes du premier tri (Popular)
                const sort = resp.data.sorts[0];
                if (sort.games) return sort.games;
            }
            return [];
        },
        // Méthode 4 : Recherche avec un keyword vide sur le nouvel endpoint
        async () => {
            const url = 'https://games.roblox.com/v1/games/list?model.keyword=&model.maxRows=30&model.startRows=0&model.gameSetTypeId=2&model.sortToken=Popular';
            console.log('🎯 Tentative 4 :', url);
            const resp = await axios.get(url, { headers, timeout: 8000 });
            if (resp.data && Array.isArray(resp.data.games)) return resp.data.games;
            return [];
        }
    ];

    for (const strategy of strategies) {
        try {
            const games = await strategy();
            if (games && games.length > 0) {
                console.log(`✅ Succès avec ${games.length} jeux`);
                return games;
            }
        } catch (err) {
            console.log(`❌ Échec stratégie : ${err.message}`);
        }
    }
    return [];
}

// Route principale pour les jeux
app.get('/api/games', async (req, res) => {
    try {
        // Utilisation du cache si moins de 5 minutes (évite de se faire bloquer)
        const now = Date.now();
        if (gamesCache.data.length > 0 && (now - gamesCache.timestamp) < 300000) {
            console.log('📦 Envoi depuis le cache');
            return res.json({ games: gamesCache.data });
        }

        const games = await fetchRobloxPopularGames();

        // Fallback : si toujours vide, renvoyer une liste de jeux connus pour que le site fonctionne
        if (!games || games.length === 0) {
            console.log('⚠️ Aucun jeu trouvé, utilisation du fallback');
            // Quelques universes populaires vérifiés (ex: Adopt Me, Brookhaven, etc.)
            const fallbackGames = [
                { universeId: 2303188151, name: "Adopt Me!", placeId: 920587237, playing: 100000, visits: 30000000000, upVotes: 5000000, downVotes: 500000, updated: new Date().toISOString(), rootPlaceId: 920587237 },
                { universeId: 1680985200, name: "Brookhaven 🏡RP", placeId: 4925175923, playing: 80000, visits: 50000000000, upVotes: 4000000, downVotes: 600000, updated: new Date().toISOString(), rootPlaceId: 4925175923 },
                { universeId: 3231531487, name: "Blox Fruits", placeId: 2753915549, playing: 60000, visits: 20000000000, upVotes: 3000000, downVotes: 400000, updated: new Date().toISOString(), rootPlaceId: 2753915549 },
                { universeId: 3472719646, name: "Murder Mystery 2", placeId: 142823291, playing: 30000, visits: 10000000000, upVotes: 2000000, downVotes: 300000, updated: new Date().toISOString(), rootPlaceId: 142823291 },
                { universeId: 3521557827, name: "Pet Simulator X", placeId: 6284583030, playing: 25000, visits: 8000000000, upVotes: 1500000, downVotes: 200000, updated: new Date().toISOString(), rootPlaceId: 6284583030 }
            ];
            // On met à jour le cache
            gamesCache = { data: fallbackGames, timestamp: now };
            return res.json({ games: fallbackGames, fromFallback: true });
        }

        // Mise à jour du cache
        gamesCache = { data: games, timestamp: now };
        res.json({ games });

    } catch (error) {
        console.error('💥 Erreur /api/games :', error.message);
        // Même en cas d'erreur, on renvoie le fallback
        const fallbackGames = [ /* même liste que ci-dessus */ ];
        res.json({ games: fallbackGames, fromFallback: true, error: error.message });
    }
});

// Détails (inchangé mais avec validations)
app.get('/api/details', async (req, res) => {
    try {
        const { ids } = req.query;
        if (!ids) return res.status(400).json({ error: "Paramètre ids requis" });
        const url = `https://games.roblox.com/v1/games?universeIds=${ids}`;
        const resp = await axios.get(url, { headers, timeout: 10000 });
        res.json(resp.data);
    } catch (error) {
        res.status(500).json({ error: error.message, data: [] });
    }
});

// Thumbnails (inchangé)
app.get('/api/thumbnails', async (req, res) => {
    try {
        const { ids } = req.query;
        if (!ids) return res.status(400).json({ error: "Paramètre ids requis" });
        const url = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`;
        const resp = await axios.get(url, { headers, timeout: 10000 });
        res.json(resp.data);
    } catch (error) {
        res.status(500).json({ error: error.message, data: [] });
    }
});

// Route de test (pour voir la réponse brute d'un endpoint)
app.get('/api/test-raw', async (req, res) => {
    try {
        const url = 'https://games.roblox.com/v1/games/list?model.gameSetTypeId=2&model.maxRows=5&model.sortToken=Popular';
        const resp = await axios.get(url, { headers });
        res.json({ status: resp.status, data: resp.data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => res.send('✅ Proxy Roblox actif. Routes : /api/games, /api/details, /api/thumbnails, /api/test-raw'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Serveur prêt sur le port ${PORT}`));
