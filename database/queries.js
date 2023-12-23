const Game = require("../models/Game");

async function changeStatus(gameId, status, winner) {
    try {
        await Game.findOneAndUpdate({ _id: gameId }, { status:  status, winner: winner });
    } catch (e) {
        console.log(e);
    }
}

async function onMove(fen, gameId, move) {
    try {
        await Game.findOneAndUpdate({ _id: gameId }, { fen: fen });
    } catch (e) {
        console.log(e);
    }
}

module.exports = { changeStatus, onMove }