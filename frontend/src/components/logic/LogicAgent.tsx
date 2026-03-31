import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Bot, X, Terminal, ChevronRight, ChevronDown,
  Sparkles, MessageCircle, Users, FolderOpen, Phone, HelpCircle,
} from 'lucide-react';
import { useLogic } from '../../hooks/useLogic';

interface LogicAgentProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const FAQ_ITEMS = [
  { icon: <Sparkles size={15} />, label: 'Դասընթացներ', question: 'Ի՞նչ դասընթացներ ունեք:', color: 'faq-yellow' },
  { icon: <Users size={15} />, label: 'Դասախոսներ', question: 'Ովքե՞ր են դասախոսները:', color: 'faq-blue' },
  { icon: <FolderOpen size={15} />, label: 'Նախագծեր', question: 'Տեսնել ուսանողական նախագծերը:', color: 'faq-green' },
  { icon: <Phone size={15} />, label: 'Կապ', question: 'Ինչպե՞ս կապվել ձեզ հետ:', color: 'faq-purple' },
];

const QUICK_CHIPS = ['Գին', 'Ժամանակացույց', 'Հավաստագիր', 'Անվճար'];

const LogicAgent: React.FC<LogicAgentProps> = ({ isOpen, setIsOpen }) => {
  const [input, setInput] = useState('');
  const [showFAQ, setShowFAQ] = useState(true);
  const { messages, isLoading, sendMessage } = useLogic();
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

  const handleFAQ = (question: string) => {
    if (isLoading) return;
    sendMessage(question);
  };

  return (
    <>
      <style>{`
        .faq-card {
          position: relative;
          overflow: hidden;
          cursor: pointer;
          border: 1.5px solid transparent;
          border-radius: 14px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 11px;
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          background: var(--gray-dark);
          text-align: left;
          width: 100%;
        }
        .faq-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,0.4); }
        .faq-card:active { transform: scale(0.97); }
        .faq-card:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; }

        .faq-yellow { border-color: rgba(255,215,0,0.18); }
        .faq-yellow:hover { border-color: rgba(255,215,0,0.55); background: rgba(255,215,0,0.06); }
        .faq-yellow .faq-icon-wrap { background: rgba(255,215,0,0.14); color: #ffd700; }
        .faq-yellow .faq-arrow { color: #ffd700; }

        .faq-blue { border-color: rgba(99,179,237,0.18); }
        .faq-blue:hover { border-color: rgba(99,179,237,0.55); background: rgba(99,179,237,0.06); }
        .faq-blue .faq-icon-wrap { background: rgba(99,179,237,0.14); color: #63b3ed; }
        .faq-blue .faq-arrow { color: #63b3ed; }

        .faq-green { border-color: rgba(72,187,120,0.18); }
        .faq-green:hover { border-color: rgba(72,187,120,0.55); background: rgba(72,187,120,0.06); }
        .faq-green .faq-icon-wrap { background: rgba(72,187,120,0.14); color: #48bb78; }
        .faq-green .faq-arrow { color: #48bb78; }

        .faq-purple { border-color: rgba(159,122,234,0.18); }
        .faq-purple:hover { border-color: rgba(159,122,234,0.55); background: rgba(159,122,234,0.06); }
        .faq-purple .faq-icon-wrap { background: rgba(159,122,234,0.14); color: #9f7aea; }
        .faq-purple .faq-arrow { color: #9f7aea; }

        .faq-icon-wrap {
          width: 32px; height: 32px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: transform 0.2s ease;
        }
        .faq-card:hover .faq-icon-wrap { transform: scale(1.1); }
        .faq-arrow { margin-left: auto; flex-shrink: 0; transition: transform 0.22s ease; }
        .faq-card:hover .faq-arrow { transform: translateX(3px); }

        /* Collapse */
        .faq-collapse-wrapper {
          display: grid;
          grid-template-rows: 1fr;
          transition: grid-template-rows 0.32s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.25s ease;
          opacity: 1;
        }
        .faq-collapse-wrapper.faq-closed {
          grid-template-rows: 0fr;
          opacity: 0;
          pointer-events: none;
        }
        .faq-collapse-inner { overflow: hidden; }

        /* Toggle button */
        .faq-toggle-btn {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 9px 13px; border-radius: 12px;
          background: rgba(255,215,0,0.06);
          border: 1px solid rgba(255,215,0,0.14);
          cursor: pointer; transition: all 0.2s ease;
        }
        .faq-toggle-btn:hover { background: rgba(255,215,0,0.11); border-color: rgba(255,215,0,0.3); }
        .faq-chevron { transition: transform 0.3s cubic-bezier(0.4,0,0.2,1); }
        .faq-chevron.open  { transform: rotate(0deg); }
        .faq-chevron.closed { transform: rotate(-90deg); }

        /* Quick chips */
        .quick-chips { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 10px; }
        .quick-chip {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 20px; padding: 5px 13px;
          font-size: 11px; color: var(--gray-light);
          cursor: pointer; transition: all 0.18s ease;
          font-weight: 600; letter-spacing: 0.02em;
        }
        .quick-chip:hover { background: rgba(255,215,0,0.09); border-color: rgba(255,215,0,0.38); color: #ffd700; }
        .quick-chip:disabled { opacity: 0.35; cursor: not-allowed; }

        .faq-badge {
          font-size: 10px; font-weight: 700;
          background: rgba(255,215,0,0.1); color: rgba(255,215,0,0.6);
          border-radius: 20px; padding: 3px 8px;
        }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* FAB Toggle */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 left-8 z-[100] w-20 h-20 bg-primary-alt text-black rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,215,0,0.4)] border-4 border-black hover:scale-110 active:scale-95 transition-[var(--transition)]"
          aria-label="Activate Logic AI"
        >
          <Bot size={40} />
          <span className="absolute -top-1 -right-1 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75" />
            <span className="relative inline-flex rounded-full h-6 w-6 bg-[var(--success)]" />
          </span>
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen flex flex-col bg-black border-r border-gray-dark shadow-[20px_0_50px_rgba(0,0,0,0.5)] transition-[var(--transition)] ${
          isOpen ? 'w-full md:w-[440px] translate-x-0 z-[150]' : '-translate-x-full z-[90]'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 p-6 md:p-7 border-b border-gray-dark bg-gray-dark flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-12 h-12 bg-primary-alt text-black rounded-full flex items-center justify-center shadow-[0_0_28px_rgba(255,215,0,0.35)] border-4 border-black">
                <Bot size={24} />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[var(--success)]" />
              </span>
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tighter leading-none">LOGIC AGENT</h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                <p className="text-[9px] text-[var(--gray-light)] opacity-55 font-mono uppercase tracking-[0.2em]">v1</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--gray-light)] hover:bg-black hover:text-primary transition-[var(--transition)]"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 md:p-7 space-y-5 bg-black scrollbar-hide min-h-0"
          style={{ scrollBehavior: 'smooth' }}
        >
          {messages.length === 0 && (
            <div className="text-center pt-8 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[rgba(255,215,0,0.09)] border border-[rgba(255,215,0,0.18)] mb-4">
                <MessageCircle size={24} className="text-primary-alt" />
              </div>
              <h4 className="text-white text-lg font-black mb-2.5 tracking-tight">ԻՆՉՊԵ՞Ս ԿԱՐՈՂ ԵՄ ՕԳՆԵԼ</h4>
              <p className="text-[var(--gray-light)] opacity-55 text-sm px-6 leading-relaxed">
                Ես ձեր LOGIC նավիգացիոն օգնականն եմ։ Հարցրեք ինձ դասընթացների, դասախոսների կամ LogicLab-ի մասին։
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed font-semibold shadow-xl ${
                  msg.role === 'user'
                    ? 'bg-primary-alt text-black rounded-tr-none'
                    : 'bg-gray-dark text-white border border-[rgba(255,255,255,0.06)] rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[9px] text-[var(--gray-light)] opacity-30 mt-1.5 font-mono uppercase tracking-[0.15em]">
                {msg.role === 'user' ? 'YOU' : 'LOGIC.CORE'}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start animate-in fade-in duration-300">
              <div className="bg-gray-dark border border-[rgba(255,255,255,0.06)] p-4 rounded-2xl rounded-tl-none shadow-xl">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-primary-alt rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-primary-alt rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-primary-alt rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Persistent FAQ Panel (always visible, collapsible) ── */}
        <div className="shrink-0 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.35)] px-5 md:px-6 pt-3.5 pb-3">
          {/* Toggle */}
          <button
            className="faq-toggle-btn"
            onClick={() => setShowFAQ(v => !v)}
            aria-expanded={showFAQ}
          >
            <HelpCircle size={13} className="text-primary-alt shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-alt flex-1 text-left">
              Հաճախ տրվող հարցեր
            </span>
            {!showFAQ && <span className="faq-badge">{FAQ_ITEMS.length}</span>}
            <ChevronDown
              size={13}
              className={`faq-chevron text-primary-alt opacity-70 ${showFAQ ? 'open' : 'closed'}`}
            />
          </button>

          {/* Collapsible body */}
          <div className={`faq-collapse-wrapper ${showFAQ ? '' : 'faq-closed'}`}>
            <div className="faq-collapse-inner">
              <div className="grid grid-cols-1 gap-2 pt-3">
                {FAQ_ITEMS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleFAQ(item.question)}
                    disabled={isLoading}
                    className={`faq-card ${item.color}`}
                  >
                    <div className="faq-icon-wrap">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm leading-tight">{item.label}</div>
                      <div className="text-[var(--gray-light)] opacity-50 text-xs mt-0.5 truncate">{item.question}</div>
                    </div>
                    <ChevronRight size={13} className="faq-arrow" />
                  </button>
                ))}
              </div>
              <div className="quick-chips pb-2">
                {QUICK_CHIPS.map((chip, i) => (
                  <button key={i} className="quick-chip" onClick={() => handleFAQ(chip)} disabled={isLoading}>
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 p-5 md:p-6 border-t border-gray-dark bg-gray-dark">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Մուտքագրեք հրամանը..."
              rows={1}
              className="w-full bg-black border-2 border-gray-dark text-white text-sm rounded-2xl p-4 pr-14 focus:outline-none focus:border-primary transition-[var(--transition)] resize-none shadow-inner min-h-[54px] font-semibold placeholder:opacity-35"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-[var(--transition)] ${
                input.trim() && !isLoading
                  ? 'bg-primary text-primary-alt shadow-[0_0_18px_rgba(255,215,0,0.28)] hover:scale-105 active:scale-95'
                  : 'bg-[rgba(255,255,255,0.05)] text-[var(--gray-light)] opacity-35 cursor-not-allowed'
              }`}
            >
              <Send size={17} />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3.5">
            <Terminal size={10} className="text-primary-alt opacity-40" />
            <p className="text-[9px] text-[var(--gray-light)] opacity-25 font-black uppercase tracking-[0.25em]">
              LogicLab v1
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogicAgent;