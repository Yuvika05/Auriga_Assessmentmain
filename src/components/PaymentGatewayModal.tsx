import React, { useState } from 'react';
import { Pool, Participant } from '../types';
import { useAppStore } from '../store/useAppStore';
import { formatPaise, paiseToRupees, rupeesToPaise, calculateParticipantSummaries } from '../utils/settlementMath';
import {
  X,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  RotateCw,
  Lock,
  Building2,
  Wallet,
} from 'lucide-react';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  pool: Pool;
  defaultParticipantId?: string | null;
  onClose: () => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  pool,
  defaultParticipantId,
  onClose,
}) => {
  const { recordGatewayPayment } = useAppStore();

  const activeParticipants = pool.participants.filter((p) => !p.isArchived);
  const summaries = calculateParticipantSummaries(pool);

  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(
    defaultParticipantId || activeParticipants[0]?.id || ''
  );

  const currentSummary = summaries.find((s) => s.participant.id === selectedParticipantId);
  const amountOwedPaise = currentSummary && currentSummary.balancePaise < 0 ? Math.abs(currentSummary.balancePaise) : 0;

  const [amountInput, setAmountInput] = useState<string>(
    amountOwedPaise > 0 ? paiseToRupees(amountOwedPaise).toString() : '500'
  );
  const [selectedMethod, setSelectedMethod] = useState<'upi_qr' | 'razorpay_gateway' | 'bank_transfer'>('razorpay_gateway');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [simulateFailure, setSimulateFailure] = useState<boolean>(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    txId: string;
    amountPaise: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentParticipant = activeParticipants.find((p) => p.id === selectedParticipantId);

  const handlePayNow = async () => {
    if (!currentParticipant) return;
    const num = parseFloat(amountInput);
    if (isNaN(num) || num <= 0) {
      setErrorMessage('Please enter a valid amount greater than ₹0');
      return;
    }

    const amountPaise = rupeesToPaise(num);
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      if (simulateFailure) {
        await new Promise((r) => setTimeout(r, 1500));
        throw new Error('Bank authorization declined or transaction timed out (Simulated sandbox error)');
      }

      const tx = await recordGatewayPayment({
        poolId: pool.id,
        payerId: currentParticipant.id,
        payerName: currentParticipant.name,
        amountPaise,
        method: selectedMethod,
      });

      setIsProcessing(false);
      setPaymentSuccessData({
        txId: tx.id,
        amountPaise: tx.amountPaise,
      });
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err?.message || 'Payment processing failed');
    }
  };

  const handleReset = () => {
    setPaymentSuccessData(null);
    setErrorMessage(null);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header with Razorpay Sandbox Branding */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">Razorpay Secure Checkout</h3>
                <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded">
                  Sandbox
                </span>
              </div>
              <p className="text-[11px] text-slate-400">256-Bit Encrypted Real-Time Settlement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {paymentSuccessData ? (
            /* Success View */
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-100">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">Payment Successful!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Received and settled via real-time gateway webhook.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payer</span>
                  <span className="font-bold text-slate-800">{currentParticipant?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid</span>
                  <span className="font-extrabold text-emerald-700">
                    {formatPaise(paymentSuccessData.amountPaise, pool.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID</span>
                  <span className="font-mono text-[11px] text-slate-700">{paymentSuccessData.txId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-emerald-600 uppercase text-[10px]">Realtime Verified</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Done & Return to Pool
              </button>
            </div>
          ) : (
            /* Payment Form */
            <>
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Payment Failed</span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Payer Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Paying As (Participant)
                </label>
                <select
                  value={selectedParticipantId}
                  onChange={(e) => {
                    setSelectedParticipantId(e.target.value);
                    const summ = summaries.find((s) => s.participant.id === e.target.value);
                    if (summ && summ.balancePaise < 0) {
                      setAmountInput(paiseToRupees(Math.abs(summ.balancePaise)).toString());
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {activeParticipants.map((p) => {
                    const sum = summaries.find((s) => s.participant.id === p.id);
                    const owes = sum && sum.balancePaise < 0 ? Math.abs(sum.balancePaise) : 0;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} {owes > 0 ? `(Owes ${formatPaise(owes, pool.currency)})` : '(Settled)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Amount to Pay */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Amount ({pool.currency})
                  </label>
                  {amountOwedPaise > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmountInput(paiseToRupees(amountOwedPaise).toString())}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Fill Exact Due ({formatPaise(amountOwedPaise, pool.currency)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    {pool.currency}
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'razorpay_gateway' as const,
                      label: 'Cards / NetBanking',
                      icon: <CreditCard className="w-4 h-4" />,
                    },
                    {
                      id: 'upi_qr' as const,
                      label: 'Instant UPI QR',
                      icon: <QrCode className="w-4 h-4" />,
                    },
                    {
                      id: 'bank_transfer' as const,
                      label: 'NEFT / IMPS',
                      icon: <Building2 className="w-4 h-4" />,
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        selectedMethod === m.id
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="text-indigo-600 mb-2">{m.icon}</div>
                      <span className="text-[11px] font-bold block">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulated Method Info */}
              {selectedMethod === 'upi_qr' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-2">
                  <div className="w-24 h-24 bg-white border border-slate-200 rounded-xl mx-auto flex items-center justify-center p-2 shadow-2xs">
                    <QrCode className="w-20 h-20 text-slate-800" />
                  </div>
                  <p className="text-[11px] font-bold text-slate-600">Scan via Google Pay, PhonePe, or Paytm</p>
                  <p className="font-mono text-[10px] text-slate-400 break-all">
                    upi://pay?pa=splitpool@icici&pn=SplitPool&am={amountInput}&cu=INR
                  </p>
                </div>
              )}

              {/* Simulator Options Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Simulate gateway decline (sandbox testing)</span>
                </label>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>Test Mode</span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handlePayNow}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Processing Sandbox Gateway...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Pay {pool.currency}
                      {parseFloat(amountInput || '0').toLocaleString()} via Gateway
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
