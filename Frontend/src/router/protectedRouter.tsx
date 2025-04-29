import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface ProtectedRouteProps {
  children: React.ReactNode;
  authRequired?: boolean;
}

const ProtectedRoute = ({ children, authRequired = true }: ProtectedRouteProps) => {
  const user = useSelector((state: RootState) => state.user.user);
  const location = useLocation();

  // For protected routes (like /chat)
  if (authRequired && !user?.accessToken) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // For auth routes (like /login, /signup)
  if (!authRequired && user?.accessToken) {
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
