const mongoose = require('mongoose');
const documentSchema = require('./document')

var itemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    files : [{type: mongoose.Schema.Types.ObjectId, ref: 'document'}],
    creationDate: { type: Date, default: Date.now },
    owner : String,
    classificadores : [String],
    isPublic : { type: Boolean, default: false },
    comments: [{
        text: { type: String, required: true },
        date: { type: Date, default: Date.now }
    }],
}, {versionKey : false})

module.exports = mongoose.model('item', itemSchema);