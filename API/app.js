var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');

const {v4: uuidv4} = require('uuid')
var session = require('express-session')
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy

// Connect to MongoDB
var mongoDB = 'mongodb://localhost:27017/engweb2025'
mongoose.connect(mongoDB)
var conn = mongoose.connection
conn.on('error', console.error.bind(console, 'MongoDB connection error:'));
conn.once('open', () => console.log('Connected to MongoDB'));

// passport config
var user = require('./models/user')
passport.use(new LocalStrategy(user.authenticate()))
passport.serializeUser(user.serializeUser())
passport.deserializeUser(user.deserializeUser())

var userRouter = require('./routes/user');
var itemRouter = require('./routes/item')
var adminRouter = require('./routes/admin');

var mongoose = require('mongoose');
const item = require('./models/item');

var app = express();

app.use(session({
  genid: req => {
    return uuidv4()
  },
  secret: 'EngWeb2025',
  resave: false,
  saveUninitialized: true
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/items', itemRouter);
app.use('/', userRouter);
app.use('/admin', adminRouter);


app.use('/fileStore', express.static(path.join(__dirname, 'public/fileStore'))); // Serve para ver os ficheiros directamente no browser 


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
