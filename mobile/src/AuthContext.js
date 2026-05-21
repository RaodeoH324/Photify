import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.log('Failed to load user', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const validUsers = [
      { email: 'harsh.raodeo@gmail.com', password: 'Harsh1616', name: 'Harsh' },
      { email: 'dikshakadam2007@gmail.com', password: 'Diksha2727', name: 'Diksha' }
    ];

    const foundUser = validUsers.find(u => u.email === email.toLowerCase() && u.password === password);
    
    if (foundUser) {
      const userData = { email: foundUser.email, name: foundUser.name };
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      return { success: true };
    } else {
      return { success: false, message: 'Invalid credentials' };
    }
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
