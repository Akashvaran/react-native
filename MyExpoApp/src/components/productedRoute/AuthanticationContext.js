import React, { createContext, useState, useEffect } from 'react';
import Axios from '../axios/Axios';


export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
    

  const login = (userData) => {
    console.log('Setting user data:', userData);
    setIsLoggedIn(true);
    setUser(userData);
    setUserId(userData.id);
    setLoading(false);
  };

  const logout = async () => {
    try {
      await Axios.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggedIn(false);
      setUser(null);
      setUserId(null);
    }
  };

  const verifyUser = async () => {
    try {
      setLoading(true);
      const response = await Axios.get('/auth/verify');
      if (response.data.status && response.data.user) {
        login(response.data.user);
        
      } else {
        setIsLoggedIn(false);
        setUser(null);
        setUserId(null);
      }
    } catch (error) {
      console.error('Verification errors:', error);
      setIsLoggedIn(false);
      setUser(null);
      setUserId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        userId,
        isLoggedIn,
        user,
        loading,
        login,
        logout,
        verifyUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};