import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore, systemStore } from '../store/useSystemStore';
import { playGlassPop, playToggleClick, playWaterDrop } from '../utils/sfx';
import { evaluateMathExpression, MathEvalResult } from '../utils/mathEvaluator';
import { ClipboardSnippetItem, DevPortInfo, ShelfFileItem } from '../types/liquid';
import {
  Search,
  Calculator,
  Terminal,
  HelpCircle,
  Copy,
  Check,
  Pin,
  Trash2,
  ExternalLink,
  PowerOff,
  RefreshCw,
  Plus,
  Camera,
  FolderPlus,
  Sparkles,
  X,
  FileCode,
  FileText,
  Radio,
  Sliders,
  Moon,
  Sun,
  Eye,
  Smile,
  Cat,
  Timer,
  Droplets,
  Inbox,
  CheckSquare,
  Cpu,
  Shield,
  Layout,
} from 'lucide-react';

// Storage keys
const CLIPBOARD_STORAGE_KEY = 'liquidisland_clipboard_snippets_v1';
const SCRATCHPAD_STORAGE_KEY = 'liquidisland_scratchpad_v1';

// Seed snippets for Feature #3
const SEED_SNIPPETS: ClipboardSnippetItem[] = [
  {
    id: 'snip-1',
    content: 'const [active, setActive] = useState(false);',
    kind: 'code',
    pinned: true,
    timestamp: 'Pinned',
  },
  {
    id: 'snip-2',
    content: '#10b981',
    kind: 'color',
    pinned: true,
    timestamp: 'Pinned',
  },
  {
    id: 'snip-3',
    content: '#3b82f6',
    kind: 'color',
    pinned: false,
    timestamp: '10m ago',
  },
  {
    id: 'snip-4',
    content: '#a855f7',
    kind: 'color',
    pinned: false,
    timestamp: '25m ago',
  },
  {
    id: 'snip-5',
    content: 'git commit -m "feat: liquid glass dynamic island"',
    kind: 'code',
    pinned: false,
    timestamp: '1h ago',
  },
  {
    id: 'snip-6',
    content: 'fn trim_ram_working_set() -> f64',
    kind: 'code',
    pinned: false,
    timestamp: '2h ago',
  },
];

// Curated AI Quick-Reference Database
interface QuickRefEntry {
  trigger: string;
  question: string;
  solution: string;
  language: string;
  tags: string[];
}

const AI_QUICK_REFS: QuickRefEntry[] = [
  {
    trigger: 'git undo commit',
    question: 'How to undo last git commit but keep changes staged?',
    solution: 'git reset --soft HEAD~1',
    language: 'bash',
    tags: ['git', 'commit', 'reset'],
  },
  {
    trigger: 'git squash',
    question: 'How to squash the last N commits into one?',
    solution: 'git reset --soft HEAD~3 && git commit -m "feat: consolidated updates"',
    language: 'bash',
    tags: ['git', 'squash'],
  },
  {
    trigger: 'flex center',
    question: 'CSS modern one-line perfect centering?',
    solution: 'display: grid; place-items: center;',
    language: 'css',
    tags: ['css', 'flex', 'center', 'grid'],
  },
  {
    trigger: 'glassmorphism',
    question: 'Pure Liquid Glass backdrop filter and border token?',
    solution: 'backdrop-filter: blur(28px) saturate(190%);\nbackground: rgba(18, 18, 22, 0.88);\nborder: 1px solid rgba(255, 255, 255, 0.12);',
    language: 'css',
    tags: ['css', 'glass', 'backdrop'],
  },
  {
    trigger: 'docker prune',
    question: 'Clean all unused containers, networks, and images?',
    solution: 'docker system prune -a --volumes',
    language: 'bash',
    tags: ['docker', 'clean', 'prune'],
  },
  {
    trigger: 'rust closure',
    question: 'Move semantics closure in Rust?',
    solution: 'let add_ten = move |x: i32| -> i32 { x + 10 };',
    language: 'rust',
    tags: ['rust', 'closure', 'move'],
  },
  {
    trigger: 'regex email',
    question: 'Standard RFC-compliant email validation regex?',
    solution: '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/',
    language: 'regex',
    tags: ['regex', 'email', 'validation'],
  },
  {
    trigger: 'http 418',
    question: 'HTTP Status 418 I\'m a teapot?',
    solution: 'RFC 2324: "418 I\'m a teapot" - HTCPCP client error returned by coffee pots requested to brew tea.',
    language: 'text',
    tags: ['http', '418', 'status'],
  },
];

