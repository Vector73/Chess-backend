const Game = require("../models/Game");
const User = require("../models/User");

async function changeStatus(gameId, status, winner) {
    try {
        await Game.findOneAndUpdate({ _id: gameId }, { status: status, winner: winner });
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

async function deleteGame(gameId) {
    try {
        await Game.findOneAndDelete({ _id: gameId });
    } catch (e) {
        console.log(e);
    }
}

async function makeUserOnline(gameId) {
    try {
        await User.findOneAndUpdate({ username: username.username }, { online: true });
    } catch (e) {
        console.log(e);
    }
}
module.exports = { changeStatus, onMove, deleteGame, makeUserOnline }