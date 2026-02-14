"use client";

import { useState } from 'react';
import Link from 'next/link';
import axios, { isAxiosError } from 'axios';
import { analyzeUrl } from '../lib/api';

export default function App() {
  const [input, setInput] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const solveCase = async () => {
    setLoading(true);
    setTimedOut(false);
    try {
      const { data } = await axios.post(analyzeUrl(), { logError: input });
      setReport(data.report);
    } catch (err) {
      if (isAxiosError(err)) {
        const code = err.response?.data?.code as string | undefined;
        const message = err.response?.data?.error || err.message;
        if (code === 'TIMEOUT' || err.code === 'ECONNABORTED') {
          setTimedOut(true);
        }
        setReport(message || "The detective hit a dead end. Try again.");
      } else {
        setReport("The detective hit a dead end. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-10 font-mono">
      <div className="max-w-4xl mx-auto border border-slate-800 p-8 rounded-xl shadow-2xl bg-slate-900">
        <h1 className="text-3xl font-black text-emerald-400 mb-2 uppercase tracking-tighter italic">Log Detective v1.0</h1>
        <p className="text-slate-500 mb-6">Uncovering the truth behind your stack traces.</p>

        <textarea 
          className="w-full h-48 bg-slate-950 border border-slate-700 rounded p-4 text-emerald-100 placeholder:text-slate-700 focus:border-emerald-500 outline-none transition-all"
          placeholder="Paste the evidence (error logs) here..."
          onChange={(e) => setInput(e.target.value)}
        />

        <Link href="/history" className="mt-4 text-blue-500 hover:underline inline-block">View Solved Case History →</Link>

        {loading ? (
          <div className="flex items-center gap-2 animate-pulse text-blue-500">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span>Detective is analyzing the log...</span>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={solveCase}
              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-3 px-8 rounded uppercase transition-all active:scale-95 disabled:opacity-50"
              disabled={!input}
            >
              Solve the Case
            </button>
            {timedOut && (
              <button
                onClick={solveCase}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded uppercase transition-all active:scale-95"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {report && (
          <div className="mt-10 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-emerald-400 font-bold mb-3 border-b border-emerald-900 pb-2">INVESTIGATION REPORT:</h2>
            <div className="bg-slate-950 p-6 rounded border border-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
              {report}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}