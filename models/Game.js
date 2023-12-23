const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
    username: String,
});

const gameSchema = new mongoose.Schema({
    players: {
        white: playerSchema,
        black: playerSchema,
    },
    fen: String,
    status: String,
    winner: String,
});

var Game = mongoose.model("game", gameSchema);

module.exports = Game;
