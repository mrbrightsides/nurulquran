
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
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
      
      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;
      
      console.warn(`Gemini API returned empty text. Finish Reason: ${finishReason}. Response:`, JSON.stringify(response, null, 2));
      
      // Check for safety blocks
      if (finishReason === 'SAFETY') {
        throw new Error("AI response blocked by safety filters. This can happen with sensitive topics. Please try rephrasing your query.");
      }
      
      if (finishReason === 'RECITATION') {
        throw new Error("AI response blocked due to recitation detection. Please try a different query.");
      }

      if (finishReason === 'OTHER') {
        throw new Error("AI response blocked for an unknown reason. Please try again.");
      }
      
      throw new Error(`Empty response from AI (Finish Reason: ${finishReason || 'UNKNOWN'})`);
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
  let model = 'gemini-3.1-pro-preview';
  
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
      tafsirIbnuKatsirID: {
        type: Type.STRING,
        description: 'Indonesian Tafsir Ibnu Katsir (Bahasa Indonesia)',
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

  const systemInstruction = `You are an expert Islamic scholar and mufassir. 
    Task: Identify the source of the input (Quranic verse or Hadith).
    
    MANDATORY BILINGUAL REQUIREMENT: 
    - Provide 'translation' in English.
    - Provide 'translationID' in Indonesian (Bahasa Indonesia).
    - Provide 'context' in English (General context/insight).
    - Provide 'contextID' in Indonesian (Bahasa Indonesia).
    - Provide 'asbabunNuzul' in English. If it's a Quranic verse, search for its specific occasion of revelation (Asbabun Nuzul). If it's a Hadith, provide the 'Sababul Wurud' (reason for the Hadith).
    - Provide 'asbabunNuzulID' in Indonesian (Bahasa Indonesia).
    - Provide 'tafsirIbnuKatsirID' in Indonesian (Bahasa Indonesia) specifically from the classical Tafsir Ibnu Katsir.
    
    CRITICAL: For Quranic verses, you MUST provide 'asbabunNuzul' and 'asbabunNuzulID' if they exist in standard Islamic scholarship (e.g., Wahidi, Suyuti). Do not skip this if the verse has a known historical context.
    
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

    const text = response.text.trim();
    if (!text) throw new Error("Empty response text");

    const result = JSON.parse(text) as IdentificationResult;
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
  let model = 'gemini-3.1-pro-preview';
  
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
      tafsirIbnuKatsirID: { type: Type.STRING },
      confidence: { type: Type.NUMBER },
    },
    required: ['type', 'title', 'reference', 'arabicText', 'translation', 'translationID', 'transliteration', 'confidence'],
  };

  const themes = ['Compassion', 'Perseverance', 'Gratitude', 'Wisdom', 'Kindness', 'Faith', 'Honesty', 'Humility', 'Moderation', 'Justice', 'Purity', 'Sincerity', 'Service', 'Knowledge'];
  const dayIndex = new Date(date).getDate(); 
  
  const attemptRequest = async (themeToUse: string, isRetry = false): Promise<IdentificationResult> => {
    const systemInstruction = `You are an expert Islamic scholar and mufassir. 
      Task: Select a specific verse from the Holy Al-Quran or a Sahih Hadith for daily reflection. 
      Current Date: ${date}
      Focus Theme: ${themeToUse}
      
      Instructions:
      1. Use a single short verse or hadith to avoid triggering recitation filters.
      2. Provide detailed context and insight in both English and Indonesian.
      3. ${isRetry ? 'Select a less common verse to ensure variety and avoid safety filters.' : 'Ensure high quality reflecton content.'}
      
      MANDATORY BILINGUAL REQUIREMENT: 
      - Provide 'translation' in English.
      - Provide 'translationID' in Indonesian (Bahasa Indonesia).
      - Provide 'asbabunNuzul' in English.
      - Provide 'asbabunNuzulID' in Indonesian.
      - Provide 'tafsirIbnuKatsirID' in Indonesian.
      
      Ensure 'translationID' follows standard Kemenag (Indonesian Ministry of Religious Affairs) formatting.`;

    const response = await callGeminiWithRetry({
      model,
      contents: {
        parts: [{ text: `Provide a specific daily wisdom about ${themeToUse} for the date ${date}. ${refresh ? 'Suggest something unique.' : ''}` }]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8,
      },
    });

    const text = response.text.trim();
    if (!text) throw new Error("Empty response text");
    return JSON.parse(text) as IdentificationResult;
  };

  try {
    const initialTheme = themes[dayIndex % themes.length];
    return await attemptRequest(initialTheme);
  } catch (error: any) {
    if (error.message.includes("recitation") || error.message.includes("safety")) {
      console.warn("Retrying daily wisdom with alternative theme due to safety/recitation block...");
      try {
        const fallbackTheme = themes[(dayIndex + 3) % themes.length];
        return await attemptRequest(fallbackTheme, true);
      } catch (retryError: any) {
        throw new Error(retryError.message || "Failed to fetch daily wisdom after retry.");
      }
    }
    console.error("Gemini Daily Wisdom Error:", error);
    throw new Error(error.message || "Failed to fetch daily wisdom.");
  }
}

export const getRelatedContent = async (
  currentResult: IdentificationResult
): Promise<RelatedContent[]> => {
  let model = 'gemini-3.1-pro-preview';
  
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
        tafsirIbnuKatsirID: { type: Type.STRING },
      },
      required: ['title', 'reference', 'arabicText', 'translation', 'translationID', 'transliteration'],
    }
  };

  const systemInstruction = `You are an expert Islamic scholar and mufassir. 
    Task: Provide 3 related verses or hadiths based on the following content:
    Title: ${currentResult.title}
    Reference: ${currentResult.reference}
    Arabic: ${currentResult.arabicText}
    Translation: ${currentResult.translation}
    
    The related content should share similar themes, keywords, or contextual meaning.
    MANDATORY BILINGUAL REQUIREMENT: 
    - Provide 'translation' in English.
    - Provide 'translationID' in Indonesian (Bahasa Indonesia).
    - Provide 'asbabunNuzul' in English (Occasion of revelation for Quran or Sababul Wurud for Hadith).
    - Provide 'asbabunNuzulID' in Indonesian (Bahasa Indonesia).
    - Provide 'tafsirIbnuKatsirID' in Indonesian (Bahasa Indonesia) specifically from the classical Tafsir Ibnu Katsir.
    
    Ensure the connections are meaningful and scholarly.`;

  try {
    const response = await callGeminiWithRetry({
      model,
      contents: {
        parts: [{ 
          text: `Find 3 related verses or hadiths for the following content. Ensure they are relevant and provide meaningful connections.
          
          Content to match:
          Title: ${currentResult.title}
          Reference: ${currentResult.reference}
          Arabic: ${currentResult.arabicText}
          Translation: ${currentResult.translation}` 
        }]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.7, // Slightly higher temperature for more variety in related content
      },
    });

    const text = response.text.trim();
    if (!text) throw new Error("Empty response text");
    
    const result = JSON.parse(text) as RelatedContent[];
    return result;
  } catch (error: any) {
    console.error("Gemini Related Content Error:", error);
    return [];
  }
};
