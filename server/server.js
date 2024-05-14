const express = require("express");
const cors = require("cors");
const isProduction = process.env.NODE_ENV === "production";

const http = require(isProduction ? "http" : "https");
const fs = require("fs");
const socketIo = require("socket.io");
const { ExpressPeerServer } = require("peer");
const mongoose = require("mongoose");

const app = express();
app.use(cors());

let server;
if (isProduction) {
    console.log("inProduction");
  server = http.createServer(app); // Use http in production
} else {
  const serverOptions = {
    key: fs.readFileSync("../key.pem"),
    cert: fs.readFileSync("../cert.pem"),
  };
  server = http.createServer(serverOptions, app);
}

const io = socketIo(server, {
  cors: {
    origin: ["https://systemic-altruism-soulmegle.onrender.com", "http://localhost:5173", "https://192.168.117.97:5173", "http://192.168.117.97:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const peerServer = ExpressPeerServer(server, {
  debug: true,
});
app.use("/peerjs", peerServer);

app.use("/", (req, res) => {
  res.send("Hello World!");
});

mongoose
  .connect(
    "mongodb+srv://userdigi:nxXGji4U2SN0u5S2@cluster1.ergv8i1.mongodb.net/soulmegle-demo?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  interests: [String],
  socketId: String,
  peerId: String,
  online: Boolean,
});

const User = mongoose.model("User", userSchema);

app.use(express.json());

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("register", async ({ username, interests, peerId }) => {
    try {
      let user = await User.findOneAndUpdate(
        { username },
        { interests, socketId: socket.id, peerId, online: true },
        { upsert: true, new: true }
      );

      console.log("Registered user:", user);

      socket.on("disconnect", async () => {
        console.log("User disconnected:", socket.id);
        await User.findOneAndUpdate({ username }, { online: false });
      });
    } catch (error) {
      console.error("Error registering user:", error);
    }
  });

  socket.on("find-match", async (interests, user) => {
    try {
      const match = await User.findOne({
        username: { $ne: user.username },
        interests: { $in: interests },
        online: true,
      });

      if (match) {
        console.log("Match found:", match, user);
        io.to(socket.id).emit("match-found", {
          peerId: match.peerId,
          username: match.username,
        });
        io.to(match.socketId).emit("match-found", {
          peerId: user.peerId,
          username: user.username,
        });
      } else {
        console.log("No match found for user:", user.username);
        io.to(socket.id).emit("no-match");
      }
    } catch (error) {
      console.error("Error finding match:", error);
    }
  });

  socket.on("next", async (username) => {
    try {
      await User.findOneAndUpdate({ username }, { online: true });
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  });
});

server.listen(process.env.PORT || 5000, () => {
  console.log("Server is running on port 5000");
});
