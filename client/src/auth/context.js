import { createContext } from 'react';

// Holds { user, status, login, register, logout, updateUser }.
// status is 'loading' while a saved token is being checked, then 'ready'.
export const AuthContext = createContext(null);
