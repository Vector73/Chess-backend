const Game = require('../../models/Game');
async function onChallenge(socket, challengedId, challenger, challenged, handshake, time) {
    console.log("Challenged:" + challengedId)
    if (challengedId) {
        socket.to(challengedId).emit("pushChallenge", { challenger, handshake, time });
    }
}

module.exports = { onChallenge };