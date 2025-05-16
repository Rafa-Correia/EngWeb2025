const mongoose = require('mongoose');

var itemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    type: { type: String, required: true },
    file : String,
    creationDate: { type: Date, default: Date.now },
    owner :  {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    metadata : mongoose.Schema.Types.Mixed
}, {versionKey : false})

module.exports = mongoose.model('item', itemSchema);