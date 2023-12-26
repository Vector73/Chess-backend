const { Chess } = require("chess.js");
const { changeStatus, deleteGame } = require("./database/queries");
class ChessGame {
    constructor(id, white, black, initialTime = 600000) {
        this.id = id.toString();
        this.white = white;
        this.black = black;
        this.fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        this.nmoves = 0;
        this.gameInProgress = false;
        this.gameTimer = null;
        this.time = {
            white: initialTime,
            black: initialTime,
        };
        this.abortTime = 15;
        this.turn = true;
        this.game = new Chess(this.fen);
        this.drawRequestsLeft = {
            white: 3,
            black: 3,
        }
    }

    // TODO: Validate move

    move(io, fen, move) {
        if (!this.gameInProgress) return;
        this.abortTime = 15;
        this.game.move({ from: move.from, to: move.to, promotion: move.promotion });
        this.fen = fen;
        this.nmoves += 1;
        if (this.game.isCheckmate()) {
            this.gameOver();
            const winColor = this.turn ? 'w' : 'b';
            const winner = this.getPlayerByColor(winColor);
            io.to(this.id).emit('gameOver', { winner: winner, reason: "checkmate" });
            changeStatus(this.id, winColor, winner);
            return;
        }

        if (this.game.isDraw()) {
            this.gameOver();
            let reason;
            if (this.game.isInsufficientMaterial()) {
                reason = "insufficient material";
            } else if (this.game.isThreefoldRepetition()) {
                reason = "repetition";
            }
            io.to(this.id).emit('gameOver', { reason: reason, draw: true });
            changeStatus(this.id, 'd', 'draw');
            return;
        }
        this.turn = !this.turn;
    }

    resign(io, color) {
        if (!this.gameInProgress) return;
        this.gameOver();
        const winColor = !color ? 'w' : 'b';
        const winner = this.getPlayerByColor(winColor);
        io.to(this.id).emit('gameOver', { winner: winner, reason: "resignation of opponent" });
        clearInterval(this.gameTimer);
        changeStatus(this.id, winColor, winner);
    }

    draw(io) {
        if (!this.gameInProgress) return;
        this.gameOver();
        io.to(this.id).emit('gameOver', { reason: "agreement", draw: true });
        changeStatus(this.id, 'd', 'draw');
    }

    drawRequested(io, color) {
        if (!this.gameInProgress) return;
        const drawRequestColor = color ? 'white' : 'black';
        if (--this.drawRequestsLeft[drawRequestColor] < 0) return false;
        io.to(this.id).emit("drawRequested", { color });
    }

    startGame(io) {
        this.gameInProgress = true;
        io.to(this.id).emit("clearChat");
        this.startGameTimer(io);
    }

    startGameTimer(io) {
        this.gameTimer = setInterval(() => {
            this.updateGameTime();
            if (this.nmoves < 2) {
                this.abortTime -= 1;
            }
            const gameState = this.getGameState();
            io.to(this.id).emit('gameState', gameState);
            if (this.abortTime <= 0) {
                this.gameOver();
                io.to(this.id).emit('gameOver', {abort: true});
                deleteGame(this.id);
                return;
            }
            if (this.isGameTimeExpired()) {
                this.gameOver();
                const winColor = !this.turn? 'w' : 'b';
                const winner = this.getPlayerByColor(winColor);
                io.to(this.id).emit('gameOver', { winner: winner, reason: "timeout" });
                changeStatus(this.id, winColor, winner);
            }
        }, 1000);
    }

    isGameTimeExpired() {
        return this.time.white <= 0 || this.time.black <= 0;
    }

    resetGameTimer() {
        clearInterval(this.gameTimer);
        this.startGameTimer();
    }

    gameOver() {
        clearInterval(this.gameTimer);
        this.gameInProgress = false;
    }

    getPlayerByColor(color) {
        return color === 'w' ? this.white : this.black;
    }

    updateGameTime() {
        if (this.turn) {
            this.time.white -= 1000;
        } else {
            this.time.black -= 1000;
        }
    }

    getGameState() {
        return {
            fen: this.fen,
            white: this.white,
            black: this.black,
            time: this.time,
            abortTime: this.abortTime,
        };
    }

}

module.exports = ChessGame;
