const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

// Configuration par défaut pour Axios (pour éviter d'être bloqué)
const robloxConfig = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    }
};

app.get('/api/games', async (req, res) => {
    try {
        // On utilise une URL un peu plus simple pour commencer
        const response = await axios.get('https://games.roblox.com/v1/games/list?model.groupFilter=1&model.maxRows=20', robloxConfig);
        res.json(response.data);
    } catch (error) {
        console.error("Erreur Roblox:", error.message);
        res.status(500).json({ 
            error: "Erreur lors de la récupération des jeux",
            details: error.message 
        });
    }
});

app.get('/api/details', async (req, res) => {
    try {
        const { ids } = req.query;
        const response = await axios.get(`https://games.roblox.com/v1/games?universeIds=${ids}`, robloxConfig);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Erreur détails" });
    }
});

app.get('/api/thumbnails', async (req, res) => {
    try {
        const { ids } = req.query;
        const response = await axios.get(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`, robloxConfig);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Erreur thumbnails" });
    }
});

// Route d'accueil pour vérifier si le serveur vit
app.get('/', (req, res) => {
    res.send("Proxy Roblox opérationnel ! Ajoutez /api/games à l'URL pour voir les données.");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));
