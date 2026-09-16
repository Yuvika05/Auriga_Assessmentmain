import React, { useState } from 'react';
import { Pool, Participant } from '../types';
import { useAppStore } from '../store/useAppStore';
import { calculateUserPrivateTransactions, formatPaise } from '../utils/settlementMath';
import {
  ReceiptText,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Download,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface MyTransactionsViewProps {
  pool: Pool;
  onOpenGatewayModal: (participantId: string) => void;
  onOpenContributionModal: (defaultPayerId?: string) => void;
}

export const MyTransactionsView: React.FC<MyTransactionsViewProps> = ({
  pool,
  onOpenGatewayModal,
  onOpenContributionModal,
}) => {
  const { currentUser } = useAppStore();

  const activeParticipants = pool.participants.filter((p) => !p.isArchived);

  // Determine user participant ID matching email or name, default to first or organizer
  const matchedParticipant = activeParticipants.find(
    (p) =>
      (p.phoneOrEmail && currentUser?.email && p.phoneOrEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
      p.name.toLowerCase() === (currentUser?.name || '').toLowerCase()
  );

  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(
    matchedParticipant?.id || activeParticipants[0]?.id || ''
  );

  const currentParticipant =
    activeParticipants.find((p) => p.id === selectedParticipantId) || activeParticipants[0];

  const privateView = currentParticipant
    ? calculateUserPrivateTransactions(pool, currentParticipant.id)
    : null;

  const handleExportReceipt = () => {
    if (!privateView || !currentParticipant) return;
    const content = `
=========================================
SPLITPOOL - OFFICIAL EXPENSE RECEIPT
=========================================
Pool Name: ${pool.name}
Participant: ${currentParticipant.name}
Email / Phone: ${currentParticipant.phoneOrEmail || 'N/A'}
Date of Statement: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}
Currency: ${pool.currency}
-----------------------------------------
Target Share: ${formatPaise(privateView.targetSharePaise, pool.currency)}
Total Paid Out-of-Pocket: ${formatPaise(privateView.totalPaidOutOfPocketPaise, pool.currency)}
Credited Towards Share: ${formatPaise(privateView.totalCreditedTowardsMySharePaise, pool.currency)}
Covered for Friends: ${formatPaise(privateView.totalCoveredForOthersPaise, pool.currency)}
Friends Covered for Me: ${formatPaise(privateView.totalReceivedFromOthersPaise, pool.currency)}
-----------------------------------------
Net Balance: ${formatPaise(privateView.netBalancePaise, pool.currency)}
Status: ${
      privateView.netBalancePaise >= 0
        ? privateView.netBalancePaise === 0
          ? 'PAID IN FULL (SETTLED)'
          : 'OVERPAID / SURPLUS'
        : 'PENDING PAYMENT'
    }
-----------------------------------------
Itemized Ledger:
${privateView.transactions
  .map(
    (t, idx) =>
      `[${idx + 1}] ${t.date} | ${t.type.toUpperCase()} | ${formatPaise(t.amountPaise, pool.currency)} | Method: ${
        t.paymentMethod || 'manual'
      }\n    Note: ${t.note || 'None'}\n    Ref: ${t.id}`
  )
  .join('\n\n')}
=========================================
Generated via SplitPool Secure Ledger
=========================================
`.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt-${pool.name.replace(/\s+/g, '_')}-${currentParticipant.name}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!currentParticipant || !privateView) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center">
        <ReceiptText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Participant Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Please add participants to this pool to view private ledgers.</p>
      </div>
    );
  }

  const isOwed = privateView.netBalancePaise < 0;
  const isSettled = privateView.netBalancePaise === 0;
  const isSurplus = privateView.netBalancePaise > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Participant Selector & Header Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
              Private Ledger
            </span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Confidential to Participant</span>
            </div>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>My Statements & Dues</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personal transaction ledger, proof of payments, and instant settlement for this pool.
          </p>
        </div>

        {/* Participant Switcher Dropdown */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-slate-400" />
            <span>Viewing as:</span>
          </label>
          <select
            value={selectedParticipantId}
            onChange={(e) => setSelectedParticipantId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {activeParticipants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.isOrganizer ? '(Organiser)' : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportReceipt}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Download formatted text statement"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Receipt</span>
          </button>
        </div>
      </div>

      {/* Balance Hero Card */}
      <div
        className={`rounded-3xl p-6 border shadow-xs transition-all ${
          isOwed
            ? 'bg-gradient-to-br from-rose-50/70 via-white to-amber-50/40 border-rose-200'
            : isSettled
            ? 'bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 border-emerald-200'
            : 'bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/40 border-indigo-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              {currentParticipant.name}’s Net Balance
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span
                className={`text-3xl sm:text-4xl font-black tracking-tight ${
                  isOwed ? 'text-rose-600' : isSettled ? 'text-emerald-700' : 'text-indigo-700'
                }`}
              >
                {isOwed ? '-' : ''}
                {formatPaise(Math.abs(privateView.netBalancePaise), pool.currency)}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                  isOwed
                    ? 'bg-rose-100 text-rose-800'
                    : isSettled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {isOwed ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Amount Still Owed</span>
                  </>
                ) : isSettled ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>All Dues Paid in Full</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Surplus / Covered Extras</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Your fair share of the target budget is{' '}
              <span className="font-bold">{formatPaise(privateView.targetSharePaise, pool.currency)}</span>.
            </p>
          </div>

          {/* Quick Action Buttons for Payment */}
          {isOwed && (
            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenGatewayModal(currentParticipant.id)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Online (Razorpay)</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenContributionModal(currentParticipant.id)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-slate-500" />
                <span>Record Manual / UPI</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 Metrics Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-200/70">
          <div className="bg-white/90 p-3 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Paid Out of Pocket
            </span>
            <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
              {formatPaise(privateView.totalPaidOutOfPocketPaise, pool.currency)}
            </span>
          </div>

          <div className="bg-white/90 p-3 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Credited to You
            </span>
            <span className="text-base font-extrabold text-emerald-700 mt-0.5 block">
              {formatPaise(privateView.totalCreditedTowardsMySharePaise, pool.currency)}
            </span>
          </div>

          <div className="bg-white/90 p-3 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Covered for Friends
            </span>
            <span className="text-base font-extrabold text-indigo-700 mt-0.5 block">
              {formatPaise(privateView.totalCoveredForOthersPaise, pool.currency)}
            </span>
          </div>

          <div className="bg-white/90 p-3 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Friends Covered You
            </span>
            <span className="text-base font-extrabold text-amber-700 mt-0.5 block">
              {formatPaise(privateView.totalReceivedFromOthersPaise, pool.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Itemized Private Transaction History */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Personal Transaction Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Every payment you made, received on your behalf, or verified via gateway.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {privateView.transactions.length} record(s)
          </span>
        </div>

        {privateView.transactions.length === 0 ? (
          <div className="p-8 text-center">
            <ReceiptText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">No personal payments recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Once you pay your share or a peer chips in for you, it will appear in this ledger.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {privateView.transactions.map((tx) => (
              <div key={tx.id} className="p-4 sm:p-5 flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === 'paid_out_of_pocket'
                        ? 'bg-emerald-50 text-emerald-600'
                        : tx.type === 'covered_for_other'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {tx.type === 'received_from_other' ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {tx.type === 'paid_out_of_pocket'
                          ? 'Direct Contribution'
                          : tx.type === 'covered_for_other'
                          ? 'Paid on Behalf of Peer'
                          : 'Covered by Peer'}
                      </span>
                      {tx.paymentMethod && (
                        <span className="px-2 py-0.2 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600 uppercase tracking-wide">
                          {tx.paymentMethod.replace('_', ' ')}
                        </span>
                      )}
                      {tx.paymentStatus && (
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-extrabold rounded-md uppercase ${
                            tx.paymentStatus === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {tx.paymentStatus}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-1">
                      {tx.note || (tx.type === 'received_from_other' ? `Chipped in by ${tx.payerName}` : 'Pool contribution')}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span>{tx.date}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px]">Ref: {tx.id.slice(0, 12)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-sm sm:text-base font-extrabold ${
                      tx.type === 'received_from_other'
                        ? 'text-amber-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {formatPaise(tx.amountPaise, pool.currency)}
                  </span>
                  <span className="block text-[10px] font-semibold text-slate-400">
                    {tx.type === 'paid_out_of_pocket'
                      ? 'Self credit'
                      : tx.type === 'covered_for_other'
                      ? 'Out-of-pocket'
                      : 'Credited to you'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
