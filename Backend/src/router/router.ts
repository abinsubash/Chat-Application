import express from 'express';
import { signup, login, search, getMessages, getRecentChats, markMessagesAsRead } from '../controller/authcontroller';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/search', verifyToken, search);
router.get('/messages/:userId', verifyToken, getMessages);
router.get('/recent-chats', verifyToken, getRecentChats);
router.put('/messages/read/:senderId', verifyToken, markMessagesAsRead);

export default router;
