# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is the **FeeModuleSupportBot** - an AI-powered chatbot support system for ENTAB ERP modules, specifically focused on fees and billing support. The application serves as both a standalone chat interface and an embeddable widget that can be integrated into external websites.

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Development server (runs on port 5003)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run check
```

### Widget-Specific Commands
```bash
# Build widget only (for embedding)
npm run build:widget

# Serve widget files (port 3000)
npm run serve:widget
```

### Database Operations
```bash
# Push database schema changes
npm run db:push
```

## High-Level Architecture

### Full-Stack Structure
- **Backend**: Express.js server with TypeScript
- **Frontend**: React with TypeScript, using Vite for building
- **Database**: MongoDB for chat history and knowledge base storage
- **AI Integration**: Google Gemini AI for response generation
- **Styling**: Tailwind CSS with custom components
- **Widget System**: Embeddable chat widget for external sites

### Key Architectural Components

#### 1. Server Architecture (`server/`)
- **`index.ts`**: Main Express server with CORS configuration for widget embedding
- **`routes.ts`**: API routes for chat, knowledge base, and analytics
- **`services/`**: Core business logic
  - `gemini.ts`: AI response generation using Google Gemini
  - `chat-history.ts`: MongoDB operations for chat sessions and analytics
  - `knowledge-base.ts`: Document management and knowledge base operations
  - `support-context.ts`: Pre-configured support scenarios and context
  - `mongo-client.ts`: MongoDB connection management

#### 2. Client Architecture (`client/`)
- **Multi-entry build system**: Supports main app, widget, and embed modes
- **React components** in `src/components/chatbot/`:
  - `chat-interface.tsx`: Main chat UI with intelligent message formatting
  - `message-bubble.tsx`: Advanced message rendering with step-by-step guides
  - `quick-actions.tsx`: Pre-configured common queries
- **Hooks** in `src/hooks/`: `use-chat.ts` manages chat state and API communication
- **Pages** in `src/pages/`: Home, dashboard, and authentication

#### 3. Widget System
- **Embeddable JavaScript**: `client/public/embed.js` for third-party integration
- **Multiple build outputs**: Main app, widget, and embed versions
- **CORS-enabled**: Designed to work across domains

### Data Flow

1. **Chat Session Creation**: Client requests session ID from server
2. **Message Processing**: User messages sent to `/api/chat/message`
3. **AI Processing**: Server uses Gemini AI with contextual support knowledge
4. **Response Formatting**: Intelligent parsing for step-by-step guides and formatting
5. **Storage**: Messages stored in MongoDB with analytics tracking

### Deployment Architecture

- **Docker containerized**: Multi-stage build for production
- **Port 5003**: Single port serves both API and client
- **Environment variables**: MongoDB URI and Gemini API key required
- **Static asset serving**: Built files served from `dist/`

## Key Development Patterns

### 1. AI Response Formatting
The system uses special formatting triggers in AI responses:
- `Quick Answer:` - Creates highlighted summary boxes
- `Step-by-Step Guide:` - Renders numbered steps with icons
- `Note:` or `Warning:` - Creates alert boxes

### 2. Message Components
- **MessageBubble**: Handles advanced rendering with linkification and step parsing
- **TypingIndicator**: Shows AI thinking state
- **QuickActions**: Provides common query shortcuts

### 3. Chat State Management
- **useChat hook**: Manages session creation, message history, and sending
- **React Query**: Handles API caching and optimistic updates
- **Session persistence**: Each chat creates a unique session in MongoDB

### 4. Widget Integration
- **Embed script**: `inject.js` route provides embeddable widget code
- **Multi-environment support**: Different build outputs for different use cases
- **Responsive design**: Adapts to mobile and desktop contexts

## Environment Setup

### Required Environment Variables
```bash
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=...
```

### Database Collections
- **`support_chat_history`**: Chat messages and sessions
- **`Chatbot`**: Knowledge base documents and configuration
- **`ticket`**: Support ticket click tracking

## Common Development Tasks

### Adding New Support Scenarios
1. Edit `server/services/support-context.ts`
2. Add scenarios to the `scenarios` array
3. Follow the format: `{ title, scenario?, steps[] }`

### Modifying AI Response Formatting
1. Update `client/src/components/chatbot/message-bubble.tsx`
2. Modify `parseAdvancedSections()` function for new formatting patterns
3. Update rendering functions for new UI components

### Adding Quick Action Buttons
1. Edit `client/src/components/chatbot/quick-actions.tsx`
2. Add new entries to the `quickActions` array
3. Include appropriate Lucide React icons

### Updating Widget Appearance
1. Modify styles in the `inject.js` route handler
2. Update widget positioning and sizing
3. Test across different host website environments

## Build System Notes

- **Vite configuration**: Multi-entry build with separate HTML templates
- **TypeScript paths**: `@/` maps to `client/src/`, `@shared/` to `shared/`
- **Asset handling**: Public assets copied to dist, embedded assets resolved
- **Production optimization**: Vendor chunks separated for better caching

## Testing and Quality

- **Type checking**: Run `npm run check` before commits
- **Development server**: Hot reload enabled for rapid development
- **Production builds**: Test with `npm run build && npm start`
- **Widget testing**: Use `npm run serve:widget` to test embeddable version

## Security Considerations

- **CORS enabled**: Configured for cross-origin widget embedding
- **Environment secrets**: MongoDB and API keys must be properly secured
- **Input validation**: User messages validated before AI processing
- **XSS protection**: Message content properly escaped in rendering
