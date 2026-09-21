import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Plus,
  Mic,
  Trash2,
  Copy,
  Check,
  Cpu,
  Wand2,
  Maximize2,
  Minimize2,
  Code,
  Terminal,
  Zap
} from 'lucide-react';
import './ChatBot.css';

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface ChatBotProps {
  title?: string;
  placeholder?: string;
  onSendMessage?: (message: string) => Promise<string> | string;
  compact?: boolean;
}

const DEFAULT_SUGGESTIONS = [
  { icon: Terminal, label: 'What is this project about?' },
  { icon: Code, label: 'Show me available API routes' },
  { icon: Zap, label: 'Check autonomous agent status' },
  { icon: Wand2, label: 'How do I run the dev server?' }
];

export const ChatBot: React.FC<ChatBotProps> = ({
  title = 'Bevin AI Assistant',
  placeholder = 'Ask Bevin to assist with tasks, write code, or explain features...',
  onSendMessage,
  compact = false
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeMode, setActiveMode] = useState<'agent' | 'ask'>('agent');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handle textarea resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Simple, realistic response generator for the project
  const generateBotResponse = (userText: string): string => {
    const lower = userText.toLowerCase();

    if (lower.includes('project') || lower.includes('what is')) {
      return `**Bevin** is an autonomous AI agent platform.\n\nKey capabilities included in this workspace:\n- 🤖 **Autonomous Workflows**: Execute agentic developer tasks.\n- 🔐 **Authentication System**: Secure JWT & GitHub OAuth authorization.\n- ⚡ **React & Express Backend**: Clean client-server architecture with Vite & Node.js.`;
    }

    if (lower.includes('api') || lower.includes('route')) {
      return `Here are the active API endpoints registered in \`core/server/src/routes\`:\n\n- \`POST /api/auth/register\` - Register new user\n- \`POST /api/auth/login\` - User authentication\n- \`GET /api/auth/me\` - Get current profile\n- \`POST /api/auth/github\` - OAuth authentication endpoint`;
    }

    if (lower.includes('status') || lower.includes('agent')) {
      return `⚡ **Agent Workspace Status:** Online & Ready\n- Environment: Local Development\n- Mode: ${activeMode.toUpperCase()}\n- Connected Services: Auth Server (Port 5000), Vite Client (Port 5173)`;
    }

    if (lower.includes('dev') || lower.includes('run') || lower.includes('server')) {
      return `To start the application locally:\n\n\`\`\`bash\n# In core/server\nnpm run dev\n\n# In core/client\nnpm run dev\n\`\`\``;
    }

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return `Hello! How can I assist you with your project today? You can ask me to explain code, check project status, or outline architecture.`;
    }

    return `I've processed your query: "${userText}".\n\nIs there anything specific in the Bevin codebase you'd like me to analyze or update?`;
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsTyping(true);

    try {
      let botText = '';
      if (onSendMessage) {
        botText = await onSendMessage(text);
      } else {
        // Simulate network delay for natural feel
        await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 500));
        botText = generateBotResponse(text);
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: botText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: 'Sorry, I encountered an issue processing your message. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  // Formatting helper for simple Markdown rendering (code blocks, bold, linebreaks)
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeLines = part.slice(3, -3).trim().split('\n');
        const language = codeLines[0].match(/^[a-z]+/i) ? codeLines[0] : '';
        const codeContent = language ? codeLines.slice(1).join('\n') : codeLines.join('\n');

        return (
          <pre key={index}>
            <code>{codeContent}</code>
          </pre>
        );
      }

      // Simple inline code & bold formatting
      const lines = part.split('\n');
      return (
        <span key={index}>
          {lines.map((line, lIdx) => {
            const formattedLine = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((segment, sIdx) => {
              if (segment.startsWith('`') && segment.endsWith('`')) {
                return <code key={sIdx}>{segment.slice(1, -1)}</code>;
              }
              if (segment.startsWith('**') && segment.endsWith('**')) {
                return <strong key={sIdx}>{segment.slice(2, -2)}</strong>;
              }
              return segment;
            });

            return (
              <React.Fragment key={lIdx}>
                {formattedLine}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            );
          })}
        </span>
      );
    });
  };

  return (
    <div className={`chatbot-wrapper ${isFullscreen ? 'fullscreen' : ''} ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <header className="chatbot-header">
        <div className="chatbot-brand">
          <div className="chatbot-avatar-icon">
            <Cpu size={20} />
          </div>
          <div className="chatbot-title-area">
            <h3 className="chatbot-name">
              {title}
              <Sparkles size={14} style={{ color: 'var(--accent, #c084fc)' }} />
            </h3>
            <div className="chatbot-status">
              <span className="status-dot"></span>
              <span>Online • Autonomous Ready</span>
            </div>
          </div>
        </div>

        <div className="chatbot-actions">
          <div className="chatbot-mode-toggle">
            <button
              className={`mode-btn ${activeMode === 'agent' ? 'active' : ''}`}
              onClick={() => setActiveMode('agent')}
              type="button"
            >
              Agent
            </button>
            <button
              className={`mode-btn ${activeMode === 'ask' ? 'active' : ''}`}
              onClick={() => setActiveMode('ask')}
              type="button"
            >
              Ask
            </button>
          </div>

          {messages.length > 0 && (
            <button
              className="icon-action-btn"
              onClick={handleClearChat}
              title="Clear Conversation"
              type="button"
            >
              <Trash2 size={16} />
            </button>
          )}

          <button
            className="icon-action-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            type="button"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="chatbot-messages">
        {messages.length === 0 ? (
          <div className="chatbot-welcome">
            <div className="welcome-icon-glow">
              <Bot size={28} />
            </div>
            <h2 className="welcome-heading">How can I help you today?</h2>
            <p className="welcome-subtext">
              I can answer questions about your repository, run developer tasks, or explain system architecture.
            </p>

            <div className="quick-chips-container">
              {DEFAULT_SUGGESTIONS.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <button
                    key={idx}
                    className="chip-btn"
                    onClick={() => handleSend(s.label)}
                    type="button"
                  >
                    <Icon size={14} />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chat-message-item ${msg.sender}`}>
              <div className="message-avatar">
                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div className="message-content-wrapper">
                <div className="message-bubble">
                  {renderFormattedText(msg.text)}
                </div>

                <div className="message-meta">
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'assistant' && (
                    <button
                      className="copy-btn"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      type="button"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={12} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="chat-message-item assistant">
            <div className="message-avatar">
              <Bot size={16} />
            </div>
            <div className="message-content-wrapper">
              <div className="message-bubble">
                <div className="typing-indicator">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <div className="chatbot-input-container">
        <div className="chatbot-input-box">
          <textarea
            ref={textareaRef}
            className="chatbot-textarea"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
          />

          <div className="input-toolbar">
            <div className="input-toolbar-left">
              <button className="toolbar-btn" title="Attach context" type="button">
                <Plus size={16} />
              </button>
              <div className="badge-tag">
                <Sparkles size={12} />
                <span>Model Fusion</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="toolbar-btn" title="Voice input" type="button">
                <Mic size={16} />
              </button>
              <button
                className="send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                type="button"
                title="Send message"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
        <div className="chatbot-footer-note">
          Press Enter to send • Shift + Enter for new line
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
