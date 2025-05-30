const mongoose = require('mongoose');

var itemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    type: { type: String, required: true },
    file : String,
    creationDate: { type: Date, default: Date.now },
    owner : String,
    classificadores : [String],
    isPublic : { type: Boolean, default: false },
    comments: [{
        text: { type: String, required: true },
        date: { type: Date, default: Date.now }
    }],
    metadata : mongoose.Schema.Types.Mixed
}, {versionKey : false})

module.exports = mongoose.model('item', itemSchema);