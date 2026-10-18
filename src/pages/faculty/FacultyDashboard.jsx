import React, { useState, useEffect } from 'react';
import { facultyApi } from '../../api/facultyApi';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/common/StatCard';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Camera,
  Upload,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  FileCheck2,
} from 'lucide-react';

export const FacultyDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [history, setHistory] = useState([]);
  const [studentApprovals, setStudentApprovals] = useState([]);
  const [approvalBusy, setApprovalBusy] = useState(null);
  const [loading, setLoading] = useState(true);

  // Capture flow states: 'select' | 'upload' | 'review' | 'submitted'
  const [step, setStep] = useState('select');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [matches, setMatches] = useState([]);
  const [confirmationModal, setConfirmationModal] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [clsRes, histRes] = await Promise.all([
          facultyApi.getClasses(),
          facultyApi.getHistory(),
        ]);
        setClasses(clsRes);
        if (clsRes?.length > 0) {
          setSelectedClassId(clsRes[0].id);
        }
        setHistory(histRes);
      } catch (err) {
        showToast('Error loading faculty records', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    facultyApi.getStudentApprovals().then((result) => setStudentApprovals(result.requests || [])).catch(() => {});
  }, []);

  const reviewStudent = async (requestId, status) => {
    setApprovalBusy(requestId);
    try {
      await facultyApi.reviewStudentApproval(requestId, status);
      setStudentApprovals((items) => items.filter((item) => item.id !== requestId));
      showToast(status === 'APPROVED' ? 'Student approved. Campus access verification is enabled.' : 'Student registration rejected.', status === 'APPROVED' ? 'success' : 'info');
    } catch (error) {
      showToast(error.message || 'Could not review student registration.', 'error');
    } finally {
      setApprovalBusy(null);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  // Photo select handler
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setStep('upload');
    }
  };

  // Run AI Detection
  const handleRunDetection = async () => {
    setDetecting(true);
    try {
      const response = await facultyApi.detectAttendance(selectedClassId, photoFile);
      setMatches(response.matches || []);
      setStep('review');
      showToast(
        `Vision engine recognized ${(response.matches || []).length} students`,
        'success'
      );
    } catch {
      showToast('Vision recognition failed to analyze photo', 'error');
    } finally {
      setDetecting(false);
    }
  };

  // Toggle present/absent in review list
  const toggleStudentStatus = (studentId) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.studentId === studentId
          ? { ...m, status: m.status === 'present' ? 'absent' : 'present' }
          : m
      )
    );
  };

  // Submit attendance to backend
  const handleSubmitAttendance = async () => {
    setSubmitting(true);
    try {
      const payload = {
        classId: selectedClassId,
        date: new Date().toISOString().split('T')[0],
        sessionType: 'Lecture',
        records: matches.map((m) => ({
          studentId: m.studentId,
          status: m.status,
        })),
      };

      const res = await facultyApi.submitAttendance(payload);
      showToast(res.message || 'Attendance submitted successfully!', 'success');

      // Add to local history table
      const presentCount = matches.filter((m) => m.status === 'present').length;
      setHistory((prev) => [
        {
          id: res.attendanceId || 'ATT-' + Date.now().toString().slice(-4),
          date: payload.date,
          courseCode: selectedClass?.courseCode || 'CS',
          courseName: selectedClass?.courseName || 'Course',
          presentCount,
          totalStudents: matches.length || selectedClass?.totalStudents || 60,
          sessionType: 'Lecture',
        },
        ...prev,
      ]);

      setConfirmationModal(false);
      setStep('submitted');
    } catch {
      showToast('Failed to submit attendance to server', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setStep('select');
    setPhotoPreview(null);
    setPhotoFile(null);
    setMatches([]);
  };

  // Counts
  const presentCount = matches.filter((m) => m.status === 'present').length;
  const absentCount = matches.filter((m) => m.status === 'absent').length;

  const historyColumns = [
    {
      header: 'Date',
      accessor: 'date',
      render: (row) => <span className="font-mono text-xs">{row.date}</span>,
    },
    {
      header: 'Course',
      render: (row) => (
        <div>
          <span className="font-medium text-slate-900">{row.courseCode}</span>
          <span className="text-slate-500 text-xs ml-1.5">{row.courseName}</span>
        </div>
      ),
    },
    {
      header: 'Session',
      render: (row) => <Badge variant="neutral">{row.sessionType}</Badge>,
    },
    {
      header: 'Attendance',
      render: (row) => {
        const pct = Math.round((row.presentCount / row.totalStudents) * 100);
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-900">
              {row.presentCount} / {row.totalStudents}
            </span>
            <Badge variant={pct >= 85 ? 'success' : 'warning'} size="sm">
              {pct}%
            </Badge>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Student Registration Approvals</h2>
          <p className="text-xs text-slate-500 mt-1">Review new students in your department. Approval enables their gate face verification.</p>
        </div>
        {studentApprovals.length === 0 ? <p className="text-xs text-slate-500">No pending student registrations.</p> : (
          <div className="space-y-3">
            {studentApprovals.map((request) => {
              const student = request.user?.studentProfile;
              const photo = request.user?.enrollmentPhotos?.[0]?.filePath;
              return <div key={request.id} className="flex flex-col sm:flex-row sm:items-center gap-3 border border-slate-100 rounded-xl p-3">
                {photo && <img src={photo} alt="Student enrollment" className="w-12 h-12 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{student?.name || request.user?.email}</div>
                  <div className="text-xs text-slate-500">{student?.prn} · {request.user?.department?.name} · {request.user?.email}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" loading={approvalBusy === request.id} onClick={() => reviewStudent(request.id, 'REJECTED')}>Reject</Button>
                  <Button size="sm" variant="primary" loading={approvalBusy === request.id} onClick={() => reviewStudent(request.id, 'APPROVED')}>Approve</Button>
                </div>
              </div>;
            })}
          </div>
        )}
      </section>
      {/* 1. Class Selection and Quick Overview */}
      <section className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Teaching Assignment
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Select Class for Attendance Capture
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                resetFlow();
              }}
              className="px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.courseCode} — {c.courseName} ({c.division})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedClass && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-slate-100 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block text-[11px]">Course:</span>
              <span className="font-semibold text-slate-900">
                {selectedClass.courseCode} - {selectedClass.courseName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Division:</span>
              <span className="font-semibold text-slate-900">
                {selectedClass.division} ({selectedClass.semester})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Enrolled Students:</span>
              <span className="font-semibold text-slate-900">
                {selectedClass.totalStudents} Students
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Assigned Hall:</span>
              <span className="font-semibold text-slate-900">
                {selectedClass.room || 'Seminar Hall 2'}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 2. Attendance Capture Multi-Step Flow */}
      <section className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-slate-700" />
              <h3 className="text-base font-semibold text-slate-900">
                Vision Attendance Capture
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload classroom photo → AI detects faces → review & edit matches → submit records
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                step === 'select'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              1. Photo
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                step === 'upload' || detecting
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              2. Detect
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                step === 'review'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              3. Review
            </span>
          </div>
        </div>

        {/* Step 1: Upload / Choose Photo */}
        {step === 'select' && (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 mb-4 shadow-2xs">
              <Camera className="w-8 h-8 stroke-[1.5]" />
            </div>

            <h4 className="text-sm font-semibold text-slate-900 mb-1">
              Capture or Upload Classroom Photo
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mb-6">
              Take a wide-angle snapshot of the classroom or upload an existing photo to run facial recognition.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="cursor-pointer inline-flex items-center justify-center font-medium text-xs sm:text-sm px-4 py-2 gap-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-sm transition-colors">
                <Upload className="w-4 h-4" />
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

            </div>
          </div>
        )}

        {/* Step 2: Uploaded Preview & Run Detection */}
        {step === 'upload' && (
          <div className="py-6 space-y-5">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 max-h-80 flex items-center justify-center">
              <img
                src={photoPreview}
                alt="Classroom capture preview"
                className="w-full object-cover max-h-80"
              />
              <div className="absolute top-3 right-3">
                <Badge variant="brand">Ready for analysis</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={resetFlow} icon={RotateCcw}>
                Choose Different Photo
              </Button>

              <Button
                variant="primary"
                size="md"
                loading={detecting}
                onClick={handleRunDetection}
                icon={ArrowRight}
              >
                {detecting ? 'Analyzing Faces...' : 'Run Vision Recognition'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review Detected Matches */}
        {step === 'review' && (
          <div className="py-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  Detection Summary: {matches.length} Total Registered Students
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Click any student record to manually toggle between Present and Absent.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {presentCount} Present
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                  <XCircle className="w-3.5 h-3.5" />
                  {absentCount} Absent
                </span>
              </div>
            </div>

            {/* Matches Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {matches.map((student) => {
                const isPresent = student.status === 'present';
                return (
                  <div
                    key={student.studentId}
                    onClick={() => toggleStudentStatus(student.studentId)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
                      isPresent
                        ? 'bg-white border-emerald-300 ring-1 ring-emerald-400/20 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-semibold text-xs text-slate-900 truncate">
                        {student.name}
                      </div>
                      <Badge
                        variant={isPresent ? 'success' : 'danger'}
                        size="sm"
                      >
                        {student.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="text-[11px] font-mono text-slate-500">
                      {student.prn}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100">
                      <span>Confidence:</span>
                      <span className="font-medium text-slate-700">
                        {student.confidence}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFlow}
                icon={RotateCcw}
              >
                Discard & Retake
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() => setConfirmationModal(true)}
                icon={CheckCircle}
              >
                Confirm & Submit Attendance
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Submission Confirmation State */}
        {step === 'submitted' && (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-200">
              <FileCheck2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              Attendance Recorded Successfully
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mb-6">
              The verified session records have been stored in the campus registry and attendance logs are updated.
            </p>
            <Button variant="primary" size="sm" onClick={resetFlow} icon={RotateCcw}>
              Record Another Session
            </Button>
          </div>
        )}
      </section>

      {/* 3. Attendance History Table */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Attendance Log
          </h3>
          <p className="text-xs text-slate-500">
            Previous sessions submitted by faculty
          </p>
        </div>

        <DataTable
          columns={historyColumns}
          data={history}
          loading={loading}
          searchPlaceholder="Filter by course code or session..."
          searchKey="courseCode"
          emptyTitle="No attendance history"
          emptyDescription="Attendance sessions recorded will appear here."
        />
      </section>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmationModal}
        onClose={() => setConfirmationModal(false)}
        title="Submit Verified Attendance"
        description="Please confirm submission for the current classroom session."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmationModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={submitting}
              onClick={handleSubmitAttendance}
            >
              Yes, Submit Attendance
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <div>
              <span className="text-slate-500">Course: </span>
              <span className="font-semibold text-slate-900">
                {selectedClass?.courseCode} - {selectedClass?.courseName}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Date: </span>
              <span className="font-mono">{new Date().toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-500">Present Count: </span>
              <span className="font-semibold text-emerald-600">
                {presentCount} Students
              </span>
            </div>
            <div>
              <span className="text-slate-500">Absent Count: </span>
              <span className="font-semibold text-rose-600">
                {absentCount} Students
              </span>
            </div>
          </div>
          <p className="text-slate-500">
            This action will register individual student attendance logs in the database.
          </p>
        </div>
      </Modal>
    </div>
  );
};
