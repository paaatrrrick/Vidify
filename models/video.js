const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VideoSchema = new Schema({
    title: String,
    description: String,
    URL: String,
    thumbnailURL: String,
    watchIds: []
})

module.exports = mongoose.model('Video', VideoSchema)