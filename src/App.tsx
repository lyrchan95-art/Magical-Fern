/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Sparkles, 
  Download, 
  Leaf, 
  Image as ImageIcon, 
  Loader2,
  Trash2,
  Plus,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import { refinePlantPrompt, generatePlantImage, type GeneratedFlora } from './services/geminiService';
import { MAGICAL_ELEMENTS, POSITIVE_QUOTES } from './constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  flora?: GeneratedFlora;
  isGenerating?: boolean;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Welcome to **Flora Fantastica**. Combine elements like *'glowing mushrooms + fairy houses'* or *'glass-leaf trees + rainbow light'* to cultivate your magical garden. What shall we grow today?",
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [selectedQuote, setSelectedQuote] = useState(POSITIVE_QUOTES[0]);
  const [gallery, setGallery] = useState<GeneratedFlora[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: "Refining your vision and calling the spirits of the garden...",
      isGenerating: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      const refined = await refinePlantPrompt(input);
      const imageUrl = await generatePlantImage(refined);
      
      const newFlora: GeneratedFlora = {
        id: Math.random().toString(36).substr(2, 9),
        prompt: input,
        refinedPrompt: refined,
        imageUrl: imageUrl,
        timestamp: Date.now(),
      };

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { 
              ...msg, 
              content: `Behold! Your **${input}** has bloomed.`, 
              isGenerating: false,
              flora: newFlora 
            } 
          : msg
      ));

      setGallery(prev => [newFlora, ...prev]);
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { 
              ...msg, 
              content: "Alas, the garden spirits are shy today. Please try again.", 
              isGenerating: false 
            } 
          : msg
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuildCard = () => {
    const elementsStr = selectedElements.join(' + ');
    const fullPrompt = `A magical illustration featuring ${elementsStr}. Include the quote: "${selectedQuote}" center-aligned with large, legible text.`;
    setInput(fullPrompt);
    setIsModalOpen(false);
    setSelectedElements([]);
  };

  const toggleElement = (el: string) => {
    setSelectedElements(prev => 
      prev.includes(el) ? prev.filter(e => e !== el) : [...prev, el]
    );
  };

  const downloadImage = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `flora-${name.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row magic-gradient">
      {/* Sidebar / Gallery */}
      <aside className="w-full md:w-80 lg:w-96 border-r border-white/10 bg-black/20 backdrop-blur-md flex flex-col h-[40vh] md:h-screen">
        <div className="p-6 border-bottom border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-magic-accent flex items-center justify-center shadow-lg shadow-magic-accent/20">
              <Leaf className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold tracking-tight">Flora</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 font-sans">Fantastica</p>
            </div>
          </div>
          <button 
            onClick={() => setGallery([])}
            className="p-2 hover:bg-white/5 rounded-full transition-colors opacity-40 hover:opacity-100"
            title="Clear Gallery"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40 px-2 mb-2">Your Collection</h2>
          {gallery.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center p-6 opacity-30">
              <ImageIcon size={32} className="mb-2" />
              <p className="text-sm italic font-serif">The garden is waiting to be planted...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {gallery.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5 cursor-pointer"
                    onClick={() => downloadImage(item.imageUrl, item.prompt)}
                  >
                    <img 
                      src={item.imageUrl} 
                      alt={item.prompt}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Download className="text-white w-6 h-6" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-[60vh] md:h-screen relative">
        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col max-w-2xl",
                  message.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "p-4 md:p-6 rounded-3xl",
                  message.role === 'user' 
                    ? "bg-magic-accent text-white rounded-tr-none" 
                    : "glass-panel rounded-tl-none"
                )}>
                  <div className="markdown-body font-serif text-lg leading-relaxed">
                    <Markdown>{message.content}</Markdown>
                  </div>
                </div>

                {message.isGenerating && (
                  <div className="mt-4 flex items-center gap-3 text-magic-accent/60 italic font-serif">
                    <Loader2 className="animate-spin" size={18} />
                    <span>Cultivating your flora...</span>
                  </div>
                )}

                {message.flora && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6 glass-panel p-2 overflow-hidden group"
                  >
                    <div className="relative aspect-square w-full max-w-md rounded-2xl overflow-hidden">
                      <img 
                        src={message.flora.imageUrl} 
                        alt={message.flora.prompt}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={() => downloadImage(message.flora!.imageUrl, message.flora!.prompt)}
                        className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                      >
                        <Download size={20} />
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Refined Vision</p>
                      <p className="text-xs italic opacity-60 line-clamp-2">{message.flora.refinedPrompt}</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 md:p-12 pt-0">
          <form 
            onSubmit={handleSend}
            className="max-w-3xl mx-auto relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-magic-accent to-emerald-500 rounded-[2rem] blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
            <div className="relative flex items-center glass-panel p-2 pl-6">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="p-2 mr-2 hover:bg-white/10 rounded-xl transition-colors text-magic-accent"
                title="Mix & Match Elements"
              >
                <Plus size={24} />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Combine glowing mushrooms + fairy houses..."
                className="flex-1 bg-transparent border-none outline-none py-4 font-serif text-xl placeholder:opacity-30"
                disabled={isProcessing}
              />
              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                  input.trim() && !isProcessing 
                    ? "bg-magic-accent text-white shadow-lg shadow-magic-accent/40 hover:scale-105 active:scale-95" 
                    : "bg-white/5 text-white/20"
                )}
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={24} />}
              </button>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2 justify-center opacity-40">
              {['Crystal Ferns', 'Moonlight Vines', 'Nebula Orchids', 'Clockwork Roses'].map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="text-[10px] uppercase tracking-widest px-3 py-1 border border-white/20 rounded-full hover:bg-white/10 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </form>
        </div>
      </main>

      {/* Prompt Builder Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl glass-panel bg-zinc-900/90 p-8 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-serif text-3xl font-semibold">Mix & Match</h2>
                  <p className="text-xs uppercase tracking-widest opacity-40">Create a surreal magical illustration</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full opacity-40 hover:opacity-100"
                >
                  <Plus className="rotate-45" />
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold opacity-60 mb-4 flex items-center gap-2">
                    <Sparkles size={14} /> Select Magical Elements
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {MAGICAL_ELEMENTS.map(el => (
                      <button
                        key={el}
                        onClick={() => toggleElement(el)}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs transition-all border",
                          selectedElements.includes(el)
                            ? "bg-magic-accent border-magic-accent text-white shadow-lg shadow-magic-accent/20"
                            : "bg-white/5 border-white/10 opacity-60 hover:opacity-100"
                        )}
                      >
                        {el}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold opacity-60 mb-4 flex items-center gap-2">
                    <Leaf size={14} /> Choose a Positive Quote
                  </h3>
                  <select
                    value={selectedQuote}
                    onChange={(e) => setSelectedQuote(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-serif text-lg outline-none focus:border-magic-accent transition-colors appearance-none"
                  >
                    {POSITIVE_QUOTES.map(quote => (
                      <option key={quote} value={quote} className="bg-zinc-900 text-white">
                        {quote}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleBuildCard}
                  disabled={selectedElements.length === 0}
                  className={cn(
                    "w-full py-4 rounded-2xl font-serif text-xl transition-all",
                    selectedElements.length > 0
                      ? "bg-magic-accent text-white shadow-xl shadow-magic-accent/30 hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-white/5 text-white/20 cursor-not-allowed"
                  )}
                >
                  Infuse Magic into Illustration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
