var User = require("../../models/User")

async function onConnect(socket, username) {
    const user = await User.findOneAndUpdate({username: username.username}, {online: true});
}

module.exports = onConnect;