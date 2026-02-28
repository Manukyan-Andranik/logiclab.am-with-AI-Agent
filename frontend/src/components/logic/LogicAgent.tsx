import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, X, Terminal, ChevronRight, MessageSquare, Mic } from 'lucide-react';
import { useNexus } from '../../hooks/useLogic';
import Loader from '../ui/Loader';

interface LogicAgentProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const LogicAgent: React.FC<LogicAgentProps> = ({ isOpen, setIsOpen }) => {
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage } = useNexus();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const content = input;
    setInput('');
    await sendMessage(content);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Logic Toggle Button (Mobile/Collapsed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 left-8 z-[100] w-20 h-20 bg-[var(--primary-alt)] text-[var(--black)] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,215,0,0.4)] border-4 border-[var(--black)] hover:scale-110 active:scale-95 transition-[var(--transition)]"
          aria-label="Activate Logic AI"
        >
          <Bot size={40} />
          <span className="absolute -top-1 -right-1 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-[var(--success)]"></span>
          </span>
        </button>
      )}

      {/* Main Sidebar Agent */}
      <div
        className={`fixed top-0 left-0 h-screen transition-[var(--transition)] flex flex-col bg-[var(--black)] border-r border-[var(--gray-dark)] shadow-[20px_0_50px_rgba(0,0,0,0.5)] ${
          isOpen 
            ? 'w-full md:w-[420px] translate-x-0 z-[150]' 
            : '-translate-x-full z-[90]'
        }`}
      >
        {/* Header */}
        <div className="p-8 border-b border-[var(--gray-dark)] bg-[var(--gray-dark)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">

            <button
              onClick={() => setIsOpen(true)}
              className=" w-14 h-14 md:w-16 md:h-16 bg-[var(--primary-alt)] text-[var(--black)] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,215,0,0.4)] border-4 border-[var(--black)] hover:scale-110 active:scale-95 transition-[var(--transition)] shrink-0"
              aria-label="Activate Logic AI"
            >
              <Bot size={32} />
              <span className="absolute -top-1 -right-1 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-[var(--success)]"></span>
              </span>
            </button>


            <div className="shrink-0">
              <h3 className="text-lg font-black text-[var(--white)] tracking-tighter">LOGIC AGENT</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse"></span>
                <p className="text-[9px] text-[var(--gray-light)] opacity-60 font-mono uppercase tracking-[0.2em]">Neural Link</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--gray-light)] hover:bg-[var(--black)] hover:text-[var(--primary)] transition-[var(--transition)] shrink-0"
            aria-label="Minimize Logic"
          >
            <X size={24} />
          </button>
        </div>

{/* Chat Area */}
<div
  ref={scrollRef}
  className="flex-1 overflow-y-auto p-8 space-y-8 bg-[var(--black)] scrollbar-hide"
  style={{ scrollBehavior: 'smooth' }}
>
  {/* Empty State */}
  {messages.length === 0 && (
    <div className="text-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h4 className="text-[var(--white)] text-2xl font-black mb-4 tracking-tight">
        ԻՆՉՊԵ՞Ս ԿԱՐՈՂ ԵՄ ՕԳՆԵԼ
      </h4>
      <p className="text-[var(--gray-light)] opacity-70 text-base px-6 leading-relaxed font-medium">
        Ես ձեր LOGIC նավիգացիոն օգնականն եմ: Հարցրեք ինձ դասընթացների, դասախոսների կամ LogicLab-ի մասին:
      </p>

      <div className="mt-12 grid grid-cols-1 gap-3">
        {[
          'Ի՞նչ դասընթացներ ունեք:',
          'Ովքե՞ր են դասախոսները:',
          'Ինչպե՞ս կապվել ձեզ հետ:',
        ].map((hint, idx) => (
          <button
            key={idx}
            onClick={() => setInput(hint)}
            className="p-4 rounded-xl border border-[var(--gray-dark)] bg-[var(--gray-dark)] hover:border-[var(--primary-alt)] hover:bg-[var(--gray-dark)] text-[var(--white)] text-sm font-bold text-left flex items-center justify-between group transition-all duration-300"
          >
            <span>{hint}</span>
            <ChevronRight
              size={16}
              className="text-[var(--primary-alt)] transition-transform duration-300 group-hover:translate-x-1"
            />
          </button>
        ))}
      </div>
    </div>
  )}

  {/* Messages */}
  {messages.map((msg, i) => (
    <div
      key={i}
      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div
        className={`max-w-[85%] p-5 rounded-2xl text-base leading-relaxed font-semibold shadow-xl ${
          msg.role === 'user'
            ? 'bg-[var(--primary-alt)] text-[var(--black)] rounded-tr-none'
            : 'bg-[var(--gray-dark)] text-[var(--white)] border border-[var(--gray-dark)] rounded-tl-none'
        }`}
      >
        {msg.content}
      </div>
      <span className="text-[10px] text-[var(--gray-light)] opacity-40 mt-2 font-mono uppercase tracking-[0.2em]">
        {msg.role === 'user' ? 'CLIENT.INPUT' : 'LOGIC.CORE'}
      </span>
    </div>
  ))}

  {/* Typing Indicator */}
  {isLoading && (
    <div className="flex items-start animate-in fade-in duration-300">
      <div className="bg-[var(--gray-dark)] border border-[var(--gray-dark)] p-5 rounded-2xl rounded-tl-none shadow-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-[var(--primary-alt)] rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-[var(--primary-alt)] rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-[var(--primary-alt)] rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  )}
</div>

        {/* Input Area */}
        <div className="p-8 border-t border-[var(--gray-dark)] bg-[var(--gray-dark)]">
          <div className="relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Մուտքագրեք հրամանը..."
              rows={1}
              className="w-full bg-[var(--black)] border-2 border-[var(--gray-dark)] text-[var(--white)] text-base rounded-2xl p-5 pr-16 focus:outline-none focus:border-[var(--primary)] transition-[var(--transition)] resize-none shadow-inner min-h-[64px] flex items-center font-bold"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className={`absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center transition-[var(--transition)] ${input.trim() && !isLoading
                ? 'bg-[var(--primary)] text-[var(--black)] shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:scale-105 active:scale-95'
                : 'bg-[var(--gray-dark)] text-[var(--gray-light)] opacity-50'
                }`}
            >
              <Send size={22} />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-6">
            <Terminal size={12} className="text-[var(--primary-alt)]" />
            <p className="text-[10px] text-[var(--gray-light)] opacity-40 font-black uppercase tracking-[0.3em]">
              LogicLab OS v4.0.2 - Conversational UI
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogicAgent;
