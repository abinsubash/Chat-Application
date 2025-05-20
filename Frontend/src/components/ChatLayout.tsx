import { clearUser } from "@/store/slice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Video, Phone, Search, Menu, X, LogOut } from "lucide-react";
import { FaUserCircle } from "react-icons/fa";
import { ReactNode, useState, useEffect, useCallback, useRef } from "react";
import api, { searchUsers } from "@/services/api";
import { useSelectedUser } from "@/context/SelectedUserContext";
import { useSocket } from "@/context/SocketContext";
import { useCall } from '@/hooks/useCall';
import CallUI from './CallUI';

interface User {
  _id: string;
  name: string;
  username: string;
}

interface ChatUser extends User {
  lastMessage?: {
    message: string;
    createdAt: string;
  };
  unreadCount: number;
}

interface ChatLayoutProps {
  children: ReactNode;
}

const ChatLayout = ({ children }: ChatLayoutProps) => {
  const [recentChats, setRecentChats] = useState<ChatUser[]>([]);
  const [searchUser, setSearchUser] = useState<User[]>([]);

  const { selectedUser, setSelectedUser } = useSelectedUser();
  const [input, setInput] = useState("");
  const dispatch = useDispatch();
  const user = useSelector(
    (state: RootState) => state.user.user as User | null
  );
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const socket = useSocket();
  const { 
    startCall, 
    endCall, 
    incomingCall, 
    remoteAudioRef,
    peerConnection,
    localStream,
    answerCall
  } = useCall(socket);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<NodeJS.Timeout>(null);

  // Fetch recent chats
  const fetchRecentChats = useCallback(async () => {
    try {
      const response = await api.get("/recent-chats");
      if (response.data.success) {
        console.log("this is response data in recent data", response.data);
        setRecentChats(response.data.chats);
      }
    } catch (error) {
      console.error("Error fetching recent chats:", error);
    }
  }, []); // add dependencies if needed (e.g., user?._id)

  useEffect(() => {
    fetchRecentChats();
  }, [fetchRecentChats]);

  // Update recent chats when new message arrives
  useEffect(() => {
    if (!socket) return;

    socket.on("receiveMessage", (newMessage) => {
      setRecentChats((prev) => {
        const updatedChats = [...prev];
        const chatUserId =
          newMessage.senderId === user?._id
            ? newMessage.receiverId
            : newMessage.senderId;

        const chatIndex = updatedChats.findIndex(
          (chat) => chat._id === chatUserId
        );

        if (chatIndex > -1) {
          // Update existing chat
          updatedChats[chatIndex] = {
            ...updatedChats[chatIndex],
            lastMessage: {
              message: newMessage.message,
              createdAt: newMessage.createdAt,
            },
            unreadCount:
              selectedUser?._id !== chatUserId
                ? updatedChats[chatIndex].unreadCount + 1
                : 0,
          };
          // Move this chat to top
          const [chat] = updatedChats.splice(chatIndex, 1);
          return [chat, ...updatedChats];
        } else {
          // Add new chat
          const newChat: ChatUser = {
            _id: chatUserId,
            name: newMessage.senderName || newMessage.receiverName,
            username: newMessage.senderUsername || newMessage.receiverUsername,
            lastMessage: {
              message: newMessage.message,
              createdAt: newMessage.createdAt,
            },
            unreadCount: selectedUser?._id !== chatUserId ? 1 : 0,
          };
          return [newChat, ...updatedChats];
        }
      });
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, [socket, user?._id, selectedUser?._id]);

  // Reset unread count when selecting a user
  useEffect(() => {
    if (selectedUser) {
      setRecentChats((prev) =>
        prev.map((chat) =>
          chat._id === selectedUser._id ? { ...chat, unreadCount: 0 } : chat
        )
      );
    }
  }, [selectedUser?._id]);

  // Close sidebar automatically on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close sidebar when user is selected on mobile
  useEffect(() => {
    if (window.innerWidth < 768 && selectedUser) {
      setSidebarOpen(false);
    }
  }, [selectedUser]);

  const handleLogout = () => {
    dispatch(clearUser());
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    try {
      const response = await searchUsers(e.target.value);
      if (response.success) {
        setSearchUser(response.searchUser);
      } else {
        setSearchUser([]);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchUser([]);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Mark messages as read when selecting a user
  const handleUserSelect = async (selectedChat: User) => {
    setSelectedUser(selectedChat);
    try {
      // Mark messages as read
      await api.put(`/messages/read/${selectedChat._id}`);
      
      // Update local state to remove unread count
      setRecentChats(prev =>
        prev.map(chat =>
          chat._id === selectedChat._id
            ? { ...chat, unreadCount: 0 }
            : chat
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }

    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleVoiceCall = () => {
    if (selectedUser) {
      startCall(selectedUser._id);
    }
  };

  useEffect(() => {
    if (peerConnection) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      return () => {
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
        }
        setCallDuration(0);
      };
    }
  }, [peerConnection]);

  const handleToggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  return (
    <div className="h-screen w-full flex bg-gray-900">
      {/* Mobile menu button - always visible when there's a selected user */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-800 p-2 rounded-full text-white"
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div
        className={`bg-gray-950 text-white w-full md:w-1/3 lg:w-1/4 h-full flex flex-col border-r border-gray-800 transition-all duration-300 fixed md:relative z-40 ${
          sidebarOpen ? "left-0" : "-left-full md:left-0"
        }`}
        style={{ backgroundColor: "#111827" }} // Ensuring consistent dark background
      >
        <div className="flex items-center justify-between p-3 border-b border-gray-800">
          <h2
            className="cursor-pointer text-xl font-bold text-green-400"
            onClick={() => setSelectedUser(null)}
          >
            ChatApp
          </h2>
          <div className="flex gap-2">
            {showSearch ? (
              <X
                size={20}
                className="cursor-pointer hover:text-gray-400 transition-colors"
                onClick={() => {
                  setShowSearch(false);
                  setSearchUser([]);
                  setInput("");
                }}
              />
            ) : (
              <Search
                size={20}
                className="cursor-pointer hover:text-gray-400 transition-colors"
                onClick={() => setShowSearch(true)}
              />
            )}
          </div>
        </div>

        {showSearch && (
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-3 text-gray-500"
              />
              <input
                type="text"
                value={input}
                placeholder="Search users..."
                className="w-full p-2 pl-9 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-green-500 transition-all text-sm"
                onChange={handleChange}
              />
            </div>
          </div>
        )}

        <div
          className="overflow-y-auto flex-grow bg-gray-950"
          style={{ backgroundColor: "#111827" }}
        >
          {showSearch && input ? (
            searchUser.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <p>No users found</p>
              </div>
            ) : (
              searchUser.map((u) => (
                <div
                  key={u._id}
                  className="p-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800 transition-colors flex items-center gap-3"
                  onClick={() => {
                    setSelectedUser(u);
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                >
                  <div className="bg-gray-700 rounded-full p-2">
                    <FaUserCircle size={20} className="text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{u.name}</span>
                    <span className="text-xs text-gray-400">@{u.username}</span>
                  </div>
                </div>
              ))
            )
          ) : (
            <>
              {recentChats.length > 0 ? (
                recentChats.map((chat) => (
                  <div
                    key={chat._id}
                    className={`p-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800 transition-colors ${
                      selectedUser?._id === chat._id ? "bg-gray-800" : ""
                    }`}
                    onClick={() => handleUserSelect(chat)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-700 rounded-full p-2">
                          <FaUserCircle size={20} className="text-gray-300" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {chat.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {chat.lastMessage?.message
                              ? `${chat.lastMessage.message.substring(0, 20)}${
                                  chat.lastMessage.message.length > 20
                                    ? "..."
                                    : ""
                                }`
                              : "@" + chat.username}
                          </span>
                        </div>
                      </div>
                      {chat.unreadCount > 0 && (
                        <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-400 text-sm">
                  No recent conversations
                </div>
              )}
            </>
          )}
        </div>

        <div
          className="p-3 border-t border-gray-800 bg-gray-950"
          style={{ backgroundColor: "#111827" }}
        >
          {user && (
            <div className="flex items-center justify-between mb-3 p-2 bg-gray-900 rounded-lg">
              <div className="flex items-center gap-3">
                <FaUserCircle size={20} className="text-green-400" />
                <div>
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-gray-400">@{user.username}</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-red-900 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-gray-900 text-white w-full">
        {selectedUser ? (
          <>
            {/* Chat header - Made more visible and accessible on mobile */}
            <div className="flex items-center justify-between p-2 md:p-3 border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
              {/* Added pl-12 for mobile to account for the menu button */}
              <div className="flex items-center gap-2 pl-12 md:pl-0">
                <div className="bg-gray-800 p-1.5 rounded-full">
                  <FaUserCircle size={20} className="text-green-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-semibold">
                    {selectedUser.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    @{selectedUser.username}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-1.5 rounded-full hover:bg-gray-800 transition-colors"
                  aria-label="Voice call"
                  onClick={handleVoiceCall}
                >
                  <Phone size={18} className="text-green-400" />
                </button>
                <button
                  className="p-1.5 rounded-full hover:bg-gray-800 transition-colors"
                  aria-label="Video call"
                >
                  <Video size={18} className="text-blue-400" />
                </button>
              </div>
            </div>
            {children}
          </>
        ) : (
          <div className="flex-1 flex flex-col bg-gray-900 text-white items-center justify-center p-4">
            <div className="bg-gray-800 p-6 rounded-lg text-center max-w-md">
              <FaUserCircle size={48} className="mx-auto mb-4 text-green-400" />
              <h2 className="text-xl font-bold mb-2">Welcome to ChatApp</h2>
              <p className="text-gray-400 mb-4 text-sm">
                Select a user from the sidebar to start chatting
              </p>
              {!sidebarOpen && (
                <button
                  onClick={toggleSidebar}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  Open Contacts
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add this audio element for remote audio */}
      <audio ref={remoteAudioRef} style={{ display: 'none' }} />
      
      {/* Replace the old call UI with the new one */}
      {(incomingCall || peerConnection) && (
        <CallUI
          isIncoming={incomingCall && !peerConnection}
          callerName={selectedUser?.name}
          onAccept={answerCall}
          onDecline={endCall}
          onToggleMute={handleToggleMute}
          isMuted={isMuted}
          callDuration={callDuration}
        />
      )}
    </div>
  );
};

export default ChatLayout;
