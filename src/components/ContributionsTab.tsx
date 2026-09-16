import React, { useState } from 'react';
import { Contribution, Pool } from '../types';
import { useAppStore } from '../store/useAppStore';
import { formatPaise } from '../utils/settlementMath';
import {
  CreditCard,
  Plus,
  Search,
  Calendar,
  HeartHandshake,
  Edit2,
  Trash2,
  Filter,
  FileText,
  User,
} from 'lucide-react';

interface ContributionsTabProps {
  pool: Pool;
  onOpenAddContribution: () => void;
  onEditContribution: (contribution: Contribution) => void;
}

export const ContributionsTab: React.FC<ContributionsTabProps> = ({
  pool,
  onOpenAddContribution,
  onEditContribution,
}) => {
  const { deleteContribution } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayerFilter, setSelectedPayerFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  const filteredContributions = pool.contributions
    .filter((c) => {
      const payer = pool.participants.find((p) => p.id === c.payerId);
      const payerName = payer ? payer.name : c.payerName || '';
      const matchesSearch =
        payerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.note && c.note.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      if (selectedPayerFilter !== 'all' && c.payerId !== selectedPayerFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount_desc') return b.amountPaise - a.amountPaise;
      if (sortBy === 'amount_asc') return a.amountPaise - b.amountPaise;
      return 0;
    });

  const handleDelete = async (id: string, payerName: string, amount: number) => {
    if (
      window.confirm(
        `Are you sure you want to delete this payment of ${formatPaise(amount, pool.currency)} from ${payerName}?`
      )
    ) {
      await deleteContribution(id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header and Controls */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Contributions Ledger ({pool.contributions.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every recorded transaction with complete split allocations and audit details.
            </p>
          </div>

          <button
            id="contributions-log-payment-btn"
            type="button"
            onClick={onOpenAddContribution}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by payer or note..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
            />
          </div>

          <div>
            <select
              value={selectedPayerFilter}
              onChange={(e) => setSelectedPayerFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
            >
              <option value="all">All Payers</option>
              {pool.participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
            >
              <option value="date_desc">Date: Newest First</option>
              <option value="date_asc">Date: Oldest First</option>
              <option value="amount_desc">Amount: Highest First</option>
              <option value="amount_asc">Amount: Lowest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contributions List */}
      {filteredContributions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No contributions found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedPayerFilter !== 'all'
              ? 'No payments match your current search and filters.'
              : 'Log payments as participants chip in to track progress toward the target.'}
          </p>
          <button
            type="button"
            onClick={onOpenAddContribution}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record First Payment</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContributions.map((c) => {
            const payer = pool.participants.find((p) => p.id === c.payerId);
            const payerName = payer ? payer.name : c.payerName || 'Member';
            const isMultiSplit =
              c.splits.length > 1 || (c.splits.length === 1 && c.splits[0].participantId !== c.payerId);

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Avatar, Payer, Date, Splits */}
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs mt-0.5"
                    style={{ backgroundColor: payer?.avatarColor || '#6366F1' }}
                  >
                    {payerName.charAt(0).toUpperCase()}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{payerName}</h4>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{c.date}</span>
                      </span>
                      {isMultiSplit && (
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <HeartHandshake className="w-3 h-3 text-indigo-500" />
                          <span>Split / Covered Friends</span>
                        </span>
                      )}
                    </div>

                    {/* Split details breakdown */}
                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-slate-400">Allocated to:</span>
                      {c.splits.map((s) => {
                        const recipient = pool.participants.find((p) => p.id === s.participantId);
                        return (
                          <span
                            key={s.participantId}
                            className="bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-700"
                          >
                            {recipient?.name || 'Member'}: {formatPaise(s.amountPaise, pool.currency)}
                          </span>
                        );
                      })}
                    </div>

                    {c.note && (
                      <p className="text-xs text-slate-500 italic flex items-center gap-1 pt-0.5">
                        <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>"{c.note}"</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Amount & Action Buttons */}
                <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <span className="text-xs text-slate-400 block font-semibold">Amount Paid</span>
                    <span className="text-base sm:text-lg font-black text-indigo-600 block">
                      {formatPaise(c.amountPaise, pool.currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditContribution(c)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Edit payment"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id, payerName, c.amountPaise)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete payment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
