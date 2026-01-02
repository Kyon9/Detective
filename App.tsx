
import React, { useState, useRef, useEffect } from 'react';
import { Clue, Message, AgentResponse, Case } from './types';
import { ALL_CASES } from './constants';
import { getDetectiveResponse, testConnection } from './services/geminiService';
import ClueBoard from './components/ClueBoard';
import ClueDetail from './components/ClueDetail';
import SaveModal from './components/SaveModal';

const App: React.FC = () => {
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
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
  const [showActionInfo, setShowActionInfo] = useState(false);
  
  const [netStatus, setNetStatus] = useState<'testing' | 'ok' | 'fail' | 'restricted'>('testing');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initCase = (targetCase: Case) => {
    setCurrentCase(targetCase);
    const isDHill = targetCase.id === 'case-004';
    const isLenton = targetCase.id === 'case-001';
    const isAvenging = targetCase.id === 'case-002';
    
    let introText = "";
    if (isDHill) {
      introText = `明智，你终于来了。那晚我们在“白梅轩”咖啡厅坐着的时候，谁也没想到对面的旧书店会发生这种事。我把目前已知的现场细节都整理在简报里了。`;
    } else if (isLenton) {
      introText = `侦探先生，我是您的调查助理。詹姆斯·诺里斯爵士已经在莱顿宅邸等候多时了。这里发生了一连串诡异的失窃案，现场唯一的共同点就是那根火柴。请指示。`;
    } else if (isAvenging) {
      introText = `总督察莫里斯比刚刚离开。这起所谓的“毒巧克力命案”真是策划得极其周密，所有人都认为威廉爵士才是目标。但我总觉得那盒巧克力的转送过程有些太“巧合”了。`;
    } else {
      introText = `我们已到达现场：${targetCase.location}。${targetCase.title} 的勘查工作正式开始。请查看初始简报。`;
    }

    const intro: Message = {
      id: 'intro-' + Date.now(),
      role: 'assistant',
      text: introText,
      timestamp: Date.now()
    };
    setMessages([intro]);

    const initialClue: Clue = {
      id: 'clue-initial-' + targetCase.id,
      title: isDHill ? `现场第一目击报告` : `案情初始笔录`,
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

  const onSaveToSlot = (caseId: string, slot: number) => {
    if (!currentCase) return;
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

  const handleExport = () => {
    if (!currentCase || messages.length === 0) {
      setSaveStatus("无可导出的调查记录");
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    const exportData = {
      version: "1.0",
      caseId: currentCase.id,
      messages,
      clues,
      timestamp: Date.now()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mystery_echoes_${currentCase.id}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSaveStatus("档案文件已导出");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.caseId || !data.messages || !data.clues) {
          throw new Error("格式错误");
        }
        
        const targetCase = ALL_CASES.find(c => c.id === data.caseId);
        if (!targetCase) {
          throw new Error("未知的案件ID");
        }

        setCurrentCase(targetCase);
        setMessages(data.messages);
        setClues(data.clues);
        setSolvedSummary(null);
        setSaveStatus("档案导入成功");
        setTimeout(() => setSaveStatus(null), 3000);
      } catch (error) {
        console.error("Import error:", error);
        setSaveStatus("无效的档案文件");
        setTimeout(() => setSaveStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading || solvedSummary || !currentCase) return;

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
          id: currentCase.id,
          initialContext: currentCase.initialContext, 
          fullScript: currentCase.fullScript 
        },
        clues.map(c => c.title)
      );
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.message || "由于现场环境干扰，信号有些模糊。请尝试换个方式询问。",
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
      const errorMsg = "⚠️ [通讯链路异常] 请检查 API KEY 状态或网络连接。";
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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
      <header className="bg-slate-900 border-b border-slate-800 px-10 py-6 flex justify-between items-center shadow-2xl z-20">
        <div className="flex items-center gap-6">
          <span className="text-amber-600 typewriter-font font-black tracking-[0.2em] text-3xl uppercase">谜案回声</span>
          <div className="h-8 w-[1px] bg-slate-800 mx-2"></div>
          <span className="text-base text-slate-500 uppercase tracking-widest font-bold">探案协助系统 v1.2</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-3.5 h-3.5 rounded-full ${netStatus === 'ok' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : netStatus === 'testing' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm text-slate-500 uppercase font-black tracking-widest">
              {netStatus === 'ok' ? '加密连接已建立' : netStatus === 'testing' ? '同步中...' : '连接中断'}
            </span>
          </div>
        </div>
      </header>

      {solvedSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6">
          <div className="bg-slate-900 border-2 border-amber-600 p-10 max-w-3xl rounded shadow-2xl text-center">
            <h2 className="text-4xl font-black typewriter-font text-amber-500 mb-8 pb-4 border-b border-slate-800">真相大白</h2>
            <div className="font-serif text-xl leading-relaxed text-slate-300 italic mb-10 max-h-[50vh] overflow-y-auto px-6">{solvedSummary}</div>
            <button onClick={() => { setSolvedSummary(null); setCurrentCase(null); setMessages([]); setClues([]); }} className="px-10 py-4 bg-amber-700 text-white font-bold hover:bg-amber-600 transition-all uppercase tracking-widest text-sm">结案并返回</button>
          </div>
        </div>
      )}

      {saveStatus && <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[60] bg-amber-600 text-white px-10 py-4 rounded shadow-2xl text-sm font-bold animate-fade-in tracking-widest uppercase">{saveStatus}</div>}

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col z-20 overflow-y-auto custom-scrollbar">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em]">卷宗管理 / Archive</h2>
              <button 
                onClick={() => setShowActionInfo(!showActionInfo)}
                className={`w-7 h-7 rounded-full flex items-center justify-center border text-sm font-black transition-all shadow-sm ${showActionInfo ? 'bg-amber-700 border-amber-500 text-slate-950' : 'border-slate-700 text-slate-500 hover:border-amber-600 hover:text-amber-600'}`}
                title="查看功能说明"
              >
                ⓘ
              </button>
            </div>
            
            {showActionInfo && (
              <div className="mb-6 p-4 bg-slate-950/80 border border-amber-900/40 rounded shadow-inner animate-fade-in">
                <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-3 border-b border-amber-900/20 pb-1">侦探手册：归档指南</p>
                <ul className="space-y-3 text-xs text-slate-400 font-serif leading-relaxed italic">
                  <li><strong className="text-amber-700 not-italic uppercase tracking-tighter">● 保存:</strong> 进度同步至本地私密档案柜。</li>
                  <li><strong className="text-amber-700 not-italic uppercase tracking-tighter">● 读取:</strong> 提取历史调查记录恢复现场。</li>
                  <li><strong className="text-amber-700 not-italic uppercase tracking-tighter">● 导出:</strong> 打包线索与对话为 JSON 文件。</li>
                  <li><strong className="text-amber-700 not-italic uppercase tracking-tighter">● 导入:</strong> 载入外部 JSON 档案重现经过。</li>
                </ul>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button 
                onClick={() => { if(currentCase) { setModalMode('save'); setModalOpen(true); } }} 
                className={`py-3 text-xs font-black border rounded transition-all uppercase tracking-widest ${currentCase ? 'bg-amber-900/10 border-amber-900/50 text-amber-500 hover:bg-amber-900/20 shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-700 cursor-not-allowed'}`}
              >
                📝 保存
              </button>
              <button 
                onClick={() => { setModalMode('load'); setModalOpen(true); }} 
                className="py-3 text-xs font-black border border-slate-800 bg-slate-950 text-slate-500 hover:bg-slate-800 hover:text-white transition-all uppercase tracking-widest shadow-sm"
              >
                📖 读取
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleExport}
                className={`py-3 text-xs font-black border rounded transition-all uppercase tracking-widest ${currentCase && messages.length > 0 ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white shadow-sm' : 'bg-slate-950 border-slate-900 text-slate-800 cursor-not-allowed'}`}
              >
                📤 导出
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="py-3 text-xs font-black border border-slate-800 bg-slate-950 text-slate-500 hover:bg-slate-800 hover:text-white transition-all uppercase tracking-widest shadow-sm"
              >
                📥 导入
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImport} 
                accept=".json" 
                className="hidden" 
              />
            </div>
          </div>

          <div className="p-6 flex-1">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-6">待办案件 / Cases</h2>
            <div className="space-y-4">
              {ALL_CASES.map(c => (
                <div 
                  key={c.id}
                  onClick={() => initCase(c)}
                  className={`p-6 border rounded cursor-pointer transition-all group relative overflow-hidden shadow-md ${currentCase?.id === c.id ? 'bg-amber-900/5 border-amber-600/50 shadow-[inset_0_0_15px_rgba(217,119,6,0.1)]' : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900'}`}
                >
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2">案号：{c.id}</span>
                  <h3 className={`text-base font-bold transition-colors ${currentCase?.id === c.id ? 'text-amber-500' : 'text-slate-200 group-hover:text-amber-600'}`}>《{c.title}》</h3>
                  <p className="text-sm text-slate-500 mt-3 line-clamp-3 leading-relaxed italic font-serif opacity-80">{c.shortDescription}</p>
                  {currentCase?.id === c.id && (
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.6)]"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col relative bg-slate-950 border-r border-slate-800">
          {!currentCase ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fade-in">
              <div className="w-24 h-24 border-2 border-slate-800 rounded-full flex items-center justify-center mb-10 opacity-30 shadow-inner">
                <span className="text-5xl filter grayscale">🕵️</span>
              </div>
              <h2 className="text-3xl font-black typewriter-font text-slate-600 uppercase tracking-[0.3em] mb-6">等待指派现场</h2>
              <p className="text-slate-500 max-w-md text-base leading-relaxed font-serif italic">
                “每一个未被察觉的细节，都是通往真相的阶梯。请从左侧卷宗库中选择一个案件以开始调查。”
              </p>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`max-w-[85%] p-7 rounded-sm shadow-2xl ${
                      msg.role === 'user' ? 'bg-amber-800/10 text-slate-100 border-r-8 border-amber-600' : 'bg-slate-900/70 border-l-8 border-slate-700 text-slate-200'
                    }`}>
                       <div className="text-lg leading-relaxed whitespace-pre-wrap font-serif tracking-wide">{msg.text}</div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900/40 p-5 rounded-sm flex items-center gap-6 shadow-lg">
                       <div className="flex gap-2">
                          <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                          <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                       </div>
                       <p className="text-sm text-amber-700 uppercase font-black tracking-[0.4em]">正在整理现场记录 / Processing</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-10 bg-slate-900/50 border-t border-slate-800/50 backdrop-blur-sm">
                <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto flex gap-6">
                  <input
                    type="text"
                    disabled={!!solvedSummary}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={solvedSummary ? "本案已结案" : "请输入指令、询问嫌疑人或分析物证..."}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-sm px-8 py-5 text-slate-100 focus:outline-none focus:border-amber-700/60 text-lg placeholder:text-slate-700 transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputText.trim() || !!solvedSummary}
                    className="bg-amber-700 hover:bg-amber-600 disabled:bg-slate-800 text-white px-12 py-5 rounded-sm font-black uppercase tracking-widest text-sm transition-all shadow-lg active:scale-95"
                  >提交指令</button>
                </form>
              </div>
            </>
          )}
        </main>
        
        <aside className={`w-96 bg-slate-900 flex flex-col z-20 transition-all duration-700 ${newCluePing ? 'ring-4 ring-amber-600/40 bg-amber-900/20' : ''}`}>
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
        currentCaseId={currentCase?.id || ''}
      />
    </div>
  );
};

export default App;
