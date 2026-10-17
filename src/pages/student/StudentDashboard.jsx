import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { studentApi } from '../../api/studentApi';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
  CalendarCheck2,
  GraduationCap,
  Award,
  Users2,
  Bell,
  Briefcase,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-react';

export const StudentDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);
  const [registeringClubId, setRegisteringClubId] = useState(null);
  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await studentApi.getDashboardData();
      setData(response);
    } catch {
      showToast('Failed to load student records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyPlacement = async (driveId, company) => {
    setApplyingId(driveId);
    try {
      await studentApi.applyForPlacement(driveId);
      showToast(`Applied for ${company} drive successfully!`, 'success');
      // Update local state
      setData((prev) => ({
        ...prev,
        placements: prev.placements.map((p) =>
          p.id === driveId ? { ...p, hasApplied: true } : p
        ),
      }));
    } catch {
      showToast('Failed to submit application', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  const handleRegisterClub = async (clubId, clubName) => {
    setRegisteringClubId(clubId);
    try {
      await studentApi.registerForClub(clubId);
      showToast(`Registered for ${clubName}!`, 'success');
      setData((prev) => ({
        ...prev,
        clubs: prev.clubs.map((c) =>
          c.id === clubId ? { ...c, isRegistered: true } : c
        ),
      }));
    } catch {
      showToast('Club registration failed', 'error');
    } finally {
      setRegisteringClubId(null);
    }
  };

  const profile = data?.profile;
  const attendance = data?.attendance || { overallPercentage: 0, attendedClasses: 0, totalClasses: 0, trend: [], subjectWise: [] };
  const placements = data?.placements || [];
  const clubs = data?.clubs || [];
  const notifications = data?.notifications || [];
  const profileInitials = (profile?.name || 'Student')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'attendance', label: 'Attendance', icon: CalendarCheck2 },
    { key: 'placements', label: 'Placements', icon: Briefcase },
    { key: 'clubs', label: 'Clubs', icon: Users2 },
  ];

  return (
    <div className="space-y-6 pb-12">

      {/* â”€â”€ Top Tab Bar â”€â”€ */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xs overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => key === 'dashboard' ? setSearchParams({}) : setSearchParams({ tab: key })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          DASHBOARD TAB â€” Student Profile + College Info only
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === 'dashboard' && (
        <>
          {/* Student Profile Card */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            {loading ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <Skeleton className="w-18 h-18 rounded-2xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    {profile?.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt={profile.name || 'Student profile'}
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-100 shadow-xs"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-bold border-2 border-slate-100 shadow-xs">
                        {profileInitials}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                      <ShieldCheck className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">{profile?.name}</h2>
                      <Badge variant="success" size="sm">{profile?.status || 'Active'}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{profile?.department} â€¢ {profile?.semester}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <span className="inline-flex items-center gap-1 text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        <span className="text-slate-400">PRN:</span> {profile?.prn}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        <span className="text-slate-400">Email:</span> {profile?.email}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        <span className="text-slate-400">ID:</span> {profile?.digitalId}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-auto sm:border-l sm:border-slate-100 sm:pl-6">
                  <div className="text-right hidden sm:block">
                    <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Campus Pass</div>
                    <div className="text-xs font-semibold text-emerald-600 mt-0.5">Authorized Entry</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                    <QrCode className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* College Info â€” Quick Summary */}
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">College Information</h3>
              <p className="text-xs text-slate-400 mt-0.5">Smart Campus Vision â€” Campus overview for current semester</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Attendance</div>
                  <div className="text-lg font-bold text-slate-900">
                    {loading ? '...' : `${attendance?.overallPercentage}%`}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium">Overall this semester</div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Active Drives</div>
                  <div className="text-lg font-bold text-slate-900">
                    {loading ? '...' : placements.length}
                  </div>
                  <div className="text-[11px] text-blue-600 font-medium">Placement opportunities</div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Users2 className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Clubs</div>
                  <div className="text-lg font-bold text-slate-900">
                    {loading ? '...' : clubs.filter(c => c.isRegistered).length} / {loading ? '...' : clubs.length}
                  </div>
                  <div className="text-[11px] text-violet-600 font-medium">Joined / Available</div>
                </div>
              </div>
            </div>
          </section>

          {/* Campus Notifications */}
          <section className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">Campus Notifications</h3>
              </div>
              <span className="text-xs text-slate-400">Recent alerts</span>
            </div>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState icon={Bell} title="All caught up" description="You have no unread notifications at this time." />
            ) : (
              <div className="space-y-2.5">
                {notifications.map((notif) => (
                  <div key={notif.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">{notif.title}</span>
                        <Badge
                          variant={notif.category === 'attendance' ? 'success' : notif.category === 'placement' ? 'info' : 'neutral'}
                          size="sm"
                        >
                          {notif.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">{notif.message}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">{notif.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          ATTENDANCE TAB â€” Full attendance only
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === 'attendance' && (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Attendance Summary</h3>
            <p className="text-xs text-slate-400 mt-0.5">Verified campus facial recognition attendance log</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Overall Attendance"
              value={loading ? '...' : `${attendance?.overallPercentage}%`}
              subtitle="Min requirement: 75%"
              trend={attendance?.overallPercentage >= 75 ? '+13.4% above req' : 'Action needed'}
              trendType={attendance?.overallPercentage >= 75 ? 'positive' : 'negative'}
              icon={CalendarCheck2}
              loading={loading}
            />
            <StatCard
              title="Attended Classes"
              value={loading ? '...' : `${attendance?.attendedClasses} / ${attendance?.totalClasses}`}
              subtitle="Conducted this semester"
              icon={GraduationCap}
              loading={loading}
            />
            <StatCard
              title="Attendance Streak"
              value={loading ? '...' : '14 Days'}
              subtitle="Consecutive presence recorded"
              trend="100% this week"
              trendType="positive"
              icon={Award}
              loading={loading}
            />
            <StatCard
              title="Eligibility Status"
              value={loading ? '...' : 'Eligible'}
              subtitle="Exam & Placement clearance"
              trend="Cleared"
              trendType="positive"
              icon={ShieldCheck}
              loading={loading}
            />
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Weekly Attendance Distribution</h4>
                <p className="text-xs text-slate-500">Daily lectures presence recorded by camera recognition</p>
              </div>
              <span className="text-xs font-medium text-slate-500">Current Week</span>
            </div>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-28 pt-4">
                  {attendance?.trend?.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center h-full justify-end group">
                      <div className="text-[11px] font-semibold text-slate-600 mb-1 group-hover:text-slate-900">{item.percentage}%</div>
                      <div className="w-full bg-slate-100 rounded-md h-20 flex items-end p-1">
                        <div
                          style={{ height: `${item.percentage}%` }}
                          className={`w-full rounded transition-all duration-300 ${item.percentage >= 80 ? 'bg-slate-900' : 'bg-slate-400'}`}
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-medium mt-1.5">{item.day}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {attendance?.subjectWise?.map((sub, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{sub.subject}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{sub.attended} of {sub.total} sessions</div>
                      </div>
                      <Badge variant={sub.percentage >= 75 ? 'success' : 'warning'} size="sm">{sub.percentage}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          PLACEMENTS TAB â€” Full placements only
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === 'placements' && (
        <section className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Placement Opportunities</h3>
              <p className="text-xs text-slate-500 mt-0.5">Campus recruitment drives for your batch</p>
            </div>
            <Badge variant="brand" size="sm">{placements.length} Active</Badge>
          </div>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : placements.length === 0 ? (
            <EmptyState icon={Briefcase} title="No active placements" description="Upcoming recruitment drives will be posted here." />
          ) : (
            <div className="divide-y divide-slate-100">
              {placements.map((drive) => (
                <div key={drive.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 truncate">{drive.companyName}</span>
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{drive.package}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">{drive.role}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span>ðŸ“ {drive.location}</span>
                      <span>â€¢</span>
                      <span>Due: {drive.deadline}</span>
                      <span>â€¢</span>
                      <span>{drive.criteria}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {drive.hasApplied ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Applied</span>
                      </span>
                    ) : (
                      <Button variant="primary" size="sm" loading={applyingId === drive.id} onClick={() => handleApplyPlacement(drive.id, drive.companyName)}>Apply</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          CLUBS TAB â€” Full clubs list only
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === 'clubs' && (
        <section className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Campus Clubs &amp; Societies</h3>
              <p className="text-xs text-slate-500 mt-0.5">Extracurricular clubs &amp; technical chapters you can join</p>
            </div>
            <Badge variant="neutral" size="sm">{clubs.length} Chapters</Badge>
          </div>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : clubs.length === 0 ? (
            <EmptyState icon={Users2} title="No clubs registered" description="Clubs list will appear once created by faculty coordinator." />
          ) : (
            <div className="divide-y divide-slate-100">
              {clubs.map((club) => (
                <div key={club.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 truncate">{club.name}</span>
                      <Badge variant="neutral" size="sm">{club.category}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{club.description}</p>
                    <div className="text-[11px] text-slate-400 mt-1">Lead: {club.leadName} â€¢ {club.memberCount} members</div>
                  </div>
                  <div className="shrink-0">
                    {club.isRegistered ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Member</span>
                      </span>
                    ) : (
                      <Button variant="secondary" size="sm" loading={registeringClubId === club.id} onClick={() => handleRegisterClub(club.id, club.name)}>Register</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

    </div>
  );
};
