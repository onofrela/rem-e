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

### 3. Voice Navigation with AI (from intento-3)

Voice control for navigating the app and asking cooking questions.

**Location:** `voice-server/` (Python) + `lib/voice/` (TypeScript)

**Components:**

#### Python Voice Server
- `voice-server/voice_server.py` - WebSocket server with Vosk
- `voice-server/config.py` - Configuration
- `voice-server/requirements.txt` - Python dependencies

#### Frontend
- `lib/voice/navigationCommands.ts` - Route mapping
- `lib/hooks/useVoiceNavigation.ts` - WebSocket hook
- `components/voice/VoiceAssistant.tsx` - Floating widget

**How it works:**
1. Python server listens for wake word ("Rem-E")
2. Classifies intent: navigation vs question
3. Navigation: sends route to frontend via WebSocket
4. Question: queries LM Studio, returns response

**Voice Commands:**
```
"Rem-E, ve a recetas"        → /recipes
"Rem-E, abre el inventario"  → /inventory
"Rem-E, ir a cocinar"        → /cook
"Rem-E, ¿qué puedo cocinar?" → LLM response
```

---

### 4. LLM Chatbot Integration (from intento-3)

Cooking assistant that answers questions using context from the app.

**Features:**
- Contextual responses based on user's inventory
- Recipe suggestions
- Cooking tips and techniques
- Ingredient substitutions

**Context sent to LLM:**
- Current inventory (from IndexedDB)
- Saved recipes
- Current page

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
# LM Studio (required for vision and chatbot)
LM_STUDIO_API_URL=http://127.0.0.1:1234

# AWS Polly (optional, for TTS)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

### 3. Setup LM Studio

1. Download [LM Studio](https://lmstudio.ai/)
2. Download a vision model (Qwen VL recommended)
3. Download a chat model (Llama 2, Mistral, etc.)
4. Start local server on port 1234

### 4. Setup Voice Server (Optional)

```bash
cd voice-server

# Install Python dependencies
pip install -r requirements.txt

# Download Vosk model
# https://alphacephei.com/vosk/models
# Place in voice-server/models/vosk-model-small-es-0.42/

# Run server
python voice_server.py
```

### 5. Start the App

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
│ /api/analyze-   │  │  WebSocket  │         │
│ image           │  │ :8765       │         │
└────────┬────────┘  └──────┬──────┘         │
         │                  │                 │
         ▼                  ▼                 │
┌─────────────────────────────────────┐      │
│         LM Studio (:1234)           │      │
│                                     │      │
│  ┌──────────┐    ┌──────────────┐  │      │
│  │ Qwen VL  │    │ Chat Model   │  │      │
│  │ (Vision) │    │ (Questions)  │  │      │
│  └──────────┘    └──────────────┘  │      │
└─────────────────────────────────────┘      │
                                             │
┌─────────────────────────────────────┐      │
│     Python Voice Server (:8765)     │◄─────┘
│                                     │  (context)
│  ┌──────────┐    ┌──────────────┐  │
│  │   Vosk   │    │  LLM Client  │  │
│  │  (ASR)   │    │              │  │
│  └──────────┘    └──────────────┘  │
└─────────────────────────────────────┘
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
│       ├── useVoice.ts               # Existing voice hook
│       └── usePollyTTS.ts            # TTS hook
│
└── voice-server/                     # Python backend
    ├── voice_server.py
    ├── config.py
    ├── requirements.txt
    └── README.md
```

---

## Troubleshooting

### "Error al comunicarse con LM Studio"
- Ensure LM Studio is running
- Check that local server is enabled (Settings > Local Server)
- Verify port 1234 is not blocked

### "No se encontró el modelo Vosk"
- Download from https://alphacephei.com/vosk/models
- Extract to `voice-server/models/`

### Voice widget shows "Sin conexión"
- Run `python voice_server.py` first
- Check WebSocket connection on port 8765

### Image detection returns generic results
- Ensure Qwen VL model is loaded in LM Studio
- Try a clearer photo with good lighting
