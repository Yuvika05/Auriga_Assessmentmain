import React, { useState } from 'react';
import { ParticipantSummary, Pool } from '../types';
import { useAppStore } from '../store/useAppStore';
import { formatPaise } from '../utils/settlementMath';
import {
  X,
  Copy,
  Check,
  CreditCard,
  HeartHandshake,
  UserCheck,
  Trash2,
  Edit2,
  ArrowRight,
  Send,
  AlertCircle,
} from 'lucide-react';

interface ParticipantDetailModalProps {
  summary: ParticipantSummary | null;
  pool: Pool;
  onClose: () => void;
  onOpenAddContributionForMember: (participantId: string) => void;
}

export const ParticipantDetailModal: React.FC<ParticipantDetailModalProps> = ({
  summary,
  pool,
  onClose,
  onOpenAddContributionForMember,
}) => {
  const { updateParticipant, removeParticipant, showToast } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(summary?.participant.name || '');
  const [contactInput, setContactInput] = useState(summary?.participant.phoneOrEmail || '');
  const [copiedReminder, setCopiedReminder] = useState(false);

  if (!summary) return null;

  const { participant, fairSharePaise, amountPaidPaise, amountCreditedPaise, balancePaise, splitsReceived, contributionsPaid } = summary;

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    await updateParticipant(participant.id, nameInput, contactInput);
    setIsEditing(false);
  };

  const handleRemove = async () => {
    const hasHistory = contributionsPaid.length > 0 || splitsReceived.length > 0;
    const confirmMsg = hasHistory
      ? `${participant.name} has recorded payments or splits in this pool. Removing them will archive their profile to keep the ledger history intact while removing them from future fair-share division. Continue?`
      : `Are you sure you want to remove ${participant.name} from the pool?`;

    if (window.confirm(confirmMsg)) {
      await removeParticipant(participant.id);
      onClose();
    }
  };

  // WhatsApp / Slack Reminder Template
  const owesPaise = Math.max(0, -balancePaise);
  const reminderText = `Hi ${participant.name}! 👋 We're chipping in for "${pool.name}". Each person's fair share is ${formatPaise(
    fairSharePaise,
    pool.currency
  )}.${
    amountCreditedPaise > 0
      ? ` You currently have ${formatPaise(amountCreditedPaise, pool.currency)} credited.`
      : ''
  } Remaining balance owed: ${formatPaise(owesPaise, pool.currency)}. Please let me know once transferred!`;

  const copyReminder = () => {
    navigator.clipboard.writeText(reminderText);
    setCopiedReminder(true);
    showToast('Reminder copied to clipboard!');
    setTimeout(() => setCopiedReminder(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
              style={{ backgroundColor: participant.avatarColor }}
            >
              {participant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{participant.name}</h3>
                {participant.isOrganizer && (
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                    Organiser
                  </span>
                )}
                {participant.isArchived && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{participant.phoneOrEmail || 'Participant Breakdown'}</p>
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

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* Edit Form Toggle */}
          {isEditing ? (
            <form onSubmit={handleSaveInfo} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Edit Participant Information</span>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email or Phone</label>
                <input
                  type="text"
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  placeholder="e.g. member@company.com"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Metrics</span>
              <button
                type="button"
                onClick={() => {
                  setNameInput(participant.name);
                  setContactInput(participant.phoneOrEmail || '');
                  setIsEditing(true);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit details</span>
              </button>
            </div>
          )}

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Fair Share</span>
              <span className="text-sm sm:text-base font-black text-slate-900 mt-0.5 block">
                {formatPaise(fairSharePaise, pool.currency)}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Credited</span>
              <span className="text-sm sm:text-base font-black text-indigo-600 mt-0.5 block">
                {formatPaise(amountCreditedPaise, pool.currency)}
              </span>
            </div>
            <div
              className={`p-3 rounded-2xl border text-center ${
                balancePaise >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-600 block">Net Balance</span>
              <span
                className={`text-sm sm:text-base font-black mt-0.5 block ${
                  balancePaise >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {balancePaise >= 0
                  ? `+${formatPaise(balancePaise, pool.currency)}`
                  : `-${formatPaise(Math.abs(balancePaise), pool.currency)}`}
              </span>
            </div>
          </div>

          {/* Detailed Math Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Target Fair Share</span>
              <span className="font-bold text-slate-900">{formatPaise(fairSharePaise, pool.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Out-of-Pocket Cash Paid</span>
              <span className="font-bold text-slate-900">{formatPaise(amountPaidPaise, pool.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Credits Allocated</span>
              <span className="font-bold text-indigo-600">{formatPaise(amountCreditedPaise, pool.currency)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
              <span>Remaining Owed to Settle</span>
              <span className={balancePaise >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {balancePaise >= 0 ? '₹0.00 (Settled)' : formatPaise(Math.abs(balancePaise), pool.currency)}
              </span>
            </div>
          </div>

          {/* Full Transaction History Touching Them */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Transaction History ({splitsReceived.length + contributionsPaid.length})
            </h4>

            {splitsReceived.length === 0 && contributionsPaid.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                No payments or splits recorded yet for this participant.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Splits received */}
                {splitsReceived.map((item) => (
                  <div
                    key={item.contributionId}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {item.isSelf ? 'Direct Payment' : `Covered by ${item.payerName}`}
                        </span>
                        <span className="text-[10px] text-slate-400">{item.date}</span>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-600">+{formatPaise(item.amountPaise, pool.currency)}</span>
                  </div>
                ))}

                {/* Paid for others out of pocket */}
                {contributionsPaid
                  .filter((c) => c.splits.some((s) => s.participantId !== participant.id))
                  .map((c) => (
                    <div
                      key={`paid-${c.id}`}
                      className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                          <HeartHandshake className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-indigo-950 block">Paid out-of-pocket for team</span>
                          <span className="text-[10px] text-indigo-600">Total: {formatPaise(c.amountPaise, pool.currency)}</span>
                        </div>
                      </div>
                      <span className="font-bold text-indigo-700">{formatPaise(c.amountPaise, pool.currency)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* WhatsApp / Slack Payment Reminder Generator */}
          {balancePaise < 0 && (
            <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <Send className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Personalized Payment Reminder</span>
                </div>
                <button
                  type="button"
                  onClick={copyReminder}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-indigo-200"
                >
                  {copiedReminder ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReminder ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
              <p className="text-xs bg-white p-2.5 rounded-xl border border-indigo-100 text-slate-700 font-mono text-[11px] leading-relaxed">
                "{reminderText}"
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Member</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAddContributionForMember(participant.id);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
