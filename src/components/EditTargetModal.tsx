import React, { useState } from 'react';
import { Pool } from '../types';
import { useAppStore } from '../store/useAppStore';
import { formatPaise, paiseToRupees, rupeesToPaise } from '../utils/settlementMath';
import { X, Target, AlertTriangle, Check, ArrowRight } from 'lucide-react';

interface EditTargetModalProps {
  isOpen: boolean;
  pool: Pool;
  totalCollectedPaise: number;
  onClose: () => void;
}

export const EditTargetModal: React.FC<EditTargetModalProps> = ({
  isOpen,
  pool,
  totalCollectedPaise,
  onClose,
}) => {
  const { updateTargetAmount } = useAppStore();
  const currentRupees = paiseToRupees(pool.targetAmountPaise);
  const [targetInput, setTargetInput] = useState<string>(currentRupees.toString());
  const [reasonInput, setReasonInput] = useState<string>('');
  const [confirmedOverpayment, setConfirmedOverpayment] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const newTargetPaise = rupeesToPaise(parseFloat(targetInput) || 0);
  const isLowerThanCollected = newTargetPaise < totalCollectedPaise;
  const surplusPaise = Math.max(0, totalCollectedPaise - newTargetPaise);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newTargetPaise <= 0) {
      setErrorMsg('Target amount must be a positive number greater than zero.');
      return;
    }

    if (isLowerThanCollected && !confirmedOverpayment) {
      setErrorMsg('The new target is lower than the amount already collected. Please confirm you want to proceed with a surplus state.');
      return;
    }

    setIsSaving(true);
    try {
      await updateTargetAmount(newTargetPaise, reasonInput);
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      setErrorMsg(err?.message || 'Failed to update target amount');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="edit-target-modal"
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Target Budget</h3>
              <p className="text-xs text-slate-500">Live updates fair shares & balances</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              New Target Amount ({pool.currency}) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                {pool.currency}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={targetInput}
                onChange={(e) => {
                  setTargetInput(e.target.value);
                  setConfirmedOverpayment(false);
                  setErrorMsg(null);
                }}
                className="w-full pl-9 pr-3.5 py-2.5 text-base font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                placeholder="e.g. 6000"
                autoFocus
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Current target: {formatPaise(pool.targetAmountPaise, pool.currency)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Reason for Change (Optional)
            </label>
            <input
              type="text"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="e.g. Upgraded gift choice, price change"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Recorded in the Activity Log audit trail
            </span>
          </div>

          {/* Overpayment Warning if target < total collected */}
          {isLowerThanCollected && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
              <div className="flex items-start gap-2 text-amber-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Target is lower than total already collected!</span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                You have already collected <strong>{formatPaise(totalCollectedPaise, pool.currency)}</strong>. Setting the target to <strong>{formatPaise(newTargetPaise, pool.currency)}</strong> will result in a pool surplus of <strong>{formatPaise(surplusPaise, pool.currency)}</strong>.
              </p>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedOverpayment}
                  onChange={(e) => setConfirmedOverpayment(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-amber-950">
                  Yes, I confirm this new lower target and understand the pool will show as having a surplus.
                </span>
              </label>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || (isLowerThanCollected && !confirmedOverpayment)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? 'Updating...' : 'Save New Target'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
