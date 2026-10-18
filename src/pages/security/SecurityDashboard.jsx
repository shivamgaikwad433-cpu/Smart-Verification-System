import React, { useState } from 'react';
import { securityApi } from '../../api/securityApi';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import FaceCapture from '../../../FaceCapture.jsx';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Camera,
  RotateCcw,
  CheckCircle2,
  XCircle,
  UserCheck,
  Sparkles,
} from 'lucide-react';

export const SecurityDashboard = () => {
  const [prnInput, setPrnInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [facePhoto, setFacePhoto] = useState(null);
  const { showToast } = useToast();

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!prnInput.trim()) {
      showToast('Please enter or scan a Student PRN', 'error');
      return;
    }
    if (!facePhoto) {
      showToast('Capture a live face photo before verifying gate access', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await securityApi.verifyStudent(prnInput, facePhoto);
      const normalized = {
        verified: Boolean(result.success && result.student),
        message: result.message,
        student: result.student,
      };
      setVerificationResult(normalized);
      if (normalized.verified) {
        if (normalized.student?.gateStatus === 'Denied') {
          showToast('Alert: Access denied for this ID', 'error');
        } else {
          showToast('Student identity verified', 'success');
        }
      } else {
        showToast(result.message || 'ID not found in active database', 'error');
      }
    } catch {
      showToast('Gate verification service unreachable', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrn = (prn) => {
    setPrnInput(prn);
  };

  const handleReset = () => {
    setPrnInput('');
    setFacePhoto(null);
    setVerificationResult(null);
  };

  const student = verificationResult?.student;
  const isAllowed = student?.gateStatus === 'Allowed';

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8 space-y-6">
      {/* Terminal Title */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Gate Security Verification Terminal</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Campus Access Scanner
        </h2>
        <p className="text-xs text-slate-500">
          Single-purpose verification: Displays only student identity, photo, and access clearance.
        </p>
      </div>

      {/* Input / Scanner Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Scan or Enter Student PRN / ID
            </label>
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={prnInput}
                onChange={(e) => setPrnInput(e.target.value)}
                placeholder="e.g. PRN202401088"
                className="w-full pl-11 pr-4 py-3 text-base sm:text-lg font-mono font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-colors uppercase tracking-wider"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full sm:flex-1 py-3 text-sm font-semibold"
              icon={UserCheck}
            >
              Verify Student Access
            </Button>

            {verificationResult && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={handleReset}
                className="w-full sm:w-auto"
                icon={RotateCcw}
              >
                Scan Next ID
              </Button>
            )}
          </div>
          <FaceCapture
            title="Live gate face scan"
            instruction="A face match is required to grant access"
            disabled={loading}
            onCapture={({ blob }) => setFacePhoto(blob)}
            onRetake={() => setFacePhoto(null)}
          />
        </form>

      </div>

      {/* Verification Result Card - STRICT: NAME + PHOTO + STATUS ONLY */}
      {verificationResult && (
        <div
          className={`bg-white rounded-2xl border-2 p-6 sm:p-8 shadow-sm transition-all duration-200 animate-in fade-in zoom-in-98 ${
            verificationResult.verified && isAllowed
              ? 'border-emerald-500 bg-emerald-50/10'
              : 'border-rose-500 bg-rose-50/10'
          }`}
        >
          {verificationResult.verified && student ? (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              {/* Photo */}
              <div className="relative shrink-0">
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl object-cover border-4 border-white shadow-md"
                />
                <div
                  className={`absolute -bottom-2 -right-2 p-1.5 rounded-full text-white shadow-sm ${
                    isAllowed ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  {isAllowed ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* Strict limited fields: Name, Photo, Status */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Student Name
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                    {student.name}
                  </h3>
                  <div className="text-xs font-mono text-slate-500 mt-1">
                    PRN: {student.prn}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Clearance Status
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span
                      className={`text-sm sm:text-base font-bold px-3.5 py-1.5 rounded-xl uppercase tracking-wider inline-flex items-center gap-1.5 ${
                        isAllowed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {isAllowed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ACCESS GRANTED (ACTIVE)</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4" />
                          <span>ACCESS DENIED</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {student.notes && (
                  <div className="p-2.5 rounded-lg bg-slate-100/70 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Notice:</span>{' '}
                    {student.notes}
                  </div>
                )}
                {verificationResult.message && (
                  <p role="status" className="text-xs text-slate-600">{verificationResult.message}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-3">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Student Not Found
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No active registration record found for PRN &quot;{prnInput}&quot;. Please verify the input.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
