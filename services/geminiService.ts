
import { GoogleGenAI, Type } from "@google/genai";
import { IdentificationResult, RelatedContent } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const callGeminiWithRetry = async (params: any, retries = 2, delay = 1000): Promise<any> => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent(params);
      
      // Check if text exists and is not empty
      if (response && response.text && response.text.trim()) {
        return response;
      }
      
      // Check for safety blocks
      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        throw new Error("AI response blocked by safety filters. Please try a different query.");
      }
      
      throw new Error("Empty response from AI");
    } catch (error: any) {
      lastError = error;
      const is503 = error.message?.includes("503") || error.message?.includes("UNAVAILABLE");
      const is429 = error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED");
      const isEmpty = error.message?.includes("Empty response from AI");
      
      if (is503 || is429 || isEmpty) {
        console.warn(`Gemini API issue (attempt ${i + 1}/${retries}): ${error.message}. Retrying in ${delay}ms...`);
        if (i < retries - 1) {
          await sleep(delay);
          delay *= 2; // Exponential backoff
          continue;
        }
      }
      throw error; // Don't retry for safety blocks or other fatal errors
    }
  }
  throw lastError;
};

export const identifyContent = async (
  input: string | { data: string; mimeType: string },
  isText: boolean
): Promise<IdentificationResult> => {
  let model = 'gemini-3-flash-preview';
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: 'Type: QURAN, HADITH, or UNKNOWN',
      },
      title: {
        type: Type.STRING,
        description: 'Name of Surah or Hadith collection',
      },
      reference: {
        type: Type.STRING,
        description: 'Reference (e.g. 2:255)',
      },
      arabicText: {
        type: Type.STRING,
        description: 'Original Arabic with diacritics',
      },
      translation: {
        type: Type.STRING,
        description: 'English translation',
      },
      translationID: {
        type: Type.STRING,
        description: 'Indonesian translation (Bahasa Indonesia)',
      },
      transliteration: {
        type: Type.STRING,
        description: 'Phonetic transliteration in English characters',
      },
      context: {
        type: Type.STRING,
        description: 'English insight or context',
      },
      contextID: {
        type: Type.STRING,
        description: 'Indonesian insight or context (Bahasa Indonesia)',
      },
      asbabunNuzul: {
        type: Type.STRING,
        description: 'English Asbabun Nuzul (occasion of revelation) if applicable',
      },
      asbabunNuzulID: {
        type: Type.STRING,
        description: 'Indonesian Asbabun Nuzul (Sebab Turunnya Ayat) if applicable (Bahasa Indonesia)',
      },
      confidence: {
        type: Type.NUMBER,
        description: 'Confidence score (0-1)',
      },
      matchedArabicSegment: {
        type: Type.STRING,
        description: 'Specific matched Arabic phrase',
      }
    },
    required: ['type', 'title', 'reference', 'arabicText', 'translation', 'translationID', 'transliteration', 'confidence'],
  };

  const systemInstruction = `You are an expert Islamic scholar. 
    Task: Identify the source of the input.
    MANDATORY BILINGUAL REQUIREMENT: 
    - Provide 'translation' in English.
    - Provide 'translationID' in Indonesian (Bahasa Indonesia).
    - Provide 'context' in English.
    - Provide 'contextID' in Indonesian (Bahasa Indonesia).
    - Provide 'asbabunNuzul' in English (if applicable).
    - Provide 'asbabunNuzulID' in Indonesian (if applicable).
    Ensure the translations are high-quality and standard for Al-Quran and Hadith in both languages.`;

  const contents = isText 
    ? { parts: [{ text: `Identify this: "${input as string}"` }] }
    : {
        parts: [
          { inlineData: input as { data: string; mimeType: string } },
          { text: "Analyze this media and identify the Islamic text mentioned. Provide translations in both English and Indonesian." }
        ]
      };

  try {
    const response = await callGeminiWithRetry({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2,
      },
    });

    const result = JSON.parse(response.text.trim()) as IdentificationResult;
    return result;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("API Key issue: Please try selecting your API key again using the key icon in the header.");
    }
    if (error.message?.includes("503") || error.message?.includes("UNAVAILABLE")) {
      throw new Error("The AI service is currently overloaded. Please wait a moment and try again.");
    }
    throw new Error(error.message || "An unexpected error occurred.");
  }
};

