
import React from 'react';
import { Clue } from '../types';

interface ClueDetailProps {
  clue: Clue | null;
  onClose: () => void;
}

const ClueDetail: React.FC<ClueDetailProps> = ({ clue, onClose }) => {
  if (!clue) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-sm overflow-hidden shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-800/50">
          <h2 className="text-sm font-bold text-amber-500 uppercase tracking-widest">查看详情：{clue.title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>
        
        <div className="p-8 flex flex-col">
          <div className="bg-slate-950 p-6 rounded border border-slate-800 font-serif text-slate-300 leading-relaxed italic whitespace-pre-wrap">
            {clue.content}
          </div>
          
          <div className="mt-8 text-slate-500 text-[11px] border-t border-slate-800 pt-4 uppercase tracking-widest">
            <p className="font-bold text-slate-400 mb-1">调查备注：</p>
            <p>{clue.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClueDetail;
