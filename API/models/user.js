const moongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

var userSchema = new moongoose.Schema({
    username: String,
    password: String,
    name : String,
    creationDate : Date
});

userSchema.plugin(passportLocalMongoose);

module.exports = moongoose.model('user', userSchema);