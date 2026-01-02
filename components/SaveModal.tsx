
import React, { useState, useEffect } from 'react';
import { ALL_CASES } from '../constants';
import { Case } from '../types';

interface SaveModalProps {
  isOpen: boolean;
  mode: 'save' | 'load' | 'cases';
  onClose: () => void;
  onSelectSlot: (caseId: string, slot: number) => void;
  onLoadSlot: (caseId: string, slot: number) => void;
  onSelectCase: (c: Case) => void;
  currentCaseId: string;
}

interface SlotData {
  timestamp: number;
  preview: string;
}

const SaveModal: React.FC<SaveModalProps> = ({ isOpen, mode, onClose, onSelectSlot, onLoadSlot, onSelectCase, currentCaseId }) => {
  const [step, setStep] = useState<'case' | 'slot'>('case');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [slots, setSlots] = useState<Record<number, SlotData | null>>({});

  const TOTAL_SLOTS = 6;

  useEffect(() => {
    if (isOpen) {
      setStep('case');
      setSelectedCase(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCase && mode !== 'cases') {
      const newSlots: Record<number, SlotData | null> = {};
      for (let i = 1; i <= TOTAL_SLOTS; i++) {
        const data = localStorage.getItem(`detective_save_${selectedCase.id}_slot_${i}`);
        newSlots[i] = data ? JSON.parse(data) : null;
      }
      setSlots(newSlots);
    }
  }, [selectedCase, mode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-sm overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-fade-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-800/30">
          <div className="flex items-center gap-4">
            {step === 'slot' && (
              <button 
                onClick={() => setStep('case')}
                className="text-amber-600 hover:text-amber-500 text-xs font-black uppercase tracking-widest flex items-center gap-1 group"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span> 返回案件列表
              </button>
            )}
            <h2 className="text-2xl font-black text-amber-500 typewriter-font uppercase tracking-[0.2em]">
              {mode === 'save' ? '保存调查' : mode === 'load' ? '调取进度' : '案件选择'} 
              {step === 'slot' ? ` : ${selectedCase?.title}` : ''}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white text-4xl leading-none">&times;</button>
        </div>
        
        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          {step === 'case' ? (
            <div className="space-y-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-6 border-l-2 border-amber-900 pl-3">
                {mode === 'cases' ? '选择你要搜查的现场' : '选择目标案件'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ALL_CASES.map(c => (
                  <div 
                    key={c.id}
                    onClick={() => {
                      if (mode === 'cases') {
                        onSelectCase(c);
                        onClose();
                      } else {
                        setSelectedCase(c);
                        setStep('slot');
                      }
                    }}
                    className={`group p-5 border transition-all cursor-pointer relative overflow-hidden ${
                      c.id === currentCaseId 
                      ? 'border-amber-600/50 bg-amber-600/5' 
                      : 'border-slate-800 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    {c.id === currentCaseId && (
                      <div className="absolute -right-8 -top-8 w-16 h-16 bg-amber-600 rotate-45 flex items-end justify-center pb-1">
                        <span className="text-[8px] text-slate-950 font-black -rotate-45 mb-1">调查中</span>
                      </div>
                    )}
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">案号：{c.id}</span>
                    <h3 className="text-lg font-bold text-slate-200 group-hover:text-amber-500 transition-colors">《{c.title}》</h3>
                    <p className="text-[10px] text-slate-500 mt-2 uppercase">{c.location}</p>
                    {mode === 'cases' && (
                      <div className="mt-4 text-[9px] font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
                        前往现场 →
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mb-6 border-l-2 border-amber-900 pl-3">选择进度存储位 (1-6)</p>
              
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
                  const slotIndex = i + 1;
                  const data = slots[slotIndex];
                  const isEmpty = !data;
                  const isClickable = mode === 'save' || !isEmpty;

                  return (
                    <div 
                      key={slotIndex}
                      onClick={() => {
                        if (isClickable && selectedCase) {
                          if (mode === 'save') onSelectSlot(selectedCase.id, slotIndex);
                          else onLoadSlot(selectedCase.id, slotIndex);
                        }
                      }}
                      className={`
                        aspect-square flex flex-col justify-between p-4 border transition-all relative group
                        ${isClickable 
                          ? 'border-slate-700 bg-slate-800/40 cursor-pointer hover:border-amber-600 hover:bg-slate-800' 
                          : 'border-slate-900 bg-slate-950 opacity-30 cursor-not-allowed'
                        }
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-slate-600 group-hover:text-amber-600 transition-colors">#{slotIndex}</span>
                        {isEmpty && mode === 'save' && (
                          <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                        )}
                        {!isEmpty && (
                          <div className="w-2 h-2 rounded-full bg-amber-600 shadow-[0_0_5px_rgba(217,119,6,0.8)]"></div>
                        )}
                      </div>
                      
                      <div className="flex flex-col">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          {isEmpty ? '空闲' : '已记录'}
                        </h3>
                        {!isEmpty && (
                          <p className="text-[8px] text-slate-600 mt-1 truncate">
                            {new Date(data.timestamp).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {!isEmpty && (
                        <div className="absolute inset-0 bg-slate-900/90 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center text-center">
                          <p className="text-[9px] text-slate-300 italic line-clamp-3">"{data.preview}"</p>
                          <span className="text-[8px] text-amber-600 font-bold mt-2 uppercase tracking-tighter">继续调查</span>
                        </div>
                      )}
                      
                      {isEmpty && mode === 'save' && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-amber-600/10">
                           <span className="text-[10px] text-amber-600 font-black uppercase">记录当前进度</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-950/50 text-center border-t border-slate-800">
          <p className="text-[9px] text-slate-600 uppercase tracking-[0.4em] font-bold">谜案回声：现场实时笔记系统</p>
        </div>
      </div>
    </div>
  );
};

export default SaveModal;
