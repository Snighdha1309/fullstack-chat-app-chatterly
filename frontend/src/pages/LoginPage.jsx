import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Mail, Lock,MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import { Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebaseconfig"; // ✅ Use the exported one

const LoginPage = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login); // This should eventually set the user/token
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ 
    email: "", 
    password: "" 
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [validationError, setValidationError] = useState("");

  const validateForm = () => {
    if (!formData.email || !formData.email.includes("@")) {
      setValidationError("Please enter a valid email address");
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      setValidationError("Password must be at least 6 characters");
      return false;
    }
    setValidationError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoggingIn(true);

    try {
      // Step 1: Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email.toLowerCase().trim(),
        formData.password
      );

      const firebaseUser = userCredential.user;

      // Step 2: Send UID and email to backend for MongoDB sync
      const response = await fetch("/api/auth/firebase-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: firebaseUser.email,
          firebaseUid: firebaseUser.uid
        })
      });

      const result = await response.json();

      if (result.success) {
        // Step 3: Save token and user info in Zustand store
        login(result.user, result.token); // Adjust based on how your store works

        toast.success("Login successful!");
        navigate("/", { replace: true }); // Prevent back navigation to login
      } else {
        toast.error(result.message || "Login failed");
      }

    } catch (error) {
      console.error("Firebase or backend login error:", error.message);
      toast.error("Invalid email or password");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Welcome Back</h1>
              <p className="text-base-content/60">Sign in to your account</p>
            </div>
          </div>

          {validationError && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className="input input-bordered w-full pl-10"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setValidationError("");
                  }}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered w-full pl-10"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setValidationError("");
                  }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-base-content/40" />
                  ) : (
                    <Eye className="h-5 w-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full" 
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2">Signing in...</span>
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Don't have an account?{" "}
              <Link to="/signup" className="link link-primary">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>

      <AuthImagePattern
        title={"Welcome back!"}
        subtitle={"Sign in to continue your conversations and catch up with your messages."}
      />
    </div>
  );
};

export default LoginPage;