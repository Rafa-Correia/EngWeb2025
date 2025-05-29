var express = require('express');
var router = express.Router();
var axios = require('axios');

/* GET users listing. */
router.get('/register', (req, res, next) => {
  res.render('registerForm')
})

router.post('/register', (req, res, next) => {
  const username = req.body.uname
  const fullname = req.body.fname 
  const password = req.body.password

  let user = {
    username: username,
    name: fullname,
    password: password
  }

  console.log(JSON.stringify(user))

  axios.post('http://localhost:17000/register', user)
    .then(response => {
      if (response.status !== 201) {
        res.render('error', {error : response.data})
      }
      else {
        console.log('Success!')
        res.redirect('/')
      }
    })
    .catch(err => {
      res.render('error', {error: err})
      console.log('Something went wrong when registering user...')
    })
})

module.exports = router;
