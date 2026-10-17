import axiosClient from './axiosClient';

export const securityApi = {
  verifyStudent: async (identifier, facePhoto) => {
    const cleanId = (identifier || '').trim().toUpperCase();
    const formData = new FormData();
    formData.append('prn', cleanId);
    if (facePhoto) formData.append('photo', facePhoto, 'gate-scan.jpg');
    return axiosClient.post('/gate/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
