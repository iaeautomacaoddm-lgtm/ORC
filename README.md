# DDM Agents - Orquestrador de Agentes de IA

Este é um ambiente web interativo de **Canvas Infinito** desenvolvido para a orquestração, encadeamento e execução de agentes de IA locais (como o Agente Hermes, Claude Code, Codex) e modelos em nuvem (Gemini).

Inspirado em ferramentas de canvas virtuais modernas, o projeto permite que desenvolvedores conectem saídas e entradas de terminais em tempo real para criar pipelines automáticos de execução de tarefas.

---

## 🚀 Tecnologias Utilizadas

- **Framework:** Next.js 16 (App Router)
- **Visualização & Gráficos:** React Flow (para gerenciamento e desenho do canvas infinito)
- **Emulação de Terminal:** Xterm.js (com suporte completo a cores ANSI e captura de eventos de rolagem)
- **Styling:** TailwindCSS (Layout responsivo com design premium escuro baseado no Windows 11)
- **Gerenciamento de Processos:** Processamento assíncrono via streams no Node.js (`child_process` para Windows)

---

## 🧱 Tipos de Nós Disponíveis

1. **Terminal de Agente (`terminal`):**
   Um console interativo completo capaz de emular um prompt de comando real do Windows. Suporta execução local de scripts, consultas de IA no Gemini ou simulações isoladas.
2. **Bloco de Notas (`note`):**
   Um editor de notas em texto rico para registrar ideias, lembretes ou documentações rápidas no próprio canvas.
3. **Esboço de Desenho (`sketch`):**
   Uma lousa interativa baseada em Canvas HTML5 para desenhar arquiteturas, fluxos de caixas ou anotações visuais à mão livre.

---

## ⚙️ Motores de Execução do Terminal

Cada terminal de agente pode ser configurado de forma independente clicando no ícone de engrenagem (**⚙️**):

* **Simulado (Mock):** Executa respostas locais pré-programadas para testes rápidos de interface.
* **Gemini API:** Consome diretamente os modelos da família Gemini (como `gemini-2.5-flash` ou `pro`) inserindo sua API Key local.
* **Script Local:** Executa comandos reais no prompt do seu próprio computador (CMD ou PowerShell). Permite passar o diretório de trabalho personalizado (**CWD**), comandos prefixados e templates de argumentos.

---

## 🔗 Encadeamento e Comunicação (Piping)

Quando dois terminais de agente são conectados por um cabo no Canvas (Saída de um $\rightarrow$ Entrada de outro):

1. O primeiro terminal executa seu script ou prompt normalmente.
2. Ao concluir com **código de sucesso `0`**, a saída de texto acumulada é automaticamente **sanitizada** (remoção de códigos de cores ANSI).
3. A saída sanitizada é enviada para o próximo terminal como entrada.
4. O terminal de destino exibe o aviso `>> [Entrada recebida do nó anterior]` e dispara a sua própria execução de forma autônoma passando aquele texto como parâmetro.

*Arquitetura robusta livre de stale closures (referências obsoletas em React): O sistema monitora o mapa de conexões dinamicamente no nível superior via `useReactFlow().getEdges()` e propaga os dados através de referências mutáveis (`useRef`).*

---

## 💾 Sistema de Presets (Configurações Rápidas)

Para evitar reescrever caminhos de pastas e comandos longos todas as vezes que abrir o canvas, implementamos um gerenciador de presets:

* **Presets Padrões inclusos:**
  - **Prompt Padrão (CMD):** Carrega o prompt limpo na pasta do usuário.
  - **Agente Hermes:** Aponta para o executável no caminho local do venv do Hermes (`hermes.exe chat -q`).
  - **Claude Code:** Pronto para acionar o Claude Code (`claude`).
  - **Codex Agent:** Pronto para acionar o Codex (`codex`).
  - **Gemini Assistente:** Configura o terminal no modo Gemini com o prompt de sistema adequado.
* **Presets Customizados:** Permite configurar qualquer combinação de diretório, prefixo e argumentos, dar um nome personalizado e salvar. Os presets são persistidos no navegador (`localStorage`).
* **Exclusão de Presets:** Qualquer preset criado por você pode ser excluído instantaneamente selecionando-o no dropdown e clicando no botão **Excluir**.
* **Guia de ajuda (?):** Um botão de interrogação no cabeçalho explica detalhadamente as regras de caminho e comandos executáveis.

---

## 🛡️ Endpoints da API

- **`POST /api/run-agent`**: Inicia o processo no Windows com suporte a streaming de logs em tempo real (`text/event-stream`). Retorna o `PID` de execução e transmite as saídas de `stdout` e `stderr` encapsuladas em JSON.
- **`POST /api/kill-agent`**: Termina com segurança a árvore do processo no Windows usando o comando `taskkill` a partir do `PID` informado.

---

## 🛠️ Como Executar o Projeto

Instale as dependências:
```bash
npm install
```

Para rodar em ambiente de desenvolvimento (com hot-reload):
```bash
npm run dev
```

Para compilar e iniciar o servidor de produção otimizado:
```bash
npm run build
npm run start
```

Acesse o endereço local: `http://localhost:3000`
