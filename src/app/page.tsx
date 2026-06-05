'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';

// Import CSS for React Flow
import '@xyflow/react/dist/style.css';

// Import Custom Nodes
import TerminalNode from '@/components/TerminalNode';
import NoteNode from '@/components/NoteNode';
import SketchNode from '@/components/SketchNode';

const initialNodes: Node[] = [
  {
    id: 'agent-1',
    type: 'terminal',
    position: { x: 100, y: 150 },
    data: { agentName: 'Agent-Alpha' }
  },
  {
    id: 'note-1',
    type: 'note',
    position: { x: 730, y: 80 },
    data: { content: 'Fluxo de trabalho:\n1. Alpha analisa os logs.\n2. Conecta ao Beta para compilar.\n3. Desenhar a arquitetura no Sketch!' }
  },
  {
    id: 'sketch-1',
    type: 'sketch',
    position: { x: 1100, y: 180 },
    data: {}
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'agent-1', target: 'note-1', animated: true, style: { stroke: '#6366f1' } }
];

function FlowContainer() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { getEdges } = useReactFlow();

  // Callback to pipe outputs from source to target nodes when connected
  const handleNodeOutputChange = useCallback((sourceId: string, outputText: string) => {
    // Find all edges where the source is this node dynamically to avoid stale closures
    const currentEdges = getEdges();
    const connectedEdges = currentEdges.filter(edge => edge.source === sourceId);
    
    // Clean output text (strip formatting if needed, but pass raw first)
    const cleanOutput = outputText.trim();
    if (!cleanOutput) return;

    // For each connected edge, find the target node and trigger input
    connectedEdges.forEach(edge => {
      const targetId = edge.target;
      setNodes(nds => nds.map(node => {
        if (node.id === targetId) {
          return {
            ...node,
            data: {
              ...node.data,
              triggerInput: cleanOutput,
              triggerTimestamp: Date.now()
            }
          };
        }
        return node;
      }));
    });
  }, [getEdges, setNodes]);

  // Dynamically inject the output change callback to all nodes on render
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onOutputChange: handleNodeOutputChange
      }
    }));
  }, [nodes, handleNodeOutputChange]);

  // Register Custom Nodes
  const nodeTypes = useMemo(() => ({
    terminal: TerminalNode,
    note: NoteNode,
    sketch: SketchNode
  }), []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1' } }, eds)),
    [setEdges]
  );

  const addTerminalNode = () => {
    const id = `agent-${nodes.length + 1}`;
    const newAgentNames = ['Agent-Beta', 'Agent-Gamma', 'Agent-Delta', 'Agent-Sigma', 'Agent-Omega'];
    const agentName = newAgentNames[(nodes.length) % newAgentNames.length];
    const newNode: Node = {
      id,
      type: 'terminal',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: { agentName }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const addNoteNode = () => {
    const id = `note-${nodes.length + 1}`;
    const newNode: Node = {
      id,
      type: 'note',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: { content: '' }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const addSketchNode = () => {
    const id = `sketch-${nodes.length + 1}`;
    const newNode: Node = {
      id,
      type: 'sketch',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {}
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#09090b] text-white">
      {/* Header / Top Navbar */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#09090b]/80 border-b border-neutral-800 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-sm tracking-widest text-white shadow-lg">
            M
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-neutral-200">DDM AGENTS</h1>
            <p className="text-[10px] text-neutral-500 font-mono">Orquestrador de Agentes de IA</p>
          </div>
        </div>

        {/* Toolbar / Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={addTerminalNode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-xs font-semibold text-indigo-400 transition-colors cursor-pointer"
          >
            <span>+ Novo Terminal</span>
          </button>
          <button
            onClick={addNoteNode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-xs font-semibold text-yellow-400 transition-colors cursor-pointer"
          >
            <span>+ Nova Nota</span>
          </button>
          <button
            onClick={addSketchNode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-xs font-semibold text-purple-400 transition-colors cursor-pointer"
          >
            <span>+ Novo Esboço</span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Swarm Ativo
          </span>
        </div>
      </header>

      {/* Infinite Canvas Area */}
      <main className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#09090b]"
        >
          <Background
            color="#27272a"
            gap={16}
            size={1.5}
            variant={BackgroundVariant.Dots}
          />
          <Controls className="!bg-[#18181b] !border-neutral-800 !fill-white [&_button]:!bg-[#18181b] [&_button]:!border-neutral-800 [&_button]:!text-white" />
          <MiniMap
            nodeStrokeColor={(n) => {
              if (n.type === 'terminal') return '#6366f1';
              if (n.type === 'note') return '#eab308';
              if (n.type === 'sketch') return '#a855f7';
              return '#eee';
            }}
            nodeColor={(n) => {
              if (n.type === 'terminal') return '#09090b';
              if (n.type === 'note') return '#78350f';
              if (n.type === 'sketch') return '#581c87';
              return '#fff';
            }}
            className="!bg-[#09090b]/80 !border-neutral-800"
          />
        </ReactFlow>
      </main>

      {/* Status Bar */}
      <footer className="px-6 py-2 bg-neutral-950 border-t border-neutral-900 flex justify-between items-center text-[10px] font-mono text-neutral-500">
        <span>Windows Web Environment</span>
        <span>Canvas: 100% Zoom</span>
        <span>Modo de Conexão: PTY Virtual</span>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <FlowContainer />
    </ReactFlowProvider>
  );
}
