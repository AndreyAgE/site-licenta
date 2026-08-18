const express  = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const cron = require("node-cron");
const socketio = require("socket.io");
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/post");
const notificationRoutes = require("./routes/notifications");
const messageRoutes = require("./routes/messages");
const groupRoutes = require("./routes/groups");
const User = require("./models/User");
const Post = require("./models/Post");
const Message = require("./models/Message");

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initializez Socket.IO pe acelasi server HTTP
const io = new socketio.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

mongoose.connect(process.env.MONGO_URI)
    .then(function() {
        console.log("Conectat cu succes la MongoDB");
    })
    .catch(function(err) {
        console.error("Eroare la conectarea MongoDB:", err);
    });

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);

io.on("connection", function(socket) {
    socket.on('join', function(userId) {
        if (userId) {
            socket.join(String(userId));
        }
    });

    socket.on('joinGroupRoom', function(groupId) {
        if (groupId) {
            socket.join('group_' + String(groupId));
        }
    });

    socket.on('leaveGroupRoom', function(groupId) {
        if (groupId) {
            socket.leave('group_' + String(groupId));
        }
    });

    socket.on('sendDM', async function(data) {
        try {
            const senderId = data.senderId;
            const receiverId = data.receiverId;
            const text = data.text;

            if (!senderId || !receiverId || !text) {
                return;
            }

            const msg = new Message({ sender: senderId, receiver: receiverId, text: text });
            await msg.save();
            await msg.populate('sender', 'username avatar');

            io.to(String(receiverId)).emit('receiveDM', msg);
            io.to(String(senderId)).emit('receiveDM', msg);
        } catch (e) {
            console.error('sendDM error:', e);
        }
    });

    socket.on('sendGroupMsg', async function(data) {
        try {
            const senderId = data.senderId;
            const groupId = data.groupId;
            const text = data.text;

            if (!senderId || !groupId || !text) {
                return;
            }

            const msg = new Message({ sender: senderId, group: groupId, text: text });
            await msg.save();
            await msg.populate('sender', 'username avatar');

            io.to('group_' + String(groupId)).emit('receiveGroupMsg', { groupId: groupId, msg: msg });
        } catch (e) {
            console.error('sendGroupMsg error:', e);
        }
    });

    socket.on("disconnect", function() {});
});

// cron job - in prima zi a lunii resetez gems lunare (useri 100, postari 0)
cron.schedule("0 0 1 * *", async function() {
    try {
        await User.updateMany({}, { monthlyGems: 100 });
        await Post.updateMany({}, { monthlyGems: 0 });
        console.log("Reset lunar efectuat: gems si leaderboard resetate.");
    } catch (err) {
        console.error("Eroare la reset lunar:", err);
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, function() {
    console.log("Serverul ruleaza pe portul " + PORT);
});