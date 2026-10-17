import React from 'react';
import { NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  CalendarCheck,
  Briefcase,
  Users2,
  Bell,
  Camera,
  History,
  LayoutDashboard,
  ShieldCheck,
  Building2,
  LogOut,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const Sidebar = ({ onClose }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navByRole = {
    student: [
      { name: 'Dashboard', path: '/student', tab: 'dashboard', icon: LayoutDashboard },
      { name: 'Attendance', path: '/student?tab=attendance', tab: 'attendance', icon: CalendarCheck },
      { name: 'Placements', path: '/student?tab=placements', tab: 'placements', icon: Briefcase },
      { name: 'Clubs', path: '/student?tab=clubs', tab: 'clubs', icon: Users2 },
    ],
    faculty: [
      { name: 'Class & Attendance', path: '/faculty', tab: null, icon: Camera },
      { name: 'Attendance History', path: '/faculty?tab=history', tab: 'history', icon: History },
    ],
    admin: [
      { name: 'Overview', path: '/admin', tab: null, icon: LayoutDashboard },
      { name: 'Placements', path: '/admin?tab=placements', tab: 'placements', icon: Briefcase },
      { name: 'Clubs', path: '/admin?tab=clubs', tab: 'clubs', icon: Users2 },
      { name: 'User Management', path: '/admin?tab=users', tab: 'users', icon: UserCheck },
    ],
    security: [
      { name: 'Gate Verification', path: '/security', tab: null, icon: ShieldCheck },
    ],
  };

  const currentNav = navByRole[role] || [];

  // Check if a nav item is active
  const isNavActive = (item) => {
    const onCorrectPath = location.pathname === item.path.split('?')[0];
    if (!onCorrectPath) return false;
    if (item.tab === 'dashboard') return currentTab === 'dashboard';
    if (item.tab === null) return true; // no tab param, just path match
    return currentTab === item.tab;
  };

  return (
    <aside className="w-64 h-full bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand / Logo */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              SC
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-900 leading-tight">
                Smart Campus
              </div>
              <div className="text-[11px] font-medium text-slate-400">
                Vision System
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="px-3 py-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Navigation
          </div>
          <nav className="space-y-1">
            {currentNav.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item);
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0 stroke-[1.8]" />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User profile & logout footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-xs shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {user?.email || ''}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
