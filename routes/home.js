const express = require('express');
const User = require('../models/User');
const home = express.Router();

home.post('/', (req, res) => {
    if (req.session.authenticated) {
        return res.json({
            authenticated: 1,
            username: req.session.username,
            email: req.session.email,
        });
    }
    else {
        return res.json({authenticated: 0});
    }
});

async function get_online_users() {
    const online_users = await User.find({online: true});
    return online_users;
}

home.post('/api/online', async (req, res) => {
    const online_users = await get_online_users();
    res.json({success: true, online_users: online_users})
}) 

module.exports = home