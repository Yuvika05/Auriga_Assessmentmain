import React, { useState } from 'react';
import { Pool, ParticipantSummary, SettlementTransaction } from '../types';
import { useAppStore } from '../store/useAppStore';
import {
  calculateGreedySettlements,
  calculateSmartSocialSettlements,
  formatPaise,
} from '../utils/settlementMath';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Share2,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  Info,
  Check,
  Zap,
  CreditCard,
  Bell,
} from 'lucide-react';

interface SettleUpTabProps {
  pool: Pool;
  summaries: ParticipantSummary[];
  onOpenGatewayModal?: (participantId?: string) => void;
  onOpenReminderModal?: (participantId?: string) => void;
}

export const SettleUpTab: React.FC<SettleUpTabProps> = ({
  pool,
  summaries,
  onOpenGatewayModal,
  onOpenReminderModal,
}) => {
  const { toggleSettlementDone, resetSettlements, showToast } = useAppStore();
  const [algorithm, setAlgorithm] = useState<'greedy' | 'social'>('greedy');
  const [copiedPlan, setCopiedPlan] = useState(false);

  // Compute transactions based on selected strategy
  let transactions: SettlementTransaction[] = [];
  if (algorithm === 'greedy') {
    const activeSummaries = summaries.filter((s) => !s.participant.isArchived);
    const balanceNodes = activeSummaries.map((s) => ({
      id: s.participant.id,
      name: s.participant.name,
      // For peer-to-peer cash settlements, net balance = amountPaidPaise - fairSharePaise
      netBalancePaise: s.cashBalancePaise,
    }));
    transactions = calculateGreedySettlements(balanceNodes, pool.settlementDoneIds);
  } else {
    transactions = calculateSmartSocialSettlements(pool, summaries, pool.settlementDoneIds);
  }

  const totalTransactions = transactions.length;
  const completedTransactions = transactions.filter((t) => t.isCompleted).length;
  const isFullySettled = totalTransactions > 0 && completedTransactions === totalTransactions;

  // Format plan for sharing
  const handleCopyPlan = () => {
    if (transactions.length === 0) return;
    const lines = [
      `🎉 Settle Up Plan for "${pool.name}" (${pool.currency}):`,
      `Target: ${formatPaise(pool.targetAmountPaise, pool.currency)}`,
      '',
      ...transactions.map((t, idx) => {
        const check = t.isCompleted ? '✅' : '⏳';
        return `${idx + 1}. ${check} ${t.fromName} pays ${formatPaise(t.amountPaise, pool.currency)} to ${t.toName}`;
      }),
      '',
      `Generated with SplitPool`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedPlan(true);
    showToast('Settlement plan copied to clipboard!');
    setTimeout(() => setCopiedPlan(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header and Algorithm Strategy Toggle */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Simplification Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Settle Up Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tick off each transaction as friends transfer funds to achieve fair share balance.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              id="settle-copy-plan-btn"
              type="button"
              onClick={handleCopyPlan}
              disabled={transactions.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              {copiedPlan ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedPlan ? 'Copied!' : 'Share Plan'}</span>
            </button>

            {completedTransactions > 0 && (
              <button
                id="settle-reset-checklist-btn"
                type="button"
                onClick={resetSettlements}
                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="Reset all checkmarks"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Checks</span>
              </button>
            )}
          </div>
        </div>

        {/* Strategy Switcher */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Method:</span>
            <div className="inline-flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAlgorithm('greedy')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  algorithm === 'greedy'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Min Transactions (Greedy)</span>
              </button>

              <button
                type="button"
                onClick={() => setAlgorithm('social')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  algorithm === 'social'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Friend Reimbursement + Pool</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            Completed: <strong className="text-slate-900">{completedTransactions}</strong> of{' '}
            <strong className="text-slate-900">{totalTransactions}</strong> transfers
          </div>
        </div>

        {/* Progress Bar */}
        {totalTransactions > 0 && (
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-4 border border-slate-200">
            <div
              className={`h-full transition-all duration-500 ${
                isFullySettled ? 'bg-emerald-500' : 'bg-indigo-600'
              }`}
              style={{
                width: `${Math.round((completedTransactions / totalTransactions) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Fully Settled Celebration Card */}
      {isFullySettled && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 text-center animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-200 mb-3">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-emerald-950">All settled up! 🎉</h3>
          <p className="text-xs sm:text-sm text-emerald-800 max-w-md mx-auto mt-1 leading-relaxed">
            Every transaction has been completed. All participants have chipped in their exact fair share and everyone is square!
          </p>
          <button
            type="button"
            onClick={resetSettlements}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset checkmarks</span>
          </button>
        </div>
      )}

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">Zero Balances Outstanding</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Everyone is currently square or no payments/members have been configured yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((t, index) => {
            return (
              <div
                key={t.id}
                onClick={() => toggleSettlementDone(t.id)}
                className={`rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                  t.isCompleted
                    ? 'bg-slate-50/80 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
                }`}
              >
                {/* Left: Checkbox, Step Number, Transfer Path */}
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    className="p-1 text-indigo-600 focus:outline-none"
                    aria-label="Toggle completion"
                  >
                    {t.isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-300 hover:text-indigo-600 shrink-0" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                      <span className={`text-sm font-bold ${t.isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {t.fromName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className={`text-sm font-bold ${t.isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {t.toName}
                      </span>
                    </div>

                    {t.description && (
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {t.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Amount and Status Pill */}
                <div className="text-right shrink-0">
                  <span
                    className={`text-base sm:text-lg font-black block ${
                      t.isCompleted ? 'line-through text-slate-400' : 'text-indigo-600'
                    }`}
                  >
                    {formatPaise(t.amountPaise, pool.currency)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                      t.isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {t.isCompleted ? 'Done' : 'Pending Transfer'}
                  </span>

                  {!t.isCompleted && (onOpenGatewayModal || onOpenReminderModal) && (
                    <div
                      className="flex items-center justify-end gap-1.5 mt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onOpenGatewayModal && (
                        <button
                          type="button"
                          onClick={() => onOpenGatewayModal(t.fromId)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title={`Pay ${formatPaise(t.amountPaise, pool.currency)} via Online Gateway`}
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Pay</span>
                        </button>
                      )}
                      {onOpenReminderModal && (
                        <button
                          type="button"
                          onClick={() => onOpenReminderModal(t.fromId)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title={`Remind ${t.fromName} via WhatsApp or Email`}
                        >
                          <Bell className="w-3 h-3 text-amber-600" />
                          <span>Remind</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Callout */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>How this works:</strong> SplitPool uses an optimized greedy debt-matching algorithm ($O(n \log n)$). It balances all positive and negative net positions with the absolute minimum number of financial transfers, ensuring no participant sends or receives redundant money.
        </p>
      </div>
    </div>
  );
};
