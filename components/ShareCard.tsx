import React from 'react';
import { BookOpen, Moon, Star } from 'lucide-react';
import { IdentificationResult, SourceType } from '../types';

interface ShareCardProps {
  result: IdentificationResult;
  isEn: boolean;
  cardRef: React.RefObject<HTMLDivElement | null>;
}

const ShareCard: React.FC<ShareCardProps> = ({ result, isEn, cardRef }) => {
  const isQuran = result.type === SourceType.QURAN;
  
  // Hex color constants for html2canvas compatibility (Tailwind 4 uses oklch which html2canvas fails to parse)
  const colors = {
    emerald950: '#022c22',
    emerald900: '#064e3b',
    emerald800: '#065f46',
    emerald700: '#047857',
    emerald600: '#059669',
    emerald500: '#10b981',
    emerald400: '#34d399',
    emerald300: '#6ee7b7',
    emerald100: '#d1fae5',
    emerald50: '#ecfdf5',
    white: '#ffffff',
  };

  return (
    <div className="fixed -left-[9999px] top-0 no-print">
      <div 
        ref={cardRef}
        className="w-[1080px] h-[1920px] flex flex-col items-center justify-between p-20 text-white relative overflow-hidden"
        style={{ 
          fontFamily: "'Inter', sans-serif",
          backgroundColor: colors.emerald950 
        }}
      >
        {/* Background Decorations */}
        <div 
          className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{ backgroundColor: `${colors.emerald800}33` }} // 20% opacity
        ></div>
        <div 
          className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] rounded-full blur-[150px]"
          style={{ backgroundColor: `${colors.emerald900}4D` }} // 30% opacity
        ></div>
        
        {/* Ramadan Kareem Ornaments */}
        <div className="absolute top-10 left-10 opacity-20">
          <Moon className="w-32 h-32" style={{ color: colors.emerald400 }} />
        </div>
        <div className="absolute top-20 right-20 opacity-10">
          <Star className="w-16 h-16" style={{ color: colors.emerald300 }} />
        </div>
        <div className="absolute bottom-40 left-20 opacity-10">
          <Star className="w-20 h-20" style={{ color: colors.emerald300 }} />
        </div>

        {/* Header / Logo */}
        <div className="flex flex-col items-center gap-6 z-10 mt-10">
          <div 
            className="p-8 rounded-[3rem] border-4 shadow-2xl"
            style={{ 
              backgroundColor: colors.emerald700,
              borderColor: 'rgba(255,255,255,0.2)'
            }}
          >
            <BookOpen className="w-24 h-24 text-white" />
          </div>
          <h1 
            className="text-5xl font-black tracking-tighter uppercase"
            style={{ color: colors.emerald100 }}
          >
            Nur Al-Quran Finder
          </h1>
          <div 
            className="h-1 w-32 rounded-full"
            style={{ backgroundColor: colors.emerald500 }}
          ></div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center w-full gap-16 z-10 px-10">
          {/* Arabic Text */}
          <div className="w-full text-center">
            <p 
              className="font-arabic text-7xl leading-[1.8] drop-shadow-lg" 
              dir="rtl"
              style={{ 
                fontFamily: "'Traditional Arabic', 'Amiri', serif",
                color: colors.emerald50
              }}
            >
              {result.arabicText}
            </p>
          </div>

          {/* Translation */}
          <div className="w-full text-center space-y-8">
            <div 
              className="h-[2px] w-24 mx-auto"
              style={{ backgroundColor: `${colors.emerald500}4D` }}
            ></div>
            <p 
              className="text-4xl font-medium leading-relaxed italic px-4"
              style={{ color: 'rgba(236, 253, 245, 0.9)' }}
            >
              "{isEn ? result.translation : result.translationID}"
            </p>
            <div 
              className="h-[2px] w-24 mx-auto"
              style={{ backgroundColor: `${colors.emerald500}4D` }}
            ></div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full flex flex-col items-center gap-8 z-10 mb-10">
          {/* Ramadan Kareem Seasonal Text */}
          <div 
            className="flex items-center gap-4 py-3 px-8 rounded-full border backdrop-blur-md"
            style={{ 
              backgroundColor: `${colors.emerald900}80`,
              borderColor: `${colors.emerald700}80`
            }}
          >
            <Moon className="w-6 h-6" style={{ color: colors.emerald400, fill: colors.emerald400 }} />
            <span 
              className="text-2xl font-black uppercase tracking-[0.3em]"
              style={{ color: colors.emerald400 }}
            >
              Ramadan Kareem
            </span>
            <Moon className="w-6 h-6 scale-x-[-1]" style={{ color: colors.emerald400, fill: colors.emerald400 }} />
          </div>

          <div className="flex flex-col items-center gap-2">
            <p 
              className="text-3xl font-black uppercase tracking-widest"
              style={{ color: colors.emerald400 }}
            >
              {result.title} • {result.reference}
            </p>
            <p 
              className="text-xl font-bold tracking-widest"
              style={{ color: colors.emerald600 }}
            >
              nurulquran.vercel.app
            </p>
          </div>
        </div>

        {/* Corner Ornaments (Geometric) */}
        <div className="absolute bottom-0 right-0 w-64 h-64 opacity-10 pointer-events-none">
           <svg viewBox="0 0 100 100" className="w-full h-full" style={{ fill: colors.emerald400 }}>
             <path d="M100 0 L100 100 L0 100 Q50 100 100 0" />
           </svg>
        </div>
        <div className="absolute top-0 left-0 w-64 h-64 opacity-10 pointer-events-none rotate-180">
           <svg viewBox="0 0 100 100" className="w-full h-full" style={{ fill: colors.emerald400 }}>
             <path d="M100 0 L100 100 L0 100 Q50 100 100 0" />
           </svg>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;
