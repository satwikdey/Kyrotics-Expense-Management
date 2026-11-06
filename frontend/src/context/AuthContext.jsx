import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

const DEFAULT_KYROTICS_ADMIN = {
  uid: 'kyrotics-admin-id',
  email: 'admin@kyrotics.com',
  name: 'Kyrotics Finance Admin',
  role: 'admin',
  approvalStatus: 'approved',
  isActive: true,
};

const DEFAULT_KYROTICS_EMPLOYEE = {
  uid: 'kyrotics-employee-id',
  email: 'employee@kyrotics.com',
  name: 'Aarav Patel',
  role: 'employee',
  approvalStatus: 'approved',
  isActive: true,
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync state from localStorage for mock/offline persistence
  useEffect(() => {
    const saved = localStorage.getItem('kyrotics_auth_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentUser(parsed);
        setUserProfile(parsed);
      } catch {
        localStorage.removeItem('kyrotics_auth_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const profile = {
              uid: fbUser.uid,
              email: fbUser.email,
              name: data.name || fbUser.displayName || 'User',
              role: data.role || 'employee',
              approvalStatus: data.approvalStatus || 'pending',
              isActive: data.isActive !== false,
            };
            setCurrentUser(fbUser);
            setUserProfile(profile);
            localStorage.setItem('kyrotics_auth_user', JSON.stringify(profile));
          } else {
            // First time login fallback
            const profile = {
              uid: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || 'User',
              role: 'employee',
              approvalStatus: 'pending',
              isActive: true,
            };
            setCurrentUser(fbUser);
            setUserProfile(profile);
            localStorage.setItem('kyrotics_auth_user', JSON.stringify(profile));
          }
        } catch {
          // If offline or unconfigured
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Firebase Auth
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      let profile;
      if (userDoc.exists()) {
        const data = userDoc.data();
        profile = {
          uid: cred.user.uid,
          email: cred.user.email,
          name: data.name || cred.user.displayName || 'User',
          role: data.role || 'employee',
          approvalStatus: data.approvalStatus || 'pending',
          isActive: data.isActive !== false,
        };
      } else {
        profile = {
          uid: cred.user.uid,
          email: cred.user.email,
          name: cred.user.displayName || 'User',
          role: 'employee',
          approvalStatus: 'pending',
          isActive: true,
        };
      }
      setCurrentUser(cred.user);
      setUserProfile(profile);
      localStorage.setItem('kyrotics_auth_user', JSON.stringify(profile));
      return profile;
    } catch (err) {
      // 2. Demo fallback accounts for zero-config local testing
      if (cleanEmail === 'admin@kyrotics.com' && password === 'Password123!') {
        setCurrentUser(DEFAULT_KYROTICS_ADMIN);
        setUserProfile(DEFAULT_KYROTICS_ADMIN);
        localStorage.setItem('kyrotics_auth_user', JSON.stringify(DEFAULT_KYROTICS_ADMIN));
        return DEFAULT_KYROTICS_ADMIN;
      }
      if (cleanEmail === 'employee@kyrotics.com' && password === 'Password123!') {
        setCurrentUser(DEFAULT_KYROTICS_EMPLOYEE);
        setUserProfile(DEFAULT_KYROTICS_EMPLOYEE);
        localStorage.setItem('kyrotics_auth_user', JSON.stringify(DEFAULT_KYROTICS_EMPLOYEE));
        return DEFAULT_KYROTICS_EMPLOYEE;
      }

      // 3. Fallback to locally registered users if Firebase is not yet configured
      const registeredUsers = JSON.parse(localStorage.getItem('kyrotics_registered_users') || '[]');
      const match = registeredUsers.find((u) => u.email === cleanEmail && u.password === password);
      if (match) {
        const profile = {
          uid: match.uid,
          email: match.email,
          name: match.name,
          role: match.role || 'employee',
          approvalStatus: match.approvalStatus || 'pending',
          isActive: match.isActive !== false,
        };
        setCurrentUser(profile);
        setUserProfile(profile);
        localStorage.setItem('kyrotics_auth_user', JSON.stringify(profile));
        return profile;
      }
      throw err;
    }
  };

  const signup = async (emailOrObj, passwordArg, nameArg, phoneArg) => {
    let email, password, name, phone;
    if (typeof emailOrObj === 'object') {
      email = emailOrObj.email;
      password = emailOrObj.password;
      name = emailOrObj.name;
      phone = emailOrObj.phone;
    } else {
      email = emailOrObj;
      password = passwordArg;
      name = nameArg;
      phone = phoneArg;
    }

    const cleanEmail = email.trim().toLowerCase();
    let uid = 'emp-' + Date.now();
    const newProfile = {
      name: name?.trim() || 'Employee',
      email: cleanEmail,
      phone: phone?.trim() || null,
      role: 'employee',
      approvalStatus: 'pending', // Requires admin approval
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      uid = cred.user.uid;
      newProfile.uid = uid;
      await setDoc(doc(db, 'users', uid), newProfile);
      setCurrentUser(cred.user);
    } catch {
      // Local demo fallback
      newProfile.uid = uid;
      const registeredUsers = JSON.parse(localStorage.getItem('kyrotics_registered_users') || '[]');
      registeredUsers.push({ ...newProfile, password });
      localStorage.setItem('kyrotics_registered_users', JSON.stringify(registeredUsers));
      setCurrentUser(newProfile);
    }

    setUserProfile(newProfile);
    localStorage.setItem('kyrotics_auth_user', JSON.stringify(newProfile));
    return newProfile;
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch {
      // Ignore
    }
    setCurrentUser(null);
    setUserProfile(null);
    localStorage.removeItem('kyrotics_auth_user');
  };

  const value = {
    currentUser,
    userProfile,
    user: userProfile || currentUser,
    loading,
    isAdmin: userProfile?.role === 'admin',
    isEmployee: userProfile?.role === 'employee',
    isApproved: userProfile?.approvalStatus === 'approved' && userProfile?.isActive !== false,
    isPending: userProfile?.approvalStatus === 'pending',
    isRejected: userProfile?.approvalStatus === 'rejected',
    login,
    signup,
    register: signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
