
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Send, BookOpen, MessageSquare, LogOut, Share2, User } from 'lucide-react';
import { IdentificationResult } from '../types';
import { db, handleFirestoreError, OperationType } from '../src/services/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc, 
  getDoc,
  limit
} from 'firebase/firestore';

interface Message {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  timestamp: number;
}

interface CircleUser {
  id: string;
  name: string;
  photo?: string;
}

interface StudyCircleProps {
  user: any;
  isEn: boolean;
  currentResult?: IdentificationResult;
}

const StudyCircle: React.FC<StudyCircleProps> = ({ user, isEn, currentResult }) => {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [members, setMembers] = useState<CircleUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sharedVerse, setSharedVerse] = useState<IdentificationResult | null>(null);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (joined && roomId) {
      // 1. Listen to Circle Metadata (Shared Verse)
      const circleRef = doc(db, 'circles', roomId);
      const unsubCircle = onSnapshot(circleRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSharedVerse(data.activeVerse || null);
        } else {
          // Create circle if it doesn't exist
          setDoc(circleRef, {
            id: roomId,
            name: roomId,
            createdBy: user?.uid || 'guest',
            createdAt: Date.now(),
            activeVerse: null
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `circles/${roomId}`);
      });

      // 2. Listen to Messages
      const messagesRef = collection(db, 'circles', roomId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));
      const unsubMessages = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        setMessages(msgs);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `circles/${roomId}/messages`);
      });

      // 3. Presence (Simplified for now - just add self to a members list if we had one)
      // In a real app, we'd use Firestore Presence or a separate collection
      setMembers([{
        id: user?.uid || 'guest',
        name: user?.displayName || (isEn ? 'You' : 'Anda'),
        photo: user?.photoURL
      }]);

      return () => {
        unsubCircle();
        unsubMessages();
      };
    }
  }, [joined, roomId, user, isEn]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      setJoined(true);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && joined && roomId) {
      const messageData = {
        circleId: roomId,
        userId: user?.uid || 'guest',
        userName: user?.displayName || (isEn ? 'Guest' : 'Tamu'),
        userPhoto: user?.photoURL,
        text: inputText,
        timestamp: Date.now(),
        type: 'text'
      };
      
      try {
        await addDoc(collection(db, 'circles', roomId, 'messages'), messageData);
        setInputText('');
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `circles/${roomId}/messages`);
      }
    }
  };

  const handleShareCurrent = async () => {
    if (currentResult && joined && roomId) {
      try {
        const circleRef = doc(db, 'circles', roomId);
        await setDoc(circleRef, { activeVerse: currentResult }, { merge: true });
        
        // Also add a system message
        await addDoc(collection(db, 'circles', roomId, 'messages'), {
          circleId: roomId,
          userId: 'system',
          userName: 'System',
          text: isEn ? `Shared a verse: ${currentResult.title}` : `Membagikan ayat: ${currentResult.title}`,
          timestamp: Date.now(),
          type: 'verse',
          verseData: currentResult
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `circles/${roomId}`);
      }
    }
  };

  if (!joined) {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 bg-white dark:bg-emerald-900/40 rounded-[2.5rem] border-2 border-emerald-100 dark:border-emerald-800 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-emerald-950 dark:text-emerald-50 uppercase tracking-tight">
            {isEn ? 'Study Circle' : 'Lingkaran Studi'}
          </h2>
          <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium mt-2">
            {isEn ? 'Join a live workspace to discuss verses with others.' : 'Bergabunglah dalam ruang kerja langsung untuk mendiskusikan ayat dengan orang lain.'}
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 ml-2">
              {isEn ? 'Circle ID' : 'ID Lingkaran'}
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder={isEn ? "Enter Circle ID (e.g. RAMADAN2024)" : "Masukkan ID Lingkaran (misal: RAMADAN2024)"}
              className="w-full p-4 rounded-2xl bg-emerald-50 dark:bg-black/20 border-2 border-transparent focus:border-emerald-500 outline-none transition-all dark:text-white"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            {isEn ? 'Create/Join Circle' : 'Buat/Gabung Lingkaran'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
      {/* Sidebar: Members */}
      <div className="lg:col-span-1 bg-white dark:bg-emerald-900/40 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-emerald-950 dark:text-emerald-50 uppercase tracking-tight flex items-center gap-2">
            <Users className="h-4 w-4" />
            {isEn ? 'Members' : 'Anggota'}
          </h3>
          <span className="bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-lg text-[10px] font-black">
            {members.length}
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-800/30 transition-all">
              {m.photo ? (
                <img src={m.photo} alt={m.name} className="w-8 h-8 rounded-full border-2 border-emerald-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              )}
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-50 truncate">{m.name}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setJoined(false)}
          className="mt-6 flex items-center justify-center gap-2 py-3 border-2 border-red-100 dark:border-red-900/30 text-red-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <LogOut className="h-4 w-4" />
          {isEn ? 'Leave' : 'Keluar'}
        </button>
      </div>

      {/* Main: Shared Verse & Chat */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        {/* Shared Verse Area */}
        <div className="bg-emerald-900 text-white rounded-[2rem] p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-800/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-800 rounded-xl flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-widest text-xs opacity-60">
                    {isEn ? 'Shared Verse' : 'Ayat Bersama'}
                  </h3>
                  <p className="text-sm font-bold">
                    {sharedVerse ? sharedVerse.title : (isEn ? 'No verse shared yet' : 'Belum ada ayat dibagikan')}
                  </p>
                </div>
              </div>
              
              {currentResult && (
                <button
                  onClick={handleShareCurrent}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Share2 className="h-3 w-3" />
                  {isEn ? 'Share Current' : 'Bagikan Sekarang'}
                </button>
              )}
            </div>

            {sharedVerse ? (
              <div className="space-y-4">
                <p className="font-arabic text-right text-3xl leading-[1.8] text-emerald-50" dir="rtl">
                  {sharedVerse.arabicText}
                </p>
                <div className="h-[1px] bg-emerald-800 w-full"></div>
                <p className="text-sm italic text-emerald-200">
                  "{isEn ? sharedVerse.translation : sharedVerse.translationID}"
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {sharedVerse.reference}
                </p>
              </div>
            ) : (
              <div className="py-10 text-center opacity-40">
                <p className="text-sm font-medium italic">
                  {isEn ? "Share a verse from your search results to discuss it here." : "Bagikan ayat dari hasil pencarian Anda untuk didiskusikan di sini."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white dark:bg-emerald-900/40 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-bottom border-emerald-50 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-800/20 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-900 dark:text-emerald-50">
              {isEn ? 'Live Discussion' : 'Diskusi Langsung'}
            </h4>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.userId === user?.uid ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0">
                  {msg.userPhoto ? (
                    <img src={msg.userPhoto} alt={msg.userName} className="w-8 h-8 rounded-full border border-emerald-100" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
                </div>
                <div className={`max-w-[70%] ${msg.userId === user?.uid ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-emerald-900 dark:text-emerald-50">{msg.userName}</span>
                    <span className="text-[8px] opacity-40 font-bold">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`p-3 rounded-2xl text-sm font-medium ${msg.userId === user?.uid ? 'bg-emerald-700 text-white rounded-tr-none' : 'bg-emerald-50 dark:bg-emerald-800/50 text-emerald-900 dark:text-emerald-50 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center opacity-30 italic text-sm">
                {isEn ? 'No messages yet. Start the conversation!' : 'Belum ada pesan. Mulai percakapan!'}
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-emerald-50/50 dark:bg-emerald-800/20 border-t border-emerald-100 dark:border-emerald-800 flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isEn ? "Type your message..." : "Ketik pesan Anda..."}
              className="flex-1 p-3 rounded-xl bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 outline-none focus:border-emerald-500 transition-all text-sm dark:text-white"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-3 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudyCircle;
