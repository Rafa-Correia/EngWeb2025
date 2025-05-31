var express = require('express');
var router = express.Router();
var axios = require('axios')
var multer = require('multer')
var upload = multer({dest: 'tmp'})
var fs = require('fs')

router.get('/', (req, res, next) => {
    axios.get('http://localhost:17000/items', {
        headers: {
            Authorization: `Bearer ${req.cookies.jwt}`
        }
    })
    .then(response => {
        res.render('diaryList', {diaryEntries: response.data})
    })
    .catch(err => {
        res.render('error', {error: err})
    })
})

router.get('/create', (req, res, next) => {
    res.render('diaryEntryForm')
})

router.post('/create', (req, res, next) => {
    let post = {
        title: req.body.title,
        description: req.body.desc
    }

    console.log(JSON.stringify(post))
    res.redirect('http://localhost:17001')
})

module.exports = router;