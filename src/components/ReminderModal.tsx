import React, { useState } from 'react';
import { Pool, Participant } from '../types';
import { useAppStore } from '../store/useAppStore';
import { formatPaise, calculateParticipantSummaries } from '../utils/settlementMath';
import {
  X,
  Bell,
  Send,
  MessageSquare,
  Mail,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  pool: Pool;
  defaultParticipantId?: string | null;
  onClose: () => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  pool,
  defaultParticipantId,
  onClose,
}) => {
  const { sendManualReminder, updatePoolDeadline } = useAppStore();

  const summaries = calculateParticipantSummaries(pool);
  const debtors = summaries.filter((s) => s.balancePaise < 0 && !s.participant.isArchived);

  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(
    defaultParticipantId || debtors[0]?.participant.id || ''
  );
  const [customMessage, setCustomMessage] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email' | 'in_app' | 'upi_collect'>('whatsapp');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDebtor = debtors.find((d) => d.participant.id === selectedParticipantId) || debtors[0];
  const amountOwedPaise = currentDebtor ? Math.abs(currentDebtor.balancePaise) : 0;

  const formattedAmount = formatPaise(amountOwedPaise, pool.currency);

  const defaultDraft = `Hey ${
    currentDebtor?.participant.name || 'there'
  }! Friendly reminder for our "${pool.name}" pool. Your pending share is ${formattedAmount}. Please send it when you get a chance!`;

  const finalMessage = customMessage.trim() || defaultDraft;

  const handleCopy = () => {
    navigator.clipboard.writeText(finalMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendReminder = async () => {
    if (!currentDebtor) return;

    setIsSending(true);
    setDispatchNotice(null);

    try {
      await sendManualReminder({
        poolId: pool.id,
        participantId: currentDebtor.participant.id,
        channel: selectedChannel,
        customMessage: finalMessage,
      });

      if (selectedChannel === 'whatsapp') {
        const phone = currentDebtor.participant.phoneOrEmail?.replace(/[^0-9]/g, '');
        const url = phone
          ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(finalMessage)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(finalMessage)}`;
        window.open(url, '_blank');
      } else if (selectedChannel === 'email') {
        const email = currentDebtor.participant.phoneOrEmail || '';
        const mailto = `mailto:${email}?subject=${encodeURIComponent(
          `SplitPool Reminder: ${pool.name}`
        )}&body=${encodeURIComponent(finalMessage)}`;
        window.location.href = mailto;
      }

      setIsSending(false);
      setDispatchNotice(`Reminder sent successfully via ${selectedChannel}!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setIsSending(false);
      setDispatchNotice(err?.message || 'Failed to dispatch reminder');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Dispatch Smart Reminder</h3>
              <p className="text-[11px] text-slate-400">Automated cadence or 1-click personal outreach</p>
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

        <div className="p-6 overflow-y-auto space-y-4">
          {debtors.length === 0 ? (
            <div className="py-8 text-center">
              <Check className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-base font-extrabold text-slate-800">Everyone is All Settled!</h4>
              <p className="text-xs text-slate-500 mt-1">
                No participants currently have pending dues for this pool.
              </p>
            </div>
          ) : (
            <>
              {dispatchNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                  {dispatchNotice}
                </div>
              )}

              {/* Select Debtor */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Select Participant with Pending Due
                </label>
                <select
                  value={selectedParticipantId}
                  onChange={(e) => setSelectedParticipantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {debtors.map((d) => (
                    <option key={d.participant.id} value={d.participant.id}>
                      {d.participant.name} — Pending: {formatPaise(Math.abs(d.balancePaise), pool.currency)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Delivery Channel
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'whatsapp' as const, label: 'WhatsApp', icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> },
                    { id: 'email' as const, label: 'Email', icon: <Mail className="w-3.5 h-3.5 text-indigo-600" /> },
                    { id: 'upi_collect' as const, label: 'UPI Collect', icon: <Smartphone className="w-3.5 h-3.5 text-sky-600" /> },
                    { id: 'in_app' as const, label: 'In-App / Copy', icon: <Copy className="w-3.5 h-3.5 text-amber-600" /> },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setSelectedChannel(ch.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                        selectedChannel === ch.id
                          ? 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      {ch.icon}
                      <span className="truncate">{ch.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Draft */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Message Preview
                  </label>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={defaultDraft}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900"
                />
              </div>

              {/* Automated Cadence Rules Info */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600">
                <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Anti-Spam Cooldown</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Automated background reminders honor a {pool.reminderCooldownDays || 3}-day cooldown period to protect relationships while keeping collections on track.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleSendReminder}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md shadow-amber-100 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Sending...' : `Send via ${selectedChannel}`}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
