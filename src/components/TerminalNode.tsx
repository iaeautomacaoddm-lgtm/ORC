'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

// Import xterm CSS
import 'xterm/css/xterm.css';

interface TerminalNodeProps {
  data: {
    title?: string;
    agentName?: string;
    triggerInput?: string;
    triggerTimestamp?: number;
    onOutputChange?: (id: string, output: string) => void;
  };
  id: string;
}

type ExecMode = 'mock' | 'gemini' | 'local';
type NodeStatus = 'idle' | 'running' | 'success' | 'failed';

interface AgentPreset {
  name: string;
  execMode: ExecMode;
  localCwd: string;
  commandPrefix: string;
  argumentTemplate: string;
  systemPrompt: string;
  model: string;
}

const DEFAULT_PRESETS: AgentPreset[] = [
  {
    name: 'Prompt Padrão (CMD)',
    execMode: 'local',
    localCwd: 'C:\\Users\\Caio.Vicente',
    commandPrefix: '',
    argumentTemplate: '{input}',
    systemPrompt: '',
    model: ''
  },
  {
    name: 'Agente Hermes',
    execMode: 'local',
    localCwd: 'C:\\Users\\Caio.Vicente',
    commandPrefix: 'C:\\Users\\Caio.Vicente\\AppData\\Local\\hermes\\hermes-agent\\venv\\Scripts\\hermes.exe chat -q',
    argumentTemplate: '"{input}"',
    systemPrompt: '',
    model: ''
  },
  {
    name: 'Claude Code',
    execMode: 'local',
    localCwd: 'C:\\Users\\Caio.Vicente',
    commandPrefix: 'claude',
    argumentTemplate: '"{input}"',
    systemPrompt: '',
    model: ''
  },
  {
    name: 'Codex Agent',
    execMode: 'local',
    localCwd: 'C:\\Users\\Caio.Vicente',
    commandPrefix: 'codex',
    argumentTemplate: '"{input}"',
    systemPrompt: '',
    model: ''
  },
  {
    name: 'Gemini Assistente',
    execMode: 'gemini',
    localCwd: 'O:\\',
    commandPrefix: '',
    argumentTemplate: '{input}',
    systemPrompt: 'Você é um assistente de programação prestativo.',
    model: 'gemini-2.5-flash'
  }
];

