import { useDispatch } from 'react-redux';
import { clearUser } from '@/store/slice';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const logout = () => {
    dispatch(clearUser());
    navigate('/', { replace: true });
  };

  return { logout };
};