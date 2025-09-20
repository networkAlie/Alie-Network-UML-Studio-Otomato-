
import React, { useEffect, useMemo, useRef, useState } from "react";
import type mermaid from "mermaid";

declare global {
  interface Window {
    mermaid: typeof mermaid;
  }
}

// --- Type Definitions ---
interface Diagram {
  id: string;
  group: string;
  title: string;
  code: string;
}

// --- Mermaid init helper ---
const initMermaid = (dark = false): void => {
  window.mermaid.initialize({
    startOnLoad: false,
    theme: dark ? "dark" : "default",
    securityLevel: "loose",
    flowchart: { htmlLabels: true, diagramPadding: 8 },
    sequence: { actorMargin: 30 },
  });
};

// --- Helper Functions ---
const copy = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

const download = (name: string, svg: string): void => {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// Shared class for exception/risk nodes
const CLASSDEF = "classDef risk fill:#fff3cd,stroke:#f0ad4e,color:#8a6d3b;\n";

// ------------------ OTOMATO DIAGRAMS ------------------
const diagrams: Diagram[] = [
  {
    id: "OTO0",
    group: "Otomato Platform",
    title: "System Overview (Use-Case)",
    code: `flowchart LR\n  U([User])\n  D([Developer])\n  P([Partner Protocol])\n\n  subgraph Otomato[Otomato Automation Platform]\n    UC1((Create No-Code Agent))\n    UC2((Use Otomato SDK))\n    UC3((Integrate via API))\n    UC4((Monitor On-Chain Events))\n  end\n\n  U --> UC1\n  D --> UC2\n  P --> UC3\n  UC1 --> UC4\n  UC2 --> UC4`,
  },
  {
    id: "OTO1",
    group: "Otomato Platform",
    title: "No-Code Automation Workflow (Flowchart)",
    code: `flowchart TD\n  ${CLASSDEF}  A[Start: User opens Automation Builder]\n  B{"Define Trigger<br/><i>e.g., Gas price < 10 Gwei</i>"}\n  C{"Define Action<br/><i>e.g., Swap ETH for TOKEN</i>"}\n  D[Save & Deploy Agent]\n  E((Otomato Engine Monitors Blockchain))\n  F{Condition Met?}\n  G[Execute Transaction via Smart Account]\n  H([End: Success])\n  I([End: Failed])\n\n  A --> B --> C --> D --> E --> F\n  F -- Yes --> G --> H\n  F -- No --> E\n  G -- Error --> I`,
  },
  {
    id: "OTO2",
    group: "Otomato Platform",
    title: "Technology Ecosystem (Component View)",
    code: `flowchart TD\n  subgraph UserFacing[User-Facing Layer]\n    UI[No-Code Builder UI]\n    SDK[TypeScript SDK]\n  end\n\n  subgraph CoreEngine[Core Engine]\n    AE[Automation Engine]\n    SA["Smart Accounts<br/>(ERC-4337)"]\n  end\n\n  subgraph Integrations[Integrations & Infrastructure]\n    EVM["EVM Chains<br/>(Base, Ethereum, etc.)"]\n    DeFi["DeFi Protocols<br/>(Aave, Compound)"]\n    Privacy["Privacy Layer<br/>(iExec)"]\n  end\n\n  UI --> AE\n  SDK --> AE\n  AE --> SA\n  SA --> EVM\n  SA --> DeFi\n  AE --> Privacy`,
  },
  {
    id: "OTO3",
    group: "Strategy & Growth",
    title: "Funding & Partnerships (Sequence)",
    code: `sequenceDiagram\n  autonumber\n  participant C as Coinsilium (Investor)\n  participant O as Otomato\n  participant I as iExec (Partner)\n  participant M as Mode Network\n\n  C->>O: Provide Strategic Funding (SAFT)\n  O-->>C: Grant % of future revenue & tokens\n  O->>I: Propose technical integration\n  I-->>O: Agree to provide privacy tools on Arbitrum\n  O->>M: Join Yield Accelerator Program\n  M-->>O: Provide ecosystem support & grant\n  O->>O: Develop platform using funds & tech`,
  },
  {
    id: "OTO4",
    group: "Strategy & Growth",
    title: "Project Launch Roadmap (Flowchart)",
    code: `flowchart LR\n  ${CLASSDEF}  A[Q3 2024: Private Beta] --> B[Q4 2024: Public Launch]\n  B --> C["Q2 2025: Token Generation Event (TGE)"]\n  C --> D[Post-TGE: Exchange Listings & DAO Formation]\n\n  R1{{Tokenomics Not Public}}:::risk\n  C -.-> R1`,
  },
];

// --- React Components ---

interface MermaidRendererProps {
  code: string;
  onRender: (svg: string) => void;
}

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, onRender }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    let active = true;
    const id = `mmd_${Math.random().toString(36).slice(2)}`;
    
    // Clear previous render to avoid flashes of old content
    ref.current.innerHTML = '<div class="flex justify-center items-center h-64"><div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-500"></div></div>';

    window.mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (!active) return;
        if (ref.current) ref.current.innerHTML = svg;
        onRender(svg);
      })
      .catch((err) => {
        if (ref.current) {
          const safeCode = code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          ref.current.innerHTML = `<pre class='text-red-500 whitespace-pre-wrap p-4 bg-red-50 dark:bg-red-900/20 rounded-lg'><strong>Mermaid Render Error:</strong><br/>${String(err)}<br/><br/><strong>Code:</strong><br/>${safeCode}</pre>`;
        }
      });
      
    return () => {
      active = false;
    };
  }, [code, onRender]);
  
  return <div ref={ref} className="w-full overflow-auto" />;
};


