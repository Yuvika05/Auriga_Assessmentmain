import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, NavTab } from '../store/useAppStore';
import {
  PiggyBank,
  LogOut,
  Plus,
  ChevronDown,
  LayoutDashboard,
  Users,
  CreditCard,
  CheckCircle2,
  Clock,
  Settings as SettingsIcon,
  Sparkles,
  ReceiptText,
  Copy,
  Zap,
} from 'lucide-react';

interface HeaderNavProps {
  onOpenNewPool: () => void;
  onOpenClonePool?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ onOpenNewPool, onOpenClonePool }) => {
  const {
    currentUser,
    pools,
    activePoolId,
    selectPool,
    activeTab,
    setActiveTab,
    logout,
    resetPoolToDemo,
  } = useAppStore();
  const navigate = useNavigate();
  const [isPoolDropdownOpen, setIsPoolDropdownOpen] = useState(false);

  const activePool = pools.find((p) => p.id === activePoolId) || pools[0];

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'participants',
      label: 'Participants',
      icon: <Users className="w-4 h-4" />,
      badge: activePool?.participants.filter((p) => !p.isArchived).length,
    },
    {
      id: 'contributions',
      label: 'Contributions',
      icon: <CreditCard className="w-4 h-4" />,
      badge: activePool?.contributions.length,
    },
    { id: 'settle', label: 'Settle Up', icon: <CheckCircle2 className="w-4 h-4" /> },
    {
      id: 'my_transactions',
      label: 'My Ledger',
      icon: <ReceiptText className="w-4 h-4" />,
    },
    {
      id: 'activity',
      label: 'Activity Log',
      icon: <Clock className="w-4 h-4" />,
      badge: activePool?.activityLogs.length,
    },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Top bar: Brand, Pool Selector, and User profile / Logout */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100 gap-3">
          {/* Logo & Pool Switcher */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
              <PiggyBank className="w-5 h-5" />
            </div>

            {/* Multi-Pool Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPoolDropdownOpen(!isPoolDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-left transition-colors cursor-pointer group"
                title="Switch or create pools"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                    Current Pool
                  </span>
                  <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 truncate max-w-[160px] sm:max-w-xs block leading-tight">
                    {activePool ? activePool.name : 'Select a Pool'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
              </button>

              {isPoolDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsPoolDropdownOpen(false)} />
                  <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-30 animate-in fade-in zoom-in-95 duration-100">
                    <span className="text-[11px] font-bold text-slate-400 px-3 py-1 block uppercase tracking-wider">
                      Your Pools ({pools.length})
                    </span>

                    <div className="space-y-1 max-h-56 overflow-y-auto my-1">
                      {pools.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            selectPool(p.id);
                            setIsPoolDropdownOpen(false);
                            navigate(`/pools/${p.id}/${activeTab}`);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                            p.id === activePoolId
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                            {p.currency}
                            {(p.targetAmountPaise / 100).toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      {onOpenClonePool && activePool && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsPoolDropdownOpen(false);
                            onOpenClonePool();
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 cursor-pointer"
                        >
                          <Copy className="w-4 h-4 text-slate-500" />
                          <span>Clone "{activePool.name}"</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsPoolDropdownOpen(false);
                          onOpenNewPool();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create New Pool</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          setIsPoolDropdownOpen(false);
                          await resetPoolToDemo();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-xl flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Load Farewell Gift Demo</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User Profile, Live Sync Badge & Logout Action */}
          <div className="flex items-center gap-2.5">
            {/* Realtime Live Sync status */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-emerald-600" /> Realtime Live
              </span>
            </div>

            <div className="hidden sm:block text-right">
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                {currentUser?.name || 'Organiser'}
              </span>
              <span className="text-[10px] text-slate-500 block leading-tight">
                {currentUser?.isGuest ? 'Guest Session' : currentUser?.email}
              </span>
            </div>

            <button
              id="header-logout-btn"
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to log out of your session?')) {
                  logout();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-colors cursor-pointer shadow-2xs"
              title="Log out of current account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs bar */}
        <nav className="flex items-center space-x-1 overflow-x-auto py-2 -mb-px">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  if (activePool) {
                    navigate(`/pools/${activePool.id}/${item.id}`);
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {typeof item.badge === 'number' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