// Helper: safe Tauri invoker
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const isTauri =
      typeof window !== 'undefined' &&
      ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    if (!isTauri) {
      if (cmd === 'scan_active_dev_ports') {
        return [
          { port: 5173, pid: 1420, process_name: 'vite.exe (LiquidIsland)', active: true },
          { port: 3000, pid: 8940, process_name: 'node.exe (Next/React)', active: true },
          { port: 8080, pid: 5520, process_name: 'server.exe (HTTP)', active: true },
          { port: 1420, pid: 7820, process_name: 'tauri.exe (Dev Backend)', active: true },
          { port: 4000, pid: 0, process_name: '', active: false },
          { port: 8000, pid: 0, process_name: '', active: false },
        ] as unknown as T;
      }
      if (cmd === 'kill_dev_port') {
        return true as unknown as T;
      }
      return null;
    }
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.warn(`[Spotlight IPC] "${cmd}" returned:`, err);
    return null;
  }
}

// Snip SVG generator
const CREATE_SNIP_DATA_URL = (text: string, timestamp: string): string => {
  const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 80);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180">
    <defs>
      <linearGradient id="snipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e1e24" />
        <stop offset="100%" stop-color="#0b0b0e" />
      </linearGradient>
      <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#3b82f6" />
        <stop offset="100%" stop-color="#a855f7" />
      </linearGradient>
    </defs>
    <rect width="300" height="180" rx="14" fill="url(#snipGrad)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <rect x="0" y="0" width="300" height="28" rx="14" fill="rgba(255,255,255,0.04)"/>
    <circle cx="16" cy="14" r="4" fill="#ef4444" />
    <circle cx="28" cy="14" r="4" fill="#f59e0b" />
    <circle cx="40" cy="14" r="4" fill="#10b981" />
    <text x="60" y="18" fill="#94a3b8" font-size="10" font-family="monospace">LiquidIsland Screen Snip</text>
    <rect x="18" y="44" width="264" height="2" fill="url(#glow)"/>
    <text x="20" y="74" fill="#f8fafc" font-size="12" font-family="monospace" font-weight="bold">${safeText || 'Code Snapshot'}</text>
    <text x="20" y="100" fill="#94a3b8" font-size="10" font-family="monospace">Snapshot captured from Spotlight</text>
    <text x="20" y="152" fill="#64748b" font-size="9" font-family="sans-serif">📸 ${timestamp}</text>
    <rect x="236" y="138" width="46" height="20" rx="4" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" stroke-width="1"/>
    <text x="246" y="152" fill="#60a5fa" font-size="9" font-family="sans-serif" font-weight="bold">SHELF</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

interface SpotlightModalProps {
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const SpotlightModal: React.FC<SpotlightModalProps> = ({ onClose, onOpenSettings }) => {
  const activeTab = useSystemStore((s) => s.spotlightActiveTab ?? 'omni');
  const theme = useSystemStore((s) => s.theme);

  // Search input state
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tab 2: Clipboard & Snippets State
  const [snippets, setSnippets] = useState<ClipboardSnippetItem[]>(() => {
    try {
      const raw = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return SEED_SNIPPETS;
  });
  const [snippetFilter, setSnippetFilter] = useState<'all' | 'pinned' | 'code' | 'color' | 'text'>('all');
  const [newSnippetInput, setNewSnippetInput] = useState('');
  const [showAddSnippet, setShowAddSnippet] = useState(false);

  // Tab 3: Dev Ports State
  const [devPorts, setDevPorts] = useState<DevPortInfo[]>([]);
  const [isScanningPorts, setIsScanningPorts] = useState(false);
  const [portNotice, setPortNotice] = useState<string | null>(null);

  // Tab 4: Scratchpad State
  const [scratchpadText, setScratchpadText] = useState<string>(() => {
    try {
      return localStorage.getItem(SCRATCHPAD_STORAGE_KEY) || '# Developer Scratchpad\n\n- [ ] Review active ports\n- [ ] Test Spotlight Alt+Space dropdown\n- [ ] Verify liquid glass specular highlights\n';
    } catch {
      return '';
    }
  });
  const [snipToast, setSnipToast] = useState<string | null>(null);

  // Auto-focus search input on mount
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
    return () => clearTimeout(t);
  }, [activeTab]);

