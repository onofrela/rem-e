# Rem-E Integration Guide

This document describes the integrations added from `intento-3` and `vision-computadora` projects.

## Features Integrated

### 1. AI-Powered Ingredient Recognition (from vision-computadora)

The app now uses **Qwen VL** via LM Studio for real ingredient detection from photos.

**Location:** `lib/vision/`

**Files:**
- `lib/vision/foodRecognition.ts` - Core recognition logic
- `app/api/analyze-image/route.ts` - API endpoint for image analysis

**How it works:**
1. User takes a photo in `/cook`
2. Image is converted to base64
3. Sent to LM Studio's Qwen VL model
4. Model returns structured JSON with:
   - Ingredient name
   - Category
   - Estimated weight
   - Calories
   - Synonyms
   - Description

**Requirements:**
- LM Studio running locally on port 1234
- Qwen VL model loaded in LM Studio

---

### 2. Ingredient Database with IndexedDB (from vision-computadora)

Persistent local storage for ingredients with smart duplicate detection.

**Location:** `lib/db/`

**Files:**
- `lib/db/indexedDB.ts` - CRUD operations
- `lib/db/normalizer.ts` - Name normalization and fuzzy search
- `lib/db/synonyms.ts` - Spanish synonyms dictionary

**Features:**
- Automatic singular/plural normalization
- Accent-insensitive search
- Synonym support (e.g., "tomate" = "jitomate")
- Levenshtein distance for fuzzy matching
- Export/Import to JSON

---

### 3. Voice Navigation with Web Speech API

Voice control for navigating the app and controlling cooking steps.

**Location:** `lib/hooks/useVoiceNavigation.ts` + `components/voice/VoiceAssistant.tsx`

**Components:**

#### Frontend Voice Recognition
- `lib/hooks/useVoiceNavigation.ts` - Web Speech API hook
- `lib/hooks/useVoice.ts` - Simple voice commands hook
- `lib/voice/navigationCommands.ts` - Route mapping
- `components/voice/VoiceAssistant.tsx` - Floating widget

**How it works:**
1. Uses browser's native Web Speech API (Chrome, Edge, Safari)
2. Listens for wake word ("Rem-E")
3. Processes navigation commands locally
4. During cooking, responds to step commands without wake word

**Voice Commands:**
```
"Rem-E, ve a recetas"        → /recipes
"Rem-E, abre el inventario"  → /inventory
"Rem-E, ir a cocinar"        → /cook

During cooking (no wake word needed):
"siguiente"                   → Next step
"anterior"                    → Previous step
"repetir"                     → Repeat current step
"pausar"                      → Pause
"reanudar"                    → Resume
"timer 5 minutos"            → Start timer
```

**Browser Compatibility:**
- ✅ Chrome/Edge (full support)
- ✅ Safari (iOS/macOS)
- ❌ Firefox (limited support)

**Requirements:**
- Modern browser with Web Speech API
- Microphone access
- Internet connection (for speech recognition)

---

### 4. Text-to-Speech with Amazon Polly

Natural voice feedback during cooking with Amazon Polly TTS.

**Features:**
- High-quality voice synthesis
- Automatic step narration
- Fallback to browser TTS
- Cached audio for performance

**Files:**
- `lib/hooks/usePollyTTS.ts` - TTS hook
- `app/api/tts/route.ts` - Polly API endpoint

---

## Setup Instructions

### 1. Install Frontend Dependencies

```bash
cd rem-e
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# LM Studio (required for vision)
LM_STUDIO_API_URL=http://127.0.0.1:1234

# AWS Polly (optional, for TTS)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

### 3. Setup LM Studio

1. Download [LM Studio](https://lmstudio.ai/)
2. Download a vision model (Qwen VL recommended)
3. Start local server on port 1234

### 4. Start the App

```bash
npm run dev
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                     │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   /cook     │  │ VoiceWidget │  │   IndexedDB     │ │
│  │  (Vision)   │  │ (Floating)  │  │  (Ingredients)  │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
└─────────┼────────────────┼──────────────────┼──────────┘
          │                │                  │
          ▼                ▼                  │
┌─────────────────┐  ┌─────────────┐         │
│ /api/analyze-   │  │ Web Speech  │         │
│ image           │  │     API     │         │
└────────┬────────┘  └─────────────┘         │
         │                                    │
         ▼                                    │
┌─────────────────────────────────────┐      │
│         LM Studio (:1234)           │      │
│                                     │      │
│  ┌──────────┐                       │      │
│  │ Qwen VL  │                       │      │
│  │ (Vision) │                       │      │
│  └──────────┘                       │      │
└─────────────────────────────────────┘      │
                                             │
                     Browser                 │
                   (Context) ◄───────────────┘
```

---

## File Structure

```
rem-e/
├── app/
│   ├── api/
│   │   ├── analyze-image/route.ts    # Vision API
│   │   └── tts/route.ts              # TTS API
│   └── cook/page.tsx                  # Updated with real detection
│
├── components/
│   └── voice/
│       ├── VoiceAssistant.tsx        # Floating widget
│       └── index.ts
│
├── lib/
│   ├── db/                           # IndexedDB module
│   │   ├── indexedDB.ts
│   │   ├── normalizer.ts
│   │   ├── synonyms.ts
│   │   └── index.ts
│   │
│   ├── vision/                       # Vision module
│   │   ├── foodRecognition.ts
│   │   └── index.ts
│   │
│   ├── voice/                        # Voice module
│   │   ├── navigationCommands.ts
│   │   └── index.ts
│   │
│   └── hooks/
│       ├── useVoiceNavigation.ts     # Voice navigation hook
│       ├── useVoice.ts               # Basic voice hook
│       └── usePollyTTS.ts            # TTS hook
```

---

## Troubleshooting

### "Error al comunicarse con LM Studio"
- Ensure LM Studio is running
- Check that local server is enabled (Settings > Local Server)
- Verify port 1234 is not blocked

### Voice widget shows error
- Allow microphone access in browser
- Use Chrome, Edge, or Safari
- Check internet connection (required for speech recognition)

### Image detection returns generic results
- Ensure Qwen VL model is loaded in LM Studio
- Try a clearer photo with good lighting
