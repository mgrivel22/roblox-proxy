const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Autorise ton site web à interroger ce serveur
app.use(cors());

// Route pour récupérer les jeux
app.get('/api/games', async (req, res) => {
    try {
        const response = await axios.get('https://games.roblox.com/v1/games/list?sortToken=&gameSetTypeId=1&isAscending=false&limit=50');
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération des jeux" });
    }
});

// Route pour les détails (besoin des IDs en paramètre)
app.get('/api/details', async (req, res) => {
    try {
        const { ids } = req.query;
        const response = await axios.get(`https://games.roblox.com/v1/games?universeIds=${ids}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Erreur détails" });
    }
});

// Route pour les miniatures
app.get('/api/thumbnails', async (req, res) => {
    try {
        const { ids } = req.query;
        const response = await axios.get(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Erreur thumbnails" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));
