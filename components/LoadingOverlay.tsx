
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  lang: 'en' | 'id';
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, lang }) => {
  const isEn = lang === 'en';
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-emerald-950/40 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-24 h-24 bg-emerald-700 rounded-[2rem] flex items-center justify-center shadow-2xl border-4 border-white"
              >
                <BookOpen className="h-12 w-12 text-white" />
              </motion.div>
              
              {/* Subtle pulse rings */}
              <motion.div
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-emerald-400 rounded-[2rem] -z-10"
              />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-white tracking-tight">
                {isEn ? "Consulting the Source..." : "Sedang mencari di Al-Quran..."}
              </h3>
              <p className="text-emerald-200 text-sm font-medium italic animate-pulse">
                {isEn ? "Seeking wisdom for you" : "Mencari hikmah untuk Anda"}
              </p>
            </div>
            
            {/* Minimal progress bar */}
            <div className="w-48 h-1 bg-emerald-900/50 rounded-full overflow-hidden">
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-1/2 h-full bg-emerald-400 rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay;
