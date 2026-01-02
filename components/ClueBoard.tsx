
import React from 'react';
import { Clue } from '../types';

interface ClueBoardProps {
  clues: Clue[];
  onSelectClue: (clue: Clue) => void;
}

const ClueBoard: React.FC<ClueBoardProps> = ({ clues, onSelectClue }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900/50 p-4 overflow-hidden">
      <h2 className="text-xs font-bold mb-6 flex items-center gap-2 border-b border-slate-800 pb-2 text-slate-500 uppercase tracking-[0.2em]">
        <span className="text-amber-600">👜</span> 搜集到的证物
      </h2>
      <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
        {clues.length === 0 ? (
          <p className="text-slate-700 italic text-[10px] text-center py-10 uppercase tracking-widest">
            证物袋目前是空的
          </p>
        ) : (
          clues.map((clue) => (
            <div
              key={clue.id}
              onClick={() => onSelectClue(clue)}
              className="bg-slate-800/40 p-3 rounded-sm border border-slate-800 hover:border-amber-700/50 cursor-pointer transition-all group"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[9px] font-black uppercase tracking-tighter text-amber-700">
                  {clue.type === 'archive' ? '关键物证' : '现场笔录'}
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-300 group-hover:text-amber-500 truncate">
                {clue.title}
              </h3>
              <p className="text-[10px] text-slate-600 line-clamp-1 mt-1 font-serif">
                {clue.description}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClueBoard;
