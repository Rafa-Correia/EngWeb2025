const mongoose = require('mongoose')

var documentSchema = new mongoose.Schema({
    name: String,
    path: String,
    mimetype: String,
    lastModified: Date,
    uploadedAt: {type: Date, default: Date.now}
})

module.exports = mongoose.model('document', documentSchema)