  // Persist snippets
  const persistSnippets = useCallback((items: ClipboardSnippetItem[]) => {
    setSnippets(items);
    try {
      localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist snippets:', e);
    }
  }, []);

  // Persist scratchpad
  const handleScratchpadChange = useCallback((text: string) => {
    setScratchpadText(text);
    try {
      localStorage.setItem(SCRATCHPAD_STORAGE_KEY, text);
    } catch (e) {
      console.error('Failed to persist scratchpad:', e);
    }
  }, []);

  // Scan Dev Ports on Tab 3 activation
  const fetchDevPorts = useCallback(async () => {
    setIsScanningPorts(true);
    const res = await safeInvoke<DevPortInfo[]>('scan_active_dev_ports');
    if (res) {
      setDevPorts(res);
    }
    setIsScanningPorts(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'ports') {
      fetchDevPorts();
    }
  }, [activeTab, fetchDevPorts]);

  // Instant Math Calculator Result
  const mathResult: MathEvalResult | null = useMemo(() => {
    if (activeTab !== 'omni' || !query.trim()) return null;
    return evaluateMathExpression(query);
  }, [activeTab, query]);

  // Available Island Commands definition
  const islandCommands = useMemo(() => {
    return [
      {
        id: 'cmd-slime',
        keyword: 'slime',
        label: 'Switch Companion: Liquid Slime (B)',
        icon: Smile,
        color: '#10b981',
        action: () => {
          systemStore.setCompanionMode('slime');
          systemStore.setIslandState('eyes');
        },
      },
      {
        id: 'cmd-cat',
        keyword: 'cat',
        label: 'Switch Companion: Shadow Cat (C)',
        icon: Cat,
        color: '#a855f7',
        action: () => {
          systemStore.setCompanionMode('cat');
          systemStore.setIslandState('eyes');
        },
      },
      {
        id: 'cmd-eyes',
        keyword: 'eyes',
        label: 'Switch Companion: Cyber-Eyes (A)',
        icon: Eye,
        color: '#06b6d4',
        action: () => {
          systemStore.setCompanionMode('eyes');
          systemStore.setIslandState('eyes');
        },
      },
      {
        id: 'cmd-dark',
        keyword: 'dark',
        label: 'Theme: Obsidian Dark Glass',
        icon: Moon,
        color: '#93c5fd',
        action: () => {
          systemStore.setTheme('dark');
        },
      },
      {
        id: 'cmd-light',
        keyword: 'light',
        label: 'Theme: Quartz Light Glass',
        icon: Sun,
        color: '#f59e0b',
        action: () => {
          systemStore.setTheme('light');
        },
      },
      {
        id: 'cmd-pomo',
        keyword: 'pomo',
        label: 'Slide 1: Pomodoro Focus Timer',
        icon: Timer,
        color: '#ef4444',
        action: () => {
          systemStore.setActiveSlide(1);
          systemStore.setIslandState('expanded');
        },
      },
      {
        id: 'cmd-water',
        keyword: 'water',
        label: 'Slide 2: Water Reminder & Intake Log',
        icon: Droplets,
        color: '#06b6d4',
        action: () => {
          systemStore.setActiveSlide(2);
          systemStore.setIslandState('expanded');
        },
      },
      {
        id: 'cmd-shelf',
        keyword: 'shelf',
        label: 'Slide 3: Smart Shelf Dropzone',
        icon: Inbox,
        color: '#8b5cf6',
        action: () => {
          systemStore.setActiveSlide(3);
          systemStore.setIslandState('expanded');
        },
      },
      {
        id: 'cmd-todo',
        keyword: 'todo',
        label: 'Slide 4: Daily Todo Checklist',
        icon: CheckSquare,
        color: '#10b981',
        action: () => {
          systemStore.setActiveSlide(4);
          systemStore.setIslandState('expanded');
        },
      },
      {
        id: 'cmd-trim',
        keyword: 'trim',
        label: 'RAM Working Set Flush (~8-10 MB)',
        icon: Cpu,
        color: '#3b82f6',
        action: async () => {
          playWaterDrop();
          await safeInvoke('trim_ram_working_set');
        },
      },
      {
        id: 'cmd-compact',
        keyword: 'compact',
        label: 'Collapse Island: Compact Pill Mode',
        icon: Radio,
        color: '#10b981',
        action: () => {
          systemStore.collapseIsland();
        },
      },
      {
        id: 'cmd-bezel',
        keyword: 'bezel',
        label: 'Stealth: Ultra-Thin 6px Bezel Line',
        icon: Sliders,
        color: '#64748b',
        action: () => {
          systemStore.setIslandState('bezel-line');
        },
      },
      {
        id: 'cmd-settings',
        keyword: 'settings',
        label: 'Dashboard: Open Settings & Character Studio',
        icon: Sliders,
        color: '#a855f7',
        action: () => {
          playGlassPop();
          onClose();
          if (onOpenSettings) onOpenSettings();
        },
      },
      {
        id: 'cmd-privacy',
        keyword: 'privacy',
        label: 'Screen Privacy: Toggle Boss Key Blur (Ctrl+Alt+B)',
        icon: Shield,
        color: '#3b82f6',
        action: () => {
          systemStore.togglePrivacyBlur();
        },
      },
      {
        id: 'cmd-night',
        keyword: 'night',
        label: 'Eye Care: Toggle Warm Blue-Light Filter',
        icon: Sun,
        color: '#f59e0b',
        action: () => {
          systemStore.toggleNightEyeCare();
        },
      },
      {
        id: 'cmd-taskbar',
        keyword: 'taskbar',
        label: 'Taskbar Styler: Cycle Mode (A / B / C)',
        icon: Layout,
        color: '#38bdf8',
        action: () => {
          systemStore.cycleTaskbarMode();
        },
      },
    ];
  }, [onClose, onOpenSettings]);

