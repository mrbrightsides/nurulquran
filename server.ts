
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Study Circles State
  // Map of roomId -> { members: { socketId: { name, photo } }, sharedVerse: null, messages: [] }
  const rooms = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-circle", ({ roomId, user }) => {
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, { members: new Map(), sharedVerse: null, messages: [] });
      }
      
      const room = rooms.get(roomId);
      room.members.set(socket.id, user);
      
      // Broadcast updated member list
      io.to(roomId).emit("circle-update", {
        members: Array.from(room.members.values()),
        sharedVerse: room.sharedVerse,
        messages: room.messages
      });

      console.log(`${user.name} joined circle ${roomId}`);
    });

    socket.on("share-verse", ({ roomId, verse }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.sharedVerse = verse;
        io.to(roomId).emit("verse-shared", verse);
      }
    });

    socket.on("send-message", ({ roomId, message }) => {
      const room = rooms.get(roomId);
      if (room) {
        const msg = {
          id: Math.random().toString(36).substr(2, 9),
          ...message,
          timestamp: Date.now()
        };
        room.messages.push(msg);
        // Keep only last 50 messages
        if (room.messages.length > 50) room.messages.shift();
        
        io.to(roomId).emit("new-message", msg);
      }
    });

    socket.on("disconnect", () => {
      rooms.forEach((room, roomId) => {
        if (room.members.has(socket.id)) {
          const user = room.members.get(socket.id);
          room.members.delete(socket.id);
          
          if (room.members.size === 0) {
            rooms.delete(roomId);
          } else {
            io.to(roomId).emit("circle-update", {
              members: Array.from(room.members.values()),
              sharedVerse: room.sharedVerse,
              messages: room.messages
            });
          }
          console.log(`${user.name} left circle ${roomId}`);
        }
      });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
