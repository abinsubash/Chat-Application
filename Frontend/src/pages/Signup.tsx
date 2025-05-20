import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";

const Signup = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "", // Add username field
    name: ""
  });

  const [error, setError] = useState({
    emailError: "",
    passwordError: "",
    usernameError: "", // Add username error
    nameError: "",
    serverError: ""
  });

  const navigate = useNavigate();

  const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex: RegExp = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  const usernameRegex: RegExp = /^[a-zA-Z0-9_]{3,16}$/; // Username validation

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let isValid = true;
    const newErrors = {
      emailError: "",
      passwordError: "",
      usernameError: "",
      nameError: "",
      serverError: ""
    };

    if (!emailRegex.test(form.email)) {
      newErrors.emailError = "Enter a valid email";
      isValid = false;
    }

    if (!passwordRegex.test(form.password)) {
      newErrors.passwordError = "Password must be 6+ characters with letters & numbers";
      isValid = false;
    }

    if (!usernameRegex.test(form.username)) {
      newErrors.usernameError = "Username must be 3-16 characters (letters, numbers, underscore)";
      isValid = false;
    }

    if (!form.name.trim()) {
      newErrors.nameError = "Name is required";
      isValid = false;
    }

    setError(newErrors);

    if (isValid) {
      try {
        const response = await axios.post("https://chat-application-lf8s.onrender.com/signup", form);
        if (!response.data.success) {
          toast.error(response.data.message);
        } else {
          toast.success("Signup successful!");
          navigate("/");
        }
      } catch (err: any) {
        if (err.response?.data?.message) {
          toast.error(err.response.data.message);
        } else {
          setError(prev => ({
            ...prev,
            serverError: "Signup failed. Please try again."
          }));
        }
      }
    }
  };

  return (
    <div className="h-screen w-full bg-black flex items-center justify-center">
      <ToastContainer />
      <div className="bg-black p-8 rounded-xl shadow-xl w-full max-w-sm border-2 border-white">
        <h2 className="text-3xl font-bold mb-6 text-center text-white">Signup</h2>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-semibold text-white">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-4 py-2 mt-1 rounded-lg border-2 border-white focus:outline-none bg-white focus:ring-2 focus:ring-green-400"
              placeholder="Choose a username"
            />
            <small className="text-red-500">{error.usernameError}</small>
          </div>
          
          <div>
            <label className="text-sm font-semibold text-white">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((value) => ({ ...value, name: e.target.value }))}
              className="w-full px-4 py-2 mt-1 rounded-lg focus:outline-none focus:ring-2 border-2 border-white bg-white focus:ring-green-400"
              placeholder="Enter your name"
            />
            <small className="text-red-500">{error.nameError}</small>
          </div>

          <div>
            <label className="text-sm font-semibold text-white">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((value) => ({ ...value, email: e.target.value }))
              }
              className="w-full px-4 py-2 mt-1 rounded-lg border-2 border-white focus:outline-none bg-white focus:ring-2 focus:ring-green-400"
              placeholder="Enter your email"
            />
            <small className="text-red-500">{error.emailError}</small>
          </div>

          <div>
            <label className="text-sm font-semibold text-white">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((value) => ({ ...value, password: e.target.value }))
              }
              className="w-full px-4 py-2 mt-1 rounded-lg border-2 border-white focus:outline-none bg-white focus:ring-2 focus:ring-green-400"
              placeholder="Enter your password"
            />
            <small className="text-red-500">{error.passwordError}</small>
          </div>
          <span className="text-white">
            already have account ?{" "}
            <a className="cursor-pointer" onClick={() => navigate("/")}>
              Login
            </a>
          </span>
          <button
            type="submit"
            className="mt-4 bg-green-500 text-white font-semibold py-2 rounded-lg hover:bg-green-400 transition"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
};

export default Signup;
