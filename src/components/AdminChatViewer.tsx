'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, getDoc, doc, where } from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';
import { User, Users, MessageSquare, Clock, ArrowLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AdminChatViewer() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);

  useEffect(() => {
    fetchAllConversations();
  }, []);

  const fetchAllConversations = async () => {
    setLoading(true);
    const dbInstance = getDbInstance();
    if (!dbInstance) {
      setLoading(false);
      return;
    }

    try {
      const messagesMap = new Map<string, any>(); // key: `user1_user2`, value: conversation details

      // 1. Fetch web messages
      const webMessagesQuery = query(collection(dbInstance, 'messages'), orderBy('timestamp', 'desc'));
      const webMessagesSnapshot = await getDocs(webMessagesQuery);
      
      webMessagesSnapshot.forEach((docSnap) => {
        const msg = docSnap.data();
        if (!msg.sender || !msg.receiverId) return;
        
        const participants = [msg.sender, msg.receiverId].sort();
        const convId = participants.join('_');
        
        if (!messagesMap.has(convId)) {
          messagesMap.set(convId, {
            id: convId,
            user1Id: participants[0],
            user2Id: participants[1],
            lastMessage: msg.text,
            lastMessageTime: msg.timestamp,
            messages: []
          });
        }
        messagesMap.get(convId).messages.push({
          id: docSnap.id,
          sender: msg.sender,
          receiverId: msg.receiverId,
          text: msg.text,
          timestamp: msg.timestamp,
          source: 'web'
        });
      });

      // 2. Fetch mobile messages (chat_messages)
      const mobileMessagesQuery = query(collection(dbInstance, 'chat_messages'), orderBy('timestamp', 'desc'));
      const mobileMessagesSnapshot = await getDocs(mobileMessagesQuery);
      
      mobileMessagesSnapshot.forEach((docSnap) => {
        const msg = docSnap.data();
        if (!msg.from_user_id || !msg.to_user_id) return;

        const participants = [msg.from_user_id, msg.to_user_id].sort();
        const convId = participants.join('_');
        
        if (!messagesMap.has(convId)) {
          messagesMap.set(convId, {
            id: convId,
            user1Id: participants[0],
            user2Id: participants[1],
            lastMessage: msg.content,
            lastMessageTime: msg.timestamp,
            messages: []
          });
        }
        messagesMap.get(convId).messages.push({
          id: docSnap.id,
          sender: msg.from_user_id,
          receiverId: msg.to_user_id,
          text: msg.content,
          timestamp: msg.timestamp,
          source: 'mobile'
        });
      });

      const conversationsArray = Array.from(messagesMap.values());
      
      // Fetch user details for both participants
      const userCache = new Map();
      const getUserDetails = async (userId: string) => {
        if (!userId) return { name: 'Traveler', role: 'user' };
        if (userCache.has(userId)) return userCache.get(userId);

        try {
          // 1. Try fetching directly by document ID in 'users'
          const userDoc = await getDoc(doc(dbInstance, 'users', userId));
          let userData: any = userDoc.exists() ? userDoc.data() : null;

          // 2. Fallback: Query 'users' by uid or id or email if document ID was different
          if (!userData) {
            try {
              const qUid = query(collection(dbInstance, 'users'), where('uid', '==', userId));
              const snapUid = await getDocs(qUid);
              if (!snapUid.empty) {
                userData = snapUid.docs[0].data();
              }
            } catch {}
          }

          if (!userData) {
            try {
              const qId = query(collection(dbInstance, 'users'), where('id', '==', userId));
              const snapId = await getDocs(qId);
              if (!snapId.empty) {
                userData = snapId.docs[0].data();
              }
            } catch {}
          }

          // 3. Fallback: Check 'chat_users' collection (for mobile app users)
          if (!userData) {
            try {
              const chatUserDoc = await getDoc(doc(dbInstance, 'chat_users', userId));
              if (chatUserDoc.exists()) {
                const cud = chatUserDoc.data();
                userData = {
                  name: cud.display_name || cud.displayName || cud.name,
                  email: cud.email,
                  role: 'user'
                };
              }
            } catch {}
          }

          if (userData) {
            const role = userData.role || 'user';
            let name = '';

            if (role === 'agency') {
              name = userData.companyName || 
                     userData.agencyName || 
                     userData.name || 
                     userData.displayName || 
                     userData.email || 
                     'Agency';
            } else {
              // Traveler / User: check name first, then displayName, then display_name, email, phone
              name = userData.name || 
                     userData.displayName || 
                     userData.display_name || 
                     userData.fullName || 
                     userData.userName || 
                     (userData.email ? userData.email.split('@')[0] : '') || 
                     userData.phone || 
                     userData.contactNumber || 
                     'Traveler';
            }

            const details = { 
              name: name.trim() || 'Traveler', 
              role: role,
              email: userData.email || userData.authEmail || '',
              phone: userData.phone || userData.contactNumber || ''
            };
            userCache.set(userId, details);
            return details;
          }

          // Fallback if no user document exists at all
          const fallbackName = userId.includes('@') 
            ? userId.split('@')[0] 
            : (userId.length > 8 ? `Traveler (${userId.slice(0, 5)})` : 'Traveler');

          const fallbackDetails = { name: fallbackName, role: 'user' };
          userCache.set(userId, fallbackDetails);
          return fallbackDetails;
        } catch (e) {
          return { name: 'Traveler', role: 'unknown' };
        }
      };

      await Promise.all(
        conversationsArray.map(async (conv) => {
          conv.user1 = await getUserDetails(conv.user1Id);
          conv.user2 = await getUserDetails(conv.user2Id);
          // Sort messages by timestamp asc
          conv.messages.sort((a: any, b: any) => a.timestamp - b.timestamp);
        })
      );
      
      // Sort conversations by last message time desc
      conversationsArray.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      setConversations(conversationsArray);

    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
    setLoading(false);
  };

  const handleSelectConversation = (conv: any) => {
    setSelectedConversation(conv);
    setConversationMessages(conv.messages);
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredConversations = conversations.filter(c => 
    c.user1.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.user2.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] border rounded-xl overflow-hidden bg-white shadow-sm mt-4">
      {/* Sidebar - Conversations List */}
      <div className={`w-full md:w-1/3 border-r flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-[#1a1a1a]">
            <MessageSquare className="w-5 h-5 text-[#ff4c4c]" />
            All Conversations
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Search participants..." 
              className="pl-9 bg-gray-50 border-gray-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-[#ff4c4c] border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading chats...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div 
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 ${selectedConversation?.id === conv.id ? 'bg-red-50 border-l-4 border-l-[#ff4c4c]' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-semibold text-[#1a1a1a] truncate pr-2">
                    {conv.user1.name} & {conv.user2.name}
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {formatTime(conv.lastMessageTime)}
                  </div>
                </div>
                <div className="text-sm text-gray-600 truncate flex items-center gap-1">
                  <span className="truncate">{conv.lastMessage || 'No text content'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Area - Chat View */}
      <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            <div className="p-4 border-b flex items-center gap-3 bg-white">
              <button 
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h3 className="font-semibold text-lg text-[#1a1a1a]">
                  Conversation
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedConversation.user1.name} ({selectedConversation.user1.role}) 
                  {" "}&harr;{" "}
                  {selectedConversation.user2.name} ({selectedConversation.user2.role})
                </p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-4 max-w-3xl mx-auto">
                {conversationMessages.map((msg, idx) => {
                  const isUser1 = msg.sender === selectedConversation.user1Id;
                  const senderName = isUser1 ? selectedConversation.user1.name : selectedConversation.user2.name;
                  const senderRole = isUser1 ? selectedConversation.user1.role : selectedConversation.user2.role;

                  return (
                    <div key={msg.id || idx} className={`flex flex-col ${isUser1 ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-2 mb-1 mx-1">
                        <span className="text-xs font-medium text-gray-600">{senderName}</span>
                        <span className="text-[10px] uppercase bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                          {senderRole}
                        </span>
                      </div>
                      <div 
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          isUser1 
                            ? 'bg-blue-100 text-blue-900 border border-blue-200 rounded-tr-sm' 
                            : 'bg-white text-gray-800 border shadow-sm rounded-tl-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <div className={`text-[10px] mt-1 text-right ${isUser1 ? 'text-blue-500' : 'text-gray-400'}`}>
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-3 bg-white border-t text-center text-sm text-gray-500">
              <Clock className="w-4 h-4 inline-block mr-1 mb-0.5" />
              Viewing as Admin (Read Only)
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <MessageSquare className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg">Select a conversation to view messages</p>
            <p className="text-sm mt-2">All chats across the platform are visible here</p>
          </div>
        )}
      </div>
    </div>
  );
}
