import React, { useState } from 'react';
import { Pool, ActivityLogItem } from '../types';
import { formatPaise } from '../utils/settlementMath';
import {
  Clock,
  Target,
  CreditCard,
  UserPlus,
  Users,
  Sparkles,
  Sliders,
  Filter,
} from 'lucide-react';

interface ActivityLogTabProps {
  pool: Pool;
}

export const ActivityLogTab: React.FC<ActivityLogTabProps> = ({ pool }) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = pool.activityLogs.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'target') return item.type === 'target_changed';
    if (filterType === 'contributions')
      return (
        item.type === 'contribution_added' ||
        item.type === 'contribution_updated' ||
        item.type === 'contribution_deleted'
      );
    if (filterType === 'members')
      return (
        item.type === 'member_added' ||
        item.type === 'member_updated' ||
        item.type === 'member_archived'
      );
    return true;
  });

  const getEventIcon = (type: ActivityLogItem['type']) => {
    switch (type) {
      case 'target_changed':
        return <Target className="w-4 h-4 text-amber-600" />;
      case 'contribution_added':
      case 'contribution_updated':
      case 'contribution_deleted':
        return <CreditCard className="w-4 h-4 text-indigo-600" />;
      case 'member_added':
      case 'member_archived':
      case 'member_updated':
        return <Users className="w-4 h-4 text-sky-600" />;
      case 'pool_created':
      default:
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header and Filter */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Activity & Audit Log
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Transparent, chronological audit trail of budget changes, contributions, and member updates.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Events' },
              { id: 'target', label: 'Budget Changes' },
              { id: 'contributions', label: 'Payments' },
              { id: 'members', label: 'Members' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === f.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dedicated Target Budget Audit Trail Section */}
        {pool.targetAuditTrail.length > 0 && (
          <div className="mt-5 p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-amber-700" />
              <span>Target Budget Revision History ({pool.targetAuditTrail.length})</span>
            </div>
            <div className="space-y-2">
              {pool.targetAuditTrail.map((audit) => (
                <div
                  key={audit.id}
                  className="bg-white p-3 rounded-xl border border-amber-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-slate-900">
                      {formatPaise(audit.oldTargetPaise, pool.currency)} &rarr;{' '}
                      {formatPaise(audit.newTargetPaise, pool.currency)}
                    </span>
                    {audit.reason && (
                      <p className="text-slate-600 text-[11px] mt-0.5 italic">
                        "{audit.reason}"
                      </p>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 shrink-0">
                    By {audit.updatedBy} &bull; {formatTime(audit.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Timeline Stream */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No activity logged yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Events will be recorded here as you add contributions, modify targets, or update participants.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {filteredLogs.map((item) => (
              <div key={item.id} className="relative flex items-start gap-4 group">
                {/* Node Dot */}
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shrink-0 z-10 shadow-2xs group-hover:scale-110 transition-transform">
                  <div className="w-2 h-2 rounded-full bg-indigo-600" />
                </div>

                <div className="flex-1 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 group-hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                      {item.description}
                    </p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
