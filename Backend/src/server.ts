import express, { Application } from "express";
import cors from "cors";
import route from "./router/router";
import connectDB from "./config/mongoose";
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server } from 'socket.io';
import Message from "./models/Message";
import dotenv from 'dotenv'
dotenv.config()
const app: Application = express();
const PORT = 5000;
connectDB();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Add this map to store user socket connections
const userSocketMap = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinUser', (userId: string) => {
    socket.join(userId);
    userSocketMap.set(userId, socket.id);
    console.log('User joined:', userId);
  });

  socket.on('sendMessage', async ({ senderId, receiverId, text }) => {
    try {
      const message = new Message({
        senderId,
        receiverId,
        message: text
      });
      
      const savedMessage = await message.save();
      const populatedMessage = await Message.findById(savedMessage._id);

      // Send to receiver's room
      socket.to(receiverId).emit('receiveMessage', populatedMessage);
      // Send back to sender
      socket.emit('receiveMessage', populatedMessage);

    } catch (error) {
      console.error('Error saving/sending message:', error);
    }
  });

  socket.on('disconnect', () => {
    // Remove user from socket map
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        console.log('User disconnected:', userId);
        break;
      }
    }
  });
});

app.use("/", route);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
