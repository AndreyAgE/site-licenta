const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");

// creeaza o notificare si o trimite live prin Socket.IO
// nu trimite daca expeditorul e autorul postarii
async function notify(io, params) {
    const recipient = params.recipient;
    const sender = params.sender;
    const type = params.type;
    const post = params.post;
    
    if (!recipient || !sender || String(recipient) === String(sender)) {
        return;
    }
    try {
        const notif = new Notification({ recipient: recipient, sender: sender, type: type, post: post });
        await notif.save();
        await notif.populate('sender', 'username avatar');
        
        if (io) {
            io.to(String(recipient)).emit('notification', notif);
        }
    } catch (e) {
        console.error('notify error:', e);
    }
}

// salveaza o postare noua
router.post("/", async function(req, res) {
    try {
        const userId = req.body.userId;
        const title = req.body.title;
        const description = req.body.description;
        const terrain = req.body.terrain;
        const difficulty = req.body.difficulty;
        const totalDistance = req.body.totalDistance;
        const route = req.body.route;
        
        const newPost = new Post({
            user: userId,
            title: title,
            description: description,
            terrain: terrain,
            difficulty: difficulty,
            totalDistance: totalDistance,
            route: route
        });
        
        const savedPost = await newPost.save();
        res.status(201).json(savedPost);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// postarile unui user (profil)
router.get("/user/:userId", async function(req, res) {
    try {
        const posts = await Post.find({ user: req.params.userId })
            .populate("user", "username avatar")
            .populate("comments.user", "username avatar")
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// leaderboard
router.get("/leaderboard", async function(req, res) {
    try {
        const posts = await Post.find()
            .populate("user", "username avatar")
            .sort({ monthlyGems: -1 })
            .limit(9);
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// postari de la userii urmariți (pt harta)
router.get("/following/:userId", async function(req, res) {
    try {
        const user = await User.findById(req.params.userId).select('following');
        if (!user) {
            return res.status(404).json({ message: "Utilizator inexistent" });
        }
        
        const posts = await Post.find({ user: { $in: user.following } })
            .populate("user", "username avatar")
            .populate("comments.user", "username avatar")
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// toate postarile pentru feed
router.get("/", async function(req, res) {
    try {
        const posts = await Post.find()
            .populate("user", "username avatar")
            .populate("comments.user", "username avatar")
            .sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ofera gems la o postare
// scade din balanta lunara si ofera gems
router.put("/:id/gem", async function(req, res) {
    try {
        const userId = req.body.userId;
        const parsedAmount = parseInt(req.body.amount);
        
        if (!userId || !parsedAmount || parsedAmount < 1) {
            return res.status(400).json({ message: "Date invalide" });
        }
        
        const user = await User.findById(userId);
        const post = await Post.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: "Utilizatorul nu a fost gasit" });
        }
        if (!post) {
            return res.status(404).json({ message: "Postarea nu a fost gasita" });
        }
        if (user.monthlyGems < parsedAmount) {
            return res.status(400).json({ message: "Nu ai destule gems! Ai doar " + user.monthlyGems + " disponibili." });
        }
        
        user.monthlyGems -= parsedAmount;
        post.gems = (post.gems || 0) + parsedAmount;
        post.monthlyGems = (post.monthlyGems || 0) + parsedAmount;
        
        const author = await User.findById(post.user);
        if (author) {
            author.rankGems = (author.rankGems || 0) + parsedAmount;
            await author.save();
        }
        
        await Promise.all([user.save(), post.save()]);
        notify(req.app.get('io'), { recipient: post.user, sender: userId, type: 'gem', post: post._id });
        
        res.json({ postGems: post.gems, remainingGems: user.monthlyGems });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// like la o postare
router.put("/:id/like", async function(req, res) {
    try {
        const userId = req.body.userId;
        
        if (!userId) {
            return res.status(400).json({ message: "userId este obligatoriu" });
        }
        
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Postarea nu a fost gasita" });
        }
        
        // caut daca userul a mai dat like inainte
        let idx = -1;
        for (let i = 0; i < post.likes.length; i++) {
            if (String(post.likes[i]) === String(userId)) {
                idx = i;
                break;
            }
        }
        
        if (idx === -1) {
            post.likes.push(userId);
        } else {
            post.likes.splice(idx, 1);
        }
        
        await post.save();
        
        // trimit notificare doar la like, nu si la unlike
        if (idx === -1) {
            notify(req.app.get('io'), { recipient: post.user, sender: userId, type: 'like', post: post._id });
        }

        res.json({ likes: post.likes.length, liked: idx === -1 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// adauga comentariu la o postare
router.post("/:id/comments", async function(req, res) {
    try {
        const userId = req.body.userId;
        const text = req.body.text;

        if (!userId || !text) {
            return res.status(400).json({ message: "userId si text sunt obligatorii" });
        }
        
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Postarea nu a fost gasita" });
        }
        
        post.comments.push({ user: userId, text: text });
        await post.save();
        await post.populate("comments.user", "username avatar");
        
        notify(req.app.get('io'), { recipient: post.user, sender: userId, type: 'comment', post: post._id });
        
        const newComment = post.comments[post.comments.length - 1];
        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// sterge o postare (admin)
router.delete("/:id", async function(req, res) {
    try {
        const userId = req.body.userId;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Postarea nu a fost gasita' });
        }
        
        const requester = await User.findById(userId);
        const isAdmin = requester && (
            requester.role === 'admin' ||
            (process.env.ADMIN_EMAIL && requester.email && requester.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase())
        );
        
        if (String(post.user) !== String(userId) && !isAdmin) {
            return res.status(403).json({ message: 'Nu ai permisiunea sa stergi aceasta postare' });
        }

        await Post.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// aduc o singura postare dupa ID (folosit pt notificari)
router.get("/:id", async function(req, res) {
    try {
        const post = await Post.findById(req.params.id)
            .populate("user", "username avatar")
            .populate("comments.user", "username avatar");
            
        if (!post) {
            return res.status(404).json({ message: "Postarea nu a fost gasita" });
        }
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;