const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
// Aduc notificarile necitite
router.get('/:userId', async function(req, res) {
    try {
        const notifs = await Notification.find({ recipient: req.params.userId, read: false })
            .populate('sender', 'username avatar')
            .populate('post', 'title')
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(notifs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Marchez toate notificarile unui user ca citite
router.put('/read-all/:userId', async function(req, res) {
    try {
        await Notification.updateMany({ recipient: req.params.userId }, { read: true });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
module.exports = router;
