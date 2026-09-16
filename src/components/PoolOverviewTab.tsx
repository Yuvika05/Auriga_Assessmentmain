import React, { useState } from 'react';
import { Pool, ParticipantSummary } from '../types';
import { calculatePoolMetrics, formatPaise } from '../utils/settlementMath';
import { EditTargetModal } from './EditTargetModal';
import {
  CheckCircle2,
  AlertCircle,
  Plus,
  Users,
  ArrowUpRight,
  HelpCircle,
  Sliders,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  HeartHandshake,
  Calendar,
  Tag,
  Bell,
  CreditCard,
  Copy,
  Zap,
} from 'lucide-react';

interface PoolOverviewTabProps {
  pool: Pool;
  summaries: ParticipantSummary[];
  onOpenAddContribution: () => void;
  onOpenAddParticipant: () => void;
  onSelectParticipant: (summary: ParticipantSummary) => void;
  onNavigateToSettle: () => void;
  onNavigateToParticipants: () => void;
  onOpenGatewayModal?: (participantId?: string) => void;
  onOpenReminderModal?: (participantId?: string) => void;
  onOpenClonePool?: () => void;
}

export const PoolOverviewTab: React.FC<PoolOverviewTabProps> = ({
  pool,
  summaries,
  onOpenAddContribution,
  onOpenAddParticipant,
  onSelectParticipant,
  onNavigateToSettle,
  onNavigateToParticipants,
  onOpenGatewayModal,
  onOpenReminderModal,
  onOpenClonePool,
}) => {
  const [isEditTargetOpen, setIsEditTargetOpen] = useState(false);
  const metrics = calculatePoolMetrics(pool);
  const activeParticipants = pool.participants.filter((p) => !p.isArchived);

  // Category labels and styles
  const categoryMeta: { [k: string]: { label: string; icon: string } } = {
    gift: { label: 'Farewell / Gift', icon: '🎁' },
    trip: { label: 'Group Trip', icon: '✈️' },
    kitty_party: { label: 'Kitty Party', icon: '☕' },
    office_pool: { label: 'Office Pool', icon: '🏢' },
    custom: { label: 'Shared Pool', icon: '🏷️' },
  };
  const categoryInfo = categoryMeta[pool.category || 'gift'] || categoryMeta.custom;

  // Deadline calculation
  let deadlineDiffDays: number | null = null;
  if (pool.deadline) {
    const dTarget = new Date(pool.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDiffDays = Math.ceil((dTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Primary Pool Card */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
        {/* Top bar: Title, Organiser, and Edit Target action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Active Pool
              </span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/80 flex items-center gap-1">
                <span>{categoryInfo.icon}</span>
                <span>{categoryInfo.label}</span>
              </span>
              {deadlineDiffDays !== null && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                    deadlineDiffDays < 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : deadlineDiffDays <= 3
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>
                    {deadlineDiffDays < 0
                      ? `Overdue (${Math.abs(deadlineDiffDays)}d)`
                      : deadlineDiffDays === 0
                      ? 'Due Today'
                      : `${deadlineDiffDays}d remaining`}
                  </span>
                </span>
              )}
              {pool.organizerName && (
                <span className="text-xs text-slate-500 font-medium ml-1">
                  Organised by <strong className="text-slate-700">{pool.organizerName}</strong>
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {pool.name}
            </h2>
            {pool.description && (
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                {pool.description}
              </p>
            )}
          </div>

          {/* Primary Toolbar Actions */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              id="overview-log-payment-btn"
              type="button"
              onClick={onOpenAddContribution}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Payment</span>
            </button>

            {onOpenGatewayModal && (
              <button
                type="button"
                onClick={() => onOpenGatewayModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 transition-all cursor-pointer"
                title="Pay dues online via Razorpay Sandbox"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay Online</span>
              </button>
            )}

            {onOpenReminderModal && (
              <button
                type="button"
                onClick={() => onOpenReminderModal()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-xs font-bold rounded-xl transition-all cursor-pointer"
                title="Send reminder via WhatsApp or Email"
              >
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span>Remind</span>
              </button>
            )}

            <button
              id="overview-add-member-btn"
              type="button"
              onClick={onOpenAddParticipant}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Add Member</span>
            </button>

            <button
              id="overview-edit-target-btn"
              type="button"
              onClick={() => setIsEditTargetOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
              title="Edit target amount at any time"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Target</span>
            </button>

            {onOpenClonePool && (
              <button
                type="button"
                onClick={onOpenClonePool}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                title="Clone this pool with current roster for next cycle"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Clone</span>
              </button>
            )}
          </div>
        </div>

        {/* Collection Status Banner ("Have we collected enough yet?") */}
        <div className="mt-6 mb-6">
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              metrics.isTargetMet
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {metrics.isTargetMet ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                    Collection Status
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white/80 border border-black/5">
                    {metrics.percentage}% Funded
                  </span>
                  {metrics.surplusPaise > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      +{formatPaise(metrics.surplusPaise, pool.currency)} Surplus
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base font-bold mt-1">
                  {metrics.isTargetMet
                    ? metrics.surplusPaise > 0
                      ? `Goal Exceeded! We've collected ${formatPaise(metrics.totalCollectedPaise, pool.currency)} with a surplus of ${formatPaise(metrics.surplusPaise, pool.currency)} above target.`
                      : `Goal Achieved! We've collected ${formatPaise(metrics.totalCollectedPaise, pool.currency)} (Target: ${formatPaise(metrics.totalTargetPaise, pool.currency)})`
                    : `Have we collected enough yet? Not yet — ${formatPaise(metrics.remainingNeededPaise, pool.currency)} still needed to buy the gift.`}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0 bg-white/70 sm:bg-transparent p-2 sm:p-0 rounded-xl border sm:border-0 border-black/5 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-semibold block">Each Person's Fair Share</span>
              <span className="text-xl font-black text-slate-900">
                {metrics.participantCount > 0 ? formatPaise(metrics.fairSharePaise, pool.currency) : 'Add Members'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-2">
            <span>Collected: {formatPaise(metrics.totalCollectedPaise, pool.currency)}</span>
            <span>Target: {formatPaise(metrics.totalTargetPaise, pool.currency)}</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.isTargetMet ? 'bg-emerald-500 shadow-xs' : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, metrics.percentage))}%` }}
            />
          </div>
        </div>

        {/* 4 Core Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Target Budget</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                {formatPaise(metrics.totalTargetPaise, pool.currency)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditTargetOpen(true)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold mt-2 text-left flex items-center gap-1 cursor-pointer"
            >
              <span>Edit Target</span> &rarr;
            </button>
          </div>

          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Total Collected</span>
            <span className="text-xl sm:text-2xl font-black text-indigo-600 mt-1 block">
              {formatPaise(metrics.totalCollectedPaise, pool.currency)}
            </span>
            <span className="text-[11px] text-slate-400 mt-2 block font-medium">
              {pool.contributions.length} payments recorded
            </span>
          </div>

          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
              {metrics.surplusPaise > 0 ? 'Surplus Pool Funds' : 'Remaining to Collect'}
            </span>
            <span
              className={`text-xl sm:text-2xl font-black mt-1 block ${
                metrics.surplusPaise > 0
                  ? 'text-emerald-700'
                  : metrics.remainingNeededPaise > 0
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {metrics.surplusPaise > 0
                ? `+${formatPaise(metrics.surplusPaise, pool.currency)}`
                : formatPaise(metrics.remainingNeededPaise, pool.currency)}
            </span>
            <span className="text-[11px] text-slate-400 mt-2 block font-medium">
              {metrics.surplusPaise > 0 ? 'Above target goal' : metrics.remainingNeededPaise === 0 ? 'Target met' : 'Pending from team'}
            </span>
          </div>

          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/70">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Each Person's Share</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
              {metrics.participantCount > 0 ? formatPaise(metrics.fairSharePaise, pool.currency) : '—'}
            </span>
            <span className="text-[11px] text-slate-400 mt-2 block font-medium">
              {metrics.participantCount > 0
                ? `Across ${metrics.participantCount} members`
                : 'Add members to divide'}
            </span>
          </div>
        </div>

        {/* Rounding Remainder Note */}
        {metrics.participantCount > 1 && metrics.remainderPaise > 0 && (
          <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong>Exact Paise Accounting:</strong> {formatPaise(pool.targetAmountPaise, pool.currency)} ÷ {metrics.participantCount} people = {formatPaise(metrics.fairSharePaise, pool.currency)} each. ({metrics.remainderPaise} remainder paise allocated transparently so total is exact).
            </span>
          </div>
        )}
      </section>

      {/* Participant Status Quick Chips Grid */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Team Status Roster ({summaries.length})
            </h3>
            <p className="text-xs text-slate-500">
              Click any participant to inspect their calculations and history.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToParticipants}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Roster</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summaries.map((s) => {
            const badgeStyles = {
              emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              amber: 'bg-amber-50 text-amber-700 border-amber-200',
              rose: 'bg-rose-50 text-rose-700 border-rose-200',
              sky: 'bg-sky-50 text-sky-700 border-sky-200',
            }[s.statusColor];

            const coveredByOthers = s.splitsReceived.filter((item) => !item.isSelf);

            return (
              <div
                key={s.participant.id}
                onClick={() => onSelectParticipant(s)}
                className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-indigo-300 bg-white hover:bg-indigo-50/20 transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs"
                      style={{ backgroundColor: s.participant.avatarColor }}
                    >
                      {s.participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block truncate max-w-[130px]">
                        {s.participant.name}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Share: {formatPaise(s.fairSharePaise, pool.currency)}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeStyles}`}>
                    {s.statusLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">Credited: {formatPaise(s.amountCreditedPaise, pool.currency)}</span>
                  <span
                    className={`font-bold text-[11px] ${
                      s.balancePaise > 0
                        ? 'text-sky-600'
                        : s.balancePaise === 0
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {s.balancePaise >= 0
                      ? `+${formatPaise(s.balancePaise, pool.currency)}`
                      : `Owes ${formatPaise(Math.abs(s.balancePaise), pool.currency)}`}
                  </span>
                </div>

                {coveredByOthers.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    <HeartHandshake className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="truncate">Covered by {coveredByOthers.map((c) => c.payerName).join(', ')}</span>
                  </div>
                )}

                {/* Quick Action Buttons for Debtors */}
                {s.balancePaise < 0 && (
                  <div
                    className="flex items-center gap-1.5 pt-1 mt-0.5 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onOpenGatewayModal && (
                      <button
                        type="button"
                        onClick={() => onOpenGatewayModal(s.participant.id)}
                        className="flex-1 py-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Pay Online</span>
                      </button>
                    )}
                    {onOpenReminderModal && (
                      <button
                        type="button"
                        onClick={() => onOpenReminderModal(s.participant.id)}
                        className="py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        title="Remind this participant"
                      >
                        <Bell className="w-3 h-3 text-amber-600" />
                        <span>Remind</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Settle Up Teaser Callout */}
      <section className="bg-gradient-to-r from-indigo-50 via-white to-emerald-50 rounded-3xl border border-indigo-100 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Ready to settle balances with minimum transactions?
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              SplitPool calculates the shortest list of transfers so everyone pays their exact fair share.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateToSettle}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs cursor-pointer"
        >
          <span>Open Settle Up Plan</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </section>

      {/* Edit Target Modal */}
      <EditTargetModal
        isOpen={isEditTargetOpen}
        pool={pool}
        totalCollectedPaise={metrics.totalCollectedPaise}
        onClose={() => setIsEditTargetOpen(false)}
      />
    </div>
  );
};
