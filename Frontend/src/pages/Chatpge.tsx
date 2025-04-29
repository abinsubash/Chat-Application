import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import ChatLayout from "@/components/ChatLayout";
import { useSelectedUser } from "@/context/SelectedUserContext";
import { UserData } from "@/store/slice";
import { RootState } from "@/store/store";
import api from "@/services/api";
import { Send, Smile, Image, Paperclip, Mic } from "lucide-react";
import { useSocket } from "@/context/SocketContext";
import socket from "socket.io-client";

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string;
}

const Chatpage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const { selectedUser } = useSelectedUser();
  const user = useSelector((state: RootState) => state.user.user as UserData | null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();

  // Fetch existing messages when user or selectedUser changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (selectedUser?._id && user?._id) {
        try {
          const response = await api.get(`/messages/${selectedUser._id}`);
          if (response.data.success) {
            setMessages(response.data.messages);
          }
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      }
    };

    fetchMessages();
    return () => setMessages([]); // Clear messages when changing users
  }, [selectedUser?._id, user?._id]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !user?._id || !selectedUser?._id) return;

    // Join user's room
    socket.emit('joinUser', user._id);

    // Listen for new messages
    const handleNewMessage = (newMessage: Message) => {
      // Only add message if it's relevant to current chat
      if (
        (newMessage.senderId === selectedUser._id && newMessage.receiverId === user._id) ||
        (newMessage.senderId === user._id && newMessage.receiverId === selectedUser._id)
      ) {
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(msg => msg._id === newMessage._id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
      }
    };

    socket.on('receiveMessage', handleNewMessage);

    return () => {
      socket.off('receiveMessage', handleNewMessage);
    };
  }, [socket, user?._id, selectedUser?._id]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !selectedUser || !user || !socket) return;

    const messageData = {
      senderId: user._id,
      receiverId: selectedUser._id,
      text: input.trim(),
    };

    socket.emit('sendMessage', messageData); // Changed Socket to socket
    setInput('');
  };

  return (
    <ChatLayout>
      <div className="flex flex-col h-full w-full bg-gray-900 overflow-hidden relative" style={{backgroundColor: "#111827"}}>
        <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3 bg-gray-900 pb-16 md:pb-4" style={{backgroundColor: "#111827"}}>
          {messages.map((msg) => (
            <div
              key={msg._id}
              className={`flex ${
                msg.senderId === user?._id ? 'justify-end' : 'justify-start'
              } w-full`}
            >
              <div
                className={`p-3 rounded-lg ${
                  msg.senderId === user?._id
                    ? 'bg-green-600 text-white rounded-tr-none max-w-xs sm:max-w-sm md:max-w-md'
                    : 'bg-gray-800 text-white rounded-tl-none max-w-xs sm:max-w-sm md:max-w-md'
                }`}
              >
                <p className="break-words text-sm">{msg.message}</p>
                <small className="text-xs opacity-70 block text-right mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </small>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed position for mobile and normal for desktop */}
        <div 
          className="p-2 md:p-4 border-t border-gray-800 bg-gray-950 fixed md:static bottom-0 left-0 right-0 w-full z-20" 
          style={{backgroundColor: "#0f1623"}}
        >
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <button className="p-1 rounded-full hover:bg-gray-800 transition-colors">
                <Smile className="text-gray-400 w-5 h-5" />
              </button>
              <button className="p-1 rounded-full hover:bg-gray-800 transition-colors">
                <Image className="text-gray-400 w-5 h-5" />
              </button>
              <button className="p-1 rounded-full hover:bg-gray-800 transition-colors">
                <Paperclip className="text-gray-400 w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="w-full p-2 pl-3 pr-10 rounded-full bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500 text-sm"
              />
              <button
                onClick={sendMessage}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-700 transition-colors"
              >
                <Send className="text-green-400 w-4 h-4" />
              </button>
            </div>
            <button className="sm:block hidden p-1.5 rounded-full hover:bg-gray-800 transition-colors">
              <Mic className="text-gray-400 w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </ChatLayout>
  );
};

export default Chatpage;