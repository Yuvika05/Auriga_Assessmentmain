import React, { useState } from 'react';
import { Pool, PoolCategory } from '../types';
import { useAppStore } from '../store/useAppStore';
import { paiseToRupees, rupeesToPaise } from '../utils/settlementMath';
import { X, Copy, Calendar, Tag, DollarSign, Users } from 'lucide-react';

interface ClonePoolModalProps {
  isOpen: boolean;
  pool: Pool;
  onClose: () => void;
}

export const ClonePoolModal: React.FC<ClonePoolModalProps> = ({ isOpen, pool, onClose }) => {
  const { clonePool } = useAppStore();

  const [nameInput, setNameInput] = useState<string>(`${pool.name} (Next Cycle)`);
  const [targetInput, setTargetInput] = useState<string>(
    paiseToRupees(pool.targetAmountPaise).toString()
  );
  const [categoryInput, setCategoryInput] = useState<PoolCategory>(pool.category || 'gift');
  const [deadlineInput, setDeadlineInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setErrorMsg('Pool name cannot be empty');
      return;
    }

    const numTarget = parseFloat(targetInput);
    if (isNaN(numTarget) || numTarget <= 0) {
      setErrorMsg('Please enter a valid target budget greater than 0');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await clonePool(pool.id, {
        newName: nameInput.trim(),
        newTargetAmountPaise: rupeesToPaise(numTarget),
        newDeadline: deadlineInput || undefined,
        category: categoryInput,
      });
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Failed to clone pool');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Clone Pool for Next Cycle</h3>
              <p className="text-[11px] text-slate-400">Keeps participant list with a clean ledger</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* New Pool Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              New Pool Name
            </label>
            <input
              type="text"
              required
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Category
            </label>
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value as PoolCategory)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="gift">Farewell / Birthday Gift</option>
              <option value="trip">Group Trip / Vacation</option>
              <option value="kitty_party">Kitty Party / Social Club</option>
              <option value="office_pool">Office Pool / Team Lunch</option>
              <option value="custom">Custom Pool</option>
            </select>
          </div>

          {/* New Target */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Target Budget ({pool.currency})
            </label>
            <input
              type="number"
              step="1"
              min="1"
              required
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              New Deadline (Optional)
            </label>
            <input
              type="date"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
            />
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center gap-2 text-xs text-indigo-900">
            <Users className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              All <strong>{pool.participants.filter((p) => !p.isArchived).length} active participants</strong> will be copied over with 0 contributions.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Cloning...' : 'Create Cloned Pool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