interface SidebarProps {
  items: Diagram[];
  currentId: string;
  onSelect: (diagram: Diagram) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ items, currentId, onSelect }) => {
  const groups = useMemo(() => {
    const m = new Map<string, Diagram[]>();
    items.forEach((d) => {
      if (!m.has(d.group)) m.set(d.group, []);
      m.get(d.group)?.push(d);
    });
    return Array.from(m.entries());
  }, [items]);

  return (
    <aside className="w-full md:w-80 lg:w-96 shrink-0 space-y-4">
      {groups.map(([group, ds]) => (
        <div key={group} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-3 shadow-sm">
          <div className="mb-2 px-2 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{group}</div>
          <ul className="space-y-1">
            {ds.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => onSelect(d)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors duration-200 ${
                    currentId === d.id ? "bg-blue-600 text-white shadow-md" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {d.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
};

export default function App() {
  const [selected, setSelected] = useState<Diagram>(diagrams[0]);
  const [svg, setSvg] = useState<string>("");
  const [dark, setDark] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<string>("Copy Mermaid");

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    initMermaid(dark);
    // Force re-render of the current diagram when theme changes
    setSelected(prev => ({...prev}));
  }, [dark]);

  const handleCopy = () => {
    copy(selected.code).then(success => {
      if (success) {
        setCopyStatus("Copied!");
        setTimeout(() => setCopyStatus("Copy Mermaid"), 2000);
      }
    });
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-800 dark:bg-gray-950 dark:text-gray-200 transition-colors duration-300">
      <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Otomato — UML Studio</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Live diagrams for the Web3 No-Code Automation Platform</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((v) => !v)}
              className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Toggle dark mode"
            >
              {dark ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              onClick={handleCopy}
              className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Copy Mermaid code"
            >
              {copyStatus}
            </button>
            <button
// Fix: Replaced `replaceAll` with `replace` for broader compatibility.
              onClick={() => download(selected.title.replace(/ /g, "_"), svg)}
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm text-white shadow-sm hover:bg-blue-700 transition-colors"
              title="Export SVG"
              disabled={!svg}
            >
              Export SVG
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:flex-row">
        <Sidebar items={diagrams} currentId={selected.id} onSelect={(d) => setSelected(d)} />

        <section className="flex w-full flex-col gap-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm flex-grow">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Diagram</div>
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">{selected.title}</h2>
            <div className={dark ? "p-4 rounded-2xl bg-gray-950" : "p-4 rounded-2xl bg-gray-50"}>
              <MermaidRenderer code={selected.code} onRender={setSvg} />
            </div>
          </div>

          <details className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold">Show Mermaid Source</summary>
            <pre className="mt-3 overflow-auto rounded-xl bg-gray-50 dark:bg-gray-950 p-3 text-xs leading-relaxed text-gray-600 dark:text-gray-300 font-mono">{selected.code}</pre>
          </details>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-gray-500 dark:text-gray-500">
        © {new Date().getFullYear()} UML Studio for Otomato. Diagrams are for illustrative purposes.
      </footer>
    </div>
  );
}
