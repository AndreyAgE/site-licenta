//schema pentru mesaje
var mongoose = require("mongoose");
var messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // pentru DM
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },   // pentru chat grup
    text: { type: String, required: true }
}, { timestamps: true });
module.exports = mongoose.model("Message", messageSchema);