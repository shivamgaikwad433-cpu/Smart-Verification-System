import axiosClient from './axiosClient';

export const facultyApi = {
  getStudentApprovals: () => axiosClient.get('/verification/student-approvals'),
  reviewStudentApproval: (id, status) => axiosClient.patch(`/verification/student-approvals/${id}`, { status }),
  getClasses: async () => {
    return axiosClient.get('/faculty/classes');
  },

  detectAttendance: async (classId, photoFile) => {
    try {
      const formData = new FormData();
      formData.append('classId', classId);
      if (photoFile) {
        formData.append('photo', photoFile);
      }
      return await axiosClient.post('/faculty/attendance/detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error) {
      throw error;
    }
  },

  submitAttendance: async (payload) => {
    try {
      return await axiosClient.post('/faculty/attendance/submit', payload);
    } catch (error) {
      throw error;
    }
  },

  getHistory: async () => {
    return axiosClient.get('/faculty/attendance/history');
  },
};
