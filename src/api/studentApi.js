import axiosClient from './axiosClient';

// Get the currently logged-in user from sessionStorage
const getLoggedInUser = () => {
  try {
    const saved = sessionStorage.getItem('scv_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const studentApi = {
  getDashboardData: async () => {
    try {
      const response = await axiosClient.get('/student/dashboard');
      return response;
    } catch {
      try {
        const loggedInUser = getLoggedInUser();
        if (!loggedInUser?.email) throw new Error('No authenticated student email found');
        const lookup = await axiosClient.post('/auth/lookup-email', { email: loggedInUser.email });
        const user = lookup.user || {};
        return {
          profile: {
            id: user.id || loggedInUser.id,
            name: user.name || loggedInUser.name || 'Student',
            email: user.email || loggedInUser.email,
            prn: user.prn || loggedInUser.prn || '',
            department: user.department || loggedInUser.department || '',
            semester: loggedInUser.semester || '',
            photoUrl: user.photoUrl || loggedInUser.photoUrl || '',
            status: user.status || loggedInUser.status || 'ACTIVE',
            digitalId: loggedInUser.digitalId || ('SCV-STD-' + String(user.id || loggedInUser.id || '').slice(-4).toUpperCase()),
          },
          attendance: { overallPercentage: 0, attendedClasses: 0, totalClasses: 0, trend: [], subjectWise: [] },
          placements: [],
          clubs: [],
          notifications: [],
        };
      } catch {
        const loggedInUser = getLoggedInUser();
        if (!loggedInUser) return { profile: null, attendance: null, placements: [], clubs: [], notifications: [] };
        return {
          profile: {
            name: loggedInUser.name || 'Student', email: loggedInUser.email || '', prn: loggedInUser.prn || '',
            department: loggedInUser.department || '', semester: loggedInUser.semester || '',
            photoUrl: loggedInUser.photoUrl || '', status: loggedInUser.status || 'ACTIVE',
            digitalId: loggedInUser.digitalId || ('SCV-STD-' + String(loggedInUser.id || '').slice(-4).toUpperCase()),
          },
          attendance: { overallPercentage: 0, attendedClasses: 0, totalClasses: 0, trend: [], subjectWise: [] },
          placements: [], clubs: [], notifications: [],
        };
      }
    }
  },

  getPlacements: async () => {
    try {
      return await axiosClient.get('/placements');
    } catch (error) {
      throw error;
    }
  },

  applyForPlacement: async (id) => {
    try {
      return await axiosClient.post(`/placements/${id}/apply`);
    } catch (error) {
      throw error;
    }
  },

  getClubs: async () => {
    try {
      return await axiosClient.get('/clubs');
    } catch (error) {
      throw error;
    }
  },

  registerForClub: async (id) => {
    try {
      return await axiosClient.post(`/clubs/${id}/register`);
    } catch (error) {
      throw error;
    }
  },

  getNotifications: async () => {
    try {
      return await axiosClient.get('/notifications');
    } catch (error) {
      throw error;
    }
  },
};
