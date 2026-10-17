import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  CalendarCheck,
  Briefcase,
  Users2,
  Plus,
  Trash2,
  TrendingUp,
  ShieldCheck,
  Building,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active section tab: 'placements' | 'clubs' | 'users'
  const [activeTab, setActiveTab] = useState('placements');

  // Modals
  const [addPlacementOpen, setAddPlacementOpen] = useState(false);
  const [addClubOpen, setAddClubOpen] = useState(false);

  // Form states
  const [newPlacement, setNewPlacement] = useState({
    companyName: '',
    role: '',
    package: '',
    deadline: '',
    criteria: 'CGPA >= 7.5',
  });

  const [newClub, setNewClub] = useState({
    name: '',
    category: 'Technical',
    leadEmail: '',
    description: '',
  });

  const { showToast } = useToast();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, plcRes, clbRes, usrRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getPlacements(),
        adminApi.getClubs(),
        adminApi.getUsers(),
      ]);
      setStats(statsRes);
      setPlacements(plcRes);
      setClubs(clbRes);
      setUsers(usrRes);
    } catch {
      showToast('Failed to load administrative console data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Handlers for Placements
  const handleCreatePlacement = async (e) => {
    e.preventDefault();
    if (!newPlacement.companyName || !newPlacement.role || !newPlacement.package) {
      showToast('Please fill in company, role and package', 'error');
      return;
    }
    try {
      const created = await adminApi.createPlacement(newPlacement);
      setPlacements((prev) => [created, ...prev]);
      setAddPlacementOpen(false);
      setNewPlacement({
        companyName: '',
        role: '',
        package: '',
        deadline: '',
        criteria: 'CGPA >= 7.5',
      });
      showToast('Placement drive published successfully!', 'success');
    } catch {
      showToast('Failed to create drive', 'error');
    }
  };

  const handleDeletePlacement = async (id) => {
    try {
      await adminApi.deletePlacement(id);
      setPlacements((prev) => prev.filter((p) => p.id !== id));
      showToast('Placement drive removed', 'success');
    } catch {
      showToast('Failed to delete drive', 'error');
    }
  };

  // Handlers for Clubs
  const handleCreateClub = async (e) => {
    e.preventDefault();
    if (!newClub.name || !newClub.leadEmail) {
      showToast('Please provide club name and coordinator email', 'error');
      return;
    }
    try {
      const created = await adminApi.createClub(newClub);
      setClubs((prev) => [created, ...prev]);
      setAddClubOpen(false);
      setNewClub({ name: '', category: 'Technical', leadEmail: '', description: '' });
      showToast('New club created successfully!', 'success');
    } catch {
      showToast('Failed to create club', 'error');
    }
  };

  const handleDeleteClub = async (id) => {
    try {
      await adminApi.deleteClub(id);
      setClubs((prev) => prev.filter((c) => c.id !== id));
      showToast('Club removed', 'success');
    } catch {
      showToast('Failed to delete club', 'error');
    }
  };

  // Handler for User Role change
  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showToast('User role updated', 'success');
    } catch {
      showToast('Failed to update role', 'error');
    }
  };

  // Column definitions
  const placementColumns = [
    {
      header: 'Company & Role',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.companyName}</div>
          <div className="text-xs text-slate-500">{row.role}</div>
        </div>
      ),
    },
    {
      header: 'CTC Package',
      render: (row) => (
        <span className="font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs">
          {row.package}
        </span>
      ),
    },
    {
      header: 'Deadline',
      accessor: 'deadline',
      render: (row) => <span className="font-mono text-xs">{row.deadline}</span>,
    },
    {
      header: 'Applicants',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700">
          {row.applicantsCount || 0} students
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Open' ? 'success' : 'neutral'} size="sm">
          {row.status || 'Active'}
        </Badge>
      ),
    },
    {
      header: 'Action',
      render: (row) => (
        <button
          onClick={() => handleDeletePlacement(row.id)}
          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
          title="Delete drive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const clubColumns = [
    {
      header: 'Club Name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="text-xs text-slate-400">{row.leadEmail}</div>
        </div>
      ),
    },
    {
      header: 'Category',
      render: (row) => <Badge variant="neutral">{row.category}</Badge>,
    },
    {
      header: 'Members',
      render: (row) => (
        <span className="text-xs font-medium text-slate-700">
          {row.memberCount} members
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'neutral'} size="sm">
          {row.status || 'Active'}
        </Badge>
      ),
    },
    {
      header: 'Action',
      render: (row) => (
        <button
          onClick={() => handleDeleteClub(row.id)}
          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
          title="Delete club"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const userColumns = [
    {
      header: 'User',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="text-xs text-slate-400">{row.email}</div>
        </div>
      ),
    },
    {
      header: 'ID / PRN',
      accessor: 'prn',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600">{row.prn || 'N/A'}</span>
      ),
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (row) => <span className="text-xs text-slate-600">{row.department}</span>,
    },
    {
      header: 'Assigned Role',
      render: (row) => (
        <select
          value={row.role}
          onChange={(e) => handleRoleChange(row.id, e.target.value)}
          className="text-xs font-medium bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
        >
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
          <option value="admin">HOD / Admin</option>
          <option value="security">Security</option>
        </select>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'neutral'} size="sm">
          {row.status || 'Active'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Stats Overview Stat Cards */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Campus Metrics
          </h2>
          <p className="text-xs text-slate-500">
            Real-time aggregate status across university departments
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Students"
            value={loading ? '...' : (stats?.totalStudents || 2480).toLocaleString()}
            subtitle="Enrolled across 8 depts"
            trend="+120 this semester"
            trendType="positive"
            icon={Users}
            loading={loading}
          />
          <StatCard
            title="Average Attendance Rate"
            value={loading ? '...' : `${stats?.attendanceRate || 86.8}%`}
            subtitle="Campus-wide AI verified"
            trend="+2.1% vs last month"
            trendType="positive"
            icon={CalendarCheck}
            loading={loading}
          />
          <StatCard
            title="Active Placement Drives"
            value={loading ? '...' : (stats?.activePlacements || placements.length)}
            subtitle="Companies hiring on campus"
            icon={Briefcase}
            loading={loading}
          />
          <StatCard
            title="Registered Clubs"
            value={loading ? '...' : (stats?.activeClubs || clubs.length)}
            subtitle="Active student societies"
            icon={Users2}
            loading={loading}
          />
        </div>

        {/* 2. Value-adding Attendance Trend Chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Weekly Attendance Trend
              </h3>
              <p className="text-xs text-slate-500">
                Departmental aggregate over the last 5 tracking cycles
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>Target: 85%</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 items-end h-28 pt-2">
            {(stats?.attendanceTrend || [
              { period: 'Week 1', rate: 84.2 },
              { period: 'Week 2', rate: 87.5 },
              { period: 'Week 3', rate: 85.9 },
              { period: 'Week 4', rate: 88.1 },
              { period: 'Week 5', rate: 86.8 },
            ]).map((item, idx) => (
              <div key={idx} className="flex flex-col items-center justify-end h-full group">
                <span className="text-[11px] font-semibold text-slate-700 mb-1 group-hover:text-slate-900">
                  {item.rate}%
                </span>
                <div className="w-full bg-slate-100 rounded-md h-20 flex items-end p-1">
                  <div
                    style={{ height: `${item.rate}%` }}
                    className="w-full bg-slate-900 rounded transition-all duration-300 group-hover:bg-slate-800"
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium mt-1.5">
                  {item.period}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Tabbed Administrative Sections */}
      <section className="space-y-4">
        {/* Tab navigation pills */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('placements')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'placements'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Placement Drives ({placements.length})
            </button>
            <button
              onClick={() => setActiveTab('clubs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'clubs'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Clubs Management ({clubs.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'users'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              User Directory & Roles ({users.length})
            </button>
          </div>

          <div>
            {activeTab === 'placements' && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setAddPlacementOpen(true)}
              >
                Add Drive
              </Button>
            )}
            {activeTab === 'clubs' && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setAddClubOpen(true)}
              >
                Add Club
              </Button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'placements' && (
          <DataTable
            columns={placementColumns}
            data={placements}
            loading={loading}
            searchPlaceholder="Search company or role..."
            searchKey="companyName"
            emptyTitle="No placement drives found"
            emptyDescription="Create a drive using the Add Drive button above."
          />
        )}

        {activeTab === 'clubs' && (
          <DataTable
            columns={clubColumns}
            data={clubs}
            loading={loading}
            searchPlaceholder="Search clubs..."
            searchKey="name"
            emptyTitle="No clubs registered"
            emptyDescription="Create a club using the Add Club button above."
          />
        )}

        {activeTab === 'users' && (
          <DataTable
            columns={userColumns}
            data={users}
            loading={loading}
            searchPlaceholder="Search by name, email, or PRN..."
            searchKey="name"
            emptyTitle="No users found"
            emptyDescription="Registered campus users will appear here."
          />
        )}
      </section>

      {/* Modal: Add Placement Drive */}
      <Modal
        isOpen={addPlacementOpen}
        onClose={() => setAddPlacementOpen(false)}
        title="Add Placement Drive"
        description="Publish a new campus recruitment drive for eligible students."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAddPlacementOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreatePlacement}
            >
              Publish Drive
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreatePlacement} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              required
              value={newPlacement.companyName}
              onChange={(e) =>
                setNewPlacement({ ...newPlacement, companyName: e.target.value })
              }
              placeholder="e.g. Google India"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Job Role
            </label>
            <input
              type="text"
              required
              value={newPlacement.role}
              onChange={(e) =>
                setNewPlacement({ ...newPlacement, role: e.target.value })
              }
              placeholder="e.g. Associate Software Engineer"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Package (CTC)
              </label>
              <input
                type="text"
                required
                value={newPlacement.package}
                onChange={(e) =>
                  setNewPlacement({ ...newPlacement, package: e.target.value })
                }
                placeholder="e.g. 20 LPA"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Deadline
              </label>
              <input
                type="date"
                required
                value={newPlacement.deadline}
                onChange={(e) =>
                  setNewPlacement({ ...newPlacement, deadline: e.target.value })
                }
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Eligibility Criteria
            </label>
            <input
              type="text"
              value={newPlacement.criteria}
              onChange={(e) =>
                setNewPlacement({ ...newPlacement, criteria: e.target.value })
              }
              placeholder="e.g. CGPA >= 8.0, No active backlogs"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </form>
      </Modal>

      {/* Modal: Add Club */}
      <Modal
        isOpen={addClubOpen}
        onClose={() => setAddClubOpen(false)}
        title="Add Campus Club / Society"
        description="Register an official student-led chapter or club."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAddClubOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateClub}
            >
              Create Club
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateClub} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Club Name
            </label>
            <input
              type="text"
              required
              value={newClub.name}
              onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
              placeholder="e.g. AI & Machine Learning Society"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={newClub.category}
                onChange={(e) =>
                  setNewClub({ ...newClub, category: e.target.value })
                }
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="Technical">Technical</option>
                <option value="Cultural">Cultural</option>
                <option value="Sports">Sports</option>
                <option value="Community">Community</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Lead Coordinator Email
              </label>
              <input
                type="email"
                required
                value={newClub.leadEmail}
                onChange={(e) =>
                  setNewClub({ ...newClub, leadEmail: e.target.value })
                }
                placeholder="lead@campus.edu"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={newClub.description}
              onChange={(e) =>
                setNewClub({ ...newClub, description: e.target.value })
              }
              placeholder="Brief summary of activities and goals..."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
