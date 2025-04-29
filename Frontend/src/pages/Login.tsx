import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { setUser } from "@/store/slice";
import type { UserData } from '@/store/slice';
import api from '@/services/api';

const Login = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.user); // Fix: change from state.user to state.user.user

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState({
    emailError: "",
    passwordError: "",
    serverError: "",
  });

  const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex: RegExp = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let isValid = true;
    const newErrors = {
      emailError: "",
      passwordError: "",
      serverError: "",
    };

    if (!emailRegex.test(form.email)) {
      newErrors.emailError = "Enter a valid email";
      isValid = false;
    }

    if (!passwordRegex.test(form.password)) {
      newErrors.passwordError =
        "Password must be 6+ characters with letters & numbers";

      isValid = false;
    }

    setError(newErrors);

    if (isValid) {
      try {
        const response = await api.post("/login", form);
        if (!response.data.success) {
          toast.error(response.data.message);
        } else {
          console.log('This is responce data',response.data.id)
          const userData: UserData = {
            _id:response.data.user._id,
            accessToken: response.data.accessToken,
            name: response.data.user.name,
            email: response.data.user.email,
            username: response.data.user.username
          };
          dispatch(setUser(userData));
          navigate("/chat", { replace: true });
        }
      } catch (err) {
        setError((prev) => ({
          ...prev,
          serverError: "Login failed. Please try again.",
        }));
      }
    }
  };

  useEffect(() => {
    console.log('Current user state:', user);
  }, [user]);

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4">
      <ToastContainer position="top-center" theme="dark" />

      <div className="bg-gray-900 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 backdrop-blur-lg">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-white">
          Welcome Back
        </h2>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-gray-200">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 mt-1 rounded-lg border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              placeholder="Enter your email"
            />
            {error.emailError && (
              <small className="text-red-400 mt-1 block">{error.emailError}</small>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-200">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 mt-1 rounded-lg border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              placeholder="Enter your password"
            />
            {error.passwordError && (
              <small className="text-red-400 mt-1 block">{error.passwordError}</small>
            )}
          </div>

          {error.serverError && (
            <div className="text-red-400 text-center text-sm">{error.serverError}</div>
          )}

          <div className="text-gray-300 text-sm text-center">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="text-green-500 hover:text-green-400 font-medium transition-colors"
            >
              Sign up
            </button>
          </div>

          <button
            type="submit"
            className="mt-2 bg-green-500 text-white font-semibold py-3 rounded-lg hover:bg-green-600 transition-all transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
