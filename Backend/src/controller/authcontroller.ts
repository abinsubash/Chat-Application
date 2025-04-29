import { Request, Response } from 'express';
import User from '../models/User';
import Message from '../models/Message';
import bcrypt from 'bcrypt';
import { generateAccessToken, generateRefreshToken } from '../config/jwt';
import mongoose from 'mongoose';

// Define custom request interface with user property
interface CustomRequest extends Request {
  user?: {
    _id: string;
    name: string;
    email: string;
    username: string;
  };
}

export const signup = async (req: Request, res: Response):Promise<any> => {
  try {
    const { email, password, username, name } = req.body;

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken',
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      name,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

export const login = async (req: Request, res: Response):Promise<any>  => {
  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        success: false,
        message: 'Email not found',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.json({
        success: false,
        message: 'Wrong password',
      });
    }

    const payload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Set refresh token in cookie
    res.cookie('token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Return access token + user
    return res.status(200).json({
      success: true,
      accessToken,
      user: {
        name: user.name,
        email: user.email,
        username: user.username,
        _id: user._id,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

export const search = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const { username } = req.body;
    const userId = req.user?._id; // Use optional chaining

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!username) {
      return res.json({ 
        success: false, 
        message: "Username is required" 
      });
    }

    const users = await User.find({
      username: { $regex: username, $options: "i" },
      _id: { $ne: userId }
    }).select("-password");

    return res.status(200).json({ 
      success: true, 
      searchUser: users 
    });
  } catch (error) {
    console.error("Search error", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

export const getMessages = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    return res.json({
      success: true,
      messages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching messages'
    });
  }
};

export const getRecentChats = async (req: CustomRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?._id);
    console.log('This is user id',userId)

    const chatUsers = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', userId] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $first: '$message' },
          createdAt: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $eq: ['$receiverId', userId] },
                { $cond: [{ $eq: ['$read', false] }, 1, 0] },
                0
              ]
            }
          }
        }
      }
    ]);
    
    console.log('this is recent data',chatUsers)

    const userDetails = await User.find({
      _id: { $in: chatUsers.map(chat => chat._id) }
    }).select('name username');

    const recentChats = chatUsers.map(chat => {
      const userDetail = userDetails.find(u => u._id.toString() === chat._id.toString());
      return {
        _id: userDetail?._id,
        name: userDetail?.name,
        username: userDetail?.username,
        lastMessage: {
          message: chat.lastMessage,
          createdAt: chat.createdAt
        },
        unreadCount: chat.unreadCount
      };
    });

    res.json({
      success: true,
      chats: recentChats
    });
  } catch (error) {
    console.error('Error fetching recent chats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent chats'
    });
  }
};