export default function TerminalNode({ data, id }: TerminalNodeProps) {
  const [input, setInput] = useState('');
  const [agentName, setAgentName] = useState(data.agentName || 'Agent-Alpha');
  const [showSettings, setShowSettings] = useState(false);
  
  // Window UI States
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Agent Config
  const [execMode, setExecMode] = useState<ExecMode>('mock');
  const [systemPrompt, setSystemPrompt] = useState('Você é um assistente de programação prestativo.');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  
  // Local Script Config
  const [localCwd, setLocalCwd] = useState('O:\\');
  const [commandPrefix, setCommandPrefix] = useState('');
  const [argumentTemplate, setArgumentTemplate] = useState('{input}');
  
  // Presets State
  const [customPresets, setCustomPresets] = useState<AgentPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [showPresetHelp, setShowPresetHelp] = useState(false);
  const [selectedPresetName, setSelectedPresetName] = useState('');

  // Load custom presets from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ddm_custom_presets');
    if (saved) {
      try {
        setCustomPresets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load custom presets', e);
      }
    }
  }, []);

  const saveAsPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: AgentPreset = {
      name: newPresetName.trim(),
      execMode,
      localCwd,
      commandPrefix,
      argumentTemplate,
      systemPrompt,
      model
    };
    const updated = [...customPresets.filter(p => p.name !== newPreset.name), newPreset];
    setCustomPresets(updated);
    localStorage.setItem('ddm_custom_presets', JSON.stringify(updated));
    setNewPresetName('');
    setSelectedPresetName(newPreset.name); // Automatically select newly saved preset
  };

  const applyPreset = (preset: AgentPreset) => {
    setExecMode(preset.execMode);
    setLocalCwd(preset.localCwd);
    setCommandPrefix(preset.commandPrefix);
    setArgumentTemplate(preset.argumentTemplate);
    if (preset.systemPrompt) setSystemPrompt(preset.systemPrompt);
    if (preset.model) setModel(preset.model);
  };

  const deletePreset = () => {
    if (!selectedPresetName) return;
    const updated = customPresets.filter(p => p.name !== selectedPresetName);
    setCustomPresets(updated);
    localStorage.setItem('ddm_custom_presets', JSON.stringify(updated));
    setSelectedPresetName('');
  };
  
  // Process / Execution State
  const [pid, setPid] = useState<number | null>(null);
  const [status, setStatus] = useState<NodeStatus>('idle');
  const [isLoading, setIsLoading] = useState(false);

  // Terminal References
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<any>(null);
  const lastTriggerTimestamp = useRef<number | null>(null);

  // Get deleteElements function from React Flow context
  const { deleteElements } = useReactFlow();

  // Keep callback reference updated to avoid stale closures
  const onOutputChangeRef = useRef(data.onOutputChange);
  useEffect(() => {
    onOutputChangeRef.current = data.onOutputChange;
  }, [data.onOutputChange]);

  // ANSI escape sequences stripper helper
  const stripAnsi = (str: string) => {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  };

  // Load API Key and Initialize Terminal
  useEffect(() => {
    const savedKey = localStorage.getItem('ddm_gemini_api_key');
    if (savedKey) setApiKey(savedKey);

    // Load persisted settings for this specific node
    const savedExecMode = localStorage.getItem(`ddm_exec_mode_${id}`);
    if (savedExecMode) setExecMode(savedExecMode as ExecMode);

    const savedSysPrompt = localStorage.getItem(`ddm_sys_prompt_${id}`);
    if (savedSysPrompt) setSystemPrompt(savedSysPrompt);

    const savedModel = localStorage.getItem(`ddm_model_${id}`);
    if (savedModel) setModel(savedModel);

    const savedCwd = localStorage.getItem(`ddm_cwd_${id}`);
    if (savedCwd) setLocalCwd(savedCwd);

    const savedPrefix = localStorage.getItem(`ddm_prefix_${id}`);
    if (savedPrefix) setCommandPrefix(savedPrefix);

    const savedTemplate = localStorage.getItem(`ddm_template_${id}`);
    if (savedTemplate) setArgumentTemplate(savedTemplate);

    const initXterm = async () => {
      if (!terminalRef.current) return;
      
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 11,
        fontFamily: 'Consolas, Courier New, monospace',
        theme: {
          background: '#09090b',
          foreground: '#f4f4f5',
          cursor: '#f4f4f5',
          black: '#09090b',
          red: '#f87171',
          green: '#4ade80',
          yellow: '#facc15',
          blue: '#60a5fa',
          magenta: '#c084fc',
          cyan: '#2dd4bf',
          white: '#f4f4f5'
        },
        rows: isMaximized ? 24 : 15,
        cols: isMaximized ? 100 : 70
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      
      term.open(terminalRef.current);
      fitAddon.fit();
      
      // Welcome messages styled like Windows command line
      term.writeln('\x1b[1;36mDDM-Agents v0.1.0 [Versão 10.0.22631]\x1b[0m');
      term.writeln('(c) Corporação DDM Agents. Todos os direitos reservados.');
      term.writeln('\r\nClique na engrenagem (\x1b[33m⚙️\x1b[0m) para configurar o agente local.');
      term.writeln('Comandos internos começam com "/" (Ex: /help, /status).');
      term.write('\r\n\x1b[32mC:\\Users\\Caio.Vicente>\x1b[0m ');

      xtermInstance.current = term;
    };

    if (!isMinimized) {
      initXterm();
    }

    return () => {
      if (xtermInstance.current) {
        xtermInstance.current.dispose();
      }
    };
  }, [isMinimized, isMaximized, id]);

  // Persist settings on change
  useEffect(() => {
    localStorage.setItem(`ddm_exec_mode_${id}`, execMode);
  }, [execMode, id]);

  useEffect(() => {
    localStorage.setItem(`ddm_sys_prompt_${id}`, systemPrompt);
  }, [systemPrompt, id]);

  useEffect(() => {
    localStorage.setItem(`ddm_model_${id}`, model);
  }, [model, id]);

  useEffect(() => {
    localStorage.setItem(`ddm_cwd_${id}`, localCwd);
  }, [localCwd, id]);

  useEffect(() => {
    localStorage.setItem(`ddm_prefix_${id}`, commandPrefix);
  }, [commandPrefix, id]);

  useEffect(() => {
    localStorage.setItem(`ddm_template_${id}`, argumentTemplate);
  }, [argumentTemplate, id]);

  // Listen for external inputs from linked source nodes in the React Flow
  useEffect(() => {
    const inputVal = data.triggerInput;
    if (inputVal && data.triggerTimestamp && data.triggerTimestamp !== lastTriggerTimestamp.current) {
      lastTriggerTimestamp.current = data.triggerTimestamp;
      
      const processTrigger = async () => {
        // Wait briefly if xterm is initializing
        if (!xtermInstance.current) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
        
        if (xtermInstance.current) {
          xtermInstance.current.writeln(`\r\n\x1b[1;35m>> [Entrada recebida do nó anterior]:\x1b[0m`);
          xtermInstance.current.writeln(inputVal);
          handleCommand(inputVal);
        }
      };

      processTrigger();
    }
  }, [data.triggerInput, data.triggerTimestamp]);

  const stopRunningAgent = async () => {
    if (!pid) return;
    xtermInstance.current?.writeln('\r\n\x1b[33m>> Solicitando encerramento do processo...\x1b[0m');
    try {
      const res = await fetch('/api/kill-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid })
      });
      const data = await res.json();
      if (data.success) {
        xtermInstance.current?.writeln('\x1b[31m>> Processo encerrado pelo usuário.\x1b[0m\r\n\x1b[32mC:\\Users\\Caio.Vicente>\x1b[0m ');
        setPid(null);
        setStatus('failed');
      } else {
        xtermInstance.current?.writeln(`\x1b[31m>> Erro ao encerrar: ${data.error}\x1b[0m\r\n\x1b[32mC:\\Users\\Caio.Vicente>\x1b[0m `);
      }
    } catch (e: any) {
      xtermInstance.current?.writeln(`\x1b[31m>> Falha ao encerrar: ${e.message}\x1b[0m\r\n\x1b[32mC:\\Users\\Caio.Vicente>\x1b[0m `);
    }
  };

  const handleCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) {
      xtermInstance.current?.write('\r\n\x1b[32mC:\\Users\\Caio.Vicente>\x1b[0m ');
      return;
    }

    setIsLoading(true);
    const term = xtermInstance.current;

    // Node Control Commands (prefixed with /)
    if (trimmed.startsWith('/')) {
      term.writeln('');
      const parts = trimmed.substring(1).split(' ');
      const controlCmd = parts[0].toLowerCase();
      
      if (controlCmd === 'help') {
        term.writeln('\x1b[1mComandos do Console do Nó:\x1b[0m');
        term.writeln('  /help         - Mostra este menu');
        term.writeln('  /clear        - Limpa o histórico de tela');
        term.writeln('  /status       - Estado e modo do nó');
        term.writeln('  /agent <nome> - Renomeia o agente');
      } else if (controlCmd === 'clear') {
        term.clear();
      } else if (controlCmd === 'status') {
        term.writeln(`Agente: \x1b[1m${agentName}\x1b[0m`);
        term.writeln(`Modo de Execução: \x1b[33m${execMode.toUpperCase()}\x1b[0m`);
        term.writeln(`Status do Nó: ${status.toUpperCase()}`);
        term.writeln(pid ? `PID Ativo: \x1b[32m${pid}\x1b[0m` : 'Nenhum processo ativo no momento.');
      } else if (controlCmd === 'agent') {
        const name = parts.slice(1).join(' ').trim();
        if (name) {
          setAgentName(name);
          term.writeln(`Nome do agente alterado para: \x1b[32m${name}\x1b[0m`);
        } else {
          term.writeln('Uso: /agent <nome>');
        }
      } else {
        term.writeln(`\x1b[31mComando do nó inválido: /${controlCmd}\x1b[0m`);
      }
      term.write('\r\n\x1b[32mC:\\Users\\Caio.Vicente>\x1b[0m ');
      setIsLoading(false);
      return;
    }

    // Execute based on selected mode
    try {
      if (execMode === 'local') {
        setStatus('running');
        term.writeln('');
        
        const formattedArgs = argumentTemplate.replace('{input}', trimmed);
        const shellCommand = commandPrefix 
          ? `${commandPrefix} ${formattedArgs}` 
          : formattedArgs;

        const response = await fetch('/api/run-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: shellCommand, cwd: localCwd })
        });

        if (!response.body) {
          throw new Error('Nenhuma resposta em stream recebida da API.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullOutputAccumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            if (!part.trim()) continue;
            try {
              const msg = JSON.parse(part);
              if (msg.type === 'pid') {
                setPid(msg.data);
              } else if (msg.type === 'stdout') {
                term.write(msg.data.replace(/\n/g, '\r\n'));
                fullOutputAccumulated += msg.data;
              } else if (msg.type === 'stderr') {
                term.write(`\x1b[31m${msg.data.replace(/\n/g, '\r\n')}\x1b[0m`);
              } else if (msg.type === 'exit') {
                term.writeln(`\r\n\x1b[1;35m>> Processo concluído com código: ${msg.data}\x1b[0m`);
                setPid(null);
                setStatus(msg.data === 0 ? 'success' : 'failed');
                
                // When execution completes successfully, trigger the output change to flow to next nodes
                if (msg.data === 0 && onOutputChangeRef.current && fullOutputAccumulated.trim() !== '') {
                  const cleanText = stripAnsi(fullOutputAccumulated);
                  onOutputChangeRef.current(id, cleanText);
                }
              } else if (msg.type === 'error') {
                term.writeln(`\r\n\x1b[31m>> Erro do Processo: ${msg.data}\x1b[0m`);
                setPid(null);
                setStatus('failed');
              }
            } catch (e) {
              // Ignore partial lines
            }
          }
        }
        term.write('\r\n\x1b[32mC:\\Users\\Caio.Vicente>\x1b[0m ');

      } else if (execMode === 'gemini') {
        if (!apiKey) {
          term.writeln('\r\n\x1b[31mErro: Configure a API Key do Gemini nas configurações (⚙️) para usar este modo.\x1b[0m');
          term.write('\r\n\x1b[32mC:\\Users\\Caio.Vicente>\x1b[0m ');
          setIsLoading(false);
          return;
        }

        setStatus('running');
        term.writeln('\r\n\x1b[33mProcessando na nuvem...\x1b[0m');
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: trimmed }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] }
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const resData = await response.json();
        const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';
        
        term.write(responseText.replace(/\n/g, '\r\n'));
        term.writeln('');
        setStatus('success');
        term.write('\r\n\x1b[32mC:\\Users\\Caio.Vicente>\x1b[0m ');
        
        if (onOutputChangeRef.current) {
          onOutputChangeRef.current(id, responseText);
        }

      } else {
        // Mock Mode (Simulador)
        setStatus('running');
        term.writeln('\r\nSimulando execução do agente...');
        setTimeout(() => {
          const mockResponse = `[${agentName}]: Resposta Simulada para o comando: "${trimmed}".`;
          term.writeln(`\x1b[32m${mockResponse}\x1b[0m`);
          setStatus('success');
          term.write('\r\n\x1b[32mC:\\Users\\Caio.Vicente>\x1b[0m ');
          
          if (onOutputChangeRef.current) {
            onOutputChangeRef.current(id, mockResponse);
          }
        }, 1000);
      }
    } catch (error: any) {
      term.writeln(`\r\n\x1b[31mFalha na execução: ${error.message}\x1b[0m`);
      setStatus('failed');
      setPid(null);
      term.write('\r\n\x1b[32mC:\\Users\\Caio.Vicente>\x1b[0m ');
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('ddm_gemini_api_key', key);
  };

  const handleClose = () => {
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div className={`rounded border border-neutral-700 bg-black shadow-2xl overflow-hidden font-sans transition-all ${
      isMaximized ? 'w-[820px]' : 'w-[580px]'
    }`}>
      {/* Target/Input Connection */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-indigo-500 border-2 border-zinc-950"
      />

      {/* Header Styled like Windows 11 CMD */}
      <div className="flex items-center justify-between bg-[#1f1f1f] px-3 py-1.5 border-b border-[#2d2d2d] select-none">
        <div className="flex gap-2 items-center">
          <span className="text-xs">🪟</span>
          <span className="text-[11px] font-sans text-neutral-300 font-medium">
            Prompt de Comando ({agentName})
          </span>
          {pid && (
            <span className="text-[9px] bg-indigo-950/80 text-indigo-300 border border-indigo-500/20 px-1 py-0.2 rounded font-mono ml-2">
              PID: {pid}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {pid && !isMinimized && (
            <button
              onClick={stopRunningAgent}
              className="text-[9px] font-bold text-red-400 bg-red-950/40 hover:bg-red-950/80 px-1.5 py-0.5 border border-red-500/20 rounded mr-2 transition-all cursor-pointer"
              title="Encerrar Processo"
            >
              Parar
            </button>
          )}
          {!isMinimized && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-neutral-400 hover:text-white transition-colors mr-3 text-xs cursor-pointer"
              title="Configurações do Agente"
            >
              ⚙️
            </button>
          )}
          {/* Windows Window Controls */}
          <div className="flex items-center -mr-3">
            <button 
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-8 h-6 text-neutral-400 hover:bg-neutral-800 flex items-center justify-center text-[10px] transition-all cursor-pointer"
              title="Minimizar"
            >
              ─
            </button>
            <button 
              onClick={() => {
                if (!isMinimized) {
                  setIsMaximized(!isMaximized);
                }
              }}
              className="w-8 h-6 text-neutral-400 hover:bg-neutral-800 flex items-center justify-center text-[9px] transition-all cursor-pointer"
              title="Maximizar"
            >
              ❑
            </button>
            <button 
              onClick={handleClose}
              className="w-9 h-6 text-neutral-400 hover:bg-red-600 hover:text-white flex items-center justify-center text-xs transition-all cursor-pointer"
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Conditionally hide the main content panel if minimized */}
      {!isMinimized && (
        <>
          {/* Settings Panel */}
          {showSettings && (
            <div className="p-3 bg-neutral-900 border-b border-neutral-800 text-xs space-y-2 text-neutral-300">
              <div className="font-bold text-neutral-200">Configurações do Agente</div>
              
              {/* Presets Selection */}
              <div className="flex gap-3 items-end border-b border-neutral-800 pb-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block text-[10px] text-neutral-500 font-semibold uppercase">Carregar Preset</label>
                    <button
                      type="button"
                      onClick={() => setShowPresetHelp(!showPresetHelp)}
                      className="w-3.5 h-3.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center text-[9px] font-bold cursor-pointer transition-colors border border-neutral-700 select-none"
                      title="Ajuda sobre Presets"
                    >
                      ?
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <select
                      value={selectedPresetName}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        setSelectedPresetName(selectedName);
                        if (!selectedName) return;
                        const preset = [...DEFAULT_PRESETS, ...customPresets].find(p => p.name === selectedName);
                        if (preset) applyPreset(preset);
                      }}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 text-white"
                    >
                      <option value="" disabled>Selecione um preset...</option>
                      <optgroup label="Padrões">
                        {DEFAULT_PRESETS.map(p => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </optgroup>
                      {customPresets.length > 0 && (
                        <optgroup label="Personalizados">
                          {customPresets.map(p => (
                            <option key={p.name} value={p.name}>{p.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {customPresets.some(p => p.name === selectedPresetName) && (
                      <button
                        type="button"
                        onClick={deletePreset}
                        className="px-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 hover:border-red-500 text-red-400 rounded transition-colors text-[10px] font-semibold cursor-pointer whitespace-nowrap"
                        title="Deletar Preset"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-neutral-500 mb-1 font-semibold uppercase">Salvar Config. Atual</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Nome do preset..."
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-white text-[10px]"
                    />
                    <button
                      onClick={saveAsPreset}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded transition-colors text-[10px] font-semibold cursor-pointer whitespace-nowrap"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>

              {/* Presets Help Box */}
              {showPresetHelp && (
                <div className="p-3 bg-neutral-950 border border-indigo-500/20 rounded text-[10px] text-neutral-400 leading-relaxed mb-2 space-y-1">
                  <div className="font-bold text-indigo-400 flex items-center justify-between border-b border-neutral-800 pb-1 mb-1">
                    <span>💡 Como configurar seus Presets:</span>
                    <button 
                      type="button"
                      onClick={() => setShowPresetHelp(false)}
                      className="text-neutral-500 hover:text-white cursor-pointer font-mono"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    • <strong>Sem .exe:</strong> Comandos globais (ex: <code>git</code>, <code>claude</code>, <code>npm</code>) não precisam do caminho completo ou .exe porque o Windows os encontra automaticamente pelo PATH.
                  </div>
                  <div>
                    • <strong>Com .exe / Caminho completo:</strong> Executáveis locais ou dentro de ambientes virtuais (como o <code>hermes.exe</code>) funcionam de forma estável se você colocar o caminho absoluto dele no <strong>Prefixo do Comando</strong>.
                  </div>
                  <div>
                    • <strong>Criar seus presets:</strong> Preencha o CWD, Prefixo e Argumentos, digite um nome no campo <strong>Salvar Config. Atual</strong> e clique em <strong>Salvar</strong>. Ele estará salvo no seu navegador para qualquer terminal novo!
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-[10px] text-neutral-500 mb-1">Modo de Execução</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['mock', 'gemini', 'local'] as ExecMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setExecMode(m)}
                      className={`py-1 rounded border text-[10px] uppercase font-semibold ${
                        execMode === m
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                          : 'bg-neutral-950 border-neutral-800 hover:bg-neutral-800'
                      }`}
                    >
                      {m === 'mock' ? 'Simulado' : m === 'gemini' ? 'Gemini API' : 'Script Local'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gemini Settings */}
              {execMode === 'gemini' && (
                <>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1">Chave de API Gemini</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => saveApiKey(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 text-white"
                      placeholder="Cole sua API Key do Gemini..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1">Modelo</label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 text-white"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1">Prompt do Sistema</label>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="w-full h-12 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 text-white resize-none"
                    />
                  </div>
                </>
              )}

              {/* Local Windows script config */}
              {execMode === 'local' && (
                <>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1">Diretório de Trabalho (CWD)</label>
                    <input
                      type="text"
                      value={localCwd}
                      onChange={(e) => setLocalCwd(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 text-white font-mono"
                      placeholder="Ex: O:\ddm-agents ou C:\projetos"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1">Prefixo do Comando (Opcional)</label>
                    <input
                      type="text"
                      value={commandPrefix}
                      onChange={(e) => setCommandPrefix(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 text-white font-mono"
                      placeholder="Ex: python agent.py"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-1">Template do Argumento</label>
                    <input
                      type="text"
                      value={argumentTemplate}
                      onChange={(e) => setArgumentTemplate(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 text-white font-mono"
                      placeholder='Ex: -z "{input}"'
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1 rounded transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}

          {/* Console Area - Using Xterm.js */}
          <div className="bg-black p-3 border-b border-[#2d2d2d]">
            <div 
              ref={terminalRef} 
              className="nowheel nodrag overflow-hidden" 
              style={{ minHeight: isMaximized ? '320px' : '200px' }}
            />
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              xtermInstance.current?.write(input + '\r\n');
              handleCommand(input);
              setInput('');
            }}
            className="flex border-t border-[#2d2d2d] bg-[#0c0c0c]"
          >
            <span className="pl-3 py-2 text-xs font-mono text-neutral-500">{'>'}</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent px-2 py-2 text-xs font-mono text-white focus:outline-none font-sans"
              placeholder={isLoading && execMode !== 'local' ? "Aguarde..." : execMode === 'local' && !commandPrefix ? "Digite um comando CMD/PowerShell..." : "Digite uma mensagem..."}
              disabled={isLoading && execMode !== 'local'}
            />
          </form>
        </>
      )}

      {/* Source/Output Connection */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-indigo-500 border-2 border-zinc-950"
      />
    </div>
  );
}
