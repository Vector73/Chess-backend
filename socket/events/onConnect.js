var User = require("../../models/User")

async function onConnect(socket, username) {
    // const username = socket.handshake.auth.username;
    console.log(username);
    const user = await User.findOneAndUpdate({username: username.username}, {online: true});
    console.log(user);
}

module.exports = onConnect;