var express = require('express');
var router = express.Router();
var itemModel = require('../models/item');
var multer = require('multer')
var fs = require('fs')
var jszip = require('jszip')
var xml2js = require('xml2js')
var Auth = require('../auth/auth');

var upload = multer({ dest: 'uploads/' })

// GET items
router.get('/', Auth.validate, function(req, res, next) {
    console.log('GET /items');
    itemModel.findAll(req.user._id)
        .then(data => res.status(200).jsonp(data))
        .catch(err => res.status(500).jsonp(err));
});


// POST item
router.post('/', Auth.validate, function(req, res, next) {
    
});