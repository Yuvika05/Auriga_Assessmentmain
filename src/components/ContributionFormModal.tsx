import React, { useState, useEffect } from 'react';
import { Contribution, Participant, Pool, PaymentMethod } from '../types';
import { useAppStore } from '../store/useAppStore';
import { formatPaise, paiseToRupees, rupeesToPaise } from '../utils/settlementMath';
import {
  X,
  CreditCard,
  HeartHandshake,
  ArrowRight,
  AlertCircle,
  Equal,
  Sparkles,
} from 'lucide-react';

interface ContributionFormModalProps {
  isOpen: boolean;
  pool: Pool;
  initialContribution?: Contribution | null;
  defaultPayerId?: string | null;
  onClose: () => void;
}

export const ContributionFormModal: React.FC<ContributionFormModalProps> = ({
  isOpen,
  pool,
  initialContribution,
  defaultPayerId,
  onClose,
}) => {
  const { addContribution, updateContribution } = useAppStore();

  const activeParticipants = pool.participants.filter((p) => !p.isArchived);

  const [payerId, setPayerId] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('manual');
  const [noteInput, setNoteInput] = useState<string>('');
  const [isOnBehalf, setIsOnBehalf] = useState<boolean>(false);
  const [selectedSplitMemberIds, setSelectedSplitMemberIds] = useState<string[]>([]);
  const [splitAmounts, setSplitAmounts] = useState<{ [participantId: string]: string }>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize form state
  useEffect(() => {
    if (initialContribution) {
      setPayerId(initialContribution.payerId);
      setAmountInput(paiseToRupees(initialContribution.amountPaise).toString());
      setDateInput(initialContribution.date);
      setPaymentMethod(initialContribution.paymentMethod || 'manual');
      setNoteInput(initialContribution.note || '');

      const isMulti =
        initialContribution.splits.length > 1 ||
        (initialContribution.splits.length === 1 &&
          initialContribution.splits[0].participantId !== initialContribution.payerId);

      setIsOnBehalf(isMulti);
      const memberIds = initialContribution.splits.map((s) => s.participantId);
      setSelectedSplitMemberIds(memberIds);

      const splitObj: { [id: string]: string } = {};
      initialContribution.splits.forEach((s) => {
        splitObj[s.participantId] = paiseToRupees(s.amountPaise).toString();
      });
      setSplitAmounts(splitObj);
    } else {
      // New contribution
      const fallbackPayer = defaultPayerId || activeParticipants[0]?.id || '';
      setPayerId(fallbackPayer);
      setAmountInput('');
      setDateInput(new Date().toISOString().split('T')[0]);
      setNoteInput('');
      setIsOnBehalf(false);
      setSelectedSplitMemberIds(fallbackPayer ? [fallbackPayer] : []);
      setSplitAmounts({});
    }
    setErrorMsg(null);
  }, [initialContribution, defaultPayerId, isOpen]);

  if (!isOpen) return null;

  const totalPaise = rupeesToPaise(parseFloat(amountInput) || 0);

  // Auto split evenly across selected members
  const handleSplitEvenly = () => {
    if (selectedSplitMemberIds.length === 0 || totalPaise <= 0) return;
    const count = selectedSplitMemberIds.length;
    const baseShare = Math.floor(totalPaise / count);
    const remainder = totalPaise - baseShare * count;

    const newSplits: { [id: string]: string } = {};
    selectedSplitMemberIds.forEach((id, index) => {
      const sharePaise = baseShare + (index < remainder ? 1 : 0);
      newSplits[id] = paiseToRupees(sharePaise).toString();
    });
    setSplitAmounts(newSplits);
    setErrorMsg(null);
  };

  const handleToggleMember = (memberId: string) => {
    const isSelected = selectedSplitMemberIds.includes(memberId);
    let updated: string[];
    if (isSelected) {
      updated = selectedSplitMemberIds.filter((id) => id !== memberId);
    } else {
      updated = [...selectedSplitMemberIds, memberId];
    }
    setSelectedSplitMemberIds(updated);

    // Recalculate even split automatically
    if (updated.length > 0 && totalPaise > 0) {
      const count = updated.length;
      const baseShare = Math.floor(totalPaise / count);
      const remainder = totalPaise - baseShare * count;
      const newSplits: { [id: string]: string } = {};
      updated.forEach((id, index) => {
        const sharePaise = baseShare + (index < remainder ? 1 : 0);
        newSplits[id] = paiseToRupees(sharePaise).toString();
      });
      setSplitAmounts(newSplits);
    }
  };

  const calculateSumOfSplitsPaise = (): number => {
    if (!isOnBehalf) return totalPaise;
    return selectedSplitMemberIds.reduce((sum, id) => {
      const parsed = rupeesToPaise(parseFloat(splitAmounts[id] || '0') || 0);
      return sum + parsed;
    }, 0);
  };

  const currentSplitsSumPaise = calculateSumOfSplitsPaise();
  const splitDifferencePaise = totalPaise - currentSplitsSumPaise;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (totalPaise <= 0) {
      setErrorMsg('Please enter a valid contribution amount greater than 0.');
      return;
    }

    if (!payerId) {
      setErrorMsg('Please select who paid this contribution.');
      return;
    }

    let finalSplits: { participantId: string; amountPaise: number }[] = [];

    if (!isOnBehalf) {
      // 100% credited to the payer
      finalSplits = [{ participantId: payerId, amountPaise: totalPaise }];
    } else {
      if (selectedSplitMemberIds.length === 0) {
        setErrorMsg('Please select at least one participant to allocate the contribution credits to.');
        return;
      }

      if (splitDifferencePaise !== 0) {
        setErrorMsg(
          `The sum of member credits (${formatPaise(
            currentSplitsSumPaise,
            pool.currency
          )}) must equal the total contribution (${formatPaise(totalPaise, pool.currency)}). Difference: ${formatPaise(
            Math.abs(splitDifferencePaise),
            pool.currency
          )}`
        );
        return;
      }

      finalSplits = selectedSplitMemberIds.map((id) => ({
        participantId: id,
        amountPaise: rupeesToPaise(parseFloat(splitAmounts[id] || '0') || 0),
      }));
    }

    setIsSubmitting(true);
    try {
      if (initialContribution) {
        await updateContribution(initialContribution.id, {
          payerId,
          amountPaise: totalPaise,
          date: dateInput,
          paymentMethod,
          paymentStatus: 'confirmed',
          note: noteInput.trim() || undefined,
          splits: finalSplits,
        });
      } else {
        await addContribution({
          payerId,
          amountPaise: totalPaise,
          date: dateInput,
          paymentMethod,
          paymentStatus: 'confirmed',
          note: noteInput.trim() || undefined,
          splits: finalSplits,
        });
      }
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Failed to record contribution');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialContribution ? 'Edit Contribution' : 'Record Group Contribution'}
              </h3>
              <p className="text-xs text-slate-500">
                Supports single-payer, partial payments, and covering friends
              </p>
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

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Payer Select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Who Paid? <span className="text-rose-500">*</span>
            </label>
            <select
              value={payerId}
              onChange={(e) => {
                setPayerId(e.target.value);
                if (!isOnBehalf) {
                  setSelectedSplitMemberIds([e.target.value]);
                }
              }}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
            >
              <option value="" disabled>Select participant...</option>
              {activeParticipants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isOrganizer ? '(Organiser)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Amount Paid ({pool.currency}) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  {pool.currency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. 1000.00"
                  className="w-full pl-8 pr-3.5 py-2.5 text-base font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'manual' as PaymentMethod, label: 'Standard / GPay' },
                { id: 'upi_qr' as PaymentMethod, label: 'UPI QR Code' },
                { id: 'bank_transfer' as PaymentMethod, label: 'Bank Transfer' },
                { id: 'cash' as PaymentMethod, label: 'Cash In Hand' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                    paymentMethod === m.id
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note / Memo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Note or Payment Reference (Optional)
            </label>
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="e.g. UPI transfer, covered for Vikram"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
            />
          </div>

          {/* On Behalf Of / Multi-Person Split Option */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isOnBehalf}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsOnBehalf(checked);
                    if (checked) {
                      // default includes payer + another member
                      const initialSelected = payerId ? [payerId] : [];
                      setSelectedSplitMemberIds(initialSelected);
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-indigo-600" />
                  <span>Paying on behalf of someone else (or splitting credit)?</span>
                </span>
              </label>
            </div>

            {isOnBehalf && (
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                    Select Participants to Credit:
                  </span>
                  <button
                    type="button"
                    onClick={handleSplitEvenly}
                    disabled={selectedSplitMemberIds.length === 0 || totalPaise <= 0}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40"
                  >
                    <Equal className="w-3.5 h-3.5" />
                    <span>Split Evenly</span>
                  </button>
                </div>

                {/* Member selection chips */}
                <div className="flex flex-wrap gap-1.5">
                  {activeParticipants.map((p) => {
                    const isSelected = selectedSplitMemberIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleToggleMember(p.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{p.name}</span>
                        {p.id === payerId && (
                          <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                            (Payer)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Per-person split amount inputs */}
                {selectedSplitMemberIds.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-indigo-100">
                    <span className="text-[11px] font-bold text-slate-500 block">
                      Allocated Credit per Participant ({pool.currency}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {selectedSplitMemberIds.map((memberId) => {
                        const member = activeParticipants.find((p) => p.id === memberId);
                        return (
                          <div
                            key={memberId}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                          >
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {member?.name || 'Member'}
                            </span>
                            <div className="relative w-28 shrink-0">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                                {pool.currency}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={splitAmounts[memberId] || ''}
                                onChange={(e) => {
                                  setSplitAmounts({
                                    ...splitAmounts,
                                    [memberId]: e.target.value,
                                  });
                                  setErrorMsg(null);
                                }}
                                className="w-full pl-6 pr-2 py-1 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-right"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Split balance indicator */}
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center justify-between font-bold ${
                        splitDifferencePaise === 0
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      <span>
                        Splits Total: {formatPaise(currentSplitsSumPaise, pool.currency)} /{' '}
                        {formatPaise(totalPaise, pool.currency)}
                      </span>
                      <span>
                        {splitDifferencePaise === 0
                          ? '✓ Exact match'
                          : splitDifferencePaise > 0
                          ? `${formatPaise(splitDifferencePaise, pool.currency)} unallocated`
                          : `${formatPaise(Math.abs(splitDifferencePaise), pool.currency)} overallocated`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
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
              disabled={isSubmitting || (isOnBehalf && splitDifferencePaise !== 0)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? 'Saving...' : initialContribution ? 'Save Changes' : 'Record Payment'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
