const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// istoricul mesaje utilizatori
router.get("/dm/:u1/:u2", async function(req, res) {
    try {
        const u1 = req.params.u1;
        const u2 = req.params.u2;
        
        const msgs = await Message.find({
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

// mesajele unui grup
router.get("/group/:groupId", async function(req, res) {
    try {
        const msgs = await Message.find({ group: req.params.groupId })
            .populate('sender', 'username avatar')
            .sort({ createdAt: 1 })
            .limit(100);
            
        res.json(msgs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;