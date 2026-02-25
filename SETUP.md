# Setup Guide - Nur Al-Quran

Follow these steps to get the project running locally on your machine.

## Prerequisites

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher
- **Gemini API Key**: You will need a Google Gemini API key. Get one at [aistudio.google.com](https://aistudio.google.com/).

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mrbrightsides/nurulquran.git
   cd nurulquran
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   API_KEY=your_gemini_api_key_here
   ```

## Running the Application

### Development Mode
To start the development server with hot-reloading:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### Production Build
To create an optimized production build:
```bash
npm run build
```

### Preview Production Build
To preview the build locally:
```bash
npm run preview
```

## Deployment

The application is optimized for deployment on platforms like Vercel or Netlify.
Live version: [nurulquran.vercel.app](https://nurulquran.vercel.app/)
