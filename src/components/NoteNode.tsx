'use client';

import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

interface NoteNodeProps {
  data: {
    title?: string;
    content?: string;
  };
  id: string;
}

export default function NoteNode({ data, id }: NoteNodeProps) {
  const [content, setContent] = useState(data.content || '');
  const [isMinimized, setIsMinimized] = useState(false);
  const { deleteElements } = useReactFlow();

  const handleClose = () => {
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div className="w-80 rounded border border-yellow-700/50 bg-[#2c220c] shadow-2xl overflow-hidden font-sans">
      {/* Target/Input Connection */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-yellow-500 border-2 border-zinc-950"
      />

      {/* Header Styled like Windows 11 Note */}
      <div className="flex items-center justify-between bg-[#3a2f15] px-3 py-1.5 border-b border-yellow-700/30 select-none">
        <div className="flex gap-2 items-center">
          <span className="text-xs">📝</span>
          <span className="text-[11px] text-yellow-200 font-medium font-sans">
            Nota / Rascunho
          </span>
        </div>
        
        {/* Windows Window Controls */}
        <div className="flex items-center -mr-3">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-8 h-6 text-yellow-400 hover:bg-[#4d3f1c] flex items-center justify-center text-[10px] transition-all cursor-pointer"
            title="Minimizar"
          >
            ─
          </button>
          <button 
            onClick={handleClose}
            className="w-9 h-6 text-yellow-400 hover:bg-red-600 hover:text-white flex items-center justify-center text-xs transition-all cursor-pointer"
            title="Fechar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content Area */}
      {!isMinimized && (
        <div className="p-3 bg-[#1e1708]">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-32 bg-transparent text-sm text-yellow-100 placeholder-yellow-600/40 resize-none focus:outline-none nowheel nodrag"
            placeholder="Escreva suas ideias ou instruções para os agentes aqui..."
          />
        </div>
      )}

      {/* Source/Output Connection */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-yellow-500 border-2 border-zinc-950"
      />
    </div>
  );
}
