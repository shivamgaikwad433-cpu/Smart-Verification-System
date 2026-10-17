import axiosClient, { setAuthToken } from './axiosClient';

export const authApi = {
  sendEmailOtp: (email) => axiosClient.post('/auth/otp/send', {
    email: email.trim().toLowerCase(),
    purpose: 'EMAIL_VERIFY',
  }),
  resendEmailOtp: (email) => axiosClient.post('/auth/otp/resend', {
    email: email.trim().toLowerCase(),
    purpose: 'EMAIL_VERIFY',
  }),
  verifyEmailOtp: (email, otp) => axiosClient.post('/auth/otp/verify', {
    email: email.trim().toLowerCase(),
    purpose: 'EMAIL_VERIFY',
    code: otp,
  }),
  /**
   * Step 1 of Registration: Sends registration details & requests 6-digit email OTP
   */
  requestRegistrationOtp: async (userData) => {
    return axiosClient.post('/auth/register', {
        name: userData.name,
        email: (userData.email || '').toLowerCase().trim(),
        prn: userData.prn,
        phone: userData.phone,
        department: userData.department,
        role: userData.role || 'student',
        password: userData.password || 'defaultpassword123',
      });
  },

  /**
   * Step 2 of Registration: Verifies 6-digit email OTP and stores user in database
   */
  verifyOtp: async (email, otp, password) => {
    const response = await axiosClient.post('/auth/verify-otp', {
        email: (email || '').toLowerCase().trim(),
        otp: (otp || '').trim(),
        ...(password ? { password } : {}),
      });
    if (response?.token || response?.accessToken) setAuthToken(response.token || response.accessToken);
    return response;
  },

  /**
   * Resend OTP
   */
  resendOtp: async (email) => {
    return axiosClient.post('/auth/resend-otp', { email: (email || '').toLowerCase().trim() });
  },

  login: async (email, password) => {
    const response = await axiosClient.post('/auth/login', { email, password });
    if (response?.token || response?.accessToken) setAuthToken(response.token || response.accessToken);
    return response;
  },

  lookupByEmail: async (email) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    try {
      const response = await axiosClient.post('/auth/lookup-email', { email: cleanEmail });
      return response;
    } catch (error) {
      throw error;
    }
  },

  verifyFaceForEmail: async (email, faceImage) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    try {
      const response = await axiosClient.post('/auth/verify-face-email', { email: cleanEmail, faceData: typeof faceImage === 'string' ? faceImage : undefined });

      if (response?.token) {
        setAuthToken(response.token);
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  registerWithFace: async (userData) => {
    const response = await axiosClient.post('/auth/register', userData);
    if (response?.token || response?.accessToken) setAuthToken(response.token || response.accessToken);
    return response;
  },

  getCurrentUser: async () => {
    try {
      return await axiosClient.get('/auth/me');
    } catch {
      return null;
    }
  },

  logout: () => {
    setAuthToken(null);
  },
};
