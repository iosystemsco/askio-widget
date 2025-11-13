# @iosystemsco/askio-widget

A lightweight, embeddable AI chat widget for websites with support for text and voice interactions. Built with React and TypeScript for maximum compatibility and performance.

## Features

- **🤖 AI Chat Interface**: Modern, responsive chat UI with real-time messaging
- **🎤 Voice Support**: Built-in voice recording and text-to-speech capabilities
- **🎨 Customizable Themes**: Multiple theme presets and custom theme support
- **🌍 Multi-language**: Internationalization support with multiple language packs
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **⚡ Lightweight**: Optimized bundle with tree-shaking support
- **🔧 Headless Mode**: Custom UI implementation with state management hooks
- **📦 CDN Ready**: Optimized for CDN deployment with automatic initialization
- **🔌 WebSocket Ready**: Real-time communication with fallback support

## Recent Updates

- **Fixed TypeScript compatibility**: Updated timeout type definitions to use `ReturnType<typeof setTimeout>` instead of `NodeJS.Timeout` for cross-platform compatibility
- **Enhanced WebSocket types**: Improved WebSocket message type definitions for better type safety
- **CDN deployment**: Streamlined deployment scripts for Cloudflare R2 and AWS S3

## Installation

### Package Manager

```bash
npm install @iosystemsco/askio-widget
# or
yarn add @ask-io/chat-widget
# or
pnpm add @ask-io/chat-widget
# or
bun add @ask-io/chat-widget
```

### CDN (Recommended for Quick Start)

For immediate deployment without build setup:

```html
<!-- Include CSS -->
<link rel="stylesheet" href="https://cdn.askio.com/chat-widget/latest/embed.css" />

<!-- Include JS with auto-init -->
<script
  src="https://cdn.askio.com/chat-widget/latest/embed.js"
  data-askio-token="your-site-token"
  data-askio-theme="default"
  data-askio-language="en"
  data-askio-position="bottom-right"
></script>
```

## Usage

### Basic React Integration

```tsx
import { ChatWidget } from '@iosystemsco/askio-widget';
import '@iosystemsco/askio-widget/styles';

function App() {
  return <ChatWidget siteToken="your-site-token" theme={{ preset: 'dark' }} language="en" position="bottom-right" enableVoice={true} enableTTS={true} />;
}
```

### Headless Mode

For custom UI implementations:

```tsx
import { ChatWidgetHeadless } from '@iosystemsco/askio-widget';

function CustomChat() {
  return (
    <ChatWidgetHeadless siteToken="your-site-token">
      {(state, actions) => (
        <div className="custom-chat">
          <div className="messages">
            {state.messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                {msg.content}
              </div>
            ))}
          </div>
          <div className="input">
            <input
              value={state.input}
              onChange={(e) => actions.setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && actions.sendMessage()}
              placeholder="Type a message..."
            />
            <button onClick={() => actions.sendMessage()}>Send</button>
            {state.voiceSupported && <button onClick={() => actions.startRecording()}>🎤</button>}
          </div>
        </div>
      )}
    </ChatWidgetHeadless>
  );
}
```

### Manual JavaScript Initialization

```html
<link rel="stylesheet" href="https://cdn.askio.com/chat-widget/latest/embed.css" />
<script src="https://cdn.askio.com/chat-widget/latest/embed.js"></script>
<script>
  const widget = AskIOChat.init({
    siteToken: 'your-site-token',
    theme: {
      preset: 'purple',
      colors: {
        primary: '#8B5CF6',
        secondary: '#A78BFA',
      },
    },
    language: 'en',
    position: 'bottom-right',
    enableVoice: true,
    enableTTS: true,
    welcomeMessage: 'Hello! How can I help you today?',
    suggestions: ['What can you help me with?', 'Tell me about your features', 'How do I get started?'],
    onReady: () => {
      console.log('Chat widget is ready!');
    },
    onMessage: (message) => {
      console.log('New message:', message);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Control widget programmatically
  widget.open(); // Open the chat
  widget.close(); // Close the chat

  // Update configuration
  widget.updateConfig({
    theme: { preset: 'light' },
    language: 'es',
  });

  // Clean up when done
  widget.destroy();
</script>
```

