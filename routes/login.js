const express = require("express");
const login = express.Router();
var User = require("../models/User");
const validator = require("email-validator");
const speakeasy = require('speakeasy');
const nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: "v.shm.kunal@gmail.com",
        pass: "nzuskqkpqzjngzkj"
    }
  }, {
    from: "v.shm.kunal@gmail.com",
  });

function verifyEmail(email) {
    return validator.validate(email);
}

function sendOtp(otp, email) {
    const mailOptions = {
        from: 'v.shm.kunal@gmail.com',
        to: email,
        subject: 'Your OTP for Login',
        text: `Your OTP is: ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
        }
    });
}

login.post("/sign-up", async (req, res) => {
    const valid = verifyEmail(req.body.email);
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

    const otpSecret = Math.floor(100000 + Math.random() * 900000);

    if (email_exists.length > 0 && !email_exists.online) {
        const data = {
            username: req.body.username,
            password: req.body.password,
            otpSecret: otpSecret,
        }
        await User.findOneAndUpdate({ email: req.body.email }, data);
        sendOtp(otpSecret, req.body.email);
        return res.json({ success: true });
    }

    _user.username = req.body.username;
    _user.email = req.body.email;
    _user.password = req.body.password;
    _user.otpSecret = otpSecret;

    try {
        await _user.save();
        req.session.username = req.body.username;
        req.session.email = req.body.email;
        sendOtp(otpSecret, req.body.email);
        return res.json({ success: true });
    } catch (e) {
        console.log(e);
        return res.json({ success: false });
    }
});

login.post("/sign-in", async (req, res) => {
    console.log("user")
    try {
        const user = await User.find({ username: req.body.username, online: true });
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

login.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    console.log(user)
    if (!user || !user.otpSecret) {
        return res.status(404).json({ message: 'User not found or OTP not generated' });
    }

    if (otp === user.otpSecret) {
        user.online = true;
        await user.save();
        return res.json({ success: true });
    } else {
        return res.status(401).json({ otpInvalid: true });
    }
});

module.exports = login;
