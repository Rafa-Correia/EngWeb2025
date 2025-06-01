const mongoose = require('mongoose')

var documentSchema = new mongoose.Schema({
    name: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: {type: Date, default: Date.now}
})

module.exports = mongoose.model('document', documentSchema)