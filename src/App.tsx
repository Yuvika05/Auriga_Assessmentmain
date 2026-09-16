import React, { useEffect, useState, useMemo } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from 'react-router-dom';
import { useAppStore, NavTab } from './store/useAppStore';
import { AuthScreen } from './components/AuthScreen';
import { HeaderNav } from './components/HeaderNav';
import { PoolOverviewTab } from './components/PoolOverviewTab';
import { ParticipantsTab } from './components/ParticipantsTab';
import { ContributionsTab } from './components/ContributionsTab';
import { SettleUpTab } from './components/SettleUpTab';
import { ActivityLogTab } from './components/ActivityLogTab';
import { SettingsTab } from './components/SettingsTab';
import { MyTransactionsView } from './components/MyTransactionsView';
import { ParticipantDetailModal } from './components/ParticipantDetailModal';
import { ContributionFormModal } from './components/ContributionFormModal';
import { AddParticipantModal } from './components/AddParticipantModal';
import { NewPoolModal } from './components/NewPoolModal';
import { PaymentGatewayModal } from './components/PaymentGatewayModal';
import { ReminderModal } from './components/ReminderModal';
import { ClonePoolModal } from './components/ClonePoolModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { calculateParticipantSummaries } from './utils/settlementMath';
import { Contribution, ParticipantSummary } from './types';
import { Loader2, Plus, Sparkles } from 'lucide-react';

// Protected Route: guarantees unauthenticated requests redirect to /login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, authLoading } = useAppStore();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Loading SplitPool...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route: redirects logged-in users directly to /pools
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, authLoading } = useAppStore();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/pools" replace />;
  }

  return <>{children}</>;
}

