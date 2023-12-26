const Game = require("../../models/Game");

async function joinRoom(socket, username) {
    try {
        const game = await Game.findOne({
            $or: [
                { "players.white.username": username },
                { "players.black.username": username },
            ],
            status: "pending",
        }).exec();

        if (game) {
            socket.join(game._id.toString());
        }
    } catch (e) { }
}

module.exports = { joinRoom };
