
import React, { useState, useRef, useEffect } from 'react';
import { Clue, Message, AgentResponse, Case } from './types';
import { ALL_CASES } from './constants';
import { getDetectiveResponse, testConnection } from './services/geminiService';
import ClueBoard from './components/ClueBoard';
import ClueDetail from './components/ClueDetail';
import SaveModal from './components/SaveModal';

const App: React.FC = () => {
  const [currentCase, setCurrentCase] = useState<Case>(ALL_CASES[ALL_CASES.length - 1]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'save' | 'load' | 'cases'>('save');
  const [solvedSummary, setSolvedSummary] = useState<string | null>(null);
  const [newCluePing, setNewCluePing] = useState(false);
  
  const [netStatus, setNetStatus] = useState<'testing' | 'ok' | 'fail' | 'restricted'>('testing');
  const scrollRef = useRef<HTMLDivElement>(null);

  const initCase = (targetCase: Case) => {
    setCurrentCase(targetCase);
    const isDHill = targetCase.id === 'case-004';
    const introText = isDHill 
      ? `明智，你终于来了。那晚我们在“白梅轩”咖啡厅坐着的时候，谁也没想到对面的旧书店会发生这种事。我把目前已知的现场细节都整理在简报里了。`
      : `我们已到达现场：${targetCase.location}。${targetCase.title} 的勘查工作正式开始。请查看初始简报获取已知情报。`;

    const intro: Message = {
      id: 'intro-' + Date.now(),
      role: 'assistant',
      text: introText,
      timestamp: Date.now()
    };
    setMessages([intro]);

    const initialClue: Clue = {
      id: 'clue-initial-' + targetCase.id,
      title: isDHill ? `现场第一目击报告` : `初始勘查`,
      description: isDHill ? '关于那个闷热夜晚的详细回忆。' : '进入现场后发现的初步信息。',
      type: 'text',
      content: targetCase.initialContext,
      timestamp: Date.now()
    };
    setClues([initialClue]);
    setSolvedSummary(null);
  };

  useEffect(() => {
    checkConnection();
    initCase(ALL_CASES[ALL_CASES.length - 1]);
  }, []);

  const checkConnection = async () => {
    setNetStatus('testing');
    try {
      const result = await testConnection();
      if (result.ok) setNetStatus('ok');
      else if (result.error?.includes('LOCATION')) setNetStatus('restricted');
      else setNetStatus('fail');
    } catch (e) {
      setNetStatus('fail');
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading || solvedSummary) return;

    const userMsgText = inputText;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userMsgText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.text }]
      }));

      const response: AgentResponse = await getDetectiveResponse(
        history, 
        userMsgText, 
        { 
          initialContext: currentCase.initialContext, 
          fullScript: currentCase.fullScript 
        },
        clues.map(c => c.title)
      );
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.message || "由于现场环境干扰，明智的话被淹没了。请尝试换个方式询问。",
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.isSolved) {
        setSolvedSummary(response.solveSummary || "真相已被揭开。");
      }

      if (response.newClues && response.newClues.length > 0) {
        setClues(prevClues => {
          const updatedClues = [...prevClues];
          let added = false;
          response.newClues!.forEach(clueData => {
            if (!updatedClues.some(c => c.title === clueData.title)) {
              updatedClues.unshift({
                id: Math.random().toString(36).substr(2, 9),
                title: clueData.title,
                description: clueData.description,
                type: clueData.type,
                content: clueData.contentText || '',
                timestamp: Date.now()
              });
              added = true;
            }
          });
          if (added) {
            setNewCluePing(true);
            setTimeout(() => setNewCluePing(false), 1500);
          }
          return updatedClues;
        });
      }
    } catch (error: any) {
      console.error("Communication error:", error);
      const errorMsg = error.message?.includes('500') || error.message?.includes('xhr')
        ? "⚠️ [通讯链路崩溃] 网络连接不稳定或 API 响应超时。明智，请检查你的网络环境或稍后再试。"
        : "⚠️ [现场干扰] 信号突然切断，无法接收到进一步的回应。";
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        text: errorMsg,
        timestamp: Date.now()
      }]);
      setNetStatus('fail');
    } finally {
      setIsLoading(false);
    }
  };

  const onSaveToSlot = (caseId: string, slot: number) => {
    const saveData = {
      currentCaseId: currentCase.id,
      messages,
      clues,
      timestamp: Date.now(),
      preview: messages.length > 0 ? messages[messages.length - 1].text.substring(0, 50) : "新案件开始"
    };
    localStorage.setItem(`detective_save_${caseId}_slot_${slot}`, JSON.stringify(saveData));
    setSaveStatus(`进度已同步至存档 ${slot}`);
    setTimeout(() => setSaveStatus(null), 3000);
    setModalOpen(false);
  };

  const onLoadFromSlot = (caseId: string, slot: number) => {
    const saved = localStorage.getItem(`detective_save_${caseId}_slot_${slot}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const targetCase = ALL_CASES.find(c => c.id === data.currentCaseId) || ALL_CASES[0];
        setCurrentCase(targetCase);
        setMessages(data.messages);
        setClues(data.clues);
        setSolvedSummary(null);
        setSaveStatus(`正在加载现场进度...`);
        setTimeout(() => setSaveStatus(null), 3000);
        setModalOpen(false);
      } catch (e) {
        setSaveStatus("数据损坏");
      }
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center shadow-2xl z-20">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-slate-800 border ${netStatus === 'fail' ? 'border-red-900' : 'border-amber-900/50'} rounded flex items-center justify-center`}>
            <span className={`text-2xl filter contrast-125 grayscale ${netStatus === 'fail' ? 'opacity-50' : ''}`}>🕵️</span>
          </div>
          <div>
            <h1 className="text-xl font-bold typewriter-font text-amber-500 uppercase tracking-widest">
              {currentCase.id === 'case-004' ? 'D坂杀人事件' : '黑色侦探'}
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">现场：{currentCase.location}</p>
              {netStatus === 'fail' && (
                <button onClick={checkConnection} className="text-[9px] text-red-500 font-bold underline animate-pulse">重连</button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setModalMode('cases'); setModalOpen(true); }}
            className="px-4 py-2 text-xs font-bold bg-amber-900/20 text-amber-400 border border-amber-900/50 rounded hover:bg-amber-900/40 transition-all uppercase tracking-widest"
          >
            🗺️ 选择案件
          </button>
          <div className="flex bg-slate-950/50 rounded p-1 border border-slate-800">
            <button onClick={() => { setModalMode('save'); setModalOpen(true); }} className="px-3 py-1 text-xs font-black text-slate-500 hover:text-amber-500 uppercase tracking-tighter">📝 保存</button>
            <div className="w-[1px] bg-slate-800 my-1 mx-1"></div>
            <button onClick={() => { setModalMode('load'); setModalOpen(true); }} className="px-3 py-1 text-xs font-black text-slate-500 hover:text-amber-500 uppercase tracking-tighter">📖 加载</button>
          </div>
        </div>
      </header>

      {solvedSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6">
          <div className="bg-slate-900 border-2 border-amber-600 p-8 max-w-2xl rounded shadow-2xl text-center">
            <h2 className="text-3xl font-black typewriter-font text-amber-500 mb-6 pb-4 border-b border-slate-800">真相大白</h2>
            <div className="font-serif text-lg leading-relaxed text-slate-300 italic mb-8 max-h-[50vh] overflow-y-auto px-4">{solvedSummary}</div>
            <button onClick={() => { setSolvedSummary(null); setModalMode('cases'); setModalOpen(true); }} className="px-8 py-3 bg-amber-700 text-white font-bold hover:bg-amber-600 transition-all uppercase tracking-widest text-xs">下一个现场</button>
          </div>
        </div>
      )}

      {saveStatus && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-amber-600 text-white px-6 py-2 rounded-full shadow-2xl text-xs font-bold">{saveStatus}</div>}

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 flex flex-col relative bg-slate-950">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 z-0 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[85%] md:max-w-[75%] p-5 rounded shadow-xl ${
                  msg.role === 'user' ? 'bg-amber-800/10 text-slate-200 border-r-4 border-amber-600' : 'bg-slate-900 border-l-4 border-slate-700 text-slate-400'
                }`}>
                   <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-900/40 p-4 rounded flex items-center gap-4">
                   <div className="flex gap-1.5">
                      <div className="w-1 h-1 bg-amber-600 rounded-full animate-pulse"></div>
                      <div className="w-1 h-1 bg-amber-600 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                      <div className="w-1 h-1 bg-amber-600 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                   </div>
                   <p className="text-[10px] text-amber-700 uppercase font-bold tracking-[0.3em]">正在记录...</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-900 border-t border-slate-800 z-20">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3">
              <input
                type="text"
                disabled={!!solvedSummary}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={solvedSummary ? "调查结案" : "明智，你要下达什么指令？"}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-6 py-4 text-slate-200 focus:outline-none focus:border-amber-700/50 text-sm"
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim() || !!solvedSummary}
                className="bg-amber-700 hover:bg-amber-600 disabled:bg-slate-800 text-white px-8 py-4 rounded font-bold uppercase tracking-widest text-xs"
              >执行</button>
            </form>
          </div>
        </div>
        
        <aside className={`w-80 hidden lg:block border-l border-slate-800 z-20 transition-all duration-500 ${newCluePing ? 'ring-2 ring-amber-600/50 bg-amber-900/10' : ''}`}>
          <ClueBoard clues={clues} onSelectClue={setSelectedClue} />
        </aside>
      </div>

      <ClueDetail clue={selectedClue} onClose={() => setSelectedClue(null)} />
      <SaveModal 
        isOpen={modalOpen} 
        mode={modalMode} 
        onClose={() => setModalOpen(false)} 
        onSelectSlot={onSaveToSlot}
        onLoadSlot={onLoadFromSlot}
        onSelectCase={initCase}
        currentCaseId={currentCase.id}
      />
    </div>
  );
};

export default App;
