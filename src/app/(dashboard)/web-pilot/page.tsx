"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Square,
  Pause,
  Terminal,
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
} from "lucide-react";
import { webpilotApi, useWebPilotSocket } from "@/lib/webpilot-api";
import { useOutreachStore } from "@/store/useOutreachStore";

export default function WebPilotPage() {
  const { showAlert } = useOutreachStore();
  const [prompt, setPrompt] = useState("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { events, screenshot, status, connected } = useWebPilotSocket(activeRunId);

  useEffect(() => {
    loadActive();
    loadHistory();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const loadActive = async () => {
    try {
      const data = await webpilotApi.getActiveTask();
      if (data.run?.run_id) {
        setActiveRunId(data.run.run_id);
      }
    } catch (e) {
      console.error("No active task");
    }
  };

  const loadHistory = async () => {
    try {
      const data = await webpilotApi.listTasks(10);
      setHistory(data.runs || []);
    } catch (e) {
      console.error("Failed to load history");
    }
  };

  const handleLaunch = async () => {
    if (!prompt.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await webpilotApi.startTask(prompt);
      setActiveRunId(res.runId);
      setPrompt("");
      loadHistory();
    } catch (e: any) {
      showAlert(e.message || "Could not start the task.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleControl = async (action: 'stop' | 'pause' | 'resume') => {
    if (!activeRunId) return;
    try {
      if (action === 'stop') await webpilotApi.stopTask(activeRunId);
      if (action === 'pause') await webpilotApi.pauseTask(activeRunId);
      if (action === 'resume') await webpilotApi.resumeTask(activeRunId);
    } catch (e: any) {
      showAlert(e.message || `Could not ${action} the task.`, "error");
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "running": return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
      case "completed": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "failed": return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "paused": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default: return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  const downloadData = (data: any, name: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.json`;
    a.click();
  };

  return (
    // Fills the viewport on desktop (minus the shell's 2rem top/bottom
    // padding); on smaller screens the columns stack and the page scrolls.
    <div className="flex flex-col gap-6 lg:h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <Globe className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">WebPilot <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">BETA</span></h1>
          <p className="text-sm text-zinc-400">Autonomous AI Web Agent for arbitrary tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 flex-1">
        
        {/* Left Column: Input & History */}
        <div className="flex flex-col gap-6 lg:overflow-hidden">
          
          {/* Input Panel */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-xl backdrop-blur-xl shrink-0 transition-all">
            <h2 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" /> Task Directive
            </h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g. Go to https://quotes.toscrape.com and extract all quotes..."
              className="w-full h-32 bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all resize-none"
              disabled={status === "running" || isSubmitting}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleLaunch}
                disabled={!prompt.trim() || status === "running" || isSubmitting}
                className="group relative px-6 py-2.5 bg-indigo-500 text-white font-medium text-sm rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Launch Task
                </span>
              </button>
            </div>
          </div>

          {/* History Panel */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-xl backdrop-blur-xl flex-1 flex flex-col min-h-0">
            <h2 className="text-sm font-medium text-zinc-300 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" /> Recent Tasks
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {history.map((run) => (
                <div key={run.run_id} className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/30 hover:bg-zinc-800/30 transition-colors group cursor-pointer" onClick={() => setActiveRunId(run.run_id)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusColor(run.status)}`}>
                      {run.status}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {new Date(run.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed">{run.prompt}</p>
                  
                  {run.extracted_data && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); downloadData(run.extracted_data, `extract_${run.run_id.slice(0,6)}`); }}
                      className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Extracted Data
                    </button>
                  )}
                </div>
              ))}
              {history.length === 0 && (
                <div className="text-center py-10 text-sm text-zinc-500">No recent tasks</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live View & Terminal */}
        <div className="lg:col-span-2 flex flex-col gap-6 lg:overflow-hidden">

          {/* Browser Live View */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-xl backdrop-blur-xl flex flex-col overflow-hidden h-80 sm:h-96 lg:h-[50%]">
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-medium text-zinc-500 font-mono">Live Browser Feed</span>
                {connected && status === "running" && (
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleControl('pause')}
                  disabled={status !== "running"}
                  aria-label="Pause task"
                  title="Pause task"
                  className="p-1.5 text-zinc-400 hover:text-amber-400 disabled:opacity-30 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleControl('resume')}
                  disabled={status !== "paused"}
                  aria-label="Resume task"
                  title="Resume task"
                  className="p-1.5 text-zinc-400 hover:text-emerald-400 disabled:opacity-30 transition-colors"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleControl('stop')}
                  disabled={!['running', 'paused'].includes(status)}
                  aria-label="Stop task"
                  title="Stop task"
                  className="p-1.5 text-zinc-400 hover:text-rose-400 disabled:opacity-30 transition-colors"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-zinc-950 relative flex items-center justify-center p-4">
              {screenshot ? (
                <img src={screenshot} alt="Browser view" className="max-w-full max-h-full object-contain rounded-lg border border-zinc-800/50 shadow-2xl" />
              ) : (
                <div className="text-zinc-600 flex flex-col items-center gap-3">
                  <Globe className="w-12 h-12 opacity-20" />
                  <p className="text-sm">Browser inactive</p>
                </div>
              )}
            </div>
          </div>

          {/* Terminal Stream */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-1 shadow-xl h-80 lg:h-auto lg:flex-1 flex flex-col min-h-0 relative group">
            <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-zinc-950 to-transparent z-10 rounded-t-2xl pointer-events-none" />
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-2 font-mono text-xs custom-scrollbar">
              {events.map((ev, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-zinc-600 shrink-0">
                    {new Date(ev.receivedAt).toLocaleTimeString(undefined, {hour12:false})}
                  </span>
                  <span className={`
                    ${ev.type === 'log' && ev.payload.level === 'agent' ? 'text-indigo-300' : ''}
                    ${ev.type === 'log' && ev.payload.level === 'success' ? 'text-emerald-400' : ''}
                    ${ev.type === 'log' && ev.payload.level === 'error' ? 'text-rose-400' : ''}
                    ${ev.type === 'completed' ? 'text-emerald-400 font-bold' : ''}
                    ${!['log', 'completed'].includes(ev.type) ? 'text-zinc-400' : ''}
                  `}>
                    {ev.payload.message || ev.payload.summary || JSON.stringify(ev.payload)}
                  </span>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-zinc-600 py-4">Waiting for task execution...</div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-zinc-950 to-transparent z-10 rounded-b-2xl pointer-events-none" />
          </div>

        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>
    </div>
  );
}
