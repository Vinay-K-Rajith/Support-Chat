#Support Chat

A React-based chat widget for St. Xavier's School that can be embedded in any website. The widget provides information about admissions, fees, documents, and school policies.

## 🚀 Quick Start

### 1. Build and Run the Application

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start the server
npm start
```

### 2. Set up ngrok for External Access

```bash
# Install ngrok (if not already installed)
npm install -g ngrok

# Start ngrok tunnel to your local server
ngrok http 5002
```

### 3. Update the Embed Script

After getting your ngrok URL (e.g., `https://abc123.ngrok.io`), update the server URL in:

**File:** `client/public/embed.js`
```javascript
var config = {
  serverUrl: 'https://abc123.ngrok.io', // Replace with your actual ngrok URL
  // ...
};
```

### 4. Rebuild and Deploy

```bash
# Rebuild with updated configuration
npm run build:widget

# The embeddable files will be in the `dist` folder
```

## 📦 Embedding the Widget

Add this to any HTML file where you want the chat widget to appear:

```html
<div id="school-chat-widget"></div>
<script src="https://your-ngrok-url.ngrok.io/assets/embed.js"></script>
```

Replace `https://your-ngrok-url.ngrok.io` with your actual server URL. The `embed.js` asset name might change with each build, so be sure to use the correct one from the `dist/assets` directory.

## 🎯 Demo

Visit `https://your-ngrok-url.ngrok.io/demo.html` to see the widget in action.

## 📁 Project Structure

```
SchoolChatAssistant/
├── client/
│   ├── src/
│   │   ├── components/chatbot/
│   │   │   ├── chat-button.tsx      # Chat button component
│   │   │   ├── chat-interface.tsx   # Main chat interface
│   │   │   └── ...
│   │   ├── embed.tsx               # Embed entry point
│   │   └── widget.tsx              # Widget entry point
│   ├── public/
│   │   ├── embed.js                # Embed script
│   │   └── demo.html               # Demo page
│   ├── embed.html                  # Embed HTML template
│   └── widget.html                 # Widget HTML template
├── server/
│   └── index.ts                    # Express server with CORS
└── dist/                           # Built files
```

## 🔧 Configuration

### Widget Styling

The widget uses isolated CSS to prevent conflicts with host websites. Key styling features:

- **Z-index:** 999999 (ensures widget appears above other content)
- **Position:** Fixed bottom-right corner
- **Responsive:** Adapts to mobile and desktop screens
- **Isolated:** No CSS conflicts with host page

### CORS Configuration

The server includes CORS headers to allow embedding from any domain:

```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  // ...
});
```

## 🛠️ Development

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Build widget only
npm run build:widget

# Serve widget files
npm run serve:widget

# Start production server
npm start
```

### Building for Different Environments

1. **Development:** Use `npm run dev` for local development
2. **Production:** Use `npm run build` then `npm start`
3. **Widget Only:** Use `npm run build:widget` for embeddable files

## 🌐 Deployment

### Using ngrok (Development/Demo)

1. Start your application: `npm start`
2. Start ngrok: `ngrok http 5002`
3. Update the embed script with your ngrok URL
4. Rebuild: `npm run build:widget`

### Production Deployment

1. Deploy to your hosting provider (Vercel, Netlify, etc.)
2. Update the embed script with your production URL
3. Rebuild and deploy the updated files

## 📱 Features

- ✅ **Admissions Information:** Age eligibility, documents, procedures
- ✅ **Fee Structure:** Registration fees, payment methods, policies
- ✅ **School Policies:** Academic programs, rules, regulations
- ✅ **Real-time Chat:** Interactive conversation interface
- ✅ **Quick Actions:** Pre-defined common queries
- ✅ **Mobile Responsive:** Works on all device sizes
- ✅ **Isolated Styling:** No conflicts with host websites
- ✅ **Easy Integration:** Single script tag installation

## 🔒 Security

- CORS enabled for cross-origin embedding
- Isolated iframe loading for chat interface
- No access to host page DOM or data
- Secure API endpoints with proper validation

## 📞 Support

For questions or issues with the embeddable widget, please refer to the demo page or check the console for any error messages.

## 📄 License

MIT License - see LICENSE file for details. 
