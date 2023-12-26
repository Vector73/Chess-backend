async function onChallenge(socket, challengedId, challenger, challenged, handshake, time) {
    if (challengedId) {
        socket.to(challengedId).emit("pushChallenge", { challenger, handshake, time });
    }
}

module.exports = { onChallenge };