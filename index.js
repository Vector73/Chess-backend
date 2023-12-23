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

app.use(cors(corsOptions));

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
    await mongoose.connect('mongodb://127.0.0.1:27017/database');
}

var socketIdByUsername = {};
var socketUsernameById = {};
var activeGames = {};

io.on("connection", async (socket) => {
    console.log("Connected", socket.request.session.username);

    if (socket.request.session.username) {
        socketIdByUsername[socket.request.session.username] = socket.id;
        console.log("conn", socket.request.session.username);
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
        console.log(socketIdByUsername, socket.connected);
        io.emit("onlineUsers", { online: Object.keys(socketIdByUsername) })
        console.log("Disconnected...");
    })

    socket.on("reconnect", () => {
        console.log("recooonected")
    })

    socket.on("challenge", ({ player, challenger, handshake, time }) => {
        onChallenge(socket, socketIdByUsername[player], challenger, player, handshake, time);
    })

    socket.on("acceptChallenge", async ({ opponent, user, time }) => {
        if (socketIdByUsername[opponent] && socketIdByUsername[user]) {
            const chessGame = await onAcceptChallenge(socket, socketIdByUsername[opponent], socketIdByUsername[user], opponent, user, time * 60000);
            activeGames[chessGame.id] = chessGame;
            console.log(activeGames);
        }
    })

    socket.on("joinRoom", ({ gameId }) => {
        console.log("join")
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

    socket.on("move", ({ fen, gameId, move, opponent }) => {
        onMove(fen, gameId, move);
        const chessGame = activeGames[gameId];
        socket.to(gameId).emit("pushMove", { fen, opponent, move });
        if (chessGame) {
            if (!chessGame.nmoves) {
                chessGame.startGame(io);
            }
            chessGame.move(io, fen, move);
        }
    })
})

server.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
})