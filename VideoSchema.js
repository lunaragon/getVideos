const mongoose = require('mongoose')
mongoose.Promise = Promise

const VideoMetaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255
    },
    base_url:String,
    url: {
        type: String,
        required: true
    },
    categories: {
        type: [String],
        required: true
    }
})

module.exports = mongoose.model('VideoMeta', VideoMetaSchema)