### Configuration Options

| Option           | Type           | Default                 | Description                                       |
| ---------------- | -------------- | ----------------------- | ------------------------------------------------- |
| `siteToken`      | string         | -                       | **Required**. Your site authentication token      |
| `theme`          | ThemeConfig    | `{ preset: 'default' }` | Theme configuration                               |
| `language`       | string         | `'en'`                  | Interface language (`en`, `es`, `de`, `fr`, `pt`) |
| `position`       | WidgetPosition | `'bottom-right'`        | Widget placement                                  |
| `enableVoice`    | boolean        | `false`                 | Enable voice recording                            |
| `enableTTS`      | boolean        | `true`                  | Enable text-to-speech                             |
| `autoOpen`       | boolean        | `false`                 | Auto-open widget on page load                     |
| `autoOpenDelay`  | number         | `0`                     | Delay before auto-open (ms)                       |
| `welcomeMessage` | string         | -                       | Initial welcome message                           |
| `suggestions`    | string[]       | -                       | Quick reply suggestions                           |
| `dimensions`     | Dimensions     | -                       | Custom widget size                                |
| `hideButton`     | boolean        | `false`                 | Hide the chat button                              |
| `title`          | string         | -                       | Custom widget title                               |
| `subtitle`       | string         | -                       | Custom widget subtitle                            |

### Data Attributes (CDN)

When using CDN auto-initialization, you can configure via data attributes:

```html
<script
  src="embed.js"
  data-askio-token="your-token"
  data-askio-theme="dark"
  data-askio-language="es"
  data-askio-position="bottom-right"
  data-askio-width="350px"
  data-askio-height="500px"
  data-askio-voice="true"
  data-askio-tts="true"
  data-askio-auto-open="true"
  data-askio-auto-open-delay="2000"
  data-askio-welcome="¡Hola! ¿Cómo puedo ayudarte?"
  data-askio-placeholder="Escribe tu mensaje..."
  data-askio-suggestions="¿Qué puedes hacer?,Cuéntame sobre características"
  data-askio-hide-button="false"
></script>
```

## Development

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd packages/chat-widget

# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Type checking
bun run type-check

# Run tests
bun test
```

### Build Commands

```bash
# Build library (ESM + CJS)
bun run build:lib

# Build CDN embed script
bun run build:embed

# Build everything
bun run build

# Clean build artifacts
bun run clean

# Analyze bundle size
bun run analyze
```

### Testing

```bash
# Test local package
bun run test:package

# Test embed script
bun run test:embed

# Check package structure
bun run pack:check
```

## Deployment

### CDN Deployment

The chat widget supports deployment to multiple CDN providers:

#### Cloudflare R2

```bash
# Set environment variables
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
export R2_BUCKET_NAME="chat-widget"

# Deploy
bun run build:embed
bun run deploy:cloudflare
```

**Output URLs:**

- Versioned: `https://cdn.askio.com/chat-widget/v1.0.0/embed.js`
- Latest: `https://cdn.askio.com/chat-widget/latest/embed.js`

#### AWS S3 + CloudFront

```bash
# Set environment variables
export AWS_S3_BUCKET="your-bucket-name"
export S3_PATH_PREFIX="chat-widget"
export AWS_CLOUDFRONT_DISTRIBUTION_ID="your-dist-id"
export CDN_DOMAIN="cdn.yourdomain.com"

# Deploy
bun run build:embed
bun run deploy:aws
```

### Package Publishing

```bash
# Build and publish to npm
bun run build
npm publish

# Or for scoped package
npm publish --access public
```

### Environment Variables

**Cloudflare R2:**

- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN`: API token with R2 write permissions
- `R2_BUCKET_NAME`: R2 bucket name (default: "chat-widget")

**AWS S3:**

- `AWS_ACCESS_KEY_ID`: AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `AWS_S3_BUCKET`: S3 bucket name
- `AWS_CLOUDFRONT_DISTRIBUTION_ID`: CloudFront distribution ID (optional)
- `CDN_DOMAIN`: Custom domain for CDN URLs (optional)

## API Reference

### Components

#### ChatWidget

Main chat widget component with full UI.

```tsx
interface ChatWidgetProps {
  siteToken: string;
  theme?: ThemeConfig;
  language?: string;
  position?: WidgetPosition;
  enableVoice?: boolean;
  enableTTS?: boolean;
  initialOpen?: boolean;
  welcomeMessage?: string;
  suggestions?: string[];
  onReady?: () => void;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}
```

#### ChatWidgetHeadless

Headless version for custom UI implementation.

```tsx
interface ChatWidgetHeadlessProps {
  siteToken: string;
  children: (state: ChatState, actions: ChatActions) => React.ReactNode;
}

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isConnected: boolean;
  isLoading: boolean;
  input: string;
  voiceSupported: boolean;
  recording: boolean;
}

interface ChatActions {
  sendMessage: (text?: string) => void;
  setInput: (value: string) => void;
  open: () => void;
  close: () => void;
  startRecording: () => void;
  stopRecording: () => void;
}
```

### Hooks

#### useChat

Access chat state and actions in custom components.

```tsx
const { state, actions } = useChat();

// Send message
actions.sendMessage('Hello!');

// Check connection status
if (state.isConnected) {
  // Handle connected state
}
```

### Types

#### ChatMessage

```tsx
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    confidence?: number;
    source?: 'stt' | 'manual';
    is_final?: boolean;
  };
}
```

#### ThemeConfig

```tsx
interface ThemeConfig {
  preset?: ThemePreset;
  colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    surface?: string;
    text?: string;
    border?: string;
    accent?: string;
  };
  borderRadius?: number;
  fontFamily?: string;
}
```

## Troubleshooting

### Common Issues

**Widget not loading:**

- Check that `siteToken` is correctly provided
- Verify network connectivity
- Check browser console for errors
- Ensure CSS is loaded before JavaScript

**Voice features not working:**

- Confirm `enableVoice` is set to `true`
- Check microphone permissions in browser
- Verify HTTPS is used (required for WebRTC)
- Test on supported browsers (Chrome, Firefox, Safari)

**TypeScript errors:**

- Ensure React types are installed: `@types/react@^19.2.0`
- Update to latest version: `npm install @iosystemsco/askio-widget@latest`
- Check TypeScript version compatibility (5.9+)

**Bundle size issues:**

- Use tree-shaking: import specific components
- Consider CDN version for minimal bundle size
- Run `bun run analyze` to check bundle composition

### Browser Support

- **Chrome**: 88+
- **Firefox**: 85+
- **Safari**: 14+
- **Edge**: 88+

### Performance Tips

1. **Lazy Loading**: Use dynamic imports for non-critical features
2. **CDN Usage**: Leverage CDN version for faster initial load
3. **Tree Shaking**: Import only needed components
4. **Throttling**: Implement message throttling for high-volume usage

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Ensure all tests pass: `bun test`
5. Build successfully: `bun run build`
6. Submit a pull request

### Development Guidelines

- Follow TypeScript strict mode
- Use semantic commit messages
- Add JSDoc comments for public APIs
- Include tests for new features
- Update documentation as needed

## License

MIT License - see LICENSE file for details.

## Support

- **Documentation**: [docs.askio.com](https://docs.askio.com)
- **Issues**: [GitHub Issues](https://github.com/askio/chat-widget/issues)
- **Discussions**: [GitHub Discussions](https://github.com/askio/chat-widget/discussions)

---

**Version**: 1.0.0  
**Last Updated**: November 2024
