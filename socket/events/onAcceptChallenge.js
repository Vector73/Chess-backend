const ChessGame = require("../../ChessGame");
const Game = require("../../models/Game");

async function onAcceptChallenge(socket, playerId, opponentId, player, opponent, time) {
    const white = Math.random();
    let whitePlayer = player;
    let blackPlayer = opponent;
    if (white > 0.5) {
        [whitePlayer, blackPlayer] = [blackPlayer, whitePlayer];
    }
    let _game = new Game({
        players: {
            white: { username: whitePlayer },
            black: { username: blackPlayer }
        },
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        status: "pending",
        winner: undefined,
    })

    const game = await _game.save()

    // To the player who challenged
    socket.to(playerId).emit("joinGame", { opponent: opponent, gameId: game._id, time, color: white > 0.5 ? 0 : 1 });
    socket.emit("joinGame", { opponent: player, gameId: game._id, time, color: white > 0.5 ? 1 : 0 });

    const chessGame = new ChessGame(game._id, whitePlayer, blackPlayer, time);
    return chessGame;
}

module.exports = { onAcceptChallenge }