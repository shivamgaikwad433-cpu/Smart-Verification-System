import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { setAuthToken, getAuthToken } from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(() => getAuthToken());
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('scv_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authApi.login(email, password);
      const authToken = response.token || response.accessToken;
      const authUser = response.user;

      setTokenState(authToken);
      setUser(authUser);
      sessionStorage.setItem('scv_user', JSON.stringify(authUser));

      return { success: true, role: authUser.role };
    } catch (error) {
      return { success: false, message: error.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const lookupEmail = async (email) => {
    return await authApi.lookupByEmail(email);
  };

  const verifyFaceForEmail = async (email, faceImage) => {
    setLoading(true);
    try {
      const response = await authApi.verifyFaceForEmail(email, faceImage);
      if (response.isAllowed && (response.token || response.accessToken)) {
        const t = response.token || response.accessToken;
        setTokenState(t);
        setUser(response.user);
        sessionStorage.setItem('scv_user', JSON.stringify(response.user));
      }
      return response;
    } catch (error) {
      return {
        isAllowed: false,
        message: error.message || 'Face recognition matching failed',
      };
    } finally {
      setLoading(false);
    }
  };

  const requestRegistrationOtp = async (userData) => {
    setLoading(true);
    try {
      return await authApi.requestRegistrationOtp(userData);
    } finally {
      setLoading(false);
    }
  };

  const verifyRegistrationOtp = async (email, otp, password) => {
    setLoading(true);
    try {
      const response = await authApi.verifyOtp(email, otp, password);
      if (response.success && (response.token || response.accessToken)) {
        const t = response.token || response.accessToken;
        setTokenState(t);
        setUser(response.user);
        sessionStorage.setItem('scv_user', JSON.stringify(response.user));
      }
      return response;
    } finally {
      setLoading(false);
    }
  };

  const resendRegistrationOtp = async (email) => {
    return await authApi.resendOtp(email);
  };

  const registerWithFace = async (userData) => {
    setLoading(true);
    try {
      const response = await authApi.registerWithFace(userData);
      if (response?.token && response?.user) {
        setTokenState(response.token);
        setUser(response.user);
        sessionStorage.setItem('scv_user', JSON.stringify(response.user));
      }
      return response;
    } catch (error) {
      return { success: false, message: error.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authApi.logout();
    setTokenState(null);
    setUser(null);
    sessionStorage.removeItem('scv_user');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role: user?.role || null,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        lookupEmail,
        verifyFaceForEmail,
        requestRegistrationOtp,
        verifyRegistrationOtp,
        resendRegistrationOtp,
        registerWithFace,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
