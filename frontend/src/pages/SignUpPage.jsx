import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import { Link } from "react-router-dom";

// Import Firebase SDK
import { createUserWithEmailAndPassword,sendEmailVerification } from "firebase/auth";
import { auth } from "../lib/firebaseconfig"; // ✅ Use the exported one
const SignupPage = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login); // Assuming this sets user + token
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: ""
  });
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [validationError, setValidationError] = useState("");

  const validateForm = () => {
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      setValidationError("Please enter your full name");
      return false;
    }
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

  setIsSigningUp(true);

  try {
    // 1. Create Firebase user (unverified)
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.email.toLowerCase().trim(),
      formData.password
    );

    const user = userCredential.user;

    // 2. Send verification email
    await sendEmailVerification(user);
    toast.success(`Verification email sent to ${user.email}`);

    // 3. Set up a listener for email verification
    const interval = setInterval(async () => {
      // Refresh the user object to get latest status
      await user.reload();

      if (user.emailVerified) {
        clearInterval(interval);

        // 4. Only proceed to backend AFTER verification
        const response = await fetch('http://localhost:5001/api/auth/firebase/signup', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            firebaseUid: user.uid,
            fullName: formData.fullName.trim()
          })
        });

        const result = await response.json();
        console.log("signup result",result);

        if (result.success) {
          login(result.user, result.token); // Zustand store update
          toast.success("Account verified and created successfully!");
          navigate("/", { replace: true });
        } else {
          throw new Error(result.message || "Failed to complete signup");
        }
      }
    }, 3000); // Check every 3 seconds

    // Cleanup interval if component unmounts
    return () => clearInterval(interval);

  } catch (error) {
    console.error("Signup error:", error);
    let message = "Signup failed. Please try again.";
    
    if (error.code === 'auth/email-already-in-use') {
      message = "Email already in use. Try logging in instead.";
    } else if (error.code === 'auth/weak-password') {
      message = "Password should be at least 6 characters.";
    }
    
    toast.error(message);
  } finally {
    setIsSigningUp(false);
  }
};

  return (
    <div className="h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Create Account</h1>
              <p className="text-base-content/60">Sign up to start messaging</p>
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
                <span className="label-text font-medium">Full Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  setValidationError("");
                }}
              />
            </div>

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
                  autoComplete="new-password"
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
              disabled={isSigningUp}
            >
              {isSigningUp ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2">Creating account...</span>
                </>
              ) : (
                "Sign up"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Already have an account?{" "}
              <Link to="/login" className="link link-primary">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <AuthImagePattern
        title={"Join the conversation!"}
        subtitle={"Create an account to start sending messages and connecting with others."}
      />
    </div>
  );
};

export default SignupPage;