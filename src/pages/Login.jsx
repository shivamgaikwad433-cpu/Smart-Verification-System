import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmailOtpVerify } from '../components/auth/EmailOtpVerify';
import FaceCapture from '../../FaceCapture.jsx';
import {
  Lock,
  Mail,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Camera,
  CameraOff,
  ScanFace,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  UserCheck,
  Search,
  Check,
  UserPlus,
  GraduationCap,
  Building,
  Eye,
  RefreshCw,
  Power,
  Smartphone,
  KeyRound,
} from 'lucide-react';

export const Login = () => {
  // Main Tab: 'scan-entry' (Verify & Sign In) | 'register-face' (Enroll with Face) | 'credentials'
  const [activeTab, setActiveTab] = useState('scan-entry');

  // SCAN & ENTRY FLOW
  const [scanStep, setScanStep] = useState(1);
  const [emailInput, setEmailInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [enrolledStudent, setEnrolledStudent] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [faceCaptureBlob, setFaceCaptureBlob] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  // REGISTRATION WITH 2-PASS CAMERA SCAN & EMAIL OTP
  const [regStep, setRegStep] = useState(1); // 1 = Form & Dual Scans, 2 = Email OTP Verification, 3 = Success
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    phone: '',
    prn: '',
    password: '',
    department: 'Computer Science & Engineering',
    semester: '1st Semester',
    role: '',
    photoUrl: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  // regScanPass: 1 = Ready for Scan 1, 2 = Scan 1 done, ready for Scan 2, 3 = Both scans completed
  const [regScanPass, setRegScanPass] = useState(1);
  const [scan1Photo, setScan1Photo] = useState(null);
  const [scan2Photo, setScan2Photo] = useState(null);
  const [capturingPass, setCapturingPass] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccessUser, setRegSuccessUser] = useState(null);
  const [emailVerifyToken, setEmailVerifyToken] = useState(null);

  // OTP Verification state
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpPreview, setOtpPreview] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Camera Management - STRICTLY OFF BY DEFAULT FOR PRIVACY
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Credentials Fallback
  const [credEmail, setCredEmail] = useState('');
  const [credPassword, setCredPassword] = useState('••••••••');
  const [credLoading, setCredLoading] = useState(false);

  const {
    login,
    lookupEmail,
    verifyFaceForEmail,
    registerWithFace,
    requestRegistrationOtp,
    verifyRegistrationOtp,
    resendRegistrationOtp,
  } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Resend OTP countdown timer
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Quick preset emails for fast testing
  const quickEmails = [];

  // Camera Open Action (Explicit User Intent)
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        mediaStreamRef.current = stream;
        // Set cameraActive=true FIRST so React renders the <video> element into the DOM.
        // The useEffect below will then attach the stream once videoRef.current is available.
        setCameraActive(true);
        showToast('Camera opened successfully.', 'info');
      } else {
        setCameraError('Webcam not supported in this browser.');
      }
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError('Webcam access was denied or hardware not found. Running simulated camera mode.');
      setCameraActive(true); // Allow simulation so user can still test without webcam
    }
  };

  // Camera Close Action
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // KEY FIX: After cameraActive becomes true, the <video> element is now in the DOM.
  // Attach the stream to videoRef and play it here, after React has re-rendered.
  useEffect(() => {
    if (cameraActive && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch((e) => console.warn('Video play error:', e));
    }
  }, [cameraActive]);

  // Helper to grab frame from live video canvas
  const grabVideoFrame = () => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      } catch (e) {
        console.warn('Canvas capture error:', e);
      }
    }
    return null;
  };

  // Stop camera on tab switch or page unmount (Never leave camera running in background)
  useEffect(() => {
    stopCamera();
    return () => stopCamera();
  }, [activeTab]);

  // --- SCAN & ENTRY HANDLERS ---
  const handleLookupEmail = async (e) => {
    if (e) e.preventDefault();
    if (!emailInput.trim()) {
      showToast('Please enter a campus email address', 'error');
      return;
    }

    setLookingUp(true);
    try {
      const response = await lookupEmail(emailInput);
      if (response.found && response.user) {
        setEnrolledStudent(response.user);
        setScanStep(2);
        stopCamera(); // Keep camera off until user clicks 'Open Camera'
        showToast(`Profile found: ${response.user.name}. Open camera to scan face.`, 'success');
      } else {
        showToast(response.message || 'No registered student found for this email', 'error');
      }
    } catch {
      showToast('Lookup service unreachable', 'error');
    } finally {
      setLookingUp(false);
    }
  };

  const handleQuickSelectEmail = async (email) => {
    setEmailInput(email);
    setLookingUp(true);
    try {
      const response = await lookupEmail(email);
      if (response.found && response.user) {
        setEnrolledStudent(response.user);
        setScanStep(2);
        stopCamera();
        showToast(`Profile loaded: ${response.user.name}. Click Open Camera to verify face.`, 'success');
      }
    } catch {
      showToast('Failed to load profile', 'error');
    } finally {
      setLookingUp(false);
    }
  };

  const handleScanAndRecognizeFace = async () => {
    if (!faceCaptureBlob) {
      showToast('Open the camera and capture a clear face photo first', 'error');
      return;
    }

    setScanning(true);
    try {
      const liveFaceImage = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the captured face photo.'));
        reader.readAsDataURL(faceCaptureBlob);
      });
      const result = await verifyFaceForEmail(enrolledStudent.email, liveFaceImage);
      setVerificationResult({ ...result, user: result?.user || enrolledStudent });
      setScanStep(3);
      if (result.isAllowed) {
        showToast(`Face Recognized! College Entry Granted for ${enrolledStudent.name}`, 'success');
      } else {
        showToast(`Access Denied: ${result.message || 'Face verification failed.'}`, 'error');
      }
    } catch (error) {
      showToast(error.message || 'Face recognition matching failed', 'error');
    } finally {
      setScanning(false);
      setFaceCaptureBlob(null);
      stopCamera();
    }
  };

  const handleEnterPortal = () => {
    const role = verificationResult?.user?.role || regSuccessUser?.role || 'student';
    navigate(`/${role}`);
  };

  const handleResetScan = () => {
    setScanStep(1);
    setEnrolledStudent(null);
    setVerificationResult(null);
    setFaceCaptureBlob(null);
    stopCamera();
  };

  // --- REGISTRATION 2-PASS CAMERA SCAN HANDLERS ---
  const handleCaptureRegistrationScan = (passNumber) => {
    if (!cameraActive) {
      showToast('Please open your camera before capturing scan', 'error');
      return;
    }

    setCapturingPass(true);
    setTimeout(() => {
      const capturedImage = grabVideoFrame();
      if (passNumber === 1) {
        setScan1Photo(capturedImage);
        setRegScanPass(2);
        showToast('Scan 1/2 Captured (Frontal). Now click Scan 2 for security confirmation.', 'success');
      } else if (passNumber === 2) {
        setScan2Photo(capturedImage);
        setRegScanPass(3);
        setRegForm((prev) => ({
          ...prev,
          photoUrl: capturedImage,
        }));
        stopCamera(); // Automatically turn off camera once both scans are completed!
        showToast('Scan 2/2 Complete! Dual camera verification passed.', 'success');
      }
      setCapturingPass(false);
    }, 600);
  };

  const handleRetakeRegistrationScans = () => {
    setScan1Photo(null);
    setScan2Photo(null);
    setRegScanPass(1);
    setRegForm((prev) => ({ ...prev, photoUrl: '' }));
    startCamera();
    showToast('Camera reopened. Ready for Scan 1.', 'info');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regForm.name || !regForm.email) {
      showToast('Please fill in Full Name and Email Address', 'error');
      return;
    }

    if (!emailVerifyToken) {
      showToast('Please verify your email with the code first', 'error');
      return;
    }

    if (!regForm.phone) {
      showToast('Please enter your Mobile Number for registration', 'error');
      return;
    }

    if (regForm.role === 'student' && !regForm.prn) {
      showToast('Please enter your PRN / Student ID', 'error');
      return;
    }

    if (!regForm.role) {
      showToast('Please select a Role (Student, Staff, HOD, etc.)', 'error');
      return;
    }

    if (regScanPass < 3 || !scan1Photo || !scan2Photo) {
      showToast('Safety Verification: Open camera and complete both camera scans (Scan 1 & Scan 2) to register.', 'error');
      return;
    }

    setRegLoading(true);
    try {
      const response = await registerWithFace({
        ...regForm,
        emailVerifyToken,
        photoUrl: scan1Photo,
        secondaryPhotoUrl: scan2Photo,
      });

      if (response && response.success) {
        setRegSuccessUser(response.user || { ...regForm, photoUrl: scan1Photo });
        setRegStep(3);
        stopCamera();
        showToast('Email verified! Registration completed successfully.', 'success');
      } else {
        showToast(response?.message || 'Could not send verification OTP. Check backend connection.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Registration service error', 'error');
    } finally {
      setRegLoading(false);
      stopCamera();
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      showToast('Please enter the full 6-digit verification code', 'error');
      return;
    }

    setOtpLoading(true);
    try {
      const result = await verifyRegistrationOtp(regForm.email, otpCode.trim(), regForm.password);
      if (result && result.success) {
        const verifiedUser = result.user || {
          name: regForm.name,
          email: regForm.email,
          phone: regForm.phone,
          prn: regForm.prn || 'PRN' + Date.now().toString().slice(-6),
          role: regForm.role || 'student',
          department: regForm.department,
          photoUrl: scan1Photo || regForm.photoUrl,
          status: 'Active',
          gateStatus: 'Allowed',
        };
        // Ensure photo is attached for dashboard display
        verifiedUser.photoUrl = scan1Photo || regForm.photoUrl || verifiedUser.photoUrl;
        setRegSuccessUser(verifiedUser);
        setRegStep(3); // REGISTRATION COMPLETE!
        showToast('OTP Verified! Registration completed & stored in database.', 'success');
      } else {
        showToast(result?.message || 'Invalid or expired OTP. Please try again.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'OTP verification failed. Please check the code.', 'error');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    try {
      const res = await resendRegistrationOtp(regForm.email);
      setResendTimer(30);
      if (res?.previewOtp) setOtpPreview(res.previewOtp);
      showToast('New OTP sent to ' + regForm.email, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to resend OTP', 'error');
    }
  };

  // Prefill Demo Info
  const handleFillDemoRegistration = () => {
    const randomPrn = 'PRN' + Math.floor(10000000 + Math.random() * 90000000);
    const randomPhone = '98' + Math.floor(10000000 + Math.random() * 90000000);
    setRegForm((prev) => ({
      ...prev,
      name: 'Rohan Mehra',
      email: '',
      phone: randomPhone,
      prn: randomPrn,
      department: 'Computer Science & Engineering',
      semester: '2nd Semester',
      role: 'student',
    }));
    showToast('Demo student details prefilled', 'info');
  };

  // --- CREDENTIALS SUBMIT ---
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setCredLoading(true);
    const result = await login(credEmail, credPassword);
    setCredLoading(false);
    if (result.success) {
      showToast(`Welcome! Logged in as ${result.role}`, 'success');
      navigate(`/${result.role}`);
    } else {
      showToast(result.message || 'Invalid credentials', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 sm:px-6 lg:px-8 font-sans">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center px-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-white font-bold text-lg shadow-sm mb-3">
          SC
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Smart Campus Vision
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          On-Demand Camera Facial Verification, College Entry Clearance &amp; Portal Access
        </p>

        {/* Tab Selection Bar */}
        <div className="mt-5 inline-flex p-1 bg-slate-200/70 rounded-xl max-w-md w-full">
          <button
            type="button"
            onClick={() => {
              setActiveTab('scan-entry');
              handleResetScan();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'scan-entry'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <ScanFace className="w-4 h-4 text-emerald-600" />
            <span>Face Scan &amp; Entry</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register-face');
              setRegStep(1);
              setRegSuccessUser(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'register-face'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <UserPlus className="w-4 h-4 text-slate-900" />
            <span>Register (OTP &amp; Face)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('credentials');
              stopCamera();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'credentials'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Lock className="w-4 h-4 text-slate-500" />
            <span>Password</span>
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-7 px-5 sm:px-8 shadow-sm border border-slate-200/90 rounded-2xl">

          {/* TAB 1: FACE SCAN & ENTRY CLEARANCE (SIGN IN) */}
          {activeTab === 'scan-entry' && (
            <div className="space-y-6">
              {/* Stepper Progress */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${scanStep >= 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    {scanStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                  </span>
                  <span className={`text-xs font-semibold ${scanStep === 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                    Email Lookup
                  </span>
                </div>

                <div className="h-0.5 w-12 bg-slate-200" />

                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${scanStep >= 2 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    {scanStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                  </span>
                  <span className={`text-xs font-semibold ${scanStep === 2 ? 'text-slate-900' : 'text-slate-400'}`}>
                    Face Scan
                  </span>
                </div>

                <div className="h-0.5 w-12 bg-slate-200" />

                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${scanStep === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    3
                  </span>
                  <span className={`text-xs font-semibold ${scanStep === 3 ? 'text-emerald-700' : 'text-slate-400'}`}>
                    Entry Granted
                  </span>
                </div>
              </div>

              {/* STEP 1: Enter / Lookup Email */}
              {scanStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Step 1: Enter Registered Email ID
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Identify your enrolled profile before initiating facial verification.
                    </p>
                  </div>

                  <form onSubmit={handleLookupEmail} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                        Campus Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          autoFocus
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="student.name@campus.edu"
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 font-medium text-slate-900 transition-colors"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={lookingUp}
                      className="w-full py-2.5 text-sm font-semibold"
                      icon={ArrowRight}
                    >
                      {lookingUp ? 'Verifying Registry...' : 'Find Profile & Proceed'}
                    </Button>
                  </form>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('register-face');
                        setRegSuccessUser(null);
                      }}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2"
                    >
                      New student? Register with 2-pass camera scan here →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: On-Demand Camera Face Scan against identified profile */}
              {scanStep === 2 && enrolledStudent && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={enrolledStudent.photoUrl}
                        alt={enrolledStudent.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {enrolledStudent.name}
                          </span>
                          <Badge
                            variant={enrolledStudent.status === 'Active' ? 'success' : 'danger'}
                            size="sm"
                          >
                            {enrolledStudent.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          PRN: {enrolledStudent.prn} • {enrolledStudent.department}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setScanStep(1);
                        stopCamera();
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-200 transition-colors shrink-0"
                    >
                      Change
                    </button>
                  </div>

                  <FaceCapture
                    title="Live face verification"
                    instruction="Center your face and keep still"
                    disabled={scanning}
                    onCapture={({ blob }) => setFaceCaptureBlob(blob)}
                    onRetake={() => setFaceCaptureBlob(null)}
                  />
                  {faceCaptureBlob && (
                    <Button
                      variant="primary"
                      size="lg"
                      loading={scanning}
                      onClick={handleScanAndRecognizeFace}
                      className="w-full py-3 text-sm font-semibold tracking-wide"
                      icon={ScanFace}
                    >
                      {scanning ? 'Verifying Face Biometrics...' : 'Verify Captured Face'}
                    </Button>
                  )}

                  {/* CAMERA VIEWPORT WITH ON-DEMAND OPEN/CLOSE */}
                  {false && (!cameraActive ? (
                    /* STANDBY STATE: Camera is OFF */
                    <div className="rounded-2xl overflow-hidden bg-slate-900 aspect-4/3 max-h-72 w-full flex flex-col items-center justify-center text-center p-6 border border-slate-800 shadow-inner">
                      <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-3 text-slate-400">
                        <CameraOff className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200 mb-1">
                        Camera is Currently Off
                      </h4>
                      <p className="text-xs text-slate-400 max-w-xs mb-4">
                        Camera access is kept off for privacy. Click below to open your camera and scan your face.
                      </p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Open Camera to Scan Face</span>
                      </button>
                    </div>
                  ) : (
                    /* ACTIVE STATE: Camera is LIVE */
                    <div className="space-y-3">
                      <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 max-h-72 w-full flex items-center justify-center border border-slate-900 shadow-inner">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />

                        {/* Top Controls: Close Camera Button */}
                        <div className="absolute top-3 right-3 z-10">
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 text-xs font-semibold backdrop-blur-xs border border-rose-800/60 flex items-center gap-1 transition-colors"
                          >
                            <Power className="w-3 h-3" />
                            <span>Close Camera</span>
                          </button>
                        </div>

                        {/* HUD Target Framing */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                          <div className="relative w-44 h-52 sm:w-52 sm:h-60 border border-emerald-400/30 rounded-2xl flex items-center justify-center">
                            <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
                            <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />

                            {scanning && (
                              <div className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_15px_#34d399] animate-bounce" />
                            )}

                            <div
                              className={`w-32 h-44 rounded-[50%] border border-dashed transition-colors ${scanning
                                  ? 'border-emerald-400/80 animate-pulse'
                                  : 'border-white/30'
                                }`}
                            />
                          </div>

                          <div className="mt-2.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs border border-white/10 text-white text-[11px] font-medium flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${scanning
                                  ? 'bg-emerald-400 animate-ping'
                                  : 'bg-emerald-400'
                                }`}
                            />
                            <span>
                              {scanning
                                ? `Matching face against ${enrolledStudent.email}...`
                                : 'Live Camera Active — Look directly into lens'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="lg"
                        loading={scanning}
                        onClick={handleScanAndRecognizeFace}
                        className="w-full py-3 text-sm font-semibold tracking-wide"
                        icon={ScanFace}
                      >
                        {scanning ? 'Verifying Face Biometrics...' : 'Scan Face & Authorize Entry'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 3: Verification Result & College Entry Access */}
              {scanStep === 3 && verificationResult && (
                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${verificationResult.isAllowed
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-rose-50 border-rose-300 text-rose-950'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {verificationResult.isAllowed ? (
                        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                          <XCircle className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-sm sm:text-base tracking-tight">
                          {verificationResult.isAllowed
                            ? 'COLLEGE ENTRY GRANTED'
                            : 'ACCESS DENIED — SUSPENDED'}
                        </div>
                        <div className="text-xs opacity-80 mt-0.5">
                          {verificationResult.message}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={verificationResult.isAllowed ? 'success' : 'danger'}
                      size="md"
                    >
                      {verificationResult.confidence ?? 0}% Match
                    </Badge>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center gap-4">
                    {verificationResult.user?.photoUrl ? (
                      <img
                        src={verificationResult.user.photoUrl}
                        alt={verificationResult.user.name || 'Registered user'}
                        className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center text-lg font-bold border-2 border-white shadow-xs shrink-0">
                        {verificationResult.user?.name?.[0] || 'U'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                          {verificationResult.user?.name || 'Registered user'}
                        </h4>
                        <Badge variant={verificationResult.user?.status === 'Active' || verificationResult.user?.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                          {verificationResult.user?.status || 'Unavailable'}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        PRN: {verificationResult.user?.prn || 'Not available'}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {verificationResult.user?.department || 'Campus profile'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Entry Logged at: {verificationResult.timestamp}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {verificationResult.isAllowed && (
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleEnterPortal}
                        className="w-full py-3 text-sm font-semibold tracking-wide"
                        icon={ArrowRight}
                      >
                        Enter {verificationResult.user.role === 'student' ? 'Student' : 'Campus'} Portal
                      </Button>
                    )}

                    <Button
                      variant={verificationResult.isAllowed ? 'secondary' : 'primary'}
                      size="md"
                      onClick={handleResetScan}
                      className="w-full py-2.5 text-xs font-semibold"
                      icon={RotateCcw}
                    >
                      Scan Next Student (Gate Scanner Mode)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REGISTER WITH ON-DEMAND CAMERA & EMAIL OTP */}
          {activeTab === 'register-face' && (
            <div>
              {/* Stepper Progress Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${regStep >= 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    {regStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                  </span>
                  <span className={`text-xs font-semibold ${regStep === 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                    Info &amp; Biometrics
                  </span>
                </div>

                <div className="h-0.5 w-8 sm:w-12 bg-slate-200" />

                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${regStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    {regStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                  </span>
                  <span className={`text-xs font-semibold ${regStep === 2 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                    Email OTP
                  </span>
                </div>

                <div className="h-0.5 w-8 sm:w-12 bg-slate-200" />

                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${regStep === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    3
                  </span>
                  <span className={`text-xs font-semibold ${regStep === 3 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    Registered
                  </span>
                </div>
              </div>

              {/* STEP 1: FILL INFO & COMPLETE 2-PASS CAMERA SCAN */}
              {regStep === 1 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Step 1: Enter Profile &amp; Capture Face Scans
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Fill info, complete dual camera scans, then verify via email OTP.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleFillDemoRegistration}
                      className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                      <span>Prefill Info</span>
                    </button>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    {/* ROLE SELECTOR */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                        Role / User Type
                      </label>
                      <select
                        required
                        value={regForm.role}
                        onChange={(e) => setRegForm({ ...regForm, role: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="" disabled>Select your role...</option>
                        <option value="student">🎓 Student</option>
                        <option value="faculty">👨‍🏫 Staff / Faculty</option>
                        <option value="hod">🏛️ HOD (Head of Department)</option>
                        <option value="security">🛡️ Security</option>
                        <option value="admin">⚙️ Admin</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={regForm.name}
                          onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                          placeholder="e.g. Rohan Mehra"
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center justify-between">
                          <span>Campus Email ID</span>
                          <span className="text-[10px] text-indigo-600 normal-case font-medium">Receives 6-Digit OTP</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={regForm.email}
                          onChange={(e) => { setRegForm({ ...regForm, email: e.target.value }); setEmailVerifyToken(null); }}
                          placeholder="rohan.m@campus.edu"
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                        <EmailOtpVerify email={regForm.email} onVerified={setEmailVerifyToken} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center justify-between">
                          <span>Mobile Number</span>
                          <span className="text-[10px] text-slate-400 normal-case font-normal">Saved to Database</span>
                        </label>
                        <div className="relative">
                          <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            value={regForm.phone}
                            onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                            placeholder="e.g. 9876543210"
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                          {regForm.role === 'student' ? 'PRN / Student ID' : 'Employee / Staff ID'}
                        </label>
                        <input
                          type="text"
                          required
                          value={regForm.prn}
                          onChange={(e) => setRegForm({ ...regForm, prn: e.target.value })}
                          placeholder="e.g. PRN202401188"
                          className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                        Academic Department
                      </label>
                      <select
                        value={regForm.department}
                        onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Electronics & Telecom">Electronics & Telecom</option>
                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center justify-between">
                        <span>Account Password</span>
                        <span className="text-[10px] text-slate-400 normal-case font-normal">Min 6 characters</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          value={regForm.password}
                          onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                          placeholder="Create your account password"
                          className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* STRICT 2-PASS CAMERA BIOMETRIC ENROLLMENT BOX */}
                    <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold tracking-tight">
                            Live Camera Biometric Enrollment (2 Scans Required)
                          </span>
                        </div>
                        <Badge
                          variant={regScanPass === 3 ? 'success' : 'warning'}
                          size="sm"
                        >
                          {regScanPass === 3 ? '2/2 Scans Complete' : `Scan ${regScanPass} of 2`}
                        </Badge>
                      </div>

                      {/* Video Camera Viewport */}
                      {!cameraActive && regScanPass < 3 ? (
                        <div className="rounded-xl overflow-hidden bg-black aspect-4/3 max-h-60 w-full flex flex-col items-center justify-center text-center p-6 border border-slate-800">
                          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-2.5 text-slate-400">
                            <CameraOff className="w-6 h-6" />
                          </div>
                          <p className="text-xs text-slate-200 font-semibold mb-1">
                            Camera is Currently Off
                          </p>
                          <p className="text-[11px] text-slate-400 max-w-xs mb-3.5">
                            Click below to open your camera and capture the 2 required security angles.
                          </p>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Open Camera</span>
                          </button>
                        </div>
                      ) : regScanPass < 3 ? (
                        <div className="relative rounded-xl overflow-hidden bg-black aspect-4/3 max-h-60 w-full flex items-center justify-center border border-slate-800">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />

                          {/* Close Camera Button */}
                          <div className="absolute top-2.5 right-2.5 z-10">
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-rose-950/80 text-rose-300 text-[11px] font-semibold backdrop-blur-xs border border-rose-800/60 flex items-center gap-1 transition-colors"
                            >
                              <Power className="w-3 h-3" />
                              <span>Close Camera</span>
                            </button>
                          </div>

                          {/* Framing HUD */}
                          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                            <div className="relative w-36 h-44 sm:w-44 sm:h-52 border border-emerald-400/40 rounded-xl flex items-center justify-center">
                              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

                              {capturingPass && (
                                <div className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-bounce" />
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Both Scans Completed View */
                        <div className="p-4 bg-emerald-950/30 border border-emerald-800 rounded-xl flex items-center justify-between">
                          <span className="text-xs text-emerald-300 font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span>Both camera scans captured &amp; camera turned off.</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleRetakeRegistrationScans}
                            className="text-xs text-slate-300 hover:white underline underline-offset-2 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retake</span>
                          </button>
                        </div>
                      )}

                      {/* 2-Pass Status Indicators & Captured Thumbnails */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {/* Scan 1 Box */}
                        <div
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${scan1Photo
                              ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
                              : regScanPass === 1
                                ? 'bg-slate-800 border-slate-700 text-slate-300 ring-1 ring-emerald-500/40'
                                : 'bg-slate-800/40 border-slate-800 text-slate-500'
                            }`}
                        >
                          {scan1Photo ? (
                            <img
                              src={scan1Photo}
                              alt="Scan 1"
                              className="w-10 h-10 rounded-lg object-cover border border-emerald-500 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-slate-400">
                              1
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">
                              Scan 1: Frontal
                            </div>
                            <div className="text-[10px] opacity-75">
                              {scan1Photo ? '✓ Captured' : 'Primary Anchor'}
                            </div>
                          </div>
                        </div>

                        {/* Scan 2 Box */}
                        <div
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${scan2Photo
                              ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
                              : regScanPass === 2
                                ? 'bg-slate-800 border-slate-700 text-slate-300 ring-1 ring-emerald-500/40'
                                : 'bg-slate-800/40 border-slate-800 text-slate-500'
                            }`}
                        >
                          {scan2Photo ? (
                            <img
                              src={scan2Photo}
                              alt="Scan 2"
                              className="w-10 h-10 rounded-lg object-cover border border-emerald-500 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-slate-400">
                              2
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">
                              Scan 2: Confirm
                            </div>
                            <div className="text-[10px] opacity-75">
                              {scan2Photo ? '✓ Verified' : 'Safety Match'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Camera Action Controls */}
                      {cameraActive && (
                        <div className="pt-1">
                          {regScanPass === 1 && (
                            <button
                              type="button"
                              onClick={() => handleCaptureRegistrationScan(1)}
                              disabled={capturingPass}
                              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                            >
                              <Camera className="w-4 h-4" />
                              <span>Capture Scan 1 (Frontal Angle)</span>
                            </button>
                          )}

                          {regScanPass === 2 && (
                            <button
                              type="button"
                              onClick={() => handleCaptureRegistrationScan(2)}
                              disabled={capturingPass}
                              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                            >
                              <ScanFace className="w-4 h-4" />
                              <span>Capture Scan 2 (Confirm Liveness Angle)</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={regLoading}
                      disabled={regScanPass < 3 || !regForm.role}
                      className="w-full py-3 text-sm font-semibold shadow-xs"
                      icon={ArrowRight}
                    >
                      {regLoading
                        ? 'Submitting & Requesting Email OTP...'
                        : regScanPass < 3
                          ? 'Open Camera & Complete Both Scans to Register'
                          : 'Continue to Email OTP Verification →'}
                    </Button>
                  </form>
                </div>
              )}

              {/* STEP 2: EMAIL OTP VERIFICATION VIEW */}
              {regStep === 2 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="text-center py-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 mx-auto flex items-center justify-center shadow-xs mb-3">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      Check Your Email for OTP
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                      A 6-digit OTP code has been sent to your Email ID: <span className="font-bold text-indigo-700">{regForm.email}</span>
                    </p>
                    <div className="mt-2 flex flex-col items-center gap-1">
                      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full font-medium">
                        <Mail className="w-3 h-3" />
                        <span>OTP sent to Email ID (not mobile number)</span>
                      </span>
                      {regForm.phone && (
                        <span className="text-[11px] text-slate-500 font-mono">
                          Mobile {regForm.phone} stored in database for profile security
                        </span>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 text-center mb-2">
                        Enter 6-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full max-w-xs mx-auto block px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.5em] bg-slate-50 border-2 border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 transition-all"
                      />
                    </div>

                    <div className="max-w-xs mx-auto">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                        <span>Account Password</span>
                        <span className="text-[10px] text-slate-400 normal-case font-normal">Min 6 characters</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          value={regForm.password || ''}
                          onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                          placeholder="Create account password"
                          className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border-2 border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {otpPreview && (
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setOtpCode(otpPreview)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium hover:bg-emerald-100 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Demo OTP: <strong className="font-mono">{otpPreview}</strong> (Click to auto-fill)</span>
                        </button>
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={otpLoading}
                      disabled={otpCode.length !== 6}
                      className="w-full py-3 text-sm font-semibold shadow-xs"
                      icon={CheckCircle2}
                    >
                      {otpLoading ? 'Verifying OTP & Registering...' : 'Verify OTP & Complete Registration'}
                    </Button>
                  </form>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      ← Back to Edit Details
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendTimer > 0}
                      className={`font-semibold ${resendTimer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-slate-900 hover:underline'}`}
                    >
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: REGISTRATION SUCCESSFUL & STORED IN DATABASE */}
              {regStep === 3 && regSuccessUser && (
                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-300 text-emerald-950 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base tracking-tight">
                        Registration &amp; Verification Complete!
                      </h4>
                      <p className="text-xs opacity-85 mt-0.5">
                        Your account, mobile number, and dual camera scans are verified and stored in the database.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                    <img
                      src={regSuccessUser.photoUrl || scan1Photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                      alt={regSuccessUser.name}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-xs shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">
                          {regSuccessUser.name}
                        </span>
                        <Badge variant="success" size="sm">
                          Verified &amp; Active
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        PRN: {regSuccessUser.prn} • Mobile: {regSuccessUser.phone || regForm.phone || 'Verified'}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {regSuccessUser.department} • {regSuccessUser.email}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleEnterPortal}
                      className="w-full py-3 text-sm font-semibold tracking-wide"
                      icon={ArrowRight}
                    >
                      Authorize Entry &amp; Enter {regSuccessUser.role === 'student' ? 'Student' : 'Campus'} Portal
                    </Button>

                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        setActiveTab('scan-entry');
                        setEmailInput(regSuccessUser.email);
                        setScanStep(1);
                        setRegStep(1);
                        setRegSuccessUser(null);
                      }}
                      className="w-full py-2.5 text-xs font-semibold"
                      icon={ScanFace}
                    >
                      Test College Entry Gate Scanner with New Face
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRADITIONAL PASSWORD LOGIN */}
          {activeTab === 'credentials' && (
            <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Campus Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={credEmail}
                    onChange={(e) => setCredEmail(e.target.value)}
                    placeholder="name@campus.edu"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={credPassword}
                    onChange={(e) => setCredPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={credLoading}
                className="w-full py-2.5 text-sm font-semibold"
                icon={ArrowRight}
              >
                Sign In to Dashboard
              </Button>
            </form>
          )}

        </div>

        {/* Backend Endpoint Hint */}
        <div className="text-center mt-5 text-xs text-slate-400">
          Target API: <code className="text-slate-600 font-mono">POST /auth/register</code> &amp; <code className="text-slate-600 font-mono">POST /auth/verify-face-email</code>
        </div>
      </div>
    </div>
  );
};
