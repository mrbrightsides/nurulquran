
import React from 'react';

interface HeaderProps {
  startTour: () => void;
  onShowAbout: () => void;
  lang: 'en' | 'id';
  setLang: (lang: 'en' | 'id') => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ startTour, onShowAbout, lang, setLang, darkMode, setDarkMode }) => {
  const isEn = lang === 'en';
  
  return (
    <header className="text-center pt-8 pb-16 px-4 relative max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 mb-12 no-print">
        <button 
          onClick={onShowAbout}
          className="p-3 rounded-2xl bg-white dark:bg-emerald-900 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-sm hover:shadow-md hover:bg-emerald-50 dark:hover:bg-emerald-800 transition-all"
          title={isEn ? "About Nur Al-Quran Finder" : "Tentang Nur Al-Quran Finder"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-3 rounded-2xl bg-white dark:bg-emerald-900 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-sm hover:shadow-md transition-all"
          title={isEn ? "Toggle Dark Mode" : "Ganti Mode Gelap"}
        >
          {darkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <div className="flex bg-white dark:bg-emerald-900 rounded-xl p-1 border border-emerald-100 dark:border-emerald-800 shadow-sm overflow-hidden">
          <button 
            onClick={() => setLang('en')}
            className={`px-3 py-1 text-[10px] font-black uppercase transition-all rounded-lg ${isEn ? 'bg-emerald-700 text-white shadow-md' : 'text-emerald-300 hover:text-emerald-500'}`}
            title={isEn ? "Switch to English" : "Ganti ke Bahasa Inggris"}
          >
            EN
          </button>
          <button 
            onClick={() => setLang('id')}
            className={`px-3 py-1 text-[10px] font-black uppercase transition-all rounded-lg ${!isEn ? 'bg-emerald-700 text-white shadow-md' : 'text-emerald-300 hover:text-emerald-500'}`}
            title={isEn ? "Switch to Indonesian" : "Ganti ke Bahasa Indonesia"}
          >
            ID
          </button>
        </div>
        
        <button 
          onClick={startTour}
          className="p-3 rounded-2xl bg-white dark:bg-emerald-900 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-sm hover:shadow-md hover:bg-emerald-50 dark:hover:bg-emerald-800 transition-all"
          title={isEn ? "Start Interactive Tour" : "Mulai Tur Interaktif"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.442 1.104m-1.01 5.105h.01m0 0h.01m-10.104 0h.01m10.104 0h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
      
      <div className="relative inline-block mb-8">
        <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20"></div>
        <div className="relative p-6 bg-emerald-700 rounded-[2.5rem] shadow-xl shadow-emerald-900/20 border-4 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      </div>
      
      <h1 className={`text-5xl md:text-6xl font-black mb-4 font-serif tracking-tight ${darkMode ? 'text-white' : 'text-emerald-950'}`}>
        Nur Al-Quran <span className={`transition-colors duration-300 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Finder</span>
      </h1>
      
      <p className="text-emerald-700 max-w-xl mx-auto text-xl italic font-medium leading-relaxed mb-6">
        {isEn ? '"Read, for thy Lord is the Most Generous"' : '"Bacalah, dan Tuhanmulah Yang Maha Mulia"'}
      </p>
      
      <div className="flex justify-center items-center gap-4">
        <div className="h-[2px] w-16 bg-emerald-100"></div>
        <div className="px-6 py-2 bg-emerald-800 text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-lg shadow-emerald-900/10">
          Ramadan Kareem
        </div>
        <div className="h-[2px] w-16 bg-emerald-100"></div>
      </div>
    </header>
  );
};

export default Header;
