import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthImagePattern from "../components/AuthImagePattern";
import toast from "react-hot-toast";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "../lib/firebaseconfig.js";
import axios from "axios";

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast.error("Full name is required");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Invalid email format");
      return false;
    }
    if (!formData.password) {
      toast.error("Password is required");
      return false;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // 1. Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // 2. Send verification email
      await sendEmailVerification(user);
      toast.success("Verification email sent!");

      // 3. Save user to MongoDB - UPDATED ENDPOINT AND DATA
      const response = await axios.post('/api/auth/firebase/signup', {
        email: user.email,
        firebaseUid: user.uid,
        fullName: formData.fullName,
        authProvider: "firebase" // Explicitly set auth provider
      });

      if (response.status === 201) {
        toast.success("Account created successfully!");
        navigate("/login");
      }
    } catch (error) {
      console.error("Signup error:", error);
      
      // Enhanced error handling
      if (error.code === "auth/email-already-in-use") {
        toast.error("Email already in use. Please login.");
      } else if (error.response?.status === 409) {
        toast.error("Account already exists. Please login.");
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Account creation failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ... (keep the rest of your JSX exactly as is) ...
};

export default SignUpPage;