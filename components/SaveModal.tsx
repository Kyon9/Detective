
import React, { useState, useEffect } from 'react';

interface SaveModalProps {
  isOpen: boolean;
  mode: 'save' | 'load';
  onClose: () => void;
  onSelectSlot: (slot: number) => void;
}

interface SlotData {
  timestamp: number;
  caseId: string;
  preview: string;
}

const SaveModal: React.FC<SaveModalProps> = ({ isOpen, mode, onClose, onSelectSlot }) => {
  const [slots, setSlots] = useState<Record<number, SlotData | null>>({
    1: null,
    2: null,
    3: null,
  });

  useEffect(() => {
    if (isOpen) {
      const newSlots: Record<number, SlotData | null> = {};
      [1, 2, 3].forEach(i => {
        const data = localStorage.getItem(`detective_save_slot_${i}`);
        newSlots[i] = data ? JSON.parse(data) : null;
      });
      setSlots(newSlots);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-800/50">
          <h2 className="text-xl font-bold text-amber-500 typewriter-font uppercase tracking-widest">
            {mode === 'save' ? '档案存入' : '档案提取'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl">&times;</button>
        </div>
        
        <div className="p-6 space-y-4">
          {[1, 2, 3].map(slotIndex => {
            const data = slots[slotIndex];
            const isEmpty = !data;
            const isClickable = mode === 'save' || !isEmpty;

            return (
              <div 
                key={slotIndex}
                onClick={() => isClickable && onSelectSlot(slotIndex)}
                className={`
                  group relative flex flex-col p-4 border rounded-xl transition-all cursor-pointer
                  ${isClickable 
                    ? 'border-slate-700 bg-slate-800 hover:border-amber-500/50 hover:bg-slate-700/50' 
                    : 'border-slate-800 bg-slate-900 opacity-50 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-tighter">文件柜 #{slotIndex}</span>
                  {!isEmpty && (
                    <span className="text-[10px] text-slate-500">
                      {new Date(data.timestamp).toLocaleString()}
                    </span>
                  )}
                </div>
                
                <h3 className="text-sm font-bold text-slate-200">
                  {isEmpty ? '空置档案位' : '案件：无声的晚宴'}
                </h3>
                
                {!isEmpty && (
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                    “{data.preview}...”
                  </p>
                )}

                {mode === 'save' && (
                  <div className="absolute top-4 right-4 text-xs font-bold text-slate-600 group-hover:text-amber-500 transition-colors">
                    {isEmpty ? '[ 点击存档 ]' : '[ 点击覆盖 ]'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-slate-800/30 text-center border-t border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">档案库由斯威顿警署加密托管</p>
        </div>
      </div>
    </div>
  );
};

export default SaveModal;
