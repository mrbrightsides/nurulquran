
export enum SourceType {
  QURAN = 'QURAN',
  HADITH = 'HADITH',
  UNKNOWN = 'UNKNOWN'
}

export interface AlternativeResult {
  title: string;
  reference: string;
  arabicText: string;
  translation: string;
  translationID: string; // Indonesian Translation
  transliteration: string;
}

export interface RelatedContent {
  title: string;
  reference: string;
  arabicText: string;
  translation: string;
  translationID: string;
  transliteration: string;
  asbabunNuzul?: string;
  asbabunNuzulID?: string;
}

export interface IdentificationResult {
  type: SourceType;
  title: string; // Surah Name or Hadith Book
  reference: string; // Ayat number or Hadith number
  arabicText: string;
  translation: string; // English
  translationID: string; // Indonesian
  transliteration: string; 
  context?: string; // English context
  contextID?: string; // Indonesian context
  asbabunNuzul?: string; // English Asbabun Nuzul
  asbabunNuzulID?: string; // Indonesian Asbabun Nuzul
  tafsir?: string; // English Tafsir summary
  tafsirID?: string; // Indonesian Tafsir summary
  confidence: number;
  timestamp: number;
  matchedArabicSegment?: string; 
  alternatives?: AlternativeResult[]; 
  userNote?: string; 
  userCategory?: string; 
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export interface AppState {
  isAnalyzing: boolean;
  result: IdentificationResult | null;
  error: string | null;
}
