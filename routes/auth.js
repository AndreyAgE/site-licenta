// register login profil avatar coperta follow/unfollow search
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Notification = require("../models/Notification");
// register
router.post("/register", async function(req, res) {
    try {
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({ message: "Email deja folosit" });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const role = (process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'user';
        const newUser = new User({ username: username, email: email, password: hashedPassword, role: role });
        await newUser.save();
        res.status(201).json({ message: "Cont creat cu succes" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// login
router.post("/login", async function(req, res) {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ message: "Utilizator inexistent" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Parola incorecta" });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        const role = (process.env.ADMIN_EMAIL && user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) ? 'admin' : (user.role || 'user');
        res.status(200).json({
            token: token,
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar,
                monthlyGems: user.monthlyGems,
                rankGems: user.rankGems || 0,
                bio: user.bio || '',
                coverPhoto: user.coverPhoto || '',
                role: role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//datele unui utilizator dupa ID
router.get("/user/:id", async function(req, res) {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "Utilizator inexistent" });
        }
        const role = (process.env.ADMIN_EMAIL && user.email && user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) ? 'admin' : (user.role || 'user');
        res.json({
            id: user._id,
            username: user.username,
            avatar: user.avatar,
            monthlyGems: user.monthlyGems,
            rankGems: user.rankGems || 0,
            bio: user.bio || '',
            coverPhoto: user.coverPhoto || '',
            role: role,
            followersCount: user.followers ? user.followers.length : 0,
            followingCount: user.following ? user.following.length : 0,
            followerIds: user.followers ? user.followers.map(function(id) { return String(id); }) : [],
            followingIds: user.following ? user.following.map(function(id) { return String(id); }) : []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//utilizatorii pentru DM
router.get("/users", async function(req, res) {
    try {
        const users = await User.find().select('_id username avatar email role').sort({ username: 1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//actualizez bio-ul
router.put("/user/:id", async function(req, res) {
    try {
        const bio = req.body.bio;
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "Utilizator inexistent" });
        }
        user.bio = bio !== undefined ? bio : user.bio;
        await user.save();
        res.json({
            id: user._id,
            username: user.username,
            avatar: user.avatar,
            monthlyGems: user.monthlyGems,
            rankGems: user.rankGems || 0,
            bio: user.bio || '',
            coverPhoto: user.coverPhoto || ''
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//schimb poza de profil
router.put("/user/:id/avatar", async function(req, res) {
    try {
        const avatar = req.body.avatar;
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "Utilizator inexistent" });
        }
        user.avatar = avatar;
        await user.save();
        res.json({ avatar: user.avatar });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//schimb coperta profilului
router.put("/user/:id/cover", async function(req, res) {
    try {
        const coverPhoto = req.body.coverPhoto;
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "Utilizator inexistent" });
        }
        user.coverPhoto = coverPhoto;
        await user.save();
        res.json({ coverPhoto: user.coverPhoto });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//follow/unfollow
router.put("/user/:id/follow", async function(req, res) {
    try {
        const followerId = req.body.followerId;
        const user = await User.findById(req.params.id);
        const follower = await User.findById(followerId);

        if (!user || !follower) {
            return res.status(404).json({ message: "Utilizator inexistent" });
        }
        let alreadyFollowing = false;
        for (let i = 0; i < user.followers.length; i++) {
            if (String(user.followers[i]) === String(followerId)) {
                alreadyFollowing = true;
                break;
            }
        }
        if (alreadyFollowing) {
            user.followers = user.followers.filter(function(id) {
                return String(id) !== String(followerId);
            });
            follower.following = follower.following.filter(function(id) {
                return String(id) !== String(req.params.id);
            });
        } else {
            user.followers.push(followerId);
            follower.following.push(req.params.id);
        }
        await Promise.all([user.save(), follower.save()]);
        const isFollowing = !alreadyFollowing;
        if (isFollowing) {//notificare follow
            const notif = new Notification({ recipient: req.params.id, sender: followerId, type: 'follow' });
            await notif.save();
            await notif.populate('sender', 'username avatar');
            const io = req.app.get('io');
            if (io) {
                io.to(String(req.params.id)).emit('notification', notif);
            }
        }
        res.json({ isFollowing: isFollowing, followersCount: user.followers.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
//cauta utilizatori dupa username
router.get("/search", async function(req, res) {
    const q = req.query.q;
    if (!q || q.trim().length < 2) {
        return res.json({ users: [] });
    }
    try {
        const users = await User.find({ username: { $regex: q, $options: 'i' } })
            .select('_id username avatar')
            .limit(6);
        res.json({ users: users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// sterge un utilizator (doar admin)
router.delete("/user/:id", async function(req, res) {
    try {
        const adminId = req.body.adminId;
        const admin = await User.findById(adminId);
        const isAdmin = admin && (
            admin.role === 'admin' ||
            (process.env.ADMIN_EMAIL && admin.email && admin.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase())
        );
        if (!isAdmin) {
            return res.status(403).json({ message: 'Acces interzis' });
        }
        const target = await User.findById(req.params.id);
        if (!target) {
            return res.status(404).json({ message: 'Utilizator inexistent' });
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;
