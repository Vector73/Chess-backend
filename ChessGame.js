const { Chess } = require("chess.js");
const { changeStatus } = require("./database/queries");
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
        this.game.move({ from: move.from, to: move.to, promotion: move.promotion });
        this.fen = fen;
        this.nmoves += 1;
        if (this.game.isCheckmate()) {
            this.gameOver();
            io.to(this.id).emit('gameOver', { winner: this.turn, reason: "checkmate" });
            const color = this.turn ? 'w' : 'b';
            changeStatus(this.id, color, this.getPlayerByColor(color));
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
        io.to(this.id).emit('gameOver', { winner: !color, reason: "resignation of opponent" });
        clearInterval(this.gameTimer);
        const winColor = !color ? 'w' : 'b';
        changeStatus(this.id, winColor, this.getPlayerByColor(winColor));
    }

    draw(io) {
        if (!this.gameInProgress) return;
        this.gameOver();
        io.to(this.id).emit('gameOver', { reason: "agreement", draw: true });
        clearInterval(this.gameTimer);
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
        this.startGameTimer(io);
    }

    startGameTimer(io) {
        this.gameTimer = setInterval(() => {
            this.updateGameTime();
            const gameState = this.getGameState();
            io.to(this.id).emit('gameState', gameState);

            if (this.isGameTimeExpired()) {
                this.gameOver();
                io.to(this.id).emit('gameOver', { winner: !this.turn, reason: "timeout" });
                const color = !this.turn ? 'w' : 'b';
                changeStatus(this.id, color, this.getPlayerByColor(color));
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
        };
    }

}

module.exports = ChessGame;
