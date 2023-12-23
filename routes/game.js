const express = require('express');
const Game = require('../models/Game');
const game = express.Router();

game.post("/games", async (req, res) => {
    const username = req.body.username
    try {
        const game = await Game.findOne({
            $or: [
                { "players.white.username": username },
                { "players.black.username": username },
            ],
            status: "pending",
        }).exec();

        if (game) {
            console.log(username, game.players.white.username)
            const color = game.players.white.username === username ? 1 : 0;
            const opponent = color ? game.players.black.username : game.players.white.username;
            const args = {
                found: true,
                fen: game.fen,
                color, opponent,
                gameId: game._id
            };
            return res.json(args);
        }
        return res.json({ found: false });
    } catch (e) {
        return res.json({ found: false });
    }
})

game.post("/completedGames", async (req, res) => {
    const username = req.body.username
    try {
        const games = await Game.find({
            $or: [
                { "players.white.username": username },
                { "players.black.username": username },
            ],
            status: { $ne: "pending" },
        }).sort({ timestamp: -1 }).exec();
    
        const gamesWithTimestamp = games.map(game => ({
            ...game.toObject(),
            timestamp: game._id.getTimestamp(),
        }));
    
        return res.json(gamesWithTimestamp);
    } catch (e) {
        return res.json({ failed: true});
    }
})

module.exports = game;