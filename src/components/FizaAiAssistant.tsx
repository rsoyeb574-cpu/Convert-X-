import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  HelpCircle,
  FileText,
  Zap,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import { PageView } from '../types.js';

interface Message {
  id: string;
  sender: 'fiza' | 'user';
  text: string;
  timestamp: string;
  suggestions?: { label: string; action?: () => void; query?: string }[];
}

interface FizaAiAssistantProps {
  onNavigate?: (view: PageView, seoSlug?: string) => void;
  isPro?: boolean;
}

export const FizaAiAssistant: React.FC<FizaAiAssistantProps> = ({ onNavigate, isPro = false }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'fiza',
      text: "Hi! I'm **Fiza**, your Convert-X AI Assistant. I can help you choose the best file format, troubleshoot conversions, or configure vector Text to PDF settings.",
      timestamp: 'Just now',
      suggestions: [
        { label: 'PNG vs WebP vs JPG?', query: 'What is the difference between PNG, WebP, and JPG?' },
        { label: 'How to convert PDF to Image?', query: 'How do I convert a multi-page PDF into images?' },
        { label: 'Text to PDF tips', query: 'How does the Text to PDF converter work?' },
        { label: 'File size limits', query: 'What are the file size and daily limits?' },
      ],
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const generateFizaResponse = (userQuery: string): { text: string; suggestions?: { label: string; query: string }[] } => {
    const q = userQuery.toLowerCase();

    if (q.includes('png') && (q.includes('webp') || q.includes('jpg') || q.includes('difference') || q.includes('best format'))) {
      return {
        text: "**Format Comparison:**\n• **WEBP**: Best for website speed & SEO. Offers 25-35% smaller file sizes with great quality.\n• **PNG**: Best for graphics with crisp text, logos, and alpha transparency.\n• **JPG**: Best for everyday photos without transparency.",
        suggestions: [
          { label: 'Convert to WebP', query: 'How to convert PNG to WebP' },
          { label: 'Compress Images', query: 'How does image compression work?' },
        ],
      };
    }

    if (q.includes('pdf') && (q.includes('image') || q.includes('png') || q.includes('jpg') || q.includes('extract'))) {
      return {
        text: "You can convert any multi-page PDF into high-res PNG or JPG files:\n1. Upload your PDF file in the workspace.\n2. Choose PNG or JPG.\n3. Under **Conversion Parameters**, you can choose **All Pages (ZIP)** or pick a **Specific Page Number**.\n4. Click Convert to download!",
        suggestions: [
          { label: 'Try PDF to PNG', query: 'Take me to PDF to PNG' },
          { label: 'Try Text to PDF', query: 'Tell me about Text to PDF' },
        ],
      };
    }

    if (q.includes('text to pdf') || q.includes('devanagari') || q.includes('urdu') || q.includes('font') || q.includes('margin')) {
      return {
        text: "Our **Text to PDF Studio** features a true server-side vector PDF layout engine:\n• Fully supports Unicode, English, Hindi (Devanagari), and Urdu scripts.\n• Customizable margins, page sizes (A4, A3, Letter, Legal), font sizes, and line spacing.\n• Searchable, selectable vector text with real-time live preview.",
        suggestions: [
          { label: 'Open Text to PDF', query: 'Open Text to PDF studio' },
          { label: 'Page size options', query: 'What page sizes are supported?' },
        ],
      };
    }

    if (q.includes('limit') || q.includes('free') || q.includes('pro') || q.includes('max size') || q.includes('how many')) {
      return {
        text: `**Convert-X Limits Overview:**\n• **Free Tier**: 5 conversions/day, 25MB max file size, up to 5 files per batch.\n• **Pro Tier**: Unlimited conversions, 100MB max file size, 20 files per batch, priority processing.\n• **Business Tier**: 250MB max file size, 50 files per batch, dedicated API tokens.`,
        suggestions: [
          { label: 'View Pricing', query: 'Show me pricing plans' },
          { label: 'Earn Free Bonus', query: 'How does referral bonus work?' },
        ],
      };
    }

    if (q.includes('security') || q.includes('privacy') || q.includes('safe') || q.includes('retention') || q.includes('delete')) {
      return {
        text: "**Zero-Retention Security Policy:**\n• Your uploaded files are encrypted with 256-bit TLS.\n• Files are processed exclusively in isolated temporary memory and automatically purged after 30 minutes (or immediately upon user download).\n• We never sell, index, or store your personal files.",
        suggestions: [
          { label: 'Privacy Policy', query: 'Where is the privacy policy?' },
        ],
      };
    }

    if (q.includes('pricing') || q.includes('upgrade') || q.includes('cost') || q.includes('buy')) {
      if (onNavigate) {
        onNavigate('pricing');
      }
      return {
        text: "Navigating you to our **Pricing & Pro** page! Convert-X offers affordable Monthly and Yearly plans with higher file size limits and batch processing.",
      };
    }

    if (q.includes('open text to pdf') || q.includes('take me to text to pdf')) {
      if (onNavigate) {
        onNavigate('text-to-pdf');
      }
      return {
        text: "Opening **Text to PDF Studio** for you now!",
      };
    }

    if (q.includes('referral') || q.includes('bonus') || q.includes('invite')) {
      if (onNavigate) {
        onNavigate('referral');
      }
      return {
        text: "Opening the **Referrals & Rewards** page! For every friend you refer who uses Convert-X, you both receive bonus free conversions!",
      };
    }

    // Default intelligent fallback
    return {
      text: "I can help with file conversions (PDF, PNG, JPG, WebP, SVG, DXF, DOCX, XLSX), compression parameters, Text to PDF typesetting, and workspace limits. What would you like to do?",
      suggestions: [
        { label: 'Explore All Tools', query: 'Show all conversion tools' },
        { label: 'Check File Limits', query: 'What are the file limits?' },
        { label: 'Format Advice', query: 'What format should I use?' },
      ],
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    setTimeout(() => {
      const response = generateFizaResponse(query);
      const botMsg: Message = {
        id: `fiza-${Date.now()}`,
        sender: 'fiza',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: response.suggestions,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 450);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <aside aria-label="Fiza AI Conversion Assistant" className="pointer-events-none">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          id="fiza-ai-launcher-btn"
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Fiza AI Conversion Assistant"
          className="fixed bottom-4 right-2.5 sm:bottom-6 sm:right-6 z-40 p-3 sm:p-3.5 rounded-full bg-gradient-to-r from-[#2563EB] via-indigo-600 to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 text-white shadow-xl shadow-blue-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer pointer-events-auto group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB]"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900" />
          </div>
          <span className="text-xs font-bold tracking-wide pr-1 hidden xs:inline">Ask Fiza AI</span>
        </button>
      )}

      {/* Floating Chat Widget Window */}
      {isOpen && (
        <div
          id="fiza-ai-chat-window"
          role="dialog"
          aria-label="Fiza AI Assistant Chat"
          className="fixed z-50 bottom-2.5 right-2.5 sm:bottom-6 sm:right-6 pointer-events-auto bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 w-[calc(100vw-20px)] max-w-[420px] h-[min(550px,calc(100vh-30px))] sm:w-[420px] sm:max-w-[calc(100vw-40px)]"
          style={{
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-[#7C3AED] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-xs sm:text-sm tracking-tight truncate">Fiza AI Assistant</h3>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-bold border border-emerald-400/30">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-blue-100 truncate">Convert-X Format & Conversion Expert</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMessages([
                    {
                      id: `welcome-${Date.now()}`,
                      sender: 'fiza',
                      text: "Chat cleared! How can I assist you with your conversions today?",
                      timestamp: 'Just now',
                    },
                  ]);
                }}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="fiza-close-btn"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Assistant"
                aria-label="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-2.5 sm:p-3.5 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-[#0B1120]/50 text-xs">
            {messages.map((msg) => {
              const isBot = msg.sender === 'fiza';
              return (
                <div key={msg.id} className={`flex gap-2 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}>
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isBot
                        ? 'bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-400'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>

                  <div className={`space-y-1.5 max-w-[85%] sm:max-w-[80%]`}>
                    <div
                      className={`p-2.5 sm:p-3 rounded-2xl text-xs leading-relaxed break-words [overflow-wrap:anywhere] ${
                        isBot
                          ? 'bg-white dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xs rounded-tl-xs'
                          : 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white rounded-tr-xs shadow-xs'
                      }`}
                    >
                      {/* Formatted body with bold and line break support */}
                      <div className="whitespace-pre-wrap">
                        {msg.text.split('\n').map((line, idx) => {
                          const parts = line.split(/(\*\*.*?\*\*)/g);
                          return (
                            <p key={idx} className={idx > 0 ? 'mt-1' : ''}>
                              {parts.map((part, pIdx) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return (
                                    <strong key={pIdx} className="font-extrabold">
                                      {part.slice(2, -2)}
                                    </strong>
                                  );
                                }
                                return part;
                              })}
                            </p>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive suggestions pills */}
                    {isBot && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => {
                              if (sug.action) {
                                sug.action();
                              } else if (sug.query) {
                                handleSendMessage(sug.query);
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/40 text-[#2563EB] dark:text-blue-300 text-[10px] sm:text-[11px] font-bold text-left transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>{sug.label}</span>
                            <ArrowRight className="w-2.5 h-2.5 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    <span className={`block text-[9px] text-[#94A3B8] ${isBot ? 'text-left' : 'text-right'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-[#2563EB] flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-2.5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-1 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Send Bar */}
          <div className="p-2 sm:p-2.5 bg-white dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#1E293B] shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5 sm:gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                id="fiza-chat-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about formats, limits, or tools..."
                className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-[#2563EB] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none transition-all"
              />
              <button
                type="submit"
                id="fiza-chat-send-btn"
                disabled={!inputMessage.trim()}
                className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-violet-600 disabled:opacity-40 text-white transition-all shrink-0 cursor-pointer shadow-xs disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="flex items-center justify-between pt-1 px-1 text-[9px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" /> Real-time conversion intelligence
              </span>
              <span>Convert-X AI</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
