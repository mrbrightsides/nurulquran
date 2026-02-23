# Nur Al-Quran Finder 📖✨

Nur Al-Quran Finder is a sophisticated digital companion designed to help believers and seekers identify the exact source of Quranic verses and Prophetic Hadiths. Powered by Google's Gemini AI, it bridges the gap between memory and the divine text through text, audio, and video analysis.

---

## 🌟 Key Features

### 🔍 Smart Identification
- **Text Search**: Enter partial snippets, keywords, or phonetic transliterations (e.g., "Inna a'taina").
- **Media Analysis**: Upload audio recordings or video clips of recitations to identify the source.
- **Voice Recording**: Record yourself or a recitation directly within the app for instant identification.

### 🖼️ Share Card Generator
- **Social Media Ready**: Generate high-quality 9:16 aspect ratio images optimized for TikTok, Instagram Reels, and WhatsApp Status.
- **Automatic Decoration**: Includes seasonal "Ramadan Kareem" ornaments and elegant Islamic geometric patterns.
- **High-Quality Typography**: Features the elegant *Amiri* font for Arabic calligraphy and clean *Inter* font for translations.
- **One-Click Download**: Instantly save your findings as beautiful PNG images.

### ☀️ Daily Wisdom
- Receive a curated "Daily Wisdom" from the Al-Quran or Hadith every day.
- Bilingual insights in both English and Indonesian.
- One-click access to full details and context.

### 📚 Personal Library
- **Save Findings**: Build your personal collection of identified verses and hadiths.
- **Categorization**: Organize your library into custom collections (e.g., "Ramadan", "Daily Prayers").
- **Reflections**: Add your own personal notes and reflections to each entry.
- **Advanced Filtering**: Search and filter your library by category, date, or AI confidence score.

### 🎨 Premium User Experience
- **Bilingual Interface**: Seamlessly switch between English and Indonesian (Bahasa Indonesia).
- **Dark Mode**: A beautiful, eye-friendly dark theme for nightly reflections.
- **Interactive Tour**: A guided walkthrough for new users to master all features.
- **Customizable View**: Adjust Arabic font sizes, translation text sizes, and auto-scroll speeds for comfortable reading.
- **Highlighting**: Search for specific terms within the results to highlight them instantly.

---

## 🛠️ Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS (Modern, responsive, and "crafted" design)
- **AI Engine**: Google Gemini 3.1 Pro (via `@google/genai`)
- **Icons**: Lucide React
- **Animations**: Motion (formerly Framer Motion)
- **Image Generation**: html2canvas
- **State Management**: React Hooks (useState, useEffect, useRef)
- **Storage**: LocalStorage for persistent library and settings

---

## 🧠 How It Works

Nur Al-Quran Finder leverages the reasoning capabilities of **Gemini AI** to analyze inputs. 

1. **Input Processing**: Whether it's text or a media file, the app sends the data to the Gemini 3.1 Pro model.
2. **Contextual Analysis**: The AI compares the input against a vast knowledge base of Islamic texts.
3. **Structured Output**: The model returns a structured JSON response containing:
   - Source Type (Quran/Hadith)
   - Title (Surah name or Hadith collection)
   - Reference (Verse/Hadith number)
   - Original Arabic (with diacritics)
   - Bilingual Translations & Context
   - AI Confidence Score
4. **User Interaction**: Users can then reflect, save, share, or print the findings.

---

## 📖 Credits & Sources

- **Quranic Text**: Sourced via the [Tanzil Project](http://tanzil.net).
- **Hadith Database**: Inspired by and verified against [Sunnah.com](https://sunnah.com).
- **AI Technology**: Powered by [Google Gemini AI](https://ai.google.dev).
- **Developer**: [Telegram](https://t.me/khudriakhmad).
- **Changelog**: See [Log.md](Log.md) for detailed update history.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*“Read, for thy Lord is the Most Generous” (Al-Alaq: 3)*
