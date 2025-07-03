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
        const response = await fetch('/api/auth/firebase/signup', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            firebaseUid: user.uid,
            fullName: formData.fullName.trim()
          })
        });

        const result = await response.json();

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