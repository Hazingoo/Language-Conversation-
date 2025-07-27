# Language Learning AI with Voice Assistant

A sophisticated language learning application that combines AI-powered text conversations with real-time voice interactions using Vapi.

## Features

### 🤖 AI Language Partners
- **Multiple Characters**: Practice with diverse AI personalities from different cultures
- **Contextual Learning**: Each character has specific situations and scenarios
- **Smart Corrections**: Get real-time feedback on grammar and pronunciation
- **Curriculum Integration**: AI-generated learning objectives based on your chosen scenario

### 🎙️ Voice Assistant Integration
- **Real-time Voice Conversations**: Speak naturally with AI language partners
- **Vapi Integration**: Powered by Vapi's advanced voice AI technology
- **Multi-language Support**: Voice recognition and synthesis in multiple languages
- **Call Controls**: Start, end, mute, and manage voice calls seamlessly

### 📚 Curriculum Agent
- **Dynamic Learning Paths**: AI-generated curriculum based on language and scenario
- **Real-world Scenarios**: Cafe orders, hotel check-ins, shopping experiences
- **Progressive Difficulty**: Adapts to your learning level
- **Cultural Context**: Learn about customs and traditions

## Voice Assistant Setup

### Vapi Configuration
The application uses Vapi for voice interactions. The following credentials are configured:

```javascript
const assistant = "34d415aa-e3e3-4f23-aaa4-45c0ab668188"
const apiKey = "9226339a-8e31-44a7-a53d-a82c5cdc12fc"
```

### Voice Features
- **Start Voice Call**: Click the phone button to begin a voice conversation
- **Real-time Transcription**: See your speech converted to text in real-time
- **AI Voice Responses**: Hear natural-sounding responses from your language partner
- **Mute/Unmute**: Control your microphone during calls
- **Call Management**: Start and end calls with simple controls

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser with microphone access

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Language-Conversation-
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start the curriculum agent** (in a separate terminal)
   ```bash
   ./start-curriculum-agent.sh
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Voice Assistant Testing

1. **Test the standalone voice widget**
   Visit `http://localhost:3000/vapi-widget.html` to test voice functionality

2. **Use voice in the main app**
   - Select a character
   - Click "Voice Chat" button
   - Grant microphone permissions
   - Start speaking!

## Architecture

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Modern styling
- **Vapi Web SDK**: Voice assistant integration

### Backend Services
- **Curriculum Agent**: Python FastAPI service (port 8000)
- **Next.js API Routes**: Chat and curriculum endpoints
- **Vapi Webhooks**: Voice interaction processing

### Voice Integration
- **Vapi Assistant**: Pre-configured language learning assistant
- **Real-time Communication**: WebSocket-based voice streaming
- **Speech Recognition**: Automatic transcription
- **Text-to-Speech**: Natural voice responses

## Usage

### Text Chat Mode
1. Select a character from the main interface
2. Type messages in the target language or English
3. Receive AI responses with corrections and alternatives
4. View learning objectives and curriculum guidance

### Voice Chat Mode
1. Select a character and click "Voice Chat"
2. Grant microphone permissions when prompted
3. Click "Start Voice Call" to begin
4. Speak naturally in the target language
5. Listen to AI responses and practice pronunciation

### Creating Custom Characters
1. Click "Create" in the sidebar
2. Fill in character details:
   - Name and personality
   - Target language
   - Situation description
3. Your custom character will be available for both text and voice chat

## Supported Languages

- **French**: Marie Dubois (Café Owner)
- **Spanish**: Carlos Rodriguez (Football Fan)
- **German**: Hans Mueller (Tech Engineer)
- **Japanese**: Hiroshi Tanaka (Office Worker)
- **English**: Emma Thompson (Tea Party Host)
- **Chinese**: Li Wei (Tea Master)
- **Custom**: Create your own characters

## Voice Assistant Features

### Real-time Voice Processing
- **Speech Recognition**: Converts your speech to text
- **Natural Language Understanding**: AI understands context and intent
- **Voice Synthesis**: Natural-sounding AI responses
- **Multi-language Support**: Works with all supported languages

### Call Management
- **Start/End Calls**: Simple one-click controls
- **Mute/Unmute**: Control your microphone
- **Call Status**: Visual indicators for call state
- **Error Handling**: Graceful handling of connection issues

### Integration Benefits
- **Seamless Experience**: Switch between text and voice modes
- **Context Preservation**: Voice conversations maintain character context
- **Learning Enhancement**: Voice practice improves pronunciation
- **Accessibility**: Voice mode makes learning more accessible

## Development

### Project Structure
```
Language-Conversation-/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── chat/          # Text chat endpoint
│   │   ├── curriculum/    # Curriculum generation
│   │   └── vapi-webhook/  # Vapi webhook handler
│   └── page.tsx           # Main application
├── components/            # React components
│   ├── voice-widget.tsx   # Voice assistant component
│   └── ui/               # UI components
├── curriculum_agent/      # Python curriculum service
├── public/               # Static assets
│   └── vapi-widget.html  # Standalone voice test page
└── package.json          # Dependencies
```

### Key Components

#### Voice Widget (`components/voice-widget.tsx`)
- Integrates Vapi SDK for voice interactions
- Manages call state and controls
- Displays real-time transcripts
- Handles microphone permissions

#### Vapi Webhook (`app/api/vapi-webhook/route.ts`)
- Processes voice interaction events
- Handles function calls for curriculum data
- Manages call status updates
- Provides language learning context

#### Curriculum Integration
- Connects voice assistant to curriculum agent
- Provides learning objectives during voice calls
- Offers cultural context and corrections
- Adapts difficulty based on user level

## Troubleshooting

### Voice Issues
- **Microphone not working**: Check browser permissions
- **No voice response**: Verify Vapi credentials and internet connection
- **Call won't start**: Ensure curriculum agent is running on port 8000

### Curriculum Issues
- **No learning objectives**: Check if curriculum agent is running
- **Connection errors**: Verify localhost:8000 is accessible

### General Issues
- **Dependency conflicts**: Use `--legacy-peer-deps` flag
- **TypeScript errors**: Check for missing type definitions
- **Build issues**: Clear `.next` directory and reinstall dependencies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test voice and text functionality
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues related to:
- **Voice Assistant**: Check Vapi documentation
- **Curriculum Agent**: See curriculum_agent/README.md
- **General App**: Open an issue in the repository

---

**Happy Language Learning! 🎙️🗣️**
