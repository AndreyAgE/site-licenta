//schema utilizatori
var mongoose = require("mongoose");
var userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: ""
    },
    monthlyGems: {
        type: Number,
        default: 100
    },
    rankGems: {
        type: Number,
        default: 0
    },
    bio: {
        type: String,
        default: ''
    },
    coverPhoto: {
        type: String,
        default: 'poze/pozacoperta.png'
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);
