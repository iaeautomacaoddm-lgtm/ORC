'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

interface SketchNodeProps {
  id: string;
}

export default function SketchNode({ id }: SketchNodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#a855f7'); // Purple default
  const [isMinimized, setIsMinimized] = useState(false);
  const { deleteElements } = useReactFlow();

  useEffect(() => {
    if (isMinimized) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear and set background
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [isMinimized]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleClose = () => {
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div className="w-80 rounded border border-purple-800/50 bg-[#1e142c] shadow-2xl overflow-hidden font-sans">
      {/* Target Connection */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-purple-500 border-2 border-zinc-950"
      />

      {/* Header Styled like Windows 11 Note */}
      <div className="flex items-center justify-between bg-[#2d1c44] px-3 py-1.5 border-b border-purple-700/30 select-none">
        <div className="flex gap-2 items-center">
          <span className="text-xs">🎨</span>
          <span className="text-[11px] text-purple-200 font-medium font-sans">
            Esboço / Desenho
          </span>
        </div>
        
        {/* Windows Window Controls */}
        <div className="flex items-center -mr-3">
          {!isMinimized && (
            <button
              onClick={clearCanvas}
              className="text-[9px] bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded font-mono mr-2 cursor-pointer"
            >
              Limpar
            </button>
          )}
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-8 h-6 text-purple-400 hover:bg-[#3d295b] flex items-center justify-center text-[10px] transition-all cursor-pointer"
            title="Minimizar"
          >
            ─
          </button>
          <button 
            onClick={handleClose}
            className="w-9 h-6 text-purple-400 hover:bg-red-600 hover:text-white flex items-center justify-center text-xs transition-all cursor-pointer"
            title="Fechar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Drawing Canvas */}
      {!isMinimized && (
        <>
          <div className="p-3 bg-zinc-900">
            <canvas
              ref={canvasRef}
              width={296}
              height={180}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="cursor-crosshair rounded border border-zinc-800 bg-zinc-900 nodrag nowheel"
            />
          </div>

          {/* Color Selectors */}
          <div className="flex justify-center gap-2 pb-3 pt-1 bg-zinc-950/20">
            {['#a855f7', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
                  color === c ? 'border-white scale-110' : 'border-transparent'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Source Connection */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-purple-500 border-2 border-zinc-950"
      />
    </div>
  );
}
