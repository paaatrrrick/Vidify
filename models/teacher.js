const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const TeacherSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    videoIds: []
}
)

TeacherSchema.plugin(passportLocalMongoose);


module.exports = mongoose.model('Teacher', TeacherSchema)