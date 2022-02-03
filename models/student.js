const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');


const StudentSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
}
)

StudentSchema.plugin(passportLocalMongoose);


module.exports = mongoose.model('Student', StudentSchema)