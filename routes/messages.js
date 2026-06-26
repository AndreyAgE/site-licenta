var express = require("express");
var router = express.Router();
var Message = require("../models/Message");
//istoricul mesaje utilizatori
router.get("/dm/:u1/:u2", async function(req, res) {
    try {
        var u1 = req.params.u1;
        var u2 = req.params.u2;
        var msgs = await Message.find({
            $or: [
                { sender: u1, receiver: u2 },
                { sender: u2, receiver: u1 }
            ]
        })
        .populate('sender', 'username avatar')
        .sort({ createdAt: 1 })
        .limit(100);
        res.json(msgs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
//mesajele unui grup
router.get("/group/:groupId", async function(req, res) {
    try {
        var msgs = await Message.find({ group: req.params.groupId })
            .populate('sender', 'username avatar')
            .sort({ createdAt: 1 })
            .limit(100);
        res.json(msgs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
module.exports = router;
