import React, { useState } from 'react';
import { Pool, SUPPORTED_CURRENCIES } from '../types';
import { useAppStore } from '../store/useAppStore';
import {
  Settings as SettingsIcon,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  LogOut,
  Save,
  Globe,
  Database,
  Check,
  AlertTriangle,
  FileCode,
} from 'lucide-react';

interface SettingsTabProps {
  pool: Pool;
  onOpenNewPool: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ pool, onOpenNewPool }) => {
  const {
    currentUser,
    updatePoolMeta,
    deletePool,
    resetPoolToDemo,
    resetPoolEmpty,
    logout,
    showToast,
    pools,
  } = useAppStore();

  const [poolName, setPoolName] = useState(pool.name);
  const [organizerName, setOrganizerName] = useState(pool.organizerName);
  const [description, setDescription] = useState(pool.description || '');
  const [currency, setCurrency] = useState(pool.currency);
  const [isSavingMeta, setIsSavingMeta] = useState(false);

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMeta(true);
    try {
      await updatePoolMeta({
        name: poolName.trim() || pool.name,
        organizerName: organizerName.trim() || pool.organizerName,
        description: description.trim(),
        currency,
      });
      setIsSavingMeta(false);
    } catch (err: any) {
      setIsSavingMeta(false);
      showToast(err?.message || 'Failed to save settings');
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pool, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `splitpool_${pool.name.toLowerCase().replace(/\s+/g, '_')}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Pool data exported as JSON!');
  };

  const handleDeleteCurrentPool = async () => {
    if (pools.length <= 1) {
      alert('You cannot delete your only pool. Create another pool first or reset this one.');
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to completely delete "${pool.name}"? This action cannot be undone.`
      )
    ) {
      await deletePool(pool.id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Pool Metadata Form */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
        <div className="pb-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pool Settings & Preferences
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize pool details, currency symbols, and backup data.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveMeta} className="mt-5 space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Pool Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Organiser Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Purpose / Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Chipping in equally for our manager's farewell gift"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Currency Symbol
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full sm:w-80 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.symbol} value={c.symbol}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <button
              id="settings-save-pool-btn"
              type="submit"
              disabled={isSavingMeta}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingMeta ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Data Management & Backups */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Backup & Data Maintenance
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Export your ledger history as JSON or reset pool scenarios for testing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Export Ledger (JSON)</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Download full data structure including participants, contributions, and audit trails.
              </p>
            </div>
            <button
              id="settings-export-json-btn"
              type="button"
              onClick={handleExportJSON}
              className="self-start px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
            >
              Export JSON Backup
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Reset to Farewell Gift Scenario</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Restores the standard ₹6,000 manager farewell gift demo (Priya, Sneha covering Vikram, Rohan partial).
              </p>
            </div>
            <button
              id="settings-reset-demo-btn"
              type="button"
              onClick={() => {
                if (window.confirm('Reset this pool back to the Farewell Gift demo dataset?')) {
                  resetPoolToDemo();
                }
              }}
              className="self-start px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 cursor-pointer"
            >
              Reset to Demo Data
            </button>
          </div>
        </div>
      </section>

      {/* Architecture & Backend Swap Guide */}
      <section className="bg-slate-50 rounded-3xl border border-slate-200/80 p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <h3 className="text-sm font-bold text-slate-900">
              Architecture & Repository Abstraction Layer
            </h3>
            <p>
              This app implements a strict repository pattern (<code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px]">PoolRepository</code> and <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px]">AuthRepository</code> in <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px]">/src/repositories/index.ts</code>).
            </p>
            <p>
              To swap from browser <code className="font-mono text-[11px]">localStorage</code> to a real cloud database (e.g. Firebase/Firestore or PostgreSQL/REST API), you only need to provide a new class implementing the interface methods (<code className="font-mono text-[11px]">getPools</code>, <code className="font-mono text-[11px]">savePool</code>, <code className="font-mono text-[11px]">createPool</code>, <code className="font-mono text-[11px]">deletePool</code>). The React UI and Zustand store remain 100% untouched.
            </p>
          </div>
        </div>
      </section>

      {/* Danger Zone: Delete Pool & Logout */}
      <section className="bg-rose-50/50 rounded-3xl border border-rose-200 p-5 sm:p-7 space-y-4">
        <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Account & Pool Actions</span>
        </h3>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div>
            <h4 className="text-xs font-bold text-rose-900">Delete This Pool</h4>
            <p className="text-[11px] text-rose-700">Permanently delete "{pool.name}" and all its records.</p>
          </div>
          <button
            id="settings-delete-pool-btn"
            type="button"
            onClick={handleDeleteCurrentPool}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0"
          >
            Delete Pool
          </button>
        </div>

        <div className="pt-4 border-t border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-rose-900">Logout of Organiser Account</h4>
            <p className="text-[11px] text-rose-700">
              End your active session as {currentUser?.name} ({currentUser?.isGuest ? 'Guest' : currentUser?.email}).
            </p>
          </div>
          <button
            id="settings-logout-btn"
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to log out?')) {
                logout();
              }
            }}
            className="px-4 py-2 bg-white hover:bg-rose-100 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0 flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </section>
    </div>
  );
};
