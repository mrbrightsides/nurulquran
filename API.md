# API Documentation - Nur Al-Quran

Nur Al-Quran is a client-side application that integrates directly with the **Google Gemini API** to provide AI-powered identification and insights.

## AI Integration

The application uses the `@google/genai` SDK to communicate with Gemini models.

### Primary Model
- **Model**: `gemini-3-flash-preview`
- **Purpose**: High-speed identification, translation, and contextual analysis.
- **Fallback**: Automatically falls back to `gemini-3.1-pro-preview` if Flash is unavailable.

## Core Services

### 1. Content Identification
`identifyContent(input: string | Media, isText: boolean)`
- **Input**: Text string or Base64 audio/image data.
- **Output**: `IdentificationResult` object.
- **Logic**: Analyzes the input to determine if it's a Quranic verse or Hadith, providing bilingual translations and context.

### 2. Daily Wisdom
`getDailyWisdom(date: string, refresh: boolean)`
- **Input**: Current ISO date string.
- **Output**: `IdentificationResult` object.
- **Logic**: Generates an inspiring daily verse or hadith. Supports a `refresh` flag to force a new generation.

### 3. Related Content
`getRelatedContent(currentResult: IdentificationResult)`
- **Input**: The result of a successful identification.
- **Output**: Array of `RelatedContent` objects.
- **Logic**: Finds 3 verses or hadiths that share similar themes or keywords.

## Data Structures

### IdentificationResult
```typescript
interface IdentificationResult {
  type: 'QURAN' | 'HADITH' | 'UNKNOWN';
  title: string;        // Surah name or Hadith collection
  reference: string;    // Ayat or Hadith number
  arabicText: string;   // Original Arabic with diacritics
  translation: string;  // English
  translationID: string; // Indonesian
  transliteration: string;
  context?: string;
  contextID?: string;
  asbabunNuzul?: string;
  asbabunNuzulID?: string;
  confidence: number;
}
```

### RelatedContent
```typescript
interface RelatedContent {
  title: string;
  reference: string;
  arabicText: string;
  translation: string;
  translationID: string;
  transliteration: string;
}
```

## Error Handling

The API service includes:
- **Exponential Backoff**: Retries failed requests (503/429) with increasing delays.
- **Safety Filtering**: Handles cases where the AI blocks a response due to safety policies.
- **Empty Response Guard**: Validates that the AI returned a valid JSON structure before parsing.
