const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Configuration CORS plus permissive pour le développement
app.use(cors({
    origin: '*',
    methods: ['GET'],
    allowedHeaders: ['Content-Type']
}));

// Middleware pour les logs
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
};

// Route simplifiée pour les jeux populaires
app.get('/api/games', async (req, res) => {
    try {
        console.log('Récupération des jeux populaires...');
        
        // Essayer plusieurs endpoints possibles de Roblox
        const urls = [
            'https://games.roblox.com/v1/games/list?model.gameSetTypeId=2&model.maxRows=30',
            'https://games.roblox.com/v1/games?sortFilter=2&limit=30'
        ];
        
        let response = null;
        let games = [];
        
        for (const url of urls) {
            try {
                console.log(`Tentative avec l'URL: ${url}`);
                response = await axios.get(url, { 
                    headers,
                    timeout: 10000 // 10 secondes timeout
                });
                
                if (response.data) {
                    // Adapter selon la structure de réponse
                    if (response.data.games) {
                        games = response.data.games;
                        console.log(`✅ ${games.length} jeux récupérés via games.list`);
                    } else if (response.data.data) {
                        games = response.data.data;
                        console.log(`✅ ${games.length} jeux récupérés via games`);
                    }
                    break; // Sortir de la boucle si succès
                }
            } catch (err) {
                console.log(`❌ Échec avec ${url}: ${err.message}`);
            }
        }
        
        res.json({ games });
        
    } catch (error) {
        console.error("Erreur détaillée:", error.message);
        res.status(500).json({ 
            error: "Erreur Roblox", 
            games: [],
            message: error.message 
        });
    }
});

// Route pour les détails des jeux
app.get('/api/details', async (req, res) => {
    try {
        const { ids } = req.query;
        
        if (!ids) {
            return res.status(400).json({ error: "Paramètre 'ids' requis", data: [] });
        }
        
        console.log(`Récupération des détails pour IDs: ${ids}`);
        
        const response = await axios.get(
            `https://games.roblox.com/v1/games?universeIds=${ids}`, 
            { headers, timeout: 10000 }
        );
        
        res.json(response.data);
        
    } catch (error) {
        console.error("Erreur détails:", error.message);
        res.status(500).json({ 
            error: "Erreur détails",
            data: [],
            message: error.message 
        });
    }
});

// Route pour les thumbnails
app.get('/api/thumbnails', async (req, res) => {
    try {
        const { ids } = req.query;
        
        if (!ids) {
            return res.status(400).json({ error: "Paramètre 'ids' requis", data: [] });
        }
        
        console.log(`Récupération des thumbnails pour IDs: ${ids}`);
        
        const response = await axios.get(
            `https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`, 
            { headers, timeout: 10000 }
        );
        
        res.json(response.data);
        
    } catch (error) {
        console.error("Erreur thumbnails:", error.message);
        res.status(500).json({ 
            error: "Erreur thumbnails",
            data: [],
            message: error.message 
        });
    }
});

// Route de test pour vérifier que le serveur fonctionne
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        message: 'Le serveur proxy fonctionne correctement' 
    });
});

// Route principale
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>Proxy Roblox Actif</title></head>
            <body>
                <h1>✅ Proxy Roblox Actif</h1>
                <p>Serveur en cours d'exécution sur le port ${PORT}</p>
                <h2>Routes disponibles :</h2>
                <ul>
                    <li><a href="/api/test">/api/test</a> - Test du serveur</li>
                    <li><a href="/api/games">/api/games</a> - Liste des jeux populaires</li>
                    <li>/api/details?ids=123,456 - Détails des jeux</li>
                    <li>/api/thumbnails?ids=123,456 - Miniatures des jeux</li>
                </ul>
            </body>
        </html>
    `);
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route non trouvée',
        path: req.url 
    });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({ 
        error: 'Erreur interne du serveur',
        message: err.message 
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur proxy Roblox démarré sur le port ${PORT}`);
    console.log(`📊 Routes disponibles:`);
    console.log(`   - /api/test (test)`);
    console.log(`   - /api/games (jeux populaires)`);
    console.log(`   - /api/details?ids=... (détails)`);
    console.log(`   - /api/thumbnails?ids=... (miniatures)`);
});
