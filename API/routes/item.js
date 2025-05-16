var express = require('express');
var router = express.Router();
var itemModel = require('../controllers/item');
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
router.post('/', Auth.validate, async function(req, res, next) {
    const itemData = {
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        file: req.file ? req.file.filename : null,
        owner: req.user._id,
        metadata: req.body.metadata
    };
    console.log('POST /items', itemData);

    try {
        const res = await itemModel.create(itemData);
        res.status(201).jsonp(res);
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).jsonp({ error: 'Error processing file' });
    }
});


// DELETE item
router.delete('/:id', Auth.validate, function(req, res, next) {
    console.log('DELETE /items/' + req.params.id);
    itemModel.delete(req.params.id, req.user._id)
        .then(data => {
            if(data) {
                res.status(200).jsonp(data);
            } else {
                res.status(404).jsonp({ error: 'Item not found' });
            }
        })
        .catch(err => res.status(500).jsonp(err));
});