var express = require('express');
var router = express.Router();
var userModel = require('../models/user');
const passport = require('passport');
const jwt = require('jsonwebtoken');

router.post('/register', function(req, res, next) {
    userModel.register(
        new userModel({
            username: req.body.username,
            name: req.body.name,
            creationDate: new Date()
        }),
        req.body.password,
        function(err, user) {
            console.log(user);
            if (err) res.status(400).jsonp(err);
            else res.status(200).send('Yuppie! You are registered');
        }
    )
});

router.post('/login', passport.authenticate('local'), (req, res) => {
    //console.log(req.user._id);
    jwt.sign(
        {
            //_id: req.user._id,
            username: req.user.username,
            name: req.user.name,
            creationDate: new Date()
        },
        'EngWeb2025',
        { expiresIn: '1d' },
        (err, token) => {
            if (err) res.status(400).jsonp(err)
            else res.status(200).jsonp({ token : token })
        }
    )
})

module.exports = router;