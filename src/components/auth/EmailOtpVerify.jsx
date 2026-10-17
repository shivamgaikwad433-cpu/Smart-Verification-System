import React, { useEffect, useState } from 'react';
import { authApi } from '../../api/authApi';

export function EmailOtpVerify({ email, onVerified }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [hasSent, setHasSent] = useState(false);

  useEffect(() => {
    onVerified(null);
    setCode('');
    setStatus('idle');
    setMessage('');
    setHasSent(false);
  }, [email, onVerified]);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const sendCode = async (resend = false) => {
    try {
      const result = await (resend ? authApi.resendEmailOtp(email) : authApi.sendEmailOtp(email));
      setStatus('sent');
      setHasSent(true);
      setMessage(result.devOtp ? `Development OTP: ${result.devOtp}` : 'Verification code sent. Check your inbox and spam folder.');
      setCooldown(Number(result.resendInSeconds) || 30);
    } catch (error) {
      setStatus('error');
      if (error.status === 429) {
        const retryAfter = Number(error.original?.response?.headers?.['retry-after']) || 30;
        setCooldown(retryAfter);
      }
      setMessage(error.message || 'Could not send code. Check the backend email configuration.');
    }
  };

  const verifyCode = async () => {
    try {
      const result = await authApi.verifyEmailOtp(email, code);
      onVerified(result.emailVerifyToken);
      setStatus('verified');
      setMessage('Email verified.');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Invalid or expired code.');
      onVerified(null);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" inputMode="numeric" disabled={status === 'verified'} className="min-w-0 flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg" />
        <button type="button" onClick={() => sendCode(hasSent)} disabled={!email || cooldown > 0 || status === 'verified'} className="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white disabled:opacity-50">{cooldown > 0 ? `Resend ${cooldown}s` : hasSent ? 'Resend code' : 'Send code'}</button>
        <button type="button" onClick={verifyCode} disabled={code.length !== 6 || status === 'verified'} className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white disabled:opacity-50">Verify</button>
      </div>
      {message && <p className={`text-xs ${status === 'verified' ? 'text-emerald-700' : status === 'error' ? 'text-red-600' : 'text-slate-500'}`}>{message}</p>}
    </div>
  );
}
