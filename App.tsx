
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Library, ArrowLeft, RotateCcw, Info, Moon, Sun, Globe, HelpCircle, MessageSquare, ExternalLink, Github, Trash2, Tag, CheckSquare, Square, LogIn, LogOut, Users } from 'lucide-react';
import Header from './components/Header';
import ResultDisplay from './components/ResultDisplay';
import Toast, { ToastType } from './components/Toast';
import LoadingOverlay from './components/LoadingOverlay';
import StudyCircle from './components/StudyCircle';
import { AppState, IdentificationResult, SourceType } from './types';
import { identifyContent, getDailyWisdom } from './services/geminiService';
import { auth, db, handleFirestoreError, OperationType } from './src/services/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, writeBatch, serverTimestamp, getDocFromServer, setDoc } from 'firebase/firestore';
import { getDocFromServer as getDocFromServerTest } from 'firebase/firestore';

const App: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'id'>('id');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [savedResults, setSavedResults] = useState<IdentificationResult[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightTerm, setHighlightTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0);
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  
  const [darkMode, setDarkMode] = useState(false);
  const [arabicFontSize, setArabicFontSize] = useState(48);
  const [translationFontSize, setTranslationFontSize] = useState(18);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(0);

  const [tourStep, setTourStep] = useState<number | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });
  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion' | 'other'>('suggestion');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [dailyWisdom, setDailyWisdom] = useState<IdentificationResult | null>(null);
  const [isFetchingDaily, setIsFetchingDaily] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editNote, setEditNote] = useState('');
  const [activeTab, setActiveTab] = useState<'finder' | 'library' | 'study-circle'>('finder');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [showBulkCategorize, setShowBulkCategorize] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  const [audioSampleRate, setAudioSampleRate] = useState<number>(44100);
  const [audioBitRate, setAudioBitRate] = useState<number>(128000);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [state, setState] = useState<AppState>({ isAnalyzing: false, result: null, error: null });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isEn = lang === 'en';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Test Firestore connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    let unsubscribe: () => void;

    if (user) {
      // Sync from Firestore
      const q = query(collection(db, 'saved_results'), where('userId', '==', user.uid));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const results = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as unknown as IdentificationResult[];
        // Sort by timestamp descending
        results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setSavedResults(results);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'saved_results');
      });
    } else {
      // Load from LocalStorage for guest
      const stored = localStorage.getItem('nur_quran_saved_results');
      if (stored) try { setSavedResults(JSON.parse(stored)); } catch (e) {}
    }
    
    const storedDarkMode = localStorage.getItem('nur_quran_dark_mode');
    if (storedDarkMode === 'true') setDarkMode(true);

    fetchDailyWisdom();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, isAuthReady]);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Save user profile to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: new Date().toISOString()
      }, { merge: true });

      setToast({ message: isEn ? "Signed in successfully!" : "Berhasil masuk!", type: 'success', isVisible: true });
    } catch (error: any) {
      setToast({ message: error.message, type: 'error', isVisible: true });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSavedResults([]); // Clear local state
      setToast({ message: isEn ? "Signed out." : "Berhasil keluar.", type: 'success', isVisible: true });
    } catch (error: any) {
      setToast({ message: error.message, type: 'error', isVisible: true });
    }
  };

  const fetchDailyWisdom = async (force = false) => {
    const today = new Date().toISOString().split('T')[0];
    const cached = localStorage.getItem(`nur_daily_wisdom_${today}`);
    
    if (cached && !force) {
      try { setDailyWisdom(JSON.parse(cached)); return; } catch (e) {}
    }

    setIsFetchingDaily(true);
    try {
      const wisdom = await getDailyWisdom(today, force);
      setDailyWisdom(wisdom);
      localStorage.setItem(`nur_daily_wisdom_${today}`, JSON.stringify(wisdom));
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingDaily(false);
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('nur_quran_dark_mode', darkMode.toString());
  }, [darkMode]);

  const startTour = () => setTourStep(0);

  const nextTourStep = () => {
    if (tourStep !== null && tourStep < 4) setTourStep(tourStep + 1);
    else { setTourStep(null); }
  };

  const saveResult = async (result: IdentificationResult) => {
    const resultWithTimestamp = { ...result, timestamp: result.timestamp || Date.now() };
    
    if (user) {
      try {
        // Check if already exists to avoid duplicates
        const existing = savedResults.find(r => r.reference === result.reference && r.title === result.title);
        if (existing && existing.id) {
          await updateDoc(doc(db, 'saved_results', existing.id), { ...resultWithTimestamp, userId: user.uid });
        } else {
          await addDoc(collection(db, 'saved_results'), { ...resultWithTimestamp, userId: user.uid });
        }
        setToast({ message: isEn ? "Saved to cloud!" : "Disimpan ke awan!", type: 'success', isVisible: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'saved_results');
      }
    } else {
      const updated = [resultWithTimestamp, ...savedResults.filter(r => !(r.reference === result.reference && r.title === result.title))];
      setSavedResults(updated);
      localStorage.setItem('nur_quran_saved_results', JSON.stringify(updated));
      setToast({ message: isEn ? "Saved locally!" : "Disimpan secara lokal!", type: 'success', isVisible: true });
    }
  };

  const deleteSavedResult = async (index: number) => {
    const item = savedResults[index];
    
    if (user && item.id) {
      try {
        await deleteDoc(doc(db, 'saved_results', item.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `saved_results/${item.id}`);
      }
    } else {
      const updated = savedResults.filter((_, i) => i !== index);
      setSavedResults(updated);
      localStorage.setItem('nur_quran_saved_results', JSON.stringify(updated));
    }
    
    // Clear selection
    const newSelected = new Set(selectedIndices);
    newSelected.delete(index);
    setSelectedIndices(newSelected);
  };

  const bulkDelete = async () => {
    if (user) {
      try {
        const batch = writeBatch(db);
        selectedIndices.forEach(index => {
          const item = savedResults[index];
          if (item.id) batch.delete(doc(db, 'saved_results', item.id));
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'bulk');
      }
    } else {
      const updated = savedResults.filter((_, i) => !selectedIndices.has(i));
      setSavedResults(updated);
      localStorage.setItem('nur_quran_saved_results', JSON.stringify(updated));
    }
    
    setSelectedIndices(new Set());
    setToast({
      message: isEn ? `Deleted ${selectedIndices.size} items.` : `Dihapus ${selectedIndices.size} item.`,
      type: 'success',
      isVisible: true
    });
  };

  const bulkCategorize = async () => {
    if (!bulkCategory.trim()) return;
    
    if (user) {
      try {
        const batch = writeBatch(db);
        selectedIndices.forEach(index => {
          const item = savedResults[index];
          if (item.id) batch.update(doc(db, 'saved_results', item.id), { userCategory: bulkCategory.trim() });
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'bulk');
      }
    } else {
      const updated = [...savedResults];
      selectedIndices.forEach(index => {
        updated[index] = { ...updated[index], userCategory: bulkCategory.trim() };
      });
      setSavedResults(updated);
      localStorage.setItem('nur_quran_saved_results', JSON.stringify(updated));
    }

    setSelectedIndices(new Set());
    setShowBulkCategorize(false);
    setBulkCategory('');
    setToast({
      message: isEn ? `Categorized ${selectedIndices.size} items.` : `Dikategorikan ${selectedIndices.size} item.`,
      type: 'success',
      isVisible: true
    });
  };

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) newSelected.delete(index);
    else newSelected.add(index);
    setSelectedIndices(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === filteredResults.length) {
      setSelectedIndices(new Set());
    } else {
      const allIndices = new Set(filteredResults.map(r => savedResults.indexOf(r)));
      setSelectedIndices(allIndices);
    }
  };

  const handleUpdateSavedResult = async (index: number) => {
    const item = savedResults[index];
    const updates = { userCategory: editCategory.trim() || null, userNote: editNote.trim() || null };
    
    if (user && item.id) {
      try {
        await updateDoc(doc(db, 'saved_results', item.id), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `saved_results/${item.id}`);
      }
    } else {
      const updated = [...savedResults];
      updated[index] = { ...updated[index], userCategory: editCategory.trim() || undefined, userNote: editNote.trim() || undefined };
      setSavedResults(updated);
      localStorage.setItem('nur_quran_saved_results', JSON.stringify(updated));
    }
    setEditingIndex(null);
  };

  const startEditing = (index: number) => {
    const item = savedResults[index];
    setEditingIndex(index);
    setEditCategory(item.userCategory || '');
    setEditNote(item.userNote || '');
  };

  const reset = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Small delay to allow scroll to start before UI changes
    setTimeout(() => {
      setTextInput(''); setFile(null); setIsRecording(false); setRecordingDuration(0);
      setShowFeedback(false);
      setFeedbackSubmitted(false);
      setFeedbackMessage('');
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setState(prev => ({ ...prev, result: null }));
    }, 100);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;
    
    const subject = encodeURIComponent(`Nur Al-Quran Finder Feedback: ${feedbackType.toUpperCase()}`);
    const body = encodeURIComponent(feedbackMessage);
    const mailtoUrl = `mailto:khudri@binadarma.ac.id?subject=${subject}&body=${body}`;
    
    // Open the user's email client
    window.location.href = mailtoUrl;
    
    // We show the success state immediately as the mailto action is triggered
    setFeedbackSubmitted(true);
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) newExpanded.delete(index);
    else newExpanded.add(index);
    setExpandedItems(newExpanded);
  };

  const processSelectedFile = (selectedFile: File) => {
    const isAudio = selectedFile.type.startsWith('audio/');
    const isVideo = selectedFile.type.startsWith('video/');

    if (!isAudio && !isVideo) {
      setToast({
        message: isEn ? "Invalid file type. Please upload an audio or video file." : "Jenis file tidak valid. Silakan unggah file audio atau video.",
        type: 'error',
        isVisible: true
      });
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setToast({
        message: isEn ? "File size exceeds 20MB limit." : "Ukuran file melebihi batas 20MB.",
        type: 'error',
        isVisible: true
      });
      return;
    }

    setFile(selectedFile);
    setTextInput('');
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processSelectedFile(selectedFile);
  };

  const readFileAsBase64 = (file: File, onProgress?: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleIdentify = async () => {
    if (!textInput.trim() && !file) return;
    
    // Final validation check before processing
    if (file) {
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');
      if (!isAudio && !isVideo) {
        setToast({
          message: isEn ? "Invalid file type detected. Please upload an audio or video file." : "Jenis file tidak valid terdeteksi. Silakan unggah file audio atau video.",
          type: 'error',
          isVisible: true
        });
        setFile(null);
        return;
      }
    }

    setState({ ...state, isAnalyzing: true, error: null });
    setUploadProgress(null);
    try {
      let result;
      if (file) {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(file);
        setAudioUrl(url);

        setUploadProgress(0);
        const base64 = await readFileAsBase64(file, (progress) => {
          setUploadProgress(progress);
        });
        // After reading, we can keep progress at 100 or hide it
        setUploadProgress(100);
        
        result = await identifyContent({ data: base64, mimeType: file.type || 'audio/webm' }, false);
      } else {
        result = await identifyContent(textInput, true);
        setHighlightTerm(textInput);
      }
      const finalResult = { ...result, timestamp: Date.now() };
      setState({ ...state, isAnalyzing: false, result: finalResult });
      setUploadProgress(null);
      setToast({
        message: isEn ? "Result found successfully!" : "Hasil berhasil ditemukan!",
        type: 'success',
        isVisible: true
      });
    } catch (err: any) { 
      setState({ ...state, isAnalyzing: false, error: err.message }); 
      setUploadProgress(null);
      setToast({
        message: err.message || (isEn ? "An error occurred." : "Terjadi kesalahan."),
        type: 'error',
        isVisible: true
      });
    }
  };

  const filteredResults = savedResults.filter(r => {
    const matchesCategory = activeCategoryFilter ? r.userCategory === activeCategoryFilter : true;
    const matchesConfidence = r.confidence >= (confidenceFilter / 100);
    
    let matchesDate = true;
    if (dateFilter.start) {
      matchesDate = matchesDate && r.timestamp >= new Date(dateFilter.start).getTime();
    }
    if (dateFilter.end) {
      // End of day for the end filter
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && r.timestamp <= endDate.getTime();
    }

    const searchLower = searchTerm.toLowerCase();
    const translation = isEn ? r.translation : r.translationID;
    const matchesSearch = !searchTerm ? true : (
      r.title.toLowerCase().includes(searchLower) ||
      r.reference.toLowerCase().includes(searchLower) ||
      r.arabicText.toLowerCase().includes(searchLower) ||
      translation.toLowerCase().includes(searchLower) ||
      (r.userNote && r.userNote.toLowerCase().includes(searchLower))
    );
    return matchesCategory && matchesConfidence && matchesDate && matchesSearch;
  });

  const categories = Array.from(new Set(savedResults.map(r => r.userCategory).filter(Boolean))) as string[];

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-300 ${darkMode ? 'bg-emerald-950 text-emerald-50' : 'bg-emerald-50 text-emerald-950'}`}>
      <Header 
        startTour={startTour} 
        onShowAbout={() => setShowAbout(true)}
        lang={lang} 
        setLang={setLang} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        user={user}
        onSignIn={signIn}
        onSignOut={handleSignOut}
      />

      <div className="max-w-4xl mx-auto px-4 mb-12 no-print">
        <div className="flex p-1.5 bg-white dark:bg-emerald-900/50 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
          <button 
            onClick={() => setActiveTab('finder')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'finder' ? 'bg-emerald-700 text-white shadow-lg' : 'text-emerald-400 hover:text-emerald-600'}`}
          >
            <Search className="h-5 w-5" />
            <span className="hidden sm:inline">{isEn ? 'Finder' : 'Pencari'}</span>
          </button>
          <button 
            onClick={() => setActiveTab('library')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'library' ? 'bg-emerald-700 text-white shadow-lg' : 'text-emerald-400 hover:text-emerald-600'}`}
          >
            <Library className="h-5 w-5" />
            <span className="hidden sm:inline">{isEn ? 'Library' : 'Perpustakaan'}</span>
            {savedResults.length > 0 && (
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px]">
                {savedResults.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('study-circle')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'study-circle' ? 'bg-emerald-700 text-white shadow-lg' : 'text-emerald-400 hover:text-emerald-600'}`}
          >
            <Users className="h-5 w-5" />
            <span className="hidden sm:inline">{isEn ? 'Study Circle' : 'Lingkaran Studi'}</span>
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 relative">
        <AnimatePresence mode="wait">
          {showFeedback && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-emerald-900 p-8 rounded-[2.5rem] shadow-2xl max-w-lg w-full border-2 border-emerald-100 dark:border-emerald-800"
              >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-emerald-900 dark:text-white">
                  {isEn ? "Send Feedback" : "Kirim Masukan"}
                </h3>
                <button onClick={() => setShowFeedback(false)} className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-800 text-emerald-400 hover:text-emerald-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {feedbackSubmitted ? (
                <div className="text-center py-10 space-y-4">
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-emerald-900 dark:text-white">
                    {isEn ? "Thank You!" : "Terima Kasih!"}
                  </h4>
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {isEn ? "Your feedback helps us improve Nur Al-Quran Finder." : "Masukan Anda membantu kami meningkatkan Nur Al-Quran Finder."}
                  </p>
                  <button 
                    onClick={() => setShowFeedback(false)}
                    className="mt-6 px-8 py-3 bg-emerald-700 text-white rounded-2xl font-bold hover:bg-emerald-800 transition-all"
                  >
                    {isEn ? "Close" : "Tutup"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{isEn ? "Type" : "Jenis"}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['suggestion', 'bug', 'other'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFeedbackType(t)}
                          className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${feedbackType === t ? 'bg-emerald-700 border-emerald-700 text-white shadow-md' : 'border-emerald-50 dark:border-emerald-800 text-emerald-400 hover:border-emerald-200'}`}
                        >
                          {t === 'bug' ? (isEn ? 'Bug' : 'Error') : t === 'suggestion' ? (isEn ? 'Idea' : 'Ide') : (isEn ? 'Other' : 'Lainnya')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{isEn ? "Message" : "Pesan"}</label>
                    <textarea
                      required
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder={isEn ? "Tell us what's on your mind..." : "Ceritakan apa yang ada di pikiran Anda..."}
                      className="w-full h-40 p-4 rounded-2xl border-2 border-emerald-50 dark:border-emerald-800 bg-emerald-50/10 dark:bg-black/20 text-emerald-900 dark:text-white outline-none focus:border-emerald-500 transition-all resize-none"
                    />
                    <p className="text-[10px] text-emerald-400 font-medium italic">
                      {isEn 
                        ? "* This will open your default email app to send the message to developer" 
                        : "* Ini akan membuka aplikasi email default Anda untuk mengirim pesan ke pengembang"}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingFeedback || !feedbackMessage.trim()}
                    className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-black hover:bg-emerald-800 transition-all shadow-lg disabled:opacity-50"
                  >
                    {isSubmittingFeedback ? (isEn ? "Sending..." : "Mengirim...") : (isEn ? "Submit Feedback" : "Kirim Masukan")}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}

        {showAbout && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-emerald-900 p-8 rounded-[2.5rem] shadow-2xl max-w-2xl w-full border-2 border-emerald-100 dark:border-emerald-800 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-black text-emerald-900 dark:text-white">
                  {isEn ? "About Nur Al-Quran Finder" : "Tentang Nur Al-Quran Finder"}
                </h3>
                <button onClick={() => setShowAbout(false)} className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-800 text-emerald-400 hover:text-emerald-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-8 text-emerald-800 dark:text-emerald-100">
                <section>
                  <h4 className="text-sm font-black uppercase tracking-widest text-emerald-500 mb-3">{isEn ? "Purpose" : "Tujuan"}</h4>
                  <p className="leading-relaxed font-medium">
                    {isEn 
                      ? "Nur Al-Quran Finder is a digital companion designed to help believers and seekers find the exact source of Quranic verses and Prophetic Hadiths. Whether you have a partial snippet, a transliteration, or an audio recording, our tool bridges the gap between memory and the divine text."
                      : "Nur Al-Quran Finder adalah pendamping digital yang dirancang untuk membantu umat beriman dan pencari ilmu menemukan sumber tepat dari ayat-ayat Al-Quran dan Hadits Nabi. Baik Anda memiliki potongan ayat, transliterasi, atau rekaman audio, alat kami menjembatani celah antara ingatan dan teks suci."}
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-black uppercase tracking-widest text-emerald-500 mb-3">{isEn ? "How it works" : "Cara Kerja"}</h4>
                  <p className="leading-relaxed font-medium">
                    {isEn
                      ? "Powered by Google's Gemini AI, the application analyzes your input (text or audio) against a vast knowledge base of Islamic texts. It provides not just the identification, but also context, transliteration, and translations to deepen your understanding."
                      : "Didukung oleh AI Gemini dari Google, aplikasi ini menganalisis input Anda (teks atau audio) terhadap basis pengetahuan teks Islam yang luas. Ini tidak hanya memberikan identifikasi, tetapi juga konteks, transliterasi, dan terjemahan untuk memperdalam pemahaman Anda."}
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-black uppercase tracking-widest text-emerald-500 mb-3">{isEn ? "Key Features" : "Fitur Utama"}</h4>
                  <ul className="space-y-3 text-sm font-bold">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                      <span>{isEn ? "AI-Powered Identification for Text & Audio" : "Identifikasi Berbasis AI untuk Teks & Audio"}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                      <span>{isEn ? "Share Card Generator (9:16) for Social Media" : "Pembuat Kartu Berbagi (9:16) untuk Media Sosial"}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                      <span>{isEn ? "Personal Library with Reflections & Categories" : "Perpustakaan Pribadi dengan Refleksi & Kategori"}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                      <span>{isEn ? "Daily Wisdom & Multi-language Support" : "Hikmah Harian & Dukungan Multi-bahasa"}</span>
                    </li>
                  </ul>
                </section>

                <section className="p-6 bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl border border-emerald-100 dark:border-emerald-800">
                  <h4 className="text-sm font-black uppercase tracking-widest text-emerald-500 mb-3">{isEn ? "Credits & Sources" : "Kredit & Sumber"}</h4>
                  <ul className="space-y-2 text-sm font-bold">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                      {isEn ? "Quranic Text: Tanzil Project" : "Teks Al-Quran: Proyek Tanzil"}
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                      {isEn ? "Hadith Database: Sunnah.com" : "Database Hadits: Sunnah.com"}
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                      {isEn ? "AI Engine: Google Gemini 3.1 Pro" : "Mesin AI: Google Gemini 3.1 Pro"}
                    </li>
                  </ul>
                </section>
              </div>

              <button 
                onClick={() => setShowAbout(false)}
                className="w-full mt-10 py-4 bg-emerald-700 text-white rounded-2xl font-black hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/20"
              >
                {isEn ? "Close" : "Tutup"}
              </button>
            </motion.div>
          </motion.div>
        )}

        {tourStep !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/70 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border-2 border-emerald-500"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">{isEn ? 'Step' : 'Tahap'} {tourStep + 1} / 5</span>
                <button onClick={() => setTourStep(null)} className="text-emerald-300 hover:text-emerald-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <h3 className="text-2xl font-bold text-emerald-900 mb-2">
                {tourStep === 0 && (isEn ? "Welcome to Nur Finder" : "Selamat Datang di Nur Finder")}
                {tourStep === 1 && (isEn ? "Smart Text Input" : "Input Teks Pintar")}
                {tourStep === 2 && (isEn ? "Media Analysis" : "Analisis Media")}
                {tourStep === 3 && (isEn ? "Share Card Generator" : "Pembuat Kartu Berbagi")}
                {tourStep === 4 && (isEn ? "Organize Wisdom" : "Kelola Hikmah")}
              </h3>
              <p className="text-emerald-700 mb-6 text-sm font-medium">
                {tourStep === 0 && (isEn ? "Discover the origin of Quranic verses or Hadiths using AI." : "Temukan asal-usul ayat Al-Quran atau Hadits menggunakan AI.")}
                {tourStep === 1 && (isEn ? "Type any verse snippet, keyword, or transliteration." : "Ketik potongan ayat, kata kunci, atau transliterasi.")}
                {tourStep === 2 && (isEn ? "Upload audio recordings or video clips to identify recitation." : "Unggah rekaman audio atau klip video untuk identifikasi tilawah.")}
                {tourStep === 3 && (isEn ? "Generate beautiful, shareable cards for social media (9:16 ratio)." : "Buat kartu berbagi yang indah untuk media sosial (rasio 9:16).")}
                {tourStep === 4 && (isEn ? "Save your findings and add personal reflections." : "Simpan temuan Anda dan tambahkan refleksi pribadi.")}
              </p>
              <button onClick={nextTourStep} className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-bold hover:bg-emerald-800 transition-colors">
                {tourStep === 4 ? (isEn ? "Finish" : "Selesai") : (isEn ? "Next" : "Lanjut")}
              </button>
            </motion.div>
          </motion.div>
        )}

        {deleteConfirmIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-emerald-900 p-8 rounded-3xl shadow-2xl max-w-sm w-full border-2 border-red-100 dark:border-red-900/30"
            >
              <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50 mb-2">
                {isEn ? "Delete Result?" : "Hapus Hasil?"}
              </h3>
              <p className="text-emerald-700 dark:text-emerald-300 mb-6 text-sm font-medium">
                {isEn ? "Are you sure you want to remove this from your library? This action cannot be undone." : "Apakah Anda yakin ingin menghapus ini dari perpustakaan? Tindakan ini tidak dapat dibatalkan."}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => { deleteSavedResult(deleteConfirmIndex); setDeleteConfirmIndex(null); }} 
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors"
                >
                  {isEn ? "Delete" : "Hapus"}
                </button>
                <button 
                  onClick={() => setDeleteConfirmIndex(null)} 
                  className="flex-1 py-4 bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-2xl font-bold hover:bg-emerald-200 dark:hover:bg-emerald-700 transition-colors"
                >
                  {isEn ? "Cancel" : "Batal"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showBulkCategorize && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-emerald-900 p-8 rounded-3xl shadow-2xl max-w-sm w-full border-2 border-emerald-100 dark:border-emerald-800"
            >
              <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50 mb-4">
                {isEn ? "Bulk Categorize" : "Kategorikan Masal"}
              </h3>
              <p className="text-emerald-700 dark:text-emerald-300 mb-6 text-sm font-medium">
                {isEn ? `Assign a category to ${selectedIndices.size} selected items.` : `Berikan kategori ke ${selectedIndices.size} item terpilih.`}
              </p>
              <input 
                type="text" 
                value={bulkCategory} 
                onChange={(e) => setBulkCategory(e.target.value)} 
                placeholder={isEn ? "Enter category name..." : "Masukkan nama kategori..."}
                className="w-full p-4 rounded-2xl border-2 border-emerald-50 dark:border-emerald-800 bg-emerald-50/10 dark:bg-black/20 text-emerald-900 dark:text-white outline-none focus:border-emerald-500 transition-all mb-6"
              />
              <div className="flex gap-4">
                <button 
                  onClick={bulkCategorize} 
                  className="flex-1 py-4 bg-emerald-700 text-white rounded-2xl font-bold hover:bg-emerald-800 transition-colors"
                >
                  {isEn ? "Apply" : "Terapkan"}
                </button>
                <button 
                  onClick={() => setShowBulkCategorize(false)} 
                  className="flex-1 py-4 bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-2xl font-bold hover:bg-emerald-200 dark:hover:bg-emerald-700 transition-colors"
                >
                  {isEn ? "Cancel" : "Batal"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'finder' && !state.result && (
            <motion.div 
              key="finder-input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-12"
            >
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-100 space-y-8 no-print">
              <div>
                <label className="block text-emerald-900 font-bold text-lg mb-3">{isEn ? 'Verse or Phrase' : 'Ayat atau Frasa'}</label>
                <textarea
                  value={textInput}
                  onChange={(e) => { setTextInput(e.target.value); setFile(null); }}
                  className="w-full h-32 p-5 rounded-2xl border-2 border-emerald-50 focus:border-emerald-500 outline-none bg-emerald-50/20 text-emerald-900 placeholder-emerald-200"
                  placeholder={isEn ? "Type here (e.g., 'Inna a'taina')..." : "Ketik di sini (misal: 'Inna a'taina')..."}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  className={`border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[180px] ${file ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-100 bg-emerald-50/10'}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault(); setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) processSelectedFile(e.dataTransfer.files[0]);
                  }}
                >
                  <input type="file" onChange={handleFileChange} className="hidden" id="f-up" accept="audio/*,video/*" />
                  <label htmlFor="f-up" className="cursor-pointer flex flex-col items-center">
                    <p className="text-emerald-900 font-bold text-sm">{file ? file.name : (isEn ? 'Upload Media' : 'Unggah Media')}</p>
                  </label>
                </div>

                <div className={`border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[180px] relative ${isRecording ? 'border-orange-400 bg-orange-50' : 'border-emerald-100 bg-emerald-50/10'}`}>
                  <button 
                    onClick={() => setShowAudioSettings(!showAudioSettings)}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-white/50 dark:bg-black/20 text-emerald-600 hover:bg-emerald-100 transition-all"
                    title={isEn ? "Audio Settings" : "Pengaturan Audio"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  {showAudioSettings && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-emerald-900/95 z-10 rounded-3xl p-6 flex flex-col justify-center space-y-4 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                          {isEn ? "Quality Settings" : "Pengaturan Kualitas"}
                        </h4>
                        <button onClick={() => setShowAudioSettings(false)} className="text-emerald-400 hover:text-emerald-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1 text-left">
                          <label className="text-[9px] font-black uppercase text-emerald-500">{isEn ? "Sample Rate" : "Laju Sampel"}</label>
                          <select 
                            value={audioSampleRate} 
                            onChange={(e) => setAudioSampleRate(parseInt(e.target.value))}
                            className="text-xs p-2 bg-emerald-50 dark:bg-emerald-800 border border-emerald-100 dark:border-emerald-700 rounded-xl outline-none"
                          >
                            <option value="22050">22.05 kHz</option>
                            <option value="44100">44.1 kHz</option>
                            <option value="48000">48 kHz</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1 text-left">
                          <label className="text-[9px] font-black uppercase text-emerald-500">{isEn ? "Bit Rate" : "Laju Bit"}</label>
                          <select 
                            value={audioBitRate} 
                            onChange={(e) => setAudioBitRate(parseInt(e.target.value))}
                            className="text-xs p-2 bg-emerald-50 dark:bg-emerald-800 border border-emerald-100 dark:border-emerald-700 rounded-xl outline-none"
                          >
                            <option value="64000">64 kbps</option>
                            <option value="128000">128 kbps</option>
                            <option value="192000">192 kbps</option>
                            <option value="256000">256 kbps</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <button onClick={async () => {
                    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); }
                    else {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ 
                          audio: {
                            sampleRate: audioSampleRate,
                            channelCount: 1,
                            echoCancellation: true,
                            noiseSuppression: true
                          } 
                        });
                        const mr = new MediaRecorder(stream, {
                          audioBitsPerSecond: audioBitRate
                        });
                        mediaRecorderRef.current = mr; audioChunksRef.current = [];
                        mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
                        mr.onstop = () => { 
                          setFile(new File([new Blob(audioChunksRef.current, { type: 'audio/webm' })], `rec.webm`, { type: 'audio/webm' })); 
                          setTextInput(''); 
                        };
                        mr.start(); setIsRecording(true);
                      } catch (err) {
                        console.error("Recording error:", err);
                        alert(isEn ? "Could not access microphone." : "Tidak dapat mengakses mikrofon.");
                      }
                    }
                  }} className="flex flex-col items-center">
                    <p className="text-emerald-900 font-bold text-sm">{isRecording ? (isEn ? 'Stop' : 'Berhenti') : (isEn ? 'Record Voice' : 'Rekam Suara')}</p>
                  </button>
                </div>
              </div>

              {uploadProgress !== null && (
                <div className="w-full space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-emerald-500">
                    <span>{uploadProgress < 100 ? (isEn ? 'Reading Media...' : 'Membaca Media...') : (isEn ? 'Analyzing...' : 'Menganalisis...')}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-emerald-50 dark:bg-emerald-900/50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleIdentify}
                disabled={state.isAnalyzing || (!textInput.trim() && !file)}
                className="w-full py-5 rounded-2xl text-xl font-bold bg-emerald-700 text-white shadow-lg disabled:bg-emerald-100"
              >
                {state.isAnalyzing ? (isEn ? 'Consulting...' : 'Mencari...') : (isEn ? "Seek Source" : "Cari Sumber")}
              </button>
            </div>

            {/* Daily Wisdom Section - Moved below the finder */}
            {(dailyWisdom || isFetchingDaily) && (
              <div className="bg-white dark:bg-emerald-900/40 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
                      </svg>
                    </span>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">
                      {isEn ? "Daily Wisdom" : "Hikmah Hari Ini"}
                    </h3>
                  </div>
                  <button 
                    onClick={() => fetchDailyWisdom(true)} 
                    className="text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:text-emerald-600 transition-colors"
                    disabled={isFetchingDaily}
                  >
                    {isFetchingDaily ? (isEn ? "Refreshing..." : "Menyegarkan...") : (isEn ? "Refresh" : "Segarkan")}
                  </button>
                </div>

                {isFetchingDaily ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-emerald-50 dark:bg-emerald-800 rounded-xl w-3/4 ml-auto"></div>
                    <div className="h-4 bg-emerald-50 dark:bg-emerald-800 rounded-xl w-full"></div>
                    <div className="h-4 bg-emerald-50 dark:bg-emerald-800 rounded-xl w-5/6"></div>
                  </div>
                ) : dailyWisdom && (
                  <div className="cursor-pointer" onClick={() => setState({ ...state, result: dailyWisdom })}>
                    <p className="font-arabic text-right text-3xl text-emerald-800 dark:text-emerald-100 leading-[1.8] mb-4" dir="rtl">
                      {dailyWisdom.arabicText}
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 italic font-medium mb-4">
                      "{isEn ? dailyWisdom.translation : dailyWisdom.translationID}"
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-emerald-400">{dailyWisdom.title} • {dailyWisdom.reference}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 group-hover:translate-x-1 transition-transform">
                        {isEn ? "View Details →" : "Lihat Detail →"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

      {activeTab === 'finder' && state.result && (
        <motion.div 
          key="finder-result"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
            <div className="flex flex-wrap items-center justify-between gap-4 no-print bg-white/10 dark:bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-emerald-100/20">
              <button 
                onClick={reset} 
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                {isEn ? 'Search Again' : 'Cari Lagi'}
              </button>
              
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">{isEn ? 'Arabic Size' : 'Ukuran Arab'}</label>
                  <input 
                    type="range" min="24" max="80" value={arabicFontSize} 
                    onChange={(e) => setArabicFontSize(parseInt(e.target.value))} 
                    className="w-24 accent-emerald-600" 
                    title={isEn ? "Adjust Arabic font size" : "Sesuaikan ukuran font Arab"}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">{isEn ? 'Text Size' : 'Ukuran Teks'}</label>
                  <input 
                    type="range" min="12" max="32" value={translationFontSize} 
                    onChange={(e) => setTranslationFontSize(parseInt(e.target.value))} 
                    className="w-24 accent-emerald-600" 
                    title={isEn ? "Adjust translation font size" : "Sesuaikan ukuran font terjemahan"}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">{isEn ? 'Auto Scroll' : 'Gulir Otomatis'}</label>
                  <input 
                    type="range" min="0" max="100" value={autoScrollSpeed} 
                    onChange={(e) => setAutoScrollSpeed(parseInt(e.target.value))} 
                    className="w-24 accent-emerald-600" 
                    title={isEn ? "Adjust auto-scroll speed" : "Sesuaikan kecepatan gulir otomatis"}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">{isEn ? 'Highlight Terms' : 'Sorot Kata'}</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={highlightTerm} 
                      onChange={(e) => setHighlightTerm(e.target.value)} 
                      placeholder={isEn ? "e.g. 'Allah' or 'Mercy'..." : "misal: 'Allah' atau 'Rahman'..."}
                      className="text-xs p-2 pr-8 bg-white/50 dark:bg-black/30 border border-emerald-100/20 rounded-xl outline-none w-full focus:border-emerald-500 transition-all"
                      title={isEn ? "Type words to highlight (use spaces for multiple, quotes for phrases)" : "Ketik kata untuk disorot (spasi untuk banyak, kutip untuk frasa)"}
                    />
                    {highlightTerm && (
                      <button 
                        onClick={() => setHighlightTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-600 p-1"
                        title={isEn ? "Clear highlight" : "Hapus sorotan"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <ResultDisplay 
              result={state.result} 
              onSave={saveResult} 
              lang={lang} 
              arabicFontSize={arabicFontSize}
              translationFontSize={translationFontSize}
              highlightTerm={highlightTerm}
              autoScrollSpeed={autoScrollSpeed}
              audioUrl={audioUrl || undefined}
              onViewRelated={(item) => {
                setState({
                  ...state,
                  result: {
                    ...item,
                    type: SourceType.UNKNOWN, // We don't know for sure if it's Quran or Hadith from RelatedContent, but we can guess or let Gemini handle it
                    confidence: 1,
                    timestamp: Date.now()
                  } as IdentificationResult
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </motion.div>
        )}

        {activeTab === 'library' && savedResults.length > 0 && (
          <motion.div 
            key="library-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="no-print"
          >
            <div className="flex flex-col space-y-6 mb-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-2xl font-bold text-emerald-950 dark:text-emerald-50 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-700 rounded-xl flex items-center justify-center text-white">📖</div>
                    {isEn ? 'Library' : 'Perpustakaan'}
                  </h3>
                  {filteredResults.length > 0 && (
                    <button 
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition-all hover:bg-emerald-200 dark:hover:bg-emerald-800"
                    >
                      {selectedIndices.size === filteredResults.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      {selectedIndices.size === filteredResults.length ? (isEn ? 'Deselect All' : 'Batal Pilih Semua') : (isEn ? 'Select All' : 'Pilih Semua')}
                    </button>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                   <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase opacity-60">{isEn ? 'Category' : 'Kategori'}</label>
                    <select 
                      value={activeCategoryFilter || ''} 
                      onChange={(e) => setActiveCategoryFilter(e.target.value || null)} 
                      className="text-xs px-3 py-2 bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-xl outline-none"
                      title={isEn ? "Filter by category" : "Filter berdasarkan kategori"}
                    >
                      <option value="">{isEn ? 'All' : 'Semua'}</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase opacity-60">{isEn ? 'Min Confidence' : 'Keyakinan Min'}</label>
                    <select 
                      value={confidenceFilter} 
                      onChange={(e) => setConfidenceFilter(parseInt(e.target.value))} 
                      className="text-xs px-3 py-2 bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-xl outline-none"
                      title={isEn ? "Filter by minimum AI confidence score" : "Filter berdasarkan skor keyakinan AI minimum"}
                    >
                      <option value="0">0%</option>
                      <option value="50">50%</option>
                      <option value="80">80%</option>
                      <option value="95">95%</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase opacity-60">{isEn ? 'From' : 'Dari'}</label>
                    <input 
                      type="date" value={dateFilter.start} 
                      onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })} 
                      className="text-xs px-3 py-2 bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-xl outline-none" 
                      title={isEn ? "Filter results from this date" : "Filter hasil dari tanggal ini"}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase opacity-60">{isEn ? 'To' : 'Sampai'}</label>
                    <input 
                      type="date" value={dateFilter.end} 
                      onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })} 
                      className="text-xs px-3 py-2 bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-xl outline-none" 
                      title={isEn ? "Filter results until this date" : "Filter hasil sampai tanggal ini"}
                    />
                  </div>
                </div>
              </div>
              
              <input 
                type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isEn ? "Search your library..." : "Cari di perpustakaan..."}
                className="w-full pl-6 pr-6 py-4 rounded-2xl bg-white dark:bg-emerald-900 border border-emerald-100 dark:border-emerald-800 shadow-sm outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-8">
                {filteredResults.map((saved, idx) => {
                  const actualIdx = savedResults.indexOf(saved);
                  const isEditing = editingIndex === actualIdx;
                  const isExpanded = expandedItems.has(actualIdx);
                  const translation = isEn ? saved.translation : saved.translationID;
                  
                  // Truncate logic
                  const arabicSnippet = saved.arabicText.length > 100 && !isExpanded 
                    ? saved.arabicText.substring(0, 100) + '...' 
                    : saved.arabicText;
                  const translationSnippet = translation.length > 150 && !isExpanded 
                    ? translation.substring(0, 150) + '...' 
                    : translation;

                  return (
                    <div key={idx} className={`bg-white dark:bg-emerald-900/40 p-8 rounded-[2rem] border transition-all hover:shadow-md relative group ${selectedIndices.has(actualIdx) ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-emerald-100 dark:border-emerald-800 shadow-sm'}`}>
                      <div className="absolute top-6 right-6 flex items-center gap-3">
                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => startEditing(actualIdx)} className="text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:underline">{isEn ? 'Edit' : 'Ubah'}</button>
                          <button onClick={() => setDeleteConfirmIndex(actualIdx)} className="text-red-500 font-bold text-xs hover:underline">{isEn ? 'Delete' : 'Hapus'}</button>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleSelect(actualIdx); }}
                          className={`p-1 rounded-md transition-all ${selectedIndices.has(actualIdx) ? 'text-emerald-600' : 'text-emerald-300 hover:text-emerald-500'}`}
                        >
                          {selectedIndices.has(actualIdx) ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                        </button>
                      </div>

                      <div className="cursor-pointer" onClick={() => {
                        if (!isEditing) {
                          setState({ ...state, result: saved });
                          setActiveTab('finder');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{saved.type}</span>
                          <span className="text-[9px] opacity-40 font-bold">{new Date(saved.timestamp).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-bold text-emerald-900 dark:text-emerald-50 text-2xl mb-1">{saved.title}</h4>
                        <p className="text-sm text-emerald-400 font-bold mb-6 italic">{saved.reference}</p>
                        
                        {!isEditing && (
                          <div className="space-y-4">
                            <div className="bg-emerald-50/20 dark:bg-black/20 p-6 rounded-2xl border border-emerald-50 dark:border-emerald-800">
                              <p className="font-arabic text-right text-3xl text-emerald-800 dark:text-emerald-100 leading-[1.8]" dir="rtl">{arabicSnippet}</p>
                              <p className="text-sm mt-4 text-emerald-700 dark:text-emerald-300 italic">"{translationSnippet}"</p>
                              
                              {(saved.arabicText.length > 100 || translation.length > 150) && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleExpand(actualIdx); }}
                                  className="mt-4 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-700 transition-colors"
                                >
                                  {isExpanded ? (isEn ? 'Show Less' : 'Sembunyikan') : (isEn ? 'Show More' : 'Selengkapnya')}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {isEditing ? (
                          <div className="mt-4 p-8 bg-emerald-50/50 dark:bg-emerald-800/20 rounded-3xl border border-emerald-200 dark:border-emerald-700 space-y-6">
                            <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Category..." className="w-full p-4 rounded-2xl border dark:border-emerald-700 bg-white dark:bg-emerald-900 dark:text-white" />
                            <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Reflections..." className="w-full p-4 rounded-2xl border dark:border-emerald-700 bg-white dark:bg-emerald-900 dark:text-white h-32" />
                            <div className="flex gap-4">
                              <button onClick={() => handleUpdateSavedResult(actualIdx)} className="flex-1 py-3 bg-emerald-700 text-white rounded-xl font-bold">{isEn ? 'Update' : 'Perbarui'}</button>
                              <button onClick={() => setEditingIndex(null)} className="flex-1 py-3 bg-white dark:bg-emerald-800 border dark:border-emerald-700 text-emerald-400 rounded-xl font-bold">{isEn ? 'Cancel' : 'Batal'}</button>
                            </div>
                          </div>
                        ) : (
                          saved.userNote && (
                            <div className="mt-4 bg-emerald-50/50 dark:bg-emerald-800/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                              <p className="text-sm font-medium italic text-emerald-700 dark:text-emerald-300">"{saved.userNote}"</p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}

        {activeTab === 'library' && savedResults.length === 0 && (
          <motion.div 
            key="library-empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6 no-print"
          >
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto text-4xl">
              ✨
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50">
                {isEn ? "Your Library is Empty" : "Perpustakaan Anda Kosong"}
              </h3>
              <p className="text-emerald-600 dark:text-emerald-400 max-w-sm mx-auto font-medium">
                {isEn 
                  ? "Start your journey by identifying your first verse or Hadith. Your findings will appear here." 
                  : "Mulailah perjalanan Anda dengan mengidentifikasi ayat atau Hadits pertama Anda. Temuan Anda akan muncul di sini."}
              </p>
            </div>
            <button 
              onClick={() => setActiveTab('finder')}
              className="px-8 py-4 bg-emerald-700 text-white rounded-2xl font-black hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
            >
              {isEn ? "Explore Now" : "Jelajahi Sekarang"}
            </button>
          </motion.div>
        )}

        {activeTab === 'study-circle' && (
          <motion.div 
            key="study-circle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <StudyCircle user={user} isEn={isEn} currentResult={state.result || undefined} />
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      <footer className="mt-32 text-center text-emerald-600 text-sm pb-10 flex flex-col items-center gap-6 no-print">
        <div className="h-[2px] w-12 bg-emerald-100 dark:bg-emerald-800"></div>
        <p className="font-bold">© {new Date().getFullYear()} Nur Al-Quran Finder</p>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFeedback(true)}
            className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-all"
            title={isEn ? "Send Feedback" : "Kirim Masukan"}
          >
            <MessageSquare className="h-5 w-5" />
          </button>
          <a 
            href="https://smartfaith.streamlit.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-all"
            title={isEn ? "Visit SmartFaith (Mother App)" : "Kunjungi SmartFaith (Aplikasi Induk)"}
          >
            <Globe className="h-5 w-5" />
          </a>
          <a 
            href="https://github.com/mrbrightsides" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-all"
            title={isEn ? "Visit Developer Profile" : "Kunjungi Profil Pengembang"}
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </footer>

      <AnimatePresence>
        {selectedIndices.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4"
          >
            <div className="bg-emerald-900 text-white p-4 rounded-3xl shadow-2xl border border-emerald-700 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 pl-2">
                <div className="w-8 h-8 bg-emerald-700 rounded-full flex items-center justify-center text-xs font-black">
                  {selectedIndices.size}
                </div>
                <span className="text-sm font-bold">
                  {isEn ? 'Items Selected' : 'Item Terpilih'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowBulkCategorize(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 rounded-xl text-xs font-bold transition-all"
                >
                  <Tag className="h-4 w-4" />
                  {isEn ? 'Categorize' : 'Kategori'}
                </button>
                <button 
                  onClick={bulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  {isEn ? 'Delete' : 'Hapus'}
                </button>
                <button 
                  onClick={() => setSelectedIndices(new Set())}
                  className="p-2 hover:bg-emerald-800 rounded-xl transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LoadingOverlay isVisible={state.isAnalyzing} lang={lang} />
      
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast({ ...toast, isVisible: false })} 
      />
    </div>
  );
};

export default App;
