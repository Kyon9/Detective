
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
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-800/50">
          <h2 className="text-lg font-bold text-amber-500 uppercase tracking-widest">{clue.title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <div className="p-6 flex flex-col items-center">
          {clue.type === 'text' ? (
            <div className="bg-white/5 p-6 rounded-lg border border-white/10 w-full font-serif text-slate-300 leading-relaxed italic whitespace-pre-wrap">
              "{clue.content}"
            </div>
          ) : (
            <div className="w-full">
              <img 
                src={clue.content} 
                alt={clue.title} 
                className="w-full h-auto max-h-[60vh] object-contain rounded border border-slate-700 shadow-inner bg-black" 
              />
            </div>
          )}
          
          <div className="mt-6 w-full text-slate-400 text-sm border-t border-slate-800 pt-4">
            <p className="font-semibold text-slate-300 mb-1">侦探笔记：</p>
            <p>{clue.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClueDetail;
