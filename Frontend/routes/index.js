var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {date: new Date().toISOString().slice(0, 10)});
});

module.exports = router;