// Primary Pool Management Screen
function PoolDashboard() {
  const {
    pools,
    activePoolId,
    activeTab,
    toastMessage,
    setActiveTab,
    selectPool,
    resetPoolToDemo,
  } = useAppStore();

  const { poolId: routePoolId, tab: routeTab } = useParams<{ poolId?: string; tab?: string }>();
  const navigate = useNavigate();

  // Modals state
  const [isNewPoolOpen, setIsNewPoolOpen] = useState(false);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);
  const [selectedPayerForContrib, setSelectedPayerForContrib] = useState<string | null>(null);
  const [selectedParticipantSummary, setSelectedParticipantSummary] = useState<ParticipantSummary | null>(null);

  const [isPaymentGatewayOpen, setIsPaymentGatewayOpen] = useState(false);
  const [gatewayParticipantId, setGatewayParticipantId] = useState<string | undefined>(undefined);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [reminderParticipantId, setReminderParticipantId] = useState<string | undefined>(undefined);
  const [isClonePoolOpen, setIsClonePoolOpen] = useState(false);

  // Sync route parameters with Zustand store
  useEffect(() => {
    if (routePoolId && routePoolId !== activePoolId) {
      const exists = pools.some((p) => p.id === routePoolId);
      if (exists) {
        selectPool(routePoolId);
      }
    }
  }, [routePoolId, activePoolId, pools, selectPool]);

  useEffect(() => {
    if (routeTab) {
      const validTabs: NavTab[] = [
        'overview',
        'participants',
        'contributions',
        'settle',
        'my_transactions',
        'activity',
        'settings',
      ];
      if (validTabs.includes(routeTab as NavTab) && routeTab !== activeTab) {
        setActiveTab(routeTab as NavTab);
      }
    }
  }, [routeTab, activeTab, setActiveTab]);

  const activePool = pools.find((p) => p.id === activePoolId) || pools[0] || null;

  // Live participant calculations
  const summaries = useMemo(() => {
    if (!activePool) return [];
    return calculateParticipantSummaries(activePool);
  }, [activePool]);

  // Keep participant detail modal synchronized if pool changes
  const activeDetailSummary = useMemo(() => {
    if (!selectedParticipantSummary) return null;
    return (
      summaries.find((s) => s.participant.id === selectedParticipantSummary.participant.id) || null
    );
  }, [summaries, selectedParticipantSummary]);

  // If no pools exist yet for this user, show onboarding screen
  if (!activePool) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <HeaderNav onOpenNewPool={() => setIsNewPoolOpen(true)} />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Welcome to SplitPool</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
              Create your first pool or load the farewell gift demo to start tracking team contributions, fair shares, and debt settlements.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsNewPoolOpen(true)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-200"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Pool</span>
              </button>

              <button
                type="button"
                onClick={() => resetPoolToDemo()}
                className="w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer border border-amber-200/80"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Load Farewell Gift Demo</span>
              </button>
            </div>
          </div>
        </main>
        <NewPoolModal isOpen={isNewPoolOpen} onClose={() => setIsNewPoolOpen(false)} />
      </div>
    );
  }

  const handleTabChange = (newTab: NavTab) => {
    setActiveTab(newTab);
    navigate(`/pools/${activePool.id}/${newTab}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navbar */}
      <HeaderNav
        onOpenNewPool={() => setIsNewPoolOpen(true)}
        onOpenClonePool={() => setIsClonePoolOpen(true)}
      />

      {/* Main Content Area based on Active Tab */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && (
          <PoolOverviewTab
            pool={activePool}
            summaries={summaries}
            onOpenAddContribution={() => {
              setEditingContribution(null);
              setSelectedPayerForContrib(null);
              setIsContributionFormOpen(true);
            }}
            onOpenAddParticipant={() => setIsAddParticipantOpen(true)}
            onSelectParticipant={(s) => setSelectedParticipantSummary(s)}
            onNavigateToSettle={() => handleTabChange('settle')}
            onNavigateToParticipants={() => handleTabChange('participants')}
            onOpenGatewayModal={(pId) => {
              setGatewayParticipantId(pId);
              setIsPaymentGatewayOpen(true);
            }}
            onOpenReminderModal={(pId) => {
              setReminderParticipantId(pId);
              setIsReminderOpen(true);
            }}
            onOpenClonePool={() => setIsClonePoolOpen(true)}
          />
        )}

        {activeTab === 'participants' && (
          <ParticipantsTab
            pool={activePool}
            summaries={summaries}
            onSelectParticipant={(s) => setSelectedParticipantSummary(s)}
            onOpenAddMember={() => setIsAddParticipantOpen(true)}
            onOpenAddContributionForMember={(memberId) => {
              setEditingContribution(null);
              setSelectedPayerForContrib(memberId);
              setIsContributionFormOpen(true);
            }}
          />
        )}

        {activeTab === 'contributions' && (
          <ContributionsTab
            pool={activePool}
            onOpenAddContribution={() => {
              setEditingContribution(null);
              setSelectedPayerForContrib(null);
              setIsContributionFormOpen(true);
            }}
            onEditContribution={(contrib) => {
              setEditingContribution(contrib);
              setSelectedPayerForContrib(contrib.payerId);
              setIsContributionFormOpen(true);
            }}
          />
        )}

        {activeTab === 'settle' && (
          <SettleUpTab
            pool={activePool}
            summaries={summaries}
            onOpenGatewayModal={(pId) => {
              setGatewayParticipantId(pId);
              setIsPaymentGatewayOpen(true);
            }}
            onOpenReminderModal={(pId) => {
              setReminderParticipantId(pId);
              setIsReminderOpen(true);
            }}
          />
        )}

        {activeTab === 'my_transactions' && (
          <MyTransactionsView
            pool={activePool}
            onOpenGatewayForBalance={(participantId) => {
              setGatewayParticipantId(participantId);
              setIsPaymentGatewayOpen(true);
            }}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityLogTab pool={activePool} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            pool={activePool}
            onOpenNewPool={() => setIsNewPoolOpen(true)}
          />
        )}
      </main>

      {/* Interactive Global Modals */}
      <NewPoolModal
        isOpen={isNewPoolOpen}
        onClose={() => setIsNewPoolOpen(false)}
      />

      <AddParticipantModal
        isOpen={isAddParticipantOpen}
        onClose={() => setIsAddParticipantOpen(false)}
      />

      <ContributionFormModal
        isOpen={isContributionFormOpen}
        pool={activePool}
        initialContribution={editingContribution}
        defaultPayerId={selectedPayerForContrib}
        onClose={() => {
          setIsContributionFormOpen(false);
          setEditingContribution(null);
          setSelectedPayerForContrib(null);
        }}
      />

      <ParticipantDetailModal
        summary={activeDetailSummary}
        pool={activePool}
        onClose={() => setSelectedParticipantSummary(null)}
        onOpenAddContributionForMember={(memberId) => {
          setSelectedParticipantSummary(null);
          setEditingContribution(null);
          setSelectedPayerForContrib(memberId);
          setIsContributionFormOpen(true);
        }}
      />

      <PaymentGatewayModal
        isOpen={isPaymentGatewayOpen}
        pool={activePool}
        defaultParticipantId={gatewayParticipantId}
        onClose={() => {
          setIsPaymentGatewayOpen(false);
          setGatewayParticipantId(undefined);
        }}
      />

      <ReminderModal
        isOpen={isReminderOpen}
        pool={activePool}
        defaultParticipantId={reminderParticipantId}
        onClose={() => {
          setIsReminderOpen(false);
          setReminderParticipantId(undefined);
        }}
      />

      <ClonePoolModal
        isOpen={isClonePoolOpen}
        pool={activePool}
        onClose={() => setIsClonePoolOpen(false)}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 animate-in slide-in-from-bottom-2 duration-150">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { init } = useAppStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthScreen initialMode="login" />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <AuthScreen initialMode="signup" />
              </PublicRoute>
            }
          />
          <Route
            path="/pools"
            element={
              <ProtectedRoute>
                <PoolDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pools/:poolId"
            element={
              <ProtectedRoute>
                <PoolDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pools/:poolId/:tab"
            element={
              <ProtectedRoute>
                <PoolDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/pools" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
