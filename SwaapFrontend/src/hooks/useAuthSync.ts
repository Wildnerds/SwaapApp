import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth } from '@/context/AuthContext';
import { setAuth, logout as logoutRedux } from '@/store/redux/slices/authSlice';

export const useAuthSync = () => {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user && token) {
      dispatch(setAuth({ user, token }));
    } else {
      dispatch(logoutRedux());
    }
  }, [dispatch, user, token, isAuthenticated]);
};