export const getDailyWisdom = async (date: string, refresh = false): Promise<IdentificationResult> => {
  let model = 'gemini-3-flash-preview';
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING },
      title: { type: Type.STRING },
      reference: { type: Type.STRING },
      arabicText: { type: Type.STRING },
      translation: { type: Type.STRING },
      translationID: { type: Type.STRING },
      transliteration: { type: Type.STRING },
      context: { type: Type.STRING },
      contextID: { type: Type.STRING },
      asbabunNuzul: { type: Type.STRING },
      asbabunNuzulID: { type: Type.STRING },
      confidence: { type: Type.NUMBER },
    },
    required: ['type', 'title', 'reference', 'arabicText', 'translation', 'translationID', 'transliteration', 'confidence'],
  };

  const systemInstruction = `You are an expert Islamic scholar. 
    Task: Provide a ${refresh ? 'new and different' : 'curated'} "Daily Wisdom" from the Al-Quran or Hadith for the date: ${date}.
    MANDATORY BILINGUAL REQUIREMENT: 
    - Provide 'translation' in English.
    - Provide 'translationID' in Indonesian (Bahasa Indonesia).
    - Provide 'context' in English.
    - Provide 'contextID' in Indonesian (Bahasa Indonesia).
    - Provide 'asbabunNuzul' in English (if applicable).
    - Provide 'asbabunNuzulID' in Indonesian (if applicable).
    Ensure the translations are high-quality and standard. The content should be inspiring and relevant for a daily reflection.`;

  try {
    const response = await callGeminiWithRetry({
      model,
      contents: "Generate today's wisdom.",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.7,
      },
    });

    const result = JSON.parse(response.text.trim()) as IdentificationResult;
    return result;
  } catch (error: any) {
    console.error("Gemini Daily Wisdom Error:", error);
    throw new Error("Failed to fetch daily wisdom.");
  }
};

export const getRelatedContent = async (
  currentResult: IdentificationResult
): Promise<RelatedContent[]> => {
  let model = 'gemini-3-flash-preview';
  
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        reference: { type: Type.STRING },
        arabicText: { type: Type.STRING },
        translation: { type: Type.STRING },
        translationID: { type: Type.STRING },
        transliteration: { type: Type.STRING },
        asbabunNuzul: { type: Type.STRING },
        asbabunNuzulID: { type: Type.STRING },
      },
      required: ['title', 'reference', 'arabicText', 'translation', 'translationID', 'transliteration'],
    }
  };

  const systemInstruction = `You are an expert Islamic scholar. 
    Task: Provide 3 related verses or hadiths based on the following content:
    Title: ${currentResult.title}
    Reference: ${currentResult.reference}
    Arabic: ${currentResult.arabicText}
    Translation: ${currentResult.translation}
    
    The related content should share similar themes, keywords, or contextual meaning.
    MANDATORY BILINGUAL REQUIREMENT: 
    - Provide 'translation' in English.
    - Provide 'translationID' in Indonesian (Bahasa Indonesia).
    - Provide 'asbabunNuzul' in English (if applicable).
    - Provide 'asbabunNuzulID' in Indonesian (if applicable).
    Ensure the translations are high-quality and standard.`;

  try {
    const response = await callGeminiWithRetry({
      model,
      contents: "Find related verses or hadiths.",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.5,
      },
    });

    const result = JSON.parse(response.text.trim()) as RelatedContent[];
    return result;
  } catch (error: any) {
    console.error("Gemini Related Content Error:", error);
    return [];
  }
};
