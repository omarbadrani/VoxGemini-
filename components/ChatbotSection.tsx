
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { createChatSession } from '../services/geminiService';
import { ChatMessage } from '../types';
import { TranslationKeys } from '../utils/i18n';

interface ChatbotProps {
  t: TranslationKeys;
}

export const ChatbotSection: React.FC<ChatbotProps> = ({ t }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatSessionRef.current = createChatSession();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatSessionRef.current.sendMessage({ message: userMsg.content });
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 glass rounded-3xl flex flex-col h-[600px] border border-white/5 shadow-2xl">
      <h2 className="text-xl font-black mb-6 flex items-center gap-2">
        <span className="text-purple-400">Gemini 3 Pro</span> {t.chat}
      </h2>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto mb-6 space-y-4 pr-2 custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="text-zinc-500 text-center mt-20">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-xs font-bold uppercase tracking-widest">{t.chatWithGemini}</p>
          </div>
        )}
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-[24px] px-5 py-3 ${
              msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-100'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl px-4 py-3 animate-pulse flex gap-2">
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.askAnything}
          className="flex-1 bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all"
        />
        <Button type="submit" isLoading={isLoading} className="px-8 rounded-2xl font-black bg-indigo-600 hover:bg-indigo-500">
          {t.send}
        </Button>
      </form>
    </div>
  );
};
