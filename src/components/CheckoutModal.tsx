'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CreditCard,
  Percent,
  Loader2,
  Gift
} from 'lucide-react';
import { Coupon } from '@/lib/types';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getDbInstance, getAuthInstance } from '@/lib/firebase';


interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: 'starter' | 'premium' | 'vip';
  planTitle: string;
  originalPrice: number;
  agencyId: string;
  agencyName?: string;
  agencyEmail?: string;
  onSuccess: (updatedPlan: string) => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  targetPlan,
  planTitle,
  originalPrice,
  agencyId,
  agencyName,
  agencyEmail,
  onSuccess
}: CheckoutModalProps) {
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
  } | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCouponCodeInput('');
      setCouponError(null);
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setIsProcessing(false);
      setStatusMessage(null);

      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const finalAmount = Math.max(0, originalPrice - discountAmount);

  // Helper to load Razorpay SDK dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!couponCodeInput.trim()) return;

    setIsValidating(true);
    setCouponError(null);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCodeInput.trim(),
          targetPlan,
          originalAmount: originalPrice
        })
      });

      const data = await res.json();

      if (data.valid) {
        setAppliedCoupon({
          code: data.coupon.code,
          discountType: data.coupon.discountType,
          discountValue: data.coupon.discountValue,
          discountAmount: data.discountAmount
        });
        setDiscountAmount(data.discountAmount);
        setCouponError(null);
      } else {
        setCouponError(data.error || 'Invalid coupon code');
        setAppliedCoupon(null);
        setDiscountAmount(0);
      }
    } catch (err: any) {
      console.error('Validation error:', err);
      setCouponError('Failed to validate coupon. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCodeInput('');
    setCouponError(null);
  };

  // Direct 0-Amount Free Assignment Flow
  const handleDirectFreeActivation = async () => {
    if (!appliedCoupon) return;
    setIsProcessing(true);
    setStatusMessage('Activating your plan with 100% coupon discount...');

    const activeAgencyId = agencyId || getAuthInstance()?.currentUser?.uid || '';

    if (!activeAgencyId) {
      alert('Agency session error. Please log in again.');
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch('/api/coupons/apply-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId: activeAgencyId,
          targetPlan,
          couponCode: appliedCoupon.code,
          originalAmount: originalPrice
        })
      });

      const data = await res.json();

      if (data.success) {
        // Also perform client-side Firestore update for instant real-time sync
        try {
          const dbInstance = getDbInstance();
          if (dbInstance) {
            let maxListings = 2;
            let initCredits = 100;
            if (targetPlan === 'starter') {
              maxListings = 10;
              initCredits = 2000;
            } else if (targetPlan === 'premium') {
              maxListings = 50;
              initCredits = 5000;
            } else if (targetPlan === 'vip') {
              maxListings = 10000;
              initCredits = 10000;
            }

            const txId = `TX-CPN-${appliedCoupon.code}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
            await updateDoc(doc(dbInstance, 'users', activeAgencyId), {
              plan: targetPlan,
              listingLimit: maxListings,
              credits: initCredits,
              creditHistory: arrayUnion({
                id: txId,
                type: 'plan-change',
                description: `Upgraded to ${targetPlan.toUpperCase()} Plan (100% Coupon: ${appliedCoupon.code})`,
                amount: targetPlan,
                amountPaid: 0,
                discountAmount: originalPrice,
                couponCode: appliedCoupon.code,
                timestamp: Date.now()
              })
            });
          }
        } catch (clientErr) {
          console.warn('Client-side Firestore sync note:', clientErr);
        }

        setStatusMessage('Success! Your plan is now activated.');
        setTimeout(() => {
          onSuccess(targetPlan);
          onClose();
        }, 1000);
      } else {
        alert(data.error || 'Failed to activate plan.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('Free activation error:', err);
      alert('Failed to connect to server. Please try again.');
      setIsProcessing(false);
    }
  };

  // Razorpay Checkout Flow for Payable Amount > 0
  const handleProceedToRazorpay = async () => {
    setIsProcessing(true);
    setStatusMessage('Preparing secure checkout...');

    const resScript = await loadRazorpayScript();
    if (!resScript) {
      alert('Razorpay SDK failed to load. Please check your internet connection.');
      setIsProcessing(false);
      return;
    }

    try {
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          targetPlan,
          isAddon: false,
          couponCode: appliedCoupon?.code || ''
        })
      });

      const orderData = await orderRes.json();
      if (orderData.error) {
        throw new Error(orderData.error);
      }

      setIsProcessing(false);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'TripDM Travel Portal',
        description: `Subscription Upgrade to ${planTitle}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          setIsProcessing(true);
          setStatusMessage('Verifying payment and updating subscription...');
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                agencyId,
                targetPlan,
                isAddon: false,
                amountPaid: orderData.amount / 100,
                couponCode: appliedCoupon?.code || '',
                discountAmount: orderData.discountAmount || discountAmount
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setStatusMessage('Payment Verified! Subscription upgraded successfully.');
              setTimeout(() => {
                onSuccess(targetPlan);
                onClose();
              }, 1200);
            } else {
              alert('Payment verified on gateway, but failed to update plan: ' + verifyData.error);
              setIsProcessing(false);
            }
          } catch (e) {
            console.error('Verification error', e);
            alert('Payment completed, but verification timed out. Please refresh your dashboard.');
            setIsProcessing(false);
          }
        },
        prefill: {
          name: agencyName || '',
          email: agencyEmail || ''
        },
        theme: {
          color: '#F97316'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        alert('Payment Failed: ' + (resp.error?.description || 'Transaction cancelled'));
        setIsProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Razorpay creation error:', err);
      alert(err.message || 'Failed to initialize payment order.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-gray-100 rounded-t-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transition-all max-h-[92vh] animate-in slide-in-from-bottom sm:slide-in-from-none duration-200">
        {/* Mobile Drag Pill */}
        <div className="sm:hidden w-full flex items-center justify-center pt-2.5 pb-0.5 shrink-0 bg-slate-900">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-500/20 border border-orange-400/30 rounded-xl sm:rounded-2xl flex items-center justify-center text-orange-400 shrink-0">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Upgrade Checkout</h3>
              <p className="text-[11px] sm:text-xs text-slate-300">Complete your agency subscription upgrade</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors border border-slate-700 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Selected Plan Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md uppercase tracking-wider border border-orange-200">
                Selected Plan
              </span>
              <h4 className="text-lg font-extrabold text-slate-900 mt-1">{planTitle}</h4>
              <p className="text-xs text-slate-500">Full annual agency features & credit allocation</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 line-through">
                {discountAmount > 0 ? `₹${originalPrice.toLocaleString('en-IN')}` : ''}
              </p>
              <p className="text-xl font-black text-slate-900">
                ₹{originalPrice.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Coupon Code Input & Applied Card */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-orange-500" /> Have a Promo / Discount Coupon?
            </label>

            {!appliedCoupon ? (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter Coupon Code (e.g. SUMMER20)"
                    disabled={isValidating || isProcessing}
                    className="w-full bg-white border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 rounded-md px-3.5 py-2.5 text-xs font-mono font-semibold uppercase text-slate-900 tracking-wider transition-all placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 shadow-xs"
                    style={{ borderRadius: '6px' }}
                  />
                  {couponCodeInput && (
                    <button
                      type="button"
                      onClick={() => setCouponCodeInput('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!couponCodeInput.trim() || isValidating || isProcessing}
                  className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold text-xs px-5 py-2.5 rounded-md transition-all duration-200 shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer hover:scale-[1.02]"
                  style={{ borderRadius: '6px' }}
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Validating...
                    </>
                  ) : (
                    'Apply'
                  )}
                </button>
              </form>
            ) : (
              /* Applied Coupon State Card */
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-md p-3.5 flex items-center justify-between shadow-xs" style={{ borderRadius: '6px' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center" style={{ borderRadius: '6px' }}>
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-emerald-900 uppercase">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-200/60 text-emerald-800 px-1.5 py-0.5 rounded" style={{ borderRadius: '4px' }}>
                        Applied
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      {appliedCoupon.discountType === 'percentage'
                        ? `${appliedCoupon.discountValue}% Discount applied!`
                        : `₹${appliedCoupon.discountValue} Discount applied!`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  disabled={isProcessing}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 hover:bg-red-50 rounded-md transition-all duration-200 cursor-pointer"
                  style={{ borderRadius: '6px' }}
                >
                  Remove
                </button>
              </div>
            )}

            {/* Error Message */}
            {couponError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-md" style={{ borderRadius: '6px' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{couponError}</span>
              </div>
            )}
          </div>

          {/* Pricing Breakdown Card */}
          <div className="border-t border-b border-slate-100 py-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Plan Base Price</span>
              <span className="font-medium">₹{originalPrice.toLocaleString('en-IN')}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span className="flex items-center gap-1">
                  <Percent className="w-3 h-3" /> Coupon Discount ({appliedCoupon?.code})
                </span>
                <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-slate-200 text-slate-900">
              <div>
                <span className="text-sm font-bold block">Total Amount Payable</span>
                <span className="text-[10px] text-slate-400">Includes all taxes and platform fees</span>
              </div>
              <div className="text-right">
                {finalAmount === 0 ? (
                  <span className="text-xl font-black text-emerald-600">FREE (₹0)</span>
                ) : (
                  <span className="text-2xl font-black text-orange-600">
                    ₹{finalAmount.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Processing Status Banner */}
          {statusMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center gap-2 text-xs font-semibold text-blue-700" style={{ borderRadius: '6px' }}>
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2">
            {finalAmount === 0 ? (
              <button
                type="button"
                onClick={handleDirectFreeActivation}
                disabled={isProcessing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-md shadow-md shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
                style={{ borderRadius: '6px' }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing Activation...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Claim &amp; Activate Plan Now (FREE)
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleProceedToRazorpay}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-md shadow-md shadow-amber-500/25 border border-amber-400/50 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
                style={{ borderRadius: '6px' }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Connecting Gateway...
                  </>
                ) : (
                  <>
                    Proceed to Pay ₹{finalAmount.toLocaleString('en-IN')} via Razorpay <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Encrypted &amp; Secure Checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
}
