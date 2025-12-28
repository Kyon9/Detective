
import React, { useState, useRef, useEffect } from 'react';
import { Clue, Message, AgentResponse, Case } from './types';
import { ALL_CASES } from './constants';
import { getDetectiveResponse, generateClueVisual, testConnection } from './services/geminiService';
import ClueBoard from './components/ClueBoard';
import ClueDetail from './components/ClueDetail';
import SaveModal from './components/SaveModal';

const App: React.FC = () => {
  const [currentCase, setCurrentCase] = useState<Case>(ALL_CASES[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'save' | 'load' | 'cases'>('save');
  const [solvedSummary, setSolvedSummary] = useState<string | null>(null);
  
  const [netStatus, setNetStatus] = useState<'testing' | 'ok' | 'fail' | 'restricted'>('testing');
  const [showNetHelp, setShowNetHelp] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 初始化案件
  const initCase = (targetCase: Case) => {
    setCurrentCase(targetCase);
    const intro: Message = {
      id: 'intro-' + Date.now(),
      role: 'assistant',
      text: `侦探，我们已抵达“${targetCase.location}”。关于《${targetCase.title}》的初步档案已就绪，请查阅右侧面板。您打算从哪里查起？`,
      timestamp: Date.now()
    };
    setMessages([intro]);

    const initialClue: Clue = {
      id: 'clue-initial-' + targetCase.id,
      title: `案件简报：${targetCase.title}`,
      description: '关于本案的基本情况记录。',
      type: 'text',
      content: targetCase.initialContext,
      timestamp: Date.now()
    };
    setClues([initialClue]);
    setSolvedSummary(null);
  };

  useEffect(() => {
    checkConnection();
    initCase(ALL_CASES[0]);
  }, []);

  const checkConnection = async () => {
    setNetStatus('testing');
    const result = await testConnection();
    if (result.ok) {
      setNetStatus('ok');
    } else if (result.error === 'LOCATION_NOT_SUPPORTED') {
      setNetStatus('restricted');
    } else {
      setNetStatus('fail');
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const onSaveToSlot = (caseId: string, slot: number) => {
    const saveData = {
      currentCaseId: currentCase.id,
      messages,
      clues,
      timestamp: Date.now(),
      preview: messages.length > 0 ? messages[messages.length - 1].text.substring(0, 50) : "新案件"
    };
    localStorage.setItem(`detective_save_${caseId}_slot_${slot}`, JSON.stringify(saveData));
    setSaveStatus(`《${ALL_CASES.find(c => c.id === caseId)?.title}》进度已存入文件柜 #${slot}`);
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
        setSaveStatus(`已从《${targetCase.title}》提取档案进度`);
        setTimeout(() => setSaveStatus(null), 3000);
        setModalOpen(false);
      } catch (e) {
        setSaveStatus("提取档案失败");
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading || solvedSummary) return;

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
      const history = messages.slice(-10).map(m => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.text }]
      }));

      const response: AgentResponse = await getDetectiveResponse(history, userMessage.text, currentCase.initialContext);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.message,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.isSolved) {
        setSolvedSummary(response.solveSummary || "真相已大白。");
      }

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
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        text: "通讯异常，请确认网络环境并重试。",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200 selection:bg-amber-500/30">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center shadow-2xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 border border-amber-900/50 rounded flex items-center justify-center shadow-lg">
            <span className="text-2xl filter contrast-125 grayscale">🕵️</span>
          </div>
          <div>
            <h1 className="text-xl font-bold typewriter-font tracking-tight text-amber-500 uppercase tracking-widest">黑色侦探：AI 探案助手</h1>
            <div className="flex items-center gap-2">
               <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">当前卷宗：{currentCase.title}</p>
               <span className="text-slate-700">|</span>
               <button onClick={() => setShowNetHelp(true)} className="flex items-center gap-1">
                 <div className={`w-2 h-2 rounded-full ${netStatus === 'ok' ? 'bg-green-500 shadow-[0_0_8px_#10b981]' : netStatus === 'restricted' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                 <span className="text-[9px] text-slate-500 uppercase font-bold">{netStatus === 'ok' ? '已联机' : '联机受限'}</span>
               </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setModalMode('cases'); setModalOpen(true); }}
            className="px-4 py-2 text-xs font-bold bg-amber-900/20 text-amber-400 border border-amber-900/50 rounded hover:bg-amber-900/40 transition-all uppercase tracking-widest"
          >
            🔍 更换案件
          </button>
          <div className="flex bg-slate-950/50 rounded-lg p-1 border border-slate-800">
            <button 
              onClick={() => { setModalMode('save'); setModalOpen(true); }} 
              className="px-4 py-1.5 text-xs font-black text-slate-400 hover:text-amber-500 rounded transition-all uppercase tracking-tighter"
            >
              💾 档案存档
            </button>
            <div className="w-[1px] bg-slate-800 my-1 mx-1"></div>
            <button 
              onClick={() => { setModalMode('load'); setModalOpen(true); }} 
              className="px-4 py-1.5 text-xs font-black text-slate-400 hover:text-amber-500 rounded transition-all uppercase tracking-tighter"
            >
              📂 档案提取
            </button>
          </div>
        </div>
      </header>

      {/* Case Solved Modal */}
      {solvedSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
          <div className="bg-slate-900 border-2 border-amber-600 p-8 max-w-2xl rounded-sm shadow-[0_0_50px_rgba(217,119,6,0.2)] animate-fade-in relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-600 text-slate-950 px-8 py-2 font-black uppercase tracking-[0.5em] shadow-xl">
              案件已破获
            </div>
            <h2 className="text-3xl font-black typewriter-font text-amber-500 mb-6 text-center border-b border-slate-800 pb-4">结案报告：{currentCase.title}</h2>
            <div className="font-serif text-lg leading-relaxed text-slate-300 italic mb-8 max-h-[50vh] overflow-y-auto px-4 custom-scrollbar">
              {solvedSummary}
            </div>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setSolvedSummary(null)} 
                className="px-8 py-3 bg-slate-800 text-slate-400 font-bold border border-slate-700 hover:text-white transition-all uppercase tracking-widest text-xs"
              >返回现场</button>
              <button 
                onClick={() => { setSolvedSummary(null); setModalMode('cases'); setModalOpen(true); }} 
                className="px-8 py-3 bg-amber-700 text-white font-bold hover:bg-amber-600 transition-all uppercase tracking-widest text-xs shadow-lg"
              >切换案件</button>
            </div>
          </div>
        </div>
      )}

      {showNetHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 max-w-md rounded-xl shadow-2xl">
            <h3 className="text-amber-500 typewriter-font text-xl mb-4 uppercase">📡 侦探通讯诊断</h3>
            <div className="space-y-4 text-sm text-slate-300">
              <p>为了获得最佳体验，请确保您的网络环境稳定：</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-amber-700">
                <li>推荐使用美国或新加坡节点。</li>
                <li>确保开启了全局代理模式。</li>
              </ul>
            </div>
            <button onClick={() => setShowNetHelp(false)} className="mt-8 w-full bg-slate-800 text-white py-2 rounded hover:bg-slate-700 transition-colors">确认</button>
          </div>
        </div>
      )}

      {saveStatus && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-amber-600 text-white px-6 py-2 rounded-full shadow-2xl text-sm animate-fade-in font-bold">
          {saveStatus}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 flex flex-col relative bg-slate-950">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-10"></div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 z-0 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[85%] md:max-w-[75%] p-5 rounded-sm shadow-xl relative ${
                  msg.role === 'user' ? 'bg-amber-800/20 text-slate-200 border-r-4 border-amber-600' : 'bg-slate-900/80 border-l-4 border-slate-700 text-slate-300'
                }`}>
                  <div className={`text-[9px] uppercase font-black tracking-widest mb-2 opacity-30 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.role === 'user' ? '侦探' : '助手'}
                  </div>
                  <div className="text-[16px] leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-900/40 border-l-4 border-amber-700 p-4 rounded-sm flex items-center gap-4">
                   <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                   </div>
                   <p className="text-[10px] text-amber-700 uppercase font-bold tracking-[0.3em]">正在检索卷宗 & 绘制线索...</p>
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
                placeholder={solvedSummary ? "案件已结，请开启新档案..." : "键入您的调查指令..."}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-sm px-6 py-4 text-slate-200 focus:outline-none focus:border-amber-700/50 transition-all placeholder:text-slate-700 text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim() || !!solvedSummary}
                className="bg-amber-700 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-white px-8 py-4 rounded-sm font-bold shadow-lg transition-all active:translate-y-1 uppercase tracking-widest"
              >发送</button>
            </form>
          </div>
        </div>
        
        <aside className="w-96 hidden lg:block border-l border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-20">
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
