"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { casesUrl } from '../../lib/api';

type CaseItem = {
  _id: string;
  logError: string;
  report: string;
  createdAt: string;
};

export default function HistoryPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const fetchHistory = async () => {
        try {
          const res = await axios.get(casesUrl());
          // Support both shapes: paginated { meta, data } and legacy array
          const payload = res.data;
          if (Array.isArray(payload)) {
            setCases(payload);
          } else if (payload && Array.isArray(payload.data)) {
            setCases(payload.data);
          } else {
            setCases([]);
          }
        } catch (err) {
          console.error('Failed to fetch history', err);
          setCases([]);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }, []);

  if (loading) return <div className="p-10 text-center">Loading the archives...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-10 font-mono">
      <div className="max-w-4xl mx-auto border border-slate-800 p-8 rounded-xl shadow-2xl bg-slate-900">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-emerald-400 mb-2">Solved Case History</h1>
          <Link href="/" className="text-blue-500 hover:underline">Back to Home</Link>
        </div>

        {cases.length === 0 ? (
          <div className="text-slate-500">No solved cases yet.</div>
        ) : (
          <ul className="space-y-4 mt-6">
            {cases.map((c) => (
              <li key={c._id} className="border border-slate-800 p-4 rounded bg-slate-950">
                <div className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()}</div>
                <h3 className="mt-3 text-sm font-bold text-emerald-400">Detected Error</h3>
                <pre className="mt-2 text-sm whitespace-pre-wrap border border-slate-800 p-3 rounded bg-slate-900">
                  {c.logError}
                </pre>
                <h3 className="mt-4 text-sm font-bold text-blue-400">Detective's Solution</h3>
                <pre className="mt-2 text-sm whitespace-pre-wrap">{c.report}</pre>
              </li>
            ))}
          </ul>
        )}

        
      </div>
    </div>
  );
}