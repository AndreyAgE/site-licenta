const express = require("express");
const router = express.Router();
const Group = require("../models/Group");

router.get("/", async function(req, res) {
    try {
        const groups = await Group.find()
            .populate('members', 'username avatar')
            .populate('creator', 'username')
            .sort({ createdAt: -1 });
        res.json(groups);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// grup nou
router.post("/", async function(req, res) {
    try {
        const creatorId = req.body.creatorId;
        const name = req.body.name;
        const location = req.body.location;
        const dateTime = req.body.dateTime;
        const maxMembers = req.body.maxMembers;

        const group = new Group({
            creator: creatorId,
            name: name,
            location: location || '',
            dateTime: dateTime || '',
            maxMembers: maxMembers || 10,
            members: [creatorId]
        });

        await group.save();
        await group.populate('members', 'username avatar');
        await group.populate('creator', 'username');
        
        res.status(201).json(group);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// intra in grup
router.put("/:id/join", async function(req, res) {
    try {
        const userId = req.body.userId;
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            return res.status(404).json({ message: "Grupul nu exista" });
        }
        if (group.members.length >= group.maxMembers) {
            return res.status(400).json({ message: "Grupul este plin" });
        }
        
        let esteIn = false;
        for (let i = 0; i < group.members.length; i++) {
            if (String(group.members[i]) === String(userId)) {
                esteIn = true;
                break;
            }
        }
        
        if (!esteIn) {
            group.members.push(userId);
            await group.save();
        }
        
        await group.populate('members', 'username avatar');
        res.json(group);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Iesire din grup
router.put("/:id/leave", async function(req, res) {
    try {
        const userId = req.body.userId;
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: "Grupul nu exista" });
        }
        
        group.members = group.members.filter(function(m) {
            return String(m) !== String(userId);
        });
        
        await group.save();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;