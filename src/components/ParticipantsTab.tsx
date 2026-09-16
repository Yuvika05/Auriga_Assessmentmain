import React, { useState } from 'react';
import { Pool, ParticipantSummary } from '../types';
import { useAppStore } from '../store/useAppStore';
import { formatPaise } from '../utils/settlementMath';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  CreditCard,
  HeartHandshake,
  ChevronRight,
  Shield,
  Filter,
} from 'lucide-react';

interface ParticipantsTabProps {
  pool: Pool;
  summaries: ParticipantSummary[];
  onSelectParticipant: (summary: ParticipantSummary) => void;
  onOpenAddMember: () => void;
  onOpenAddContributionForMember: (participantId: string) => void;
}

export const ParticipantsTab: React.FC<ParticipantsTabProps> = ({
  pool,
  summaries,
  onSelectParticipant,
  onOpenAddMember,
  onOpenAddContributionForMember,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'owes' | 'paid' | 'overpaid' | 'archived'>('all');

  const filteredSummaries = summaries.filter((s) => {
    const matchesSearch = s.participant.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'archived') return Boolean(s.participant.isArchived);
    if (s.participant.isArchived) return false; // Hide archived in standard filters

    if (statusFilter === 'owes') return s.balancePaise < 0;
    if (statusFilter === 'paid') return s.balancePaise === 0;
    if (statusFilter === 'overpaid') return s.balancePaise > 0;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header with Search and Add Member */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Team Participants ({pool.participants.filter((p) => !p.isArchived).length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fair share is dynamically recalculated whenever members join or leave.
            </p>
          </div>

          <button
            id="participants-add-member-btn"
            type="button"
            onClick={onOpenAddMember}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Participant</span>
          </button>
        </div>

        {/* Search & Filter Pills */}
        <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member by name..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {(
              [
                { id: 'all', label: 'All Members' },
                { id: 'owes', label: 'Still Owes' },
                { id: 'paid', label: 'Paid in Full' },
                { id: 'overpaid', label: 'Overpaid / Covering' },
                { id: 'archived', label: 'Archived / Former' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === f.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Participants Cards Grid */}
      {filteredSummaries.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No participants found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try a different search query or reset the filter.'
              : 'Add participants to calculate equal fair shares and track who has paid.'}
          </p>
          <button
            type="button"
            onClick={onOpenAddMember}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Participant</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSummaries.map((s) => {
            const badgeStyles = {
              emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              amber: 'bg-amber-50 text-amber-700 border-amber-200',
              rose: 'bg-rose-50 text-rose-700 border-rose-200',
              sky: 'bg-sky-50 text-sky-700 border-sky-200',
            }[s.statusColor];

            const coveredByOthers = s.splitsReceived.filter((item) => !item.isSelf);
            const progressPercent =
              s.fairSharePaise > 0
                ? Math.min(100, Math.round((s.amountCreditedPaise / s.fairSharePaise) * 100))
                : 100;

            return (
              <div
                key={s.participant.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Top Bar: Avatar, Name, Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-2xs"
                        style={{ backgroundColor: s.participant.avatarColor }}
                      >
                        {s.participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900">
                            {s.participant.name}
                          </h3>
                          {s.participant.isOrganizer && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                              Organiser
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 block">
                          Fair share: <strong>{formatPaise(s.fairSharePaise, pool.currency)}</strong>
                        </span>
                      </div>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${badgeStyles}`}>
                      {s.statusLabel}
                    </span>
                  </div>

                  {/* Progress bar towards their fair share */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>Credited: {formatPaise(s.amountCreditedPaise, pool.currency)}</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          s.balancePaise >= 0 ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Numbers Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Paid Out-of-Pocket</span>
                      <span className="font-bold text-slate-900 block mt-0.5">
                        {formatPaise(s.amountPaidPaise, pool.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Net Balance</span>
                      <span
                        className={`font-black block mt-0.5 ${
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
                  </div>

                  {/* Friend Cover Note */}
                  {coveredByOthers.length > 0 && (
                    <div className="mt-3 p-2 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 flex items-center gap-1.5">
                      <HeartHandshake className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>
                        Partly covered by <strong>{coveredByOthers.map((c) => c.payerName).join(', ')}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectParticipant(s)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View History & Reminder</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenAddContributionForMember(s.participant.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    <span>Record Pay</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
