
import React, { useState, useEffect, useRef } from 'react';
import { Share2, Copy, Check, Printer, Play, Pause, Bookmark, X, Link, MessageSquare, BookOpen } from 'lucide-react';
import { IdentificationResult, SourceType, RelatedContent } from '../types';
import { getRelatedContent } from '../services/geminiService';

interface ResultDisplayProps {
  result: IdentificationResult;
  onSave?: (result: IdentificationResult) => void;
  lang: 'en' | 'id';
  arabicFontSize?: number;
  translationFontSize?: number;
  highlightTerm?: string;
  autoScrollSpeed?: number;
  audioUrl?: string;
  onViewRelated?: (item: RelatedContent) => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
  result, 
  onSave, 
  lang,
  arabicFontSize = 48,
  translationFontSize = 18,
  highlightTerm = '',
  autoScrollSpeed = 0,
  audioUrl,
  onViewRelated
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isTranslationCopied, setIsTranslationCopied] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [userNote, setUserNote] = useState(result.userNote || '');
  const [userCategory, setUserCategory] = useState(result.userCategory || '');
  const [isEditingSaveInfo, setIsEditingSaveInfo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [relatedContent, setRelatedContent] = useState<RelatedContent[]>([]);
  const [isFetchingRelated, setIsFetchingRelated] = useState(false);
  
  const arabicRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isEn = lang === 'en';
  const isQuran = result.type === SourceType.QURAN;

  useEffect(() => {
    if (autoScrollSpeed > 0 && arabicRef.current) {
      const interval = window.setInterval(() => {
        if (arabicRef.current) {
          arabicRef.current.scrollTop += 1;
          if (arabicRef.current.scrollTop + arabicRef.current.clientHeight >= arabicRef.current.scrollHeight) {
            arabicRef.current.scrollTop = 0;
          }
        }
      }, 101 - autoScrollSpeed);
      scrollIntervalRef.current = interval;
    } else {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    }
    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [autoScrollSpeed]);

  useEffect(() => {
    const fetchRelated = async () => {
      setIsFetchingRelated(true);
      try {
        const related = await getRelatedContent(result);
        setRelatedContent(related);
      } catch (err) {
        console.error(err);
      } finally {
        setIsFetchingRelated(false);
      }
    };
    fetchRelated();
  }, [result]);

  const highlightText = (text: string, term: string) => {
    if (!term.trim()) return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === term.toLowerCase() ? (
            <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 rounded px-1">{part}</mark>
          ) : part
        )}
      </>
    );
  };

  const handleShare = async () => {
    const translationText = isEn ? result.translation : result.translationID;
    let shareText = `Nur Al-Quran Finder:\n\n${result.title} (${result.reference})\nArabic: ${result.arabicText}\nTranslation: "${translationText}"\n\nShared via Nur Al-Quran Finder`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Finding: ${result.title}`, text: shareText, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        setIsShareCopied(true);
        setTimeout(() => setIsShareCopied(false), 2000);
      }
    } catch (err) { console.error("Share failed", err); }
  };

  const handleCopyArabic = async () => {
    try {
      await navigator.clipboard.writeText(result.arabicText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) { console.error("Copy failed", err); }
  };

  const handleCopyTranslation = async () => {
    try {
      const text = isEn ? result.translation : result.translationID;
      await navigator.clipboard.writeText(text);
      setIsTranslationCopied(true);
      setTimeout(() => setIsTranslationCopied(false), 2000);
    } catch (err) { console.error("Copy failed", err); }
  };

  const handleSaveResult = () => {
    if (onSave) {
      onSave({ ...result, userNote: userNote.trim() || undefined, userCategory: userCategory.trim() || undefined });
      setIsSaved(true); setIsEditingSaveInfo(false);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-12 space-y-10">
      <div className="bg-white dark:bg-emerald-900/80 rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-emerald-50 dark:border-emerald-800 backdrop-blur-md">
        <div className="bg-emerald-950 text-white p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-800 opacity-5 rounded-full translate-x-24 translate-y-24 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-900/40 px-3 py-1 rounded-full">
                {isQuran ? (isEn ? 'Holy Al-Quran' : 'Al-Qur\'anul Karim') : (isEn ? 'Prophetic Hadith' : 'Hadits Nabi')}
              </span>
            </div>
            <h2 className="text-4xl font-black tracking-tight">{result.title}</h2>
            <p className="text-emerald-400 font-bold text-lg mt-1 italic">{result.reference}</p>
          </div>

          <div className="flex flex-col gap-4 w-full md:w-auto no-print relative z-10">
            {audioUrl && (
              <div className="flex items-center gap-3 bg-emerald-800/40 p-3 rounded-2xl border border-emerald-700/50">
                <button 
                  onClick={toggleAudio}
                  className="w-10 h-10 flex items-center justify-center bg-emerald-400 text-emerald-950 rounded-full hover:bg-emerald-300 transition-all shadow-md"
                >
                  {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
                </button>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">{isEn ? 'Input Audio' : 'Audio Input'}</span>
                  <span className="text-[10px] font-bold text-white">{isEn ? 'Recorded Clip' : 'Klip Rekaman'}</span>
                </div>
                <audio 
                  ref={audioRef} 
                  src={audioUrl} 
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
            )}

            <button 
              onClick={handleShare}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg ${isShareCopied ? 'bg-emerald-500 text-white' : 'bg-emerald-700 hover:bg-emerald-600 text-white'}`}
              title={isEn ? "Share this finding" : "Bagikan temuan ini"}
            >
              {isShareCopied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
              {isShareCopied ? (isEn ? 'Copied!' : 'Tersalin!') : (isEn ? 'Share' : 'Bagikan')}
            </button>

            <div className="w-full md:w-56 bg-emerald-900/50 p-5 rounded-3xl border border-emerald-800/50">
              <div className="flex justify-between items-end mb-2">
                 <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">{isEn ? 'Confidence' : 'Keyakinan'}</span>
                 <span className="text-[10px] font-black">{(result.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 bg-emerald-950 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${result.confidence * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-12">
          <div className="relative">
            <div className="flex justify-between items-center mb-6 no-print">
               <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">{isEn ? 'Original Arabic' : 'Bahasa Arab'}</span>
               <div className="flex gap-2">
                 <button onClick={handleCopyArabic} className={`flex items-center gap-2 px-6 py-2 rounded-2xl text-[10px] font-black uppercase transition-all border shadow-sm ${isCopied ? 'bg-emerald-700 text-white' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800 border-emerald-100 dark:border-emerald-700 hover:bg-white dark:hover:bg-emerald-700'}`}>
                   {isCopied ? (isEn ? 'Arabic Copied' : 'Arab Tersalin') : (isEn ? 'Copy Arabic' : 'Salin Arab')}
                 </button>
                 <button onClick={handleCopyTranslation} className={`flex items-center gap-2 px-6 py-2 rounded-2xl text-[10px] font-black uppercase transition-all border shadow-sm ${isTranslationCopied ? 'bg-emerald-700 text-white' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-800 border-emerald-100 dark:border-emerald-700 hover:bg-white dark:hover:bg-emerald-700'}`}>
                   {isTranslationCopied ? (isEn ? 'Translation Copied' : 'Terjemahan Tersalin') : (isEn ? 'Copy Translation' : 'Salin Terjemahan')}
                 </button>
               </div>
            </div>
            <div 
              ref={arabicRef}
              className="text-right p-8 rounded-[2rem] bg-emerald-50/20 dark:bg-black/40 border border-emerald-50 dark:border-emerald-800 max-h-[400px] overflow-y-auto scroll-smooth" 
              dir="rtl"
            >
              <p className="font-arabic leading-[1.8] text-emerald-950 dark:text-emerald-50" style={{ fontSize: `${arabicFontSize}px` }}>
                {highlightText(result.arabicText, highlightTerm)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-emerald-800/30 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <h3 className="text-[9px] font-black text-emerald-500 uppercase mb-4 tracking-[0.2em]">{isEn ? 'Pronunciation' : 'Pelafalan'}</h3>
              <p className="text-emerald-900 dark:text-emerald-100 font-bold leading-relaxed" style={{ fontSize: `${translationFontSize}px` }}>
                {highlightText(result.transliteration, highlightTerm)}
              </p>
            </div>
            <div className="bg-emerald-50/20 dark:bg-black/30 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <h3 className="text-[9px] font-black text-emerald-500 uppercase mb-4 tracking-[0.2em]">{isEn ? 'Translation' : 'Terjemahan'}</h3>
              <p className="text-emerald-800 dark:text-emerald-200 italic font-medium leading-relaxed" style={{ fontSize: `${translationFontSize}px` }}>
                "{highlightText(isEn ? result.translation : result.translationID, highlightTerm)}"
              </p>
            </div>
          </div>

          {(isEn ? result.context : result.contextID) && (
            <div className="bg-emerald-950 text-white p-8 rounded-[2rem] border border-emerald-900 relative overflow-hidden">
              <h3 className="text-[9px] font-black text-emerald-400 uppercase mb-3 tracking-[0.2em]">{isEn ? 'Islamic Insight' : 'Wawasan Islami'}</h3>
              <p className="text-emerald-50 text-md font-medium leading-relaxed relative z-10">
                {highlightText(isEn ? result.context! : result.contextID!, highlightTerm)}
              </p>
            </div>
          )}

          {(isEn ? result.asbabunNuzul : result.asbabunNuzulID) && (
            <div className="bg-white dark:bg-emerald-800/10 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
              <h3 className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">{isEn ? 'Asbabun Nuzul / Occasion of Revelation' : 'Asbabun Nuzul / Sebab Turunnya'}</h3>
              <p className="text-emerald-800 dark:text-emerald-200 font-medium leading-relaxed">
                {highlightText(isEn ? result.asbabunNuzul! : result.asbabunNuzulID!, highlightTerm)}
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-emerald-800/10 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
            <h3 className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">{isEn ? 'My Reflections' : 'Refleksi Saya'}</h3>
            <textarea 
              value={userNote} 
              onChange={(e) => setUserNote(e.target.value)} 
              placeholder={isEn ? "Write your thoughts or reflections here..." : "Tulis pemikiran atau refleksi Anda di sini..."} 
              className="w-full p-6 rounded-2xl border-2 border-emerald-50 dark:border-emerald-800 bg-emerald-50/10 dark:bg-black/20 text-emerald-950 dark:text-emerald-50 font-medium outline-none text-md h-40 resize-none focus:border-emerald-500 transition-all"
              title={isEn ? "Add your personal notes" : "Tambah catatan pribadi Anda"}
            />
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Link className="h-4 w-4" />
              {isEn ? 'Related Wisdom' : 'Hikmah Terkait'}
            </h3>
            
            {isFetchingRelated ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-emerald-50 dark:bg-emerald-900/40 rounded-3xl animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedContent.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => onViewRelated && onViewRelated(item)}
                    className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-50 dark:border-emerald-800 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                  >
                    <p className="font-arabic text-right text-lg text-emerald-800 dark:text-emerald-100 leading-relaxed mb-3 line-clamp-2" dir="rtl">
                      {item.arabicText}
                    </p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-300 italic mb-2 line-clamp-2">
                      "{isEn ? item.translation : item.translationID}"
                    </p>
                    <div className="pt-2 border-t border-emerald-50 dark:border-emerald-800 flex justify-between items-center">
                      <span className="text-[8px] font-bold text-emerald-400">{item.title} • {item.reference}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isEditingSaveInfo && (
            <div className="bg-emerald-50 dark:bg-emerald-900/50 p-8 rounded-[2.5rem] border-2 border-emerald-100 dark:border-emerald-800 space-y-6">
              <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-widest">{isEn ? 'Add to Personal Library' : 'Simpan ke Perpustakaan'}</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-emerald-500 tracking-widest ml-1">{isEn ? 'Collection / Category' : 'Koleksi / Kategori'}</label>
                  <input type="text" value={userCategory} onChange={(e) => setUserCategory(e.target.value)} placeholder={isEn ? "e.g. Ramadan, Daily Prayer..." : "misal: Ramadan, Doa Harian..."} className="w-full p-4 rounded-2xl border-2 border-white dark:border-emerald-800 bg-white/80 dark:bg-emerald-900/80 text-emerald-950 dark:text-emerald-50 font-bold outline-none text-sm focus:border-emerald-500 transition-all" />
                </div>
                <div className="flex gap-4">
                  <button onClick={handleSaveResult} className="flex-1 bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-lg hover:bg-emerald-600 transition-all">{isEn ? 'Confirm Save' : 'Konfirmasi Simpan'}</button>
                  <button onClick={() => setIsEditingSaveInfo(false)} className="px-8 py-4 text-emerald-400 font-bold text-sm hover:text-emerald-600 transition-all">{isEn ? 'Cancel' : 'Batal'}</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-6 pt-8 border-t border-emerald-100 dark:border-emerald-800 no-print">
            <button 
              onClick={() => setIsEditingSaveInfo(!isEditingSaveInfo)} 
              className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isSaved ? 'bg-emerald-700 text-white' : 'bg-emerald-50 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-700'}`}
              title={isEn ? "Save this result to your library" : "Simpan hasil ini ke perpustakaan Anda"}
            >
              <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? (isEn ? 'Recorded' : 'Tersimpan') : (isEn ? 'Record Ayat' : 'Simpan Ayat')}
            </button>
            <button 
              onClick={handleShare} 
              className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isShareCopied ? 'bg-emerald-500 text-white' : 'bg-emerald-50 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-700'}`}
              title={isEn ? "Share this finding" : "Bagikan temuan ini"}
            >
              {isShareCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {isShareCopied ? (isEn ? 'Copied!' : 'Tersalin!') : (isEn ? 'Share' : 'Bagikan')}
            </button>
            <button 
              onClick={() => window.print()} 
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-700 font-black text-[10px] uppercase tracking-widest transition-all"
              title={isEn ? "Print this result" : "Cetak hasil ini"}
            >
              <Printer className="h-4 w-4" />
              {isEn ? 'Print' : 'Cetak'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;