  // Filter commands by query
  const matchedCommands = useMemo(() => {
    if (activeTab !== 'omni' || !query.trim()) return islandCommands.slice(0, 6);
    const q = query.trim().toLowerCase();
    return islandCommands.filter(
      (c) => c.keyword.includes(q) || c.label.toLowerCase().includes(q)
    );
  }, [activeTab, query, islandCommands]);

  // AI Quick Reference Matches (? query)
  const isAiQuery = query.trim().startsWith('?');
  const aiSearchTerm = query.trim().replace(/^\?\s*/, '').toLowerCase();

  const matchedAiRef = useMemo(() => {
    if (!isAiQuery) return null;
    if (!aiSearchTerm) return AI_QUICK_REFS[0];
    const found = AI_QUICK_REFS.find(
      (entry) =>
        entry.trigger.toLowerCase().includes(aiSearchTerm) ||
        entry.question.toLowerCase().includes(aiSearchTerm) ||
        entry.tags.some((t) => t.includes(aiSearchTerm))
    );
    if (found) return found;

    // Generative fallback for custom queries
    return {
      trigger: aiSearchTerm,
      question: `Quick reference guidance for: "${aiSearchTerm}"`,
      solution: `// Recommended pattern for: ${aiSearchTerm}\nexport async function handleQuery() {\n  // Implementation strategy for ${aiSearchTerm}\n  return { success: true, timestamp: Date.now() };\n}`,
      language: 'typescript',
      tags: ['custom', 'developer-guide'],
    };
  }, [isAiQuery, aiSearchTerm]);

  // Filtered Clipboard Snippets
  const filteredSnippets = useMemo(() => {
    let list = [...snippets];
    if (snippetFilter === 'pinned') {
      list = list.filter((s) => s.pinned);
    } else if (snippetFilter !== 'all') {
      list = list.filter((s) => s.kind === snippetFilter);
    }

    if (query.trim() && activeTab === 'clipboard') {
      const q = query.toLowerCase();
      list = list.filter((s) => s.content.toLowerCase().includes(q));
    }

    // Sort: pinned items first
    return list.sort((a, b) => {
      if (a.pinned === b.pinned) return 0;
      return a.pinned ? -1 : 1;
    });
  }, [snippets, snippetFilter, query, activeTab]);

