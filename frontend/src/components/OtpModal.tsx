import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Shield, Smartphone, Loader2, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { sendOtp, verifyOtp } from '../services/authService';
import toast from 'react-hot-toast';

interface OtpModalProps {
  phone?: string;
  email?: string;
  title?: string;
  subtitle?: string;
  onVerified: (otp: string) => void;
  onClose: () => void;
  sendCodeOverride?: () => Promise<{ ok: boolean; error?: string }>;
  verifyCodeOverride?: (otp: string) => Promise<{ ok: boolean; error?: string }>;
}

const RESEND_COOLDOWN = 60; // seconds

const OtpModal: React.FC<OtpModalProps> = ({
  phone,
  email,
  title = 'Verify Your Phone',
  subtitle,
  onVerified,
  onClose,
  sendCodeOverride,
  verifyCodeOverride,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));
  // Guard to prevent double-send in React StrictMode (double-invoke of useEffect)
  const hasSentRef = useRef(false);

  // ── Send OTP on mount ────────────────────────────────────────────────────────
  const doSendOtp = useCallback(async () => {
    setSending(true);
    const result = sendCodeOverride ? await sendCodeOverride() : await sendOtp(phone || '');
    setSending(false);
    if (!result.ok) {
      toast.error(result.error || 'Failed to send verification code.');
      return;
    }
    setOtpSent(true);
    setCountdown(RESEND_COOLDOWN);
    toast.success(email ? `Verification code sent to ${email}` : `OTP sent to ${phone}`);
  }, [phone, email, sendCodeOverride]);

  useEffect(() => {
    // Only send OTP once per mount. The hasSentRef guard prevents the double-call
    // that React StrictMode triggers in development (mount → unmount → remount).
    if (hasSentRef.current) return;
    hasSentRef.current = true;
    doSendOtp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Countdown timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!otpSent) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpSent, countdown]);

  // ── Auto-focus first digit ───────────────────────────────────────────────────
  useEffect(() => {
    if (otpSent) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [otpSent]);

  // ── Input handlers ───────────────────────────────────────────────────────────
  const handleChange = (idx: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const next = [...digits];
        next[idx] = '';
        setDigits(next);
      } else if (idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = Array(6).fill('');
    paste.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    const focusIdx = Math.min(paste.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  // ── Verify ───────────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    const otp = digits.join('');
    if (otp.length < 6) {
      toast.error('Please enter all 6 digits.');
      return;
    }
    setVerifying(true);
    const result = verifyCodeOverride ? await verifyCodeOverride(otp) : await verifyOtp(phone || '', otp);
    setVerifying(false);
    if (!result.ok) {
      toast.error(result.error || 'Invalid code. Please try again.');
      setDigits(Array(6).fill(''));
      inputRefs.current[0]?.focus();
      return;
    }
    setVerified(true);
    toast.success(email ? 'Email verified!' : 'Phone verified!');
    setTimeout(() => onVerified(otp), 800);
  };

  const otp = digits.join('');
  const isComplete = otp.length === 6;

  // ── Backdrop click ───────────────────────────────────────────────────────────
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(230,57,70,0.4); } 50% { box-shadow: 0 0 0 8px rgba(230,57,70,0); } }
        @keyframes checkPop { 0% { transform: scale(0.5); opacity: 0; } 80% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        .otp-digit:focus { outline: none; border-color: var(--color-primary) !important; box-shadow: 0 0 0 3px rgba(230,57,70,0.15) !important; }
        .otp-digit:not(:placeholder-shown) { background: var(--color-primary-light) !important; color: var(--color-primary) !important; font-weight: 800 !important; }
        .verify-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(230,57,70,0.35) !important; }
        .verify-btn { transition: all 0.2s; }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '24px',
          padding: '36px 32px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.04)',
          animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'var(--color-gray-100)', border: 'none', borderRadius: '50%',
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--color-gray-500)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-gray-200)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-gray-100)'; }}
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--color-primary-light), rgba(230,57,70,0.08))',
            border: '1px solid rgba(230,57,70,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            animation: verified ? 'none' : 'pulse 2s infinite',
          }}>
            {verified
              ? <CheckCircle2 size={28} color="#16a34a" style={{ animation: 'checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1)' }} />
              : <Smartphone size={28} color="var(--color-primary)" />
            }
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-gray-900)', marginBottom: '6px' }}>
            {verified ? (email ? 'Email Verified!' : 'Phone Verified!') : title}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', lineHeight: 1.6 }}>
            {verified
              ? (email ? 'Your email address has been verified successfully.' : 'Your phone number has been verified successfully.')
              : (subtitle || (
                <>
                  We sent a 6-digit code to<br />
                  <strong style={{ color: 'var(--color-gray-800)', fontWeight: 700 }}>{email || phone}</strong>
                </>
              ))
            }
          </p>
        </div>

        {!verified && (
          <>
            {/* Loading state while sending */}
            {sending && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-primary)' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginTop: '12px' }}>Sending OTP…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* OTP Input Digits */}
            {otpSent && (
              <>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '24px' }} onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      className="otp-digit"
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      style={{
                        width: '48px',
                        height: '56px',
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        border: `2px solid ${d ? 'rgba(230,57,70,0.3)' : 'var(--color-gray-200)'}`,
                        borderRadius: '14px',
                        background: d ? 'var(--color-primary-light)' : '#fafafa',
                        color: d ? 'var(--color-primary)' : 'var(--color-gray-900)',
                        cursor: 'text',
                        transition: 'all 0.15s',
                      }}
                      placeholder="·"
                    />
                  ))}
                </div>

                {/* Verify Button */}
                <button
                  className="verify-btn"
                  onClick={handleVerify}
                  disabled={!isComplete || verifying}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: isComplete && !verifying
                      ? 'linear-gradient(135deg, #e63946, #c1121f)'
                      : 'var(--color-gray-200)',
                    color: isComplete && !verifying ? '#fff' : 'var(--color-gray-400)',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '0.9375rem',
                    fontWeight: 800,
                    cursor: isComplete && !verifying ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  {verifying
                    ? <><Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} /> Verifying…</>
                    : <><Shield size={17} /> Verify {email ? 'Email Address' : 'Phone Number'}</>
                  }
                </button>

                {/* Resend & security note */}
                <div style={{ textAlign: 'center' }}>
                  {countdown > 0 ? (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)' }}>
                      Resend code in <strong style={{ color: 'var(--color-gray-600)' }}>{countdown}s</strong>
                    </p>
                  ) : (
                    <button
                      onClick={doSendOtp}
                      disabled={sending}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)',
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        textDecoration: 'underline', textUnderlineOffset: '3px',
                      }}
                    >
                      <RefreshCw size={13} />
                      Resend OTP
                    </button>
                  )}
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: '10px' }}>
                    🔒 Code expires in 5 minutes. Never share it with anyone.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OtpModal;
