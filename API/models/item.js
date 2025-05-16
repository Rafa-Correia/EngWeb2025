const mongoose = require('mongoose');

var itemSchema = new mongoose.Schema({
    name: String,
    description: String,
    type : String,
    file : String,
    creationDate : new Date(),
    owner :  {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    metadata : mongoose.Schema.Types.Mixed
}, {versionKey : false})

module.exports = mongoose.model('item', itemSchema);