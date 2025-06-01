var express = require('express');
var router = express.Router();
var axios = require('axios');

/* GET users listing. */
router.get('/register', (req, res, next) => {
  res.render('registerForm', {date: new Date().toISOString().slice(0, 10)})
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
      if (response.status !== 200) {
        res.render('error', {error : response.data})
      }
      else {
        console.log('Success!')
        res.redirect('http://localhost:17001/')
      }
    })
    .catch(err => {
      res.render('error', {error: err})
      console.log('Something went wrong when registering user...')
    })
})

router.get('/login', (req, res, next) => {
  res.render('loginForm', {date: new Date().toISOString().slice(0, 10)})
})

router.post('/login', (req, res, next) => {
  const username = req.body.uname
  const password = req.body.password

  let user = {
    username : username,
    password : password
  }

  console.log(`Trying to log ${username} in...`)
  axios.post('http://localhost:17000/login', user)
    .then(response => {
      if(response.status !== 200) {
        res.render('error', {error : response.data})
      }
      else {
        console.log("Success!")
        res.status(200)
        res.cookie('jwt', response.data.token, {maxAge:86400000, httpOnly: false}) //86'400'000 ms is 1 day!
        res.redirect('/')
      }
    })
    .catch(err => {
      res.render('error', {error : err})
      console.log('Something went wrong when loging user in...')
    })
})

router.post('/logout', (req, res, next) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  })
  res.sendStatus(200)
})

module.exports = router;
