const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Route simplifiée pour éviter le 404
app.get('/api/games', async (req, res) => {
    try {
        // Cette URL récupère les jeux les plus populaires (Front Page)
        const response = await axios.get('https://games.roblox.com/v1/games/list?model.gameSetTypeId=2&model.maxRows=30', { headers });
        
        // Structure de réponse de Roblox : data.games
        if (response.data && response.data.games) {
            res.json(response.data);
        } else {
            res.json({ games: [] });
        }
    } catch (error) {
        console.error("Erreur détaillée:", error.response ? error.response.status : error.message);
        res.status(500).json({ 
            error: "Erreur Roblox", 
            status: error.response ? error.response.status : "Unknown" 
        });
    }
});

app.get('/api/details', async (req, res) => {
    try {
        const { ids } = req.query;
        const response = await axios.get(`https://games.roblox.com/v1/games?universeIds=${ids}`, { headers });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Erreur détails" });
    }
});

app.get('/api/thumbnails', async (req, res) => {
    try {
        const { ids } = req.query;
        const response = await axios.get(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`, { headers });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Erreur thumbnails" });
    }
});

app.get('/', (req, res) => res.send("Proxy Actif"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur sur port ${PORT}`));
