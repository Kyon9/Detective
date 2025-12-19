
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clue, Message, AgentResponse } from './types';
import { INITIAL_CASE } from './constants';
import { getDetectiveResponse, generateClueVisual } from './services/geminiService';
import ClueBoard from './components/ClueBoard';
import ClueDetail from './components/ClueDetail';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [caseContext] = useState(INITIAL_CASE.initialContext);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text }]
      }));

      const response: AgentResponse = await getDetectiveResponse(history, userMessage.text, caseContext);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.message,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Process new clues
      if (response.newClues && response.newClues.length > 0) {
        for (const clueData of response.newClues) {
          let content = clueData.contentText || '';
          
          if (clueData.type === 'image' || clueData.type === 'map') {
            const visual = await generateClueVisual(clueData.contentPrompt || clueData.title);
            content = visual || 'https://picsum.photos/400/400?grayscale';
          }

          const newClue: Clue = {
            id: Math.random().toString(36).substr(2, 9),
            title: clueData.title,
            description: clueData.description,
            type: clueData.type,
            content: content,
            timestamp: Date.now()
          };
          setClues(prev => [newClue, ...prev]);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-600 rounded flex items-center justify-center shadow-inner">
            <span className="text-2xl">🕵️</span>
          </div>
          <div>
            <h1 className="text-xl font-bold typewriter-font tracking-tight text-amber-500">黑色侦探</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">案件：{INITIAL_CASE.title}</p>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="text-right hidden md:block">
              <p className="text-xs text-slate-400 font-semibold">案发地点</p>
              <p className="text-xs text-slate-500">{INITIAL_CASE.location}</p>
           </div>
           <div className="flex items-center">
             <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></span>
             <span className="text-[10px] font-bold text-slate-400 uppercase">系统在线</span>
           </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
          
          {/* Chat Display */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {/* Initial Case Prompt */}
            <div className="bg-slate-900/80 border border-amber-900/30 p-6 rounded-lg shadow-xl max-w-3xl mx-auto mb-10">
              <div className="flex items-center gap-2 mb-4 border-b border-amber-900/20 pb-2">
                 <span className="text-amber-600 font-bold typewriter-font text-lg">官方结案报告/案卷</span>
              </div>
              <p className="typewriter-font text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                {caseContext}
              </p>
            </div>

            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-[80%] p-4 rounded-2xl shadow-md
                  ${msg.role === 'user' 
                    ? 'bg-amber-700 text-white rounded-tr-none' 
                    : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none typewriter-font'
                  }
                `}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <span className="text-[10px] opacity-50 mt-2 block">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl rounded-tl-none animate-pulse">
                   <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                   </div>
                   <p className="text-[10px] text-slate-500 mt-1">分析中...</p>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md">
            <form 
              onSubmit={handleSendMessage}
              className="max-w-4xl mx-auto flex gap-3"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="向助手提问，或指示我去调查现场..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-6 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all flex items-center gap-2"
              >
                {isLoading ? '调查中' : '发送'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar for Clues */}
        <aside className="w-80 hidden lg:block">
          <ClueBoard clues={clues} onSelectClue={setSelectedClue} />
        </aside>
      </div>

      {/* Clue Detail Modal */}
      <ClueDetail clue={selectedClue} onClose={() => setSelectedClue(null)} />
    </div>
  );
};

export default App;
