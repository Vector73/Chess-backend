const express = require("express");
const login = express.Router();
var User = require("../models/User");
const validator = require("deep-email-validator");

async function verifyEmail(email) {
    const { valid } = await validator.validate(email);
    return valid; // TODO: Replace to valid
}

login.post("/sign-up", async (req, res) => {
    const valid = await verifyEmail(req.body.email);
    console.log(req.body.email, valid);
    if (!valid) {
        return res.json({ success: false, emailNotValid: true });
    }

    let _user = new User();
    const email_exists = await User.find({ email: req.body.email });
    const username_exists = await User.find({ username: req.body.username });
    if (email_exists.length > 0) {
        return res.json({ success: false, emailExists: true });
    }
    if (username_exists.length > 0) {
        return res.json({ success: false, usernameExists: true });
    }

    _user.username = req.body.username;
    _user.email = req.body.email;
    _user.password = req.body.password;
    _user.online = true;

    try {
        await _user.save();

        req.session.authenticated = true;
        req.session.username = req.body.username;
        req.session.email = req.body.email;

        return res.json({ success: true });
    } catch (e) {
        console.log(e);
        return res.json({ success: false });
    }
});

login.post("/sign-in", async (req, res) => {
    console.log("user")
    try {
        const user = await User.find({ username: req.body.username });
        if (user.length > 0) {
            const email = user[0].email;
            const password = user[0].password;
            const username = user[0].username;

            if (password === req.body.password) {
                req.session.authenticated = true;
                req.session.username = username;
                req.session.email = email;
                console.log(req.session);

                await User.findOneAndUpdate({ username: username }, { online: true });

                return res.json({
                    success: true,
                    email: email,
                    username: username,
                });
            } else {
                return res.json({
                    success: false,
                    incorrectPassword: true,
                });
            }
        } else {
            return res.json({
                success: false,
                noUserFound: true,
            });
        }
    } catch (e) {
        res.json({error: e});
    }
});

module.exports = login;
