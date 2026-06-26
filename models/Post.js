//schema pentru postari
var mongoose = require("mongoose");
//schema waypoint
var waypointSchema = new mongoose.Schema({
    lat:  { type: Number, required: true },
    lng:  { type: Number, required: true },
    name: { type: String, required: true },
    desc: { type: String },
    img:  { type: String }
});
//schema comentariu
var commentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
//schema postarii
var postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title:{ type: String, required: true },
    description:{ type: String },
    terrain:{ type: String },
    difficulty:{ type: String },
    totalDistance:{ type: String },
    route:[waypointSchema],
    likes:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    gems:{ type: Number, default: 0 },
    monthlyGems:{ type: Number, default: 0 },
    comments: [commentSchema]
}, { timestamps: true });
module.exports = mongoose.model('Post', postSchema);