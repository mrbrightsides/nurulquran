
import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import ResultDisplay from './components/ResultDisplay';
import { AppState, IdentificationResult } from './types';
import { identifyContent, getDailyWisdom } from './services/geminiService';

const App: React.FC = () => {
  const [lang, setLang] = useState<'en' | 'id'>('id');
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

  const [state, setState] = useState<AppState>({ isAnalyzing: false, result: null, error: null });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isEn = lang === 'en';

  useEffect(() => {
    const stored = localStorage.getItem('nur_quran_saved_results');
    if (stored) try { setSavedResults(JSON.parse(stored)); } catch (e) {}
    
    const storedDarkMode = localStorage.getItem('nur_quran_dark_mode');
    if (storedDarkMode === 'true') setDarkMode(true);

    fetchDailyWisdom();
  }, []);

  const fetchDailyWisdom = async () => {
    const today = new Date().toISOString().split('T')[0];
    const cached = localStorage.getItem(`nur_daily_wisdom_${today}`);
    
    if (cached) {
      try { setDailyWisdom(JSON.parse(cached)); return; } catch (e) {}
    }

    setIsFetchingDaily(true);
    try {
      const wisdom = await getDailyWisdom(today);
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
    if (tourStep !== null && tourStep < 3) setTourStep(tourStep + 1);
    else { setTourStep(null); }
  };

  const saveToLocalStorage = (result: IdentificationResult) => {
    const resultWithTimestamp = { ...result, timestamp: result.timestamp || Date.now() };
    const updated = [resultWithTimestamp, ...savedResults.filter(r => !(r.reference === result.reference && r.title === result.title))];
    setSavedResults(updated);
    localStorage.setItem('nur_quran_saved_results', JSON.stringify(updated));
  };

  const deleteSavedResult = (index: number) => {
    const updated = savedResults.filter((_, i) => i !== index);
    setSavedResults(updated);
    localStorage.setItem('nur_quran_saved_results', JSON.stringify(updated));
  };

  const handleUpdateSavedResult = (index: number) => {
    const updated = [...savedResults];
    updated[index] = { ...updated[index], userCategory: editCategory.trim() || undefined, userNote: editNote.trim() || undefined };
    setSavedResults(updated);
    localStorage.setItem('nur_quran_saved_results', JSON.stringify(updated));
    setEditingIndex(null);
  };

  const startEditing = (index: number) => {
    const item = savedResults[index];
    setEditingIndex(index);
    setEditCategory(item.userCategory || '');
    setEditNote(item.userNote || '');
  };

  const reset = () => {
    setTextInput(''); setFile(null); setIsRecording(false); setRecordingDuration(0);
    setShowFeedback(false);
    setFeedbackSubmitted(false);
    setFeedbackMessage('');
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

  const handleIdentify = async () => {
    if (!textInput.trim() && !file) return;
    setState({ ...state, isAnalyzing: true, error: null });
    try {
      let result;
      if (file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        const base64 = await new Promise<string>((res) => {
          reader.onload = () => res((reader.result as string).split(',')[1]);
        });
        result = await identifyContent({ data: base64, mimeType: file.type || 'audio/webm' }, false);
      } else {
        result = await identifyContent(textInput, true);
      }
      // Add timestamp to the result
      const finalResult = { ...result, timestamp: Date.now() };
      setState({ ...state, isAnalyzing: false, result: finalResult });
    } catch (err: any) { setState({ ...state, isAnalyzing: false, error: err.message }); }
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
      />

      <main className="max-w-4xl mx-auto px-4 relative">
        {showFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-emerald-900 p-8 rounded-[2.5rem] shadow-2xl max-w-lg w-full border-2 border-emerald-100 dark:border-emerald-800 animate-in zoom-in duration-200">
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
            </div>
          </div>
        )}

        {showAbout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-emerald-900 p-8 rounded-[2.5rem] shadow-2xl max-w-2xl w-full border-2 border-emerald-100 dark:border-emerald-800 animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
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
            </div>
          </div>
        )}

        {tourStep !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/70 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border-2 border-emerald-500 animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">{isEn ? 'Step' : 'Tahap'} {tourStep + 1} / 4</span>
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
                {tourStep === 3 && (isEn ? "Organize Wisdom" : "Kelola Hikmah")}
              </h3>
              <p className="text-emerald-700 mb-6 text-sm font-medium">
                {tourStep === 0 && (isEn ? "Discover the origin of Quranic verses or Hadiths using AI." : "Temukan asal-usul ayat Al-Quran atau Hadits menggunakan AI.")}
                {tourStep === 1 && (isEn ? "Type any verse snippet, keyword, or transliteration." : "Ketik potongan ayat, kata kunci, atau transliterasi.")}
                {tourStep === 2 && (isEn ? "Upload audio recordings or video clips to identify recitation." : "Unggah rekaman audio atau klip video untuk identifikasi tilawah.")}
                {tourStep === 3 && (isEn ? "Save your findings and add personal reflections." : "Simpan temuan Anda dan tambahkan refleksi pribadi.")}
              </p>
              <button onClick={nextTourStep} className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-bold hover:bg-emerald-800 transition-colors">
                {tourStep === 3 ? (isEn ? "Finish" : "Selesai") : (isEn ? "Next" : "Lanjut")}
              </button>
            </div>
          </div>
        )}

        {deleteConfirmIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-emerald-900 p-8 rounded-3xl shadow-2xl max-w-sm w-full border-2 border-red-100 dark:border-red-900/30 animate-in zoom-in duration-200">
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
            </div>
          </div>
        )}

        {!state.result && (
          <div className="space-y-12">
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
                    if (e.dataTransfer.files?.[0]) { setFile(e.dataTransfer.files[0]); setTextInput(''); }
                  }}
                >
                  <input type="file" onChange={(e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setTextInput(''); } }} className="hidden" id="f-up" accept="audio/*,video/*" />
                  <label htmlFor="f-up" className="cursor-pointer flex flex-col items-center">
                    <p className="text-emerald-900 font-bold text-sm">{file ? file.name : (isEn ? 'Upload Media' : 'Unggah Media')}</p>
                  </label>
                </div>

                <div className={`border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[180px] ${isRecording ? 'border-orange-400 bg-orange-50' : 'border-emerald-100 bg-emerald-50/10'}`}>
                  <button onClick={async () => {
                    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); }
                    else {
                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                      const mr = new MediaRecorder(stream);
                      mediaRecorderRef.current = mr; audioChunksRef.current = [];
                      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
                      mr.onstop = () => { setFile(new File([new Blob(audioChunksRef.current, { type: 'audio/webm' })], `rec.webm`, { type: 'audio/webm' })); setTextInput(''); };
                      mr.start(); setIsRecording(true);
                    }
                  }} className="flex flex-col items-center">
                    <p className="text-emerald-900 font-bold text-sm">{isRecording ? (isEn ? 'Stop' : 'Berhenti') : (isEn ? 'Record Voice' : 'Rekam Suara')}</p>
                  </button>
                </div>
              </div>

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
                    onClick={fetchDailyWisdom} 
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
          </div>
        )}

        {state.result && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 no-print bg-white/10 dark:bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-emerald-100/20">
              <button onClick={reset} className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                ← {isEn ? 'Find Another' : 'Cari Lagi'}
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
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">{isEn ? 'Highlight' : 'Sorot'}</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={highlightTerm} 
                      onChange={(e) => setHighlightTerm(e.target.value)} 
                      placeholder={isEn ? "Word..." : "Kata..."}
                      className="text-xs p-1 pr-6 bg-white/50 dark:bg-black/30 border border-emerald-100/20 rounded outline-none w-24"
                      title={isEn ? "Type a word to highlight in the text" : "Ketik kata untuk disorot dalam teks"}
                    />
                    {highlightTerm && (
                      <button 
                        onClick={() => setHighlightTerm('')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-600"
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
              onSave={saveToLocalStorage} 
              lang={lang} 
              arabicFontSize={arabicFontSize}
              translationFontSize={translationFontSize}
              highlightTerm={highlightTerm}
              autoScrollSpeed={autoScrollSpeed}
            />
          </div>
        )}

        {savedResults.length > 0 && !state.result && (
          <div className="mt-20 no-print">
            <div className="flex flex-col space-y-6 mb-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-2xl font-bold text-emerald-950 dark:text-emerald-50 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-700 rounded-xl flex items-center justify-center text-white">📖</div>
                  {isEn ? 'Library' : 'Perpustakaan'}
                </h3>
                
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
                    <div key={idx} className="bg-white dark:bg-emerald-900/40 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 shadow-sm relative group transition-all hover:shadow-md">
                      <div className="absolute top-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => startEditing(actualIdx)} className="text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:underline">{isEn ? 'Edit' : 'Ubah'}</button>
                        <button onClick={() => setDeleteConfirmIndex(actualIdx)} className="text-red-500 font-bold text-xs hover:underline">{isEn ? 'Delete' : 'Hapus'}</button>
                      </div>

                      <div className="cursor-pointer" onClick={() => !isEditing && setState({ ...state, result: saved })}>
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
          </div>
        )}
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
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
          <a 
            href="https://smartfaith.streamlit.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-all"
            title={isEn ? "Visit SmartFaith (Mother App)" : "Kunjungi SmartFaith (Aplikasi Induk)"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </a>
          <a 
            href="https://github.com/mrbrightsides" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-all"
            title={isEn ? "Visit Developer Profile" : "Kunjungi Profil Pengembang"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;
