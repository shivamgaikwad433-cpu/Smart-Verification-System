import axiosClient from './axiosClient';

export const adminApi = {
  getStats: async () => {
    try {
      return await axiosClient.get('/admin/stats');
    } catch (error) {
      throw error;
    }
  },

  getPlacements: async () => {
    try {
      return await axiosClient.get('/admin/placements');
    } catch (error) {
      throw error;
    }
  },

  createPlacement: async (payload) => {
    try {
      return await axiosClient.post('/admin/placements', payload);
    } catch (error) {
      throw error;
    }
  },

  deletePlacement: async (id) => {
    try {
      return await axiosClient.delete(`/admin/placements/${id}`);
    } catch (error) {
      throw error;
    }
  },

  getClubs: async () => {
    try {
      return await axiosClient.get('/admin/clubs');
    } catch (error) {
      throw error;
    }
  },

  createClub: async (payload) => {
    try {
      return await axiosClient.post('/admin/clubs', payload);
    } catch (error) {
      throw error;
    }
  },

  deleteClub: async (id) => {
    try {
      return await axiosClient.delete(`/admin/clubs/${id}`);
    } catch (error) {
      throw error;
    }
  },

  getUsers: async () => {
    try {
      return await axiosClient.get('/admin/users');
    } catch (error) {
      throw error;
    }
  },

  updateUserRole: async (userId, role) => {
    try {
      return await axiosClient.put(`/admin/users/${userId}`, { role });
    } catch (error) {
      throw error;
    }
  },
};
