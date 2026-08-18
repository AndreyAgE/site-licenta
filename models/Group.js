const mongoose = require("mongoose");
const groupSchema = new mongoose.Schema({
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    location: { type: String, default: '' },
    dateTime: { type: String, default: '' },
    maxMembers: { type: Number, default: 10 },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, 
{ timestamps: true });
module.exports = mongoose.model("Group", groupSchema);