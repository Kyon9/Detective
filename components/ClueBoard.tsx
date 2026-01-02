
import React from 'react';
import { Clue } from '../types';

interface ClueBoardProps {
  clues: Clue[];
  onSelectClue: (clue: Clue) => void;
}

const ClueBoard: React.FC<ClueBoardProps> = ({ clues, onSelectClue }) => {
  return (
    <div className="flex flex-col h-full bg-transparent p-6 overflow-hidden">
      <h2 className="text-xs font-black mb-8 flex items-center gap-3 border-b border-slate-800 pb-5 text-slate-500 uppercase tracking-[0.3em]">
        <span className="text-lg text-amber-600">👜</span> 证据箱 / Evidence Box
      </h2>
      <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
        {clues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-30 text-center">
            <div className="w-16 h-16 border-2 border-slate-800 rounded-sm mb-6 flex items-center justify-center">
               <span className="text-2xl text-slate-700">?</span>
            </div>
            <p className="text-slate-500 italic text-xs uppercase tracking-[0.2em] leading-loose">
              尚无关键发现<br/>No Evidence Collected
            </p>
          </div>
        ) : (
          clues.map((clue) => (
            <div
              key={clue.id}
              onClick={() => onSelectClue(clue)}
              className="bg-slate-950 p-5 rounded-sm border border-slate-800 hover:border-amber-700/60 cursor-pointer transition-all group relative overflow-hidden shadow-xl"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 px-2 py-1 bg-amber-900/20 rounded-sm border border-amber-900/30">
                  {clue.type === 'archive' ? 'KEY EVIDENCE' : 'FIELD NOTE'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-200 group-hover:text-amber-500 transition-colors leading-snug">
                {clue.title}
              </h3>
              <p className="text-xs text-slate-600 line-clamp-2 mt-2 font-serif italic leading-relaxed opacity-80">
                {clue.description}
              </p>
              <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                <span className="text-lg text-amber-900/50">🔍</span>
              </div>
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-800 group-hover:bg-amber-600 transition-colors"></div>
            </div>
          ))
        )}
      </div>
      <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">
        <span>已记录证物: {clues.length}</span>
        <span className="text-amber-900/50">ARCHIVE READY</span>
      </div>
    </div>
  );
};

export default ClueBoard;
