import express, { Application } from "express";
import cors from "cors";
import route from "./router/router";
import connectDB from "./config/mongoose";
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server } from 'socket.io';
import Message from "./models/Message";
import dotenv from 'dotenv'
import { CallService } from './services/callService';

dotenv.config()
const app: Application = express();
const PORT = 5000;
connectDB();

app.use(
  cors({
    origin: "https://chat-application-sandy-one.vercel.app",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://chat-application-sandy-one.vercel.app',
    methods: ['GET', 'POST']
  }
});

// Add this map to store user socket connections
const userSocketMap = new Map();
const callService = new CallService();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinUser', (userId: string) => {
    socket.join(userId);
    userSocketMap.set(userId, socket.id);
    callService.registerSocket(userId, socket);
    console.log('User joined:', userId);
  });

  // Register call handlers
  callService.handleCall(socket);

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

  socket.on('call-user', (data) => {
    io.to(data.to).emit('incoming-call', {
      from: socket.id,
      offer: data.offer,
    });
  });

  socket.on('answer-call', (data) => {
    io.to(data.to).emit('call-answered', {
      from: socket.id,
      answer: data.answer,
    });
  });

  socket.on('ice-candidate', (data) => {
    io.to(data.to).emit('ice-candidate', {
      from: socket.id,
      candidate: data.candidate,
    });
  });

  socket.on('end-call', (data) => {
    // Get the socket ID of the target user
    const targetSocketId = userSocketMap.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended');
    }
    
    // Also notify the caller's room
    const caller = Array.from(userSocketMap.entries())
      .find(([_, socketId]) => socketId === socket.id);
    if (caller) {
      io.to(targetSocketId).emit('call-ended');
    }
  });

  socket.on('disconnect', () => {
    let disconnectedUserId: string | null = null;
    
    // Find and remove the disconnected user
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        userSocketMap.delete(userId);
        callService.removeSocket(userId);
        console.log('User disconnected:', userId);
        break;
      }
    }

    // If user was in a call, notify their peer
    if (disconnectedUserId) {
      // Notify all rooms this socket was in
      Array.from(socket.rooms).forEach(room => {
        if (room !== socket.id) {
          io.to(room).emit('call-ended', { userId: disconnectedUserId });
        }
      });
    }
  });
});

app.use("/", route);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