  // Handle Enter key for instant execution
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      playToggleClick();
      onClose();
      return;
    }

    if (e.key === 'Enter') {
      if (mathResult) {
        e.preventDefault();
        handleCopyText(mathResult.result.toString(), 'math');
        return;
      }
      if (activeTab === 'omni' && matchedCommands.length > 0) {
        e.preventDefault();
        playGlassPop();
        matchedCommands[0].action();
        onClose();
      }
    }
  };

  // 1-Click Copy with visual feedback
  const handleCopyText = useCallback((text: string, id: string) => {
    playGlassPop();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  }, []);

  // 1-Click Send snippet directly to Shelf (Slide 3)
  const handleSendToShelf = useCallback((snippet: ClipboardSnippetItem) => {
    playGlassPop();
    const newShelfItem: ShelfFileItem = {
      id: `shelf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: snippet.kind === 'color' ? `Color ${snippet.content}` : snippet.kind === 'code' ? 'code-snippet.ts' : 'note.txt',
      size: snippet.content.length,
      formattedSize: `${snippet.content.length} B`,
      type: snippet.kind === 'color' ? 'text/color' : snippet.kind === 'code' ? 'text/typescript' : 'text/plain',
      previewUrl: CREATE_SNIP_DATA_URL(snippet.content, 'From Spotlight'),
      timestamp: 'Just now',
      content: snippet.content,
    };
    systemStore.addShelfFile(newShelfItem);
    setCopiedId(`shelf-${snippet.id}`);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  }, []);

  // Toggle Pin on snippet
  const handleTogglePin = useCallback(
    (id: string) => {
      playToggleClick();
      const updated = snippets.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s));
      persistSnippets(updated);
    },
    [snippets, persistSnippets]
  );

  // Delete single snippet
  const handleDeleteSnippet = useCallback(
    (id: string) => {
      playWaterDrop();
      const updated = snippets.filter((s) => s.id !== id);
      persistSnippets(updated);
    },
    [snippets, persistSnippets]
  );

  // Add custom snippet
  const handleAddCustomSnippet = useCallback(() => {
    const trimmed = newSnippetInput.trim();
    if (!trimmed) return;
    playGlassPop();

    // Auto-detect kind
    let kind: 'color' | 'code' | 'text' = 'text';
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed) || /^rgba?\(/.test(trimmed)) {
      kind = 'color';
    } else if (/const |let |function |import |class |fn |def |SELECT |=>|[{}\[\]]/.test(trimmed)) {
      kind = 'code';
    }

    const newItem: ClipboardSnippetItem = {
      id: `snip-${Date.now()}`,
      content: trimmed,
      kind,
      pinned: false,
      timestamp: 'Just now',
    };

    persistSnippets([newItem, ...snippets]);
    setNewSnippetInput('');
    setShowAddSnippet(false);
  }, [newSnippetInput, snippets, persistSnippets]);

  // Kill port action
  const handleKillPort = useCallback(
    async (pid: number, port: number) => {
      playWaterDrop();
      setPortNotice(`Killing port ${port} (PID ${pid})...`);
      const success = await safeInvoke<boolean>('kill_dev_port', { pid: Number(pid) });
      if (success) {
        setPortNotice(`Port ${port} terminated successfully.`);
        setTimeout(() => {
          fetchDevPorts();
          setPortNotice(null);
        }, 800);
      } else {
        setPortNotice(`Failed to terminate port ${port}.`);
        setTimeout(() => setPortNotice(null), 2000);
      }
    },
    [fetchDevPorts]
  );

  // Open port in default browser
  const handleOpenPort = useCallback((port: number) => {
    playToggleClick();
    window.open(`http://localhost:${port}`, '_blank');
  }, []);

  // Snip scratchpad to Shelf
  const handleSnipScratchpadToShelf = useCallback(() => {
    playGlassPop();
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const previewData = CREATE_SNIP_DATA_URL(scratchpadText.slice(0, 60), timestampStr);

    const shelfCard: ShelfFileItem = {
      id: `snip-${Date.now()}`,
      name: `scratchpad-snip-${Date.now().toString().slice(-4)}.svg`,
      size: scratchpadText.length,
      formattedSize: `${(scratchpadText.length / 1024).toFixed(1)} KB`,
      type: 'image/svg+xml',
      previewUrl: previewData,
      timestamp: 'Just now',
      content: scratchpadText,
    };

    systemStore.addShelfFile(shelfCard);
    setSnipToast('📸 Snapshot captured to Slide 3 (Shelf)!');
    setTimeout(() => setSnipToast(null), 2500);
  }, [scratchpadText]);

  // Helper: Detect if string is a valid color hex
  const isHexColor = (val: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(val.trim());

  return (
    <motion.div
      key="spotlight-overlay"
      id="spotlight-modal-root"
      initial={{ opacity: 0, y: -24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => safeInvoke('set_click_through', { ignore: false })}
      onMouseLeave={() => safeInvoke('set_click_through', { ignore: true })}
      style={{
        position: 'relative',
        width: '620px',
        maxHeight: '490px',
        backgroundColor: 'var(--island-bg)',
        backgroundImage: 'var(--glass-surface)',
        border: '1px solid var(--glass-border)',
        borderRadius: '24px',
        boxShadow: 'var(--glass-shadow)',
        backdropFilter: 'blur(32px) saturate(190%)',
        WebkitBackdropFilter: 'blur(32px) saturate(190%)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        zIndex: 9999,
      }}
    >
      {/* ==================================================================== */}
      {/* 1. Top Specular Border Rim                                           */}
      {/* ==================================================================== */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '20px',
          right: '20px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--glass-rim-top), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* ==================================================================== */}
      {/* 2. Search & Omni Input Bar                                           */}
      {/* ==================================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <Search size={20} style={{ color: 'var(--blue-glow)', flexShrink: 0 }} />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            activeTab === 'omni'
              ? 'Spotlight Search, math (e.g. 1450*1.11), ? AI helper, or commands...'
              : activeTab === 'clipboard'
              ? 'Filter copied snippets, #HEX colors, code...'
              : activeTab === 'ports'
              ? 'Watching localhost dev ports...'
              : 'Write quick scratchpad notes...'
          }
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            fontFamily: isAiQuery ? 'monospace' : 'inherit',
          }}
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '2px',
            }}
          >
            <X size={15} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '6px',
              backgroundColor: 'var(--pill-bg)',
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
            }}
          >
            Alt + Space
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '6px',
              backgroundColor: 'var(--pill-bg)',
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
            }}
          >
            Esc
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              marginLeft: '4px',
            }}
            title="Close Spotlight"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. 4-Tab Navigation Strip                                            */}
      {/* ==================================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 20px',
          backgroundColor: 'rgba(0, 0, 0, 0.08)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        {[
          { key: 'omni', label: '⚡ Omni Search', icon: Sparkles },
          { key: 'clipboard', label: '📋 Smart Clipboard', icon: Copy },
          { key: 'ports', label: '🌐 Dev Ports', icon: Terminal },
          { key: 'scratchpad', label: '📝 Scratchpad', icon: FileText },
        ].map((tab) => {
          const isCurrent = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                playToggleClick();
                systemStore.setSpotlightActiveTab(tab.key as any);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isCurrent ? 'var(--blue-glow)' : 'transparent',
                backgroundColor: isCurrent ? 'rgba(59, 130, 246, 0.22)' : 'transparent',
                color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: isCurrent ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* 4. Tab Contents Viewport (Max-Height 340px Scrollable)               */}
      {/* ==================================================================== */}
      <div
        style={{
          flex: 1,
          maxHeight: '340px',
          overflowY: 'auto',
          padding: '12px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* ================================================================== */}
        {/* TAB 1: Omni Search, Math & AI Helper                               */}
        {/* ================================================================== */}
        {activeTab === 'omni' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 1.1 Math Calculator Card */}
            {mathResult && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.18) 0%, rgba(168, 85, 247, 0.18) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(59, 130, 246, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Calculator size={18} style={{ color: '#60a5fa' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Calculator: {mathResult.expression}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>
                      {mathResult.formatted}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyText(mathResult.result.toString(), 'math')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.25)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {copiedId === 'math' ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                  <span>{copiedId === 'math' ? 'Copied!' : 'Copy Result'}</span>
                </button>
              </motion.div>
            )}

            {/* 1.2 AI Developer Quick-Reference Card (? <query>) */}
            {matchedAiRef && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(168, 85, 247, 0.12)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HelpCircle size={15} style={{ color: '#c084fc' }} />
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#e9d5ff' }}>
                      {matchedAiRef.question}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '9.5px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(168, 85, 247, 0.25)',
                      color: '#c084fc',
                      fontFamily: 'monospace',
                    }}
                  >
                    AI Helper ({matchedAiRef.language})
                  </span>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#f8fafc',
                    whiteSpace: 'pre-wrap',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {matchedAiRef.solution}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyText(matchedAiRef.solution, 'ai-ref')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(168, 85, 247, 0.25)',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      color: '#ffffff',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedId === 'ai-ref' ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                    <span>{copiedId === 'ai-ref' ? 'Copied Solution!' : 'Copy Code'}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* 1.3 Island Commands Header & List */}
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>
              ISLAND COMMANDS ({matchedCommands.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {matchedCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => {
                      playGlassPop();
                      cmd.action();
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--pill-bg)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        backgroundColor: `${cmd.color}22`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={13} style={{ color: cmd.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 600 }}>{cmd.keyword}</div>
                      <div
                        style={{
                          fontSize: '9.5px',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {cmd.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: Feature #3: Smart Clipboard & Pinned Snippet Manager       */}
        {/* ================================================================== */}
        {activeTab === 'clipboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Filter Pills & Add Button Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {(['all', 'pinned', 'code', 'color', 'text'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => {
                      playToggleClick();
                      setSnippetFilter(filter);
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: snippetFilter === filter ? 600 : 400,
                      backgroundColor: snippetFilter === filter ? 'rgba(59, 130, 246, 0.25)' : 'var(--pill-bg)',
                      borderColor: snippetFilter === filter ? '#3b82f6' : 'transparent',
                      border: '1px solid',
                      color: snippetFilter === filter ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {filter === 'pinned' ? '📌 Pinned' : filter.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  playToggleClick();
                  setShowAddSnippet((p) => !p);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#10b981',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={12} />
                <span>+ New Snippet</span>
              </button>
            </div>

            {/* Inline Add Snippet Drawer */}
            <AnimatePresence>
              {showAddSnippet && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <input
                    type="text"
                    value={newSnippetInput}
                    onChange={(e) => setNewSnippetInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustomSnippet();
                    }}
                    placeholder="Enter code, text, or #HEX (e.g. #3b82f6)..."
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '11.5px',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSnippet}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '5px',
                      backgroundColor: '#10b981',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Save
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Snippet Items List */}
            {filteredSnippets.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                }}
              >
                No snippets found matching "{query}"
              </div>
            ) : (
              filteredSnippets.map((item) => {
                const isColor = item.kind === 'color' || isHexColor(item.content);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      backgroundColor: item.pinned ? 'rgba(59, 130, 246, 0.08)' : 'var(--pill-bg)',
                      border: '1px solid',
                      borderColor: item.pinned ? 'rgba(59, 130, 246, 0.35)' : 'var(--glass-border)',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      {/* Live Color Swatch preview if kind is color */}
                      {isColor ? (
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            backgroundColor: item.content.trim(),
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            boxShadow: `0 0 10px ${item.content.trim()}44`,
                            flexShrink: 0,
                          }}
                          title={`Color swatch: ${item.content}`}
                        />
                      ) : item.kind === 'code' ? (
                        <FileCode size={16} style={{ color: '#60a5fa', flexShrink: 0 }} />
                      ) : (
                        <FileText size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                      )}

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontFamily: item.kind === 'code' || isColor ? 'monospace' : 'inherit',
                            fontSize: '11.5px',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.content}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                          {item.kind.toUpperCase()} • {item.timestamp}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {/* Pin button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePin(item.id)}
                        title={item.pinned ? 'Unpin snippet' : 'Pin to top'}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: item.pinned ? '#f59e0b' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '3px',
                        }}
                      >
                        {item.pinned ? <Pin size={13} fill="#f59e0b" /> : <Pin size={13} />}
                      </button>

                      {/* 1-Click Copy */}
                      <button
                        type="button"
                        onClick={() => handleCopyText(item.content, item.id)}
                        title="Copy to Clipboard"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 7px',
                          borderRadius: '5px',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--text-primary)',
                          fontSize: '10px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {copiedId === item.id ? (
                          <Check size={11} style={{ color: '#10b981' }} />
                        ) : (
                          <Copy size={11} />
                        )}
                        <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      {/* 1-Click Send to Shelf */}
                      <button
                        type="button"
                        onClick={() => handleSendToShelf(item)}
                        title="Send snippet to Slide 3 Shelf dropzone"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 7px',
                          borderRadius: '5px',
                          backgroundColor: 'rgba(139, 92, 246, 0.18)',
                          border: '1px solid rgba(139, 92, 246, 0.35)',
                          color: '#c084fc',
                          fontSize: '10px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {copiedId === `shelf-${item.id}` ? (
                          <Check size={11} style={{ color: '#10b981' }} />
                        ) : (
                          <FolderPlus size={11} />
                        )}
                        <span>{copiedId === `shelf-${item.id}` ? 'In Shelf!' : 'To Shelf'}</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteSnippet(item.id)}
                        title="Delete snippet"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '3px',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: Localhost Dev Port Watcher                                 */}
        {/* ================================================================== */}
        {activeTab === 'ports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                ACTIVE LOCALHOST DEVELOPMENT PORTS
              </div>
              <button
                type="button"
                onClick={fetchDevPorts}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  backgroundColor: 'var(--pill-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={11} className={isScanningPorts ? 'animate-spin' : ''} />
                <span>Refresh Ports</span>
              </button>
            </div>

            {portNotice && (
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  fontSize: '10.5px',
                  color: '#93c5fd',
                }}
              >
                {portNotice}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {devPorts.map((portInfo) => (
                <div
                  key={portInfo.port}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    backgroundColor: portInfo.active ? 'rgba(16, 185, 129, 0.08)' : 'var(--pill-bg)',
                    border: '1px solid',
                    borderColor: portInfo.active ? 'rgba(16, 185, 129, 0.35)' : 'var(--glass-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Live status dot */}
                    <div
                      style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        backgroundColor: portInfo.active ? '#10b981' : '#64748b',
                        boxShadow: portInfo.active ? '0 0 8px #10b981' : 'none',
                        flexShrink: 0,
                      }}
                    />

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px' }}>
                          :{portInfo.port}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                          http://localhost:{portInfo.port}
                        </span>
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                        {portInfo.active
                          ? `${portInfo.process_name || 'Active Service'} (PID ${portInfo.pid})`
                          : 'Idle / No process listening'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenPort(portInfo.port)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        color: '#60a5fa',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <ExternalLink size={11} />
                      <span>Open</span>
                    </button>

                    {portInfo.active && portInfo.pid > 0 && (
                      <button
                        type="button"
                        onClick={() => handleKillPort(portInfo.pid, portInfo.port)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#f87171',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <PowerOff size={11} />
                        <span>Kill Port</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 4: Quick Developer Scratchpad & Snip to Shelf                 */}
        {/* ================================================================== */}
        {activeTab === 'scratchpad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                PERSISTENT CODE & MARKDOWN SCRATCHPAD
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleSnipScratchpadToShelf}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 9px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)',
                    border: '1px solid #3b82f6',
                    color: '#ffffff',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Camera size={12} style={{ color: '#60a5fa' }} />
                  <span>📸 Snip Screen to Shelf</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyText(scratchpadText, 'scratchpad-copy')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    backgroundColor: 'var(--pill-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  {copiedId === 'scratchpad-copy' ? <Check size={11} style={{ color: '#10b981' }} /> : <Copy size={11} />}
                  <span>{copiedId === 'scratchpad-copy' ? 'Copied' : 'Copy All'}</span>
                </button>
              </div>
            </div>

            {snipToast && (
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  fontSize: '10.5px',
                  color: '#34d399',
                }}
              >
                {snipToast}
              </div>
            )}

            <textarea
              value={scratchpadText}
              onChange={(e) => handleScratchpadChange(e.target.value)}
              placeholder="Paste logs, quick code drafts, or ideas here..."
              rows={9}
              style={{
                width: '100%',
                flex: 1,
                minHeight: '180px',
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.22)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'none',
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '9.5px',
                color: 'var(--text-secondary)',
              }}
            >
              <span>Auto-saved in localStorage</span>
              <span>
                {scratchpadText.split(/\s+/).filter(Boolean).length} words • {scratchpadText.length} chars
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 5. Bottom Status Footer                                              */}
      {/* ==================================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 20px',
          borderTop: '1px solid var(--glass-border)',
          backgroundColor: 'rgba(0, 0, 0, 0.12)',
          fontSize: '10px',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Theme: {theme.toUpperCase()}</span>
          <span>•</span>
          <span>Width: 620px Glass</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Press [Enter] to run action</span>
          <span>•</span>
          <span>Press [Esc] to dismiss</span>
        </div>
      </div>
    </motion.div>
  );
};

export default SpotlightModal;
