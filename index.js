const express = require('express')
const PORT = process.env.PORT || 3001
const app = express()
const http = require('http');
const server = http.createServer(app);
const session = require('express-session')
const mongoose = require('mongoose')
const login = require('./routes/login')
const home = require('./routes/home')
const game = require('./routes/game')
const { onChallenge } = require('./socket/events/onChallenge');
const { onAcceptChallenge } = require('./socket/events/onAcceptChallenge');
const { joinRoom } = require('./socket/events/joinRoom');
const { onMove } = require('./database/queries');
const cors = require('cors');
require('dotenv').config();
const io = require("socket.io")(server, {
    cors: {
        origin: "https://chess-ir64.onrender.com",
    }
});

const corsOptions = {
    origin: 'https://chess-ir64.onrender.com',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
};

app.use(cors());

app.use(express.json())
const sessionMiddleware = session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
})

app.use(sessionMiddleware)
app.use('/home', home)
app.use('/login', login)
app.use('/game', game)

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));

main().catch(err => console.log(err));

async function main() {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log("Database connected");
        }).catch((e) => {
            console.log(e);
        });
}

var socketIdByUsername = {};
var socketUsernameById = {};
var activeGames = {};

io.on("connection", async (socket) => {
    console.log("Connected", socket.request.session.username);

    if (socket.request.session.username) {
        socketIdByUsername[socket.request.session.username] = socket.id;
        joinRoom(socket, socket.request.session.username)
    }
    socket.on("username", ({ username, reconnect }) => {
        socketIdByUsername[username] = socket.id;
        socketUsernameById[socket.id] = username;
        console.log(socketIdByUsername);
        joinRoom(socket, username);
        if (!reconnect) io.emit("onlineUsers", { online: Object.keys(socketIdByUsername) })
    })

    socket.on("disconnect", async () => {
        // delete socketIdByUsername[socketUsernameById[socket.id]];
        // delete socketUsernameById[socket.id];
        io.emit("onlineUsers", { online: Object.keys(socketIdByUsername) })
        console.log("Disconnected...");
    })

    socket.on("reconnect", () => {
        console.log("reconnected");
    })

    socket.on("challenge", async ({ player, challenger, handshake, time }) => {
        await onChallenge(socket, socketIdByUsername[player], challenger, player, handshake, time);
    })

    socket.on("acceptChallenge", async ({ opponent, user, time }) => {
        const userId = socketIdByUsername[user];
        const opponentId = socketIdByUsername[opponent];
        if (userId && opponentId) {
            const chessGame = await onAcceptChallenge(socket, opponentId, userId, opponent, user, time * 60000);
            activeGames[chessGame.id] = chessGame;
            chessGame.startGame(io);
            io.to(chessGame.id).emit("clearChat");
        }
    })

    socket.on("joinRoom", ({ gameId }) => {
        socket.join(gameId);
    })

    socket.on("resign", ({ color, gameId }) => {
        const chessGame = activeGames[gameId];
        if (chessGame) {
            chessGame.resign(io, color);
        }
    })

    socket.on("requestDraw", ({ gameId, color }) => {
        const chessGame = activeGames[gameId];
        if (chessGame) {
            chessGame.drawRequested(io, color);
        }
    })

    socket.on("rejectDraw", ({ gameId, color }) => {
        socket.to(gameId).emit("drawRejected");
    })

    socket.on("draw", ({ gameId }) => {
        const chessGame = activeGames[gameId];
        if (chessGame) {
            chessGame.draw(io);
        }
    })

    socket.on("message", ({ gameId, sender, content, key }) => {
        socket.to(gameId).emit("sendMessage", { sender, content, key })
    })

    socket.on("move", async ({ fen, gameId, move, opponent }) => {
        const chessGame = activeGames[gameId];
        if (chessGame && chessGame.gameInProgress) {
            socket.to(gameId).emit("pushMove", { fen, opponent, move });
            chessGame.move(io, fen, move);
        }
    })
})

server.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
})