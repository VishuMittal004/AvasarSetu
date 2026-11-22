"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Compass, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

const USERNAME_LOGIN_DOMAIN = "users.careercompass.app";

function authEmailForIdentifier(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  return normalized.includes("@") ? normalized : `${normalized}@${USERNAME_LOGIN_DOMAIN}`;
}

function hasSupabaseAuth() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project") &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your-anon-key")
  );
}

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const clearProfile = useProfileStore((state) => state.clearProfile);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (hasSupabaseAuth()) {
      setIsLoading(true);
      try {
        const { data, error: authError } = await createSupabaseClient().auth.signInWithPassword({
          email: authEmailForIdentifier(email),
          password,
        });
        if (authError) throw authError;
        if (!data.user) throw new Error("Sign in could not be completed.");
        login(data.user.email ?? email, "supabase");
        updateProfile({ email: data.user.email ?? email, name: data.user.user_metadata?.full_name });
        router.push("/dashboard");
      } catch {
        setError("We couldn't sign you in. Check your email and password, then try again.");
      } finally {
        setIsLoading(false);
      }
    } else if ((email === "demo@avasarsetu.app" || email === "demo@careercompass.app") && password === "Demo@123") {
      setIsLoading(true);
      clearProfile();
      login(email);
      router.push("/dashboard");
    } else {
      setError("Invalid credentials. Try demo@avasarsetu.app / Demo@123");
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!signupName.trim()) { setError("Please enter your name"); return; }
    if (signupPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    if (signupPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (!hasSupabaseAuth()) {
      setError("Account creation is unavailable until Supabase is configured. You can continue with the guest demo.");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error: authError } = await createSupabaseClient().auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          data: { full_name: signupName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });
      if (authError) throw authError;
      if (data.session && data.user) {
        updateProfile({ name: signupName.trim(), email: signupEmail.trim() });
        login(signupEmail.trim(), "supabase");
        router.push("/onboarding");
      } else {
        setNotice("Account created. Check your email to confirm your address, then sign in.");
      }
    } catch {
      setError("We couldn't create the account. Check the details or try a different email address.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestDemo = () => {
    setIsLoading(true);
    // Demo access must not silently invent a full profile and claim eligibility.
    clearProfile();
    login("guest@avasarsetu.app");
    router.push("/dashboard");
  };

  const handlePasswordReset = async () => {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Enter your account email first, then choose Forgot password.");
      return;
    }
    if (!hasSupabaseAuth()) {
      setError("Password reset is available after Supabase is configured.");
      return;
    }
    setIsLoading(true);
    try {
      const { error: resetError } = await createSupabaseClient().auth.resetPasswordForEmail(authEmailForIdentifier(email), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetError) throw resetError;
      setNotice("If an account exists for that email, a password reset link has been sent.");
    } catch {
      setNotice("If an account exists for that email, a password reset link has been sent.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Logo */}
      <Link href="/" className="auth-logo">
        <div className="auth-logo-icon">
          <Compass size={20} />
        </div>
        <span className="auth-logo-text">AvasarSetu</span>
      </Link>

      <div className="auth-card">
        <h1 className="auth-heading">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
        <p className="auth-subtext">
          {mode === "signin" ? (
            <>Or <button onClick={() => { setMode("signup"); setError(""); }}>create a new profile</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode("signin"); setError(""); }}>Sign in</button></>
          )}
        </p>

        {/* Tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab ${mode === "signin" ? "active" : ""}`} onClick={() => { setMode("signin"); setError(""); }}>Sign In</button>
          <button className={`auth-tab ${mode === "signup" ? "active" : ""}`} onClick={() => { setMode("signup"); setError(""); }}>Sign Up</button>
        </div>

        {error && <div className="error-box">{error}</div>}
        {notice && <div className="success-box" role="status">{notice}</div>}

        {mode === "signin" ? (
          <>
            {!hasSupabaseAuth() && <div className="demo-hint"><strong>Demo:</strong> demo@avasarsetu.app / Demo@123</div>}
            <form className="auth-form" onSubmit={handleSignInSubmit}>
              <div className="form-field">
                <label className="form-label">Username or Email</label>
                <input className="form-input" type="text" autoComplete="username" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="vishu or you@example.com" required />
              </div>
              <div className="form-field">
                <label className="form-label">Password</label>
                <div className="input-wrap">
                  <input className="form-input" type={showPassword ? "text" : "password"} autoComplete="current-password"
                    value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                  <button type="button" className="input-eye" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="remember-row">
                <label className="remember-label">
                  <input type="checkbox" style={{ accentColor: "#10b981" }} />
                  Remember me
                </label>
                <button type="button" className="forgot-link" onClick={handlePasswordReset} disabled={isLoading}>Forgot password?</button>
              </div>
              <button type="submit" className="btn-submit" disabled={isLoading}>
                {isLoading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </>
        ) : (
          <form className="auth-form auth-signup-form" onSubmit={handleSignUpSubmit}>
            <div className="form-field">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" autoComplete="name" value={signupName}
                onChange={e => setSignupName(e.target.value)} placeholder="Rahul Sharma" required />
            </div>
            <div className="form-field">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" autoComplete="email" value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="form-field">
              <label className="form-label">Password</label>
              <div className="input-wrap">
                <input className="form-input" type={showPassword ? "text" : "password"} autoComplete="new-password"
                  value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="At least 6 characters" required />
                <button type="button" className="input-eye" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Confirm Password</label>
              <div className="input-wrap">
                <input className="form-input" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" required />
                <button type="button" className="input-eye" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? "Creating account…" : "Sign Up & Get Started"}
            </button>
          </form>
        )}

        <button onClick={handleGuestDemo} className="btn-guest" style={{ marginTop: 12 }} disabled={isLoading}>
          <Sparkles size={16} /> Continue as Guest / Try Demo
        </button>

        <div className="auth-divider"><span>{mode === "signin" ? "New here?" : "Prefer guided setup?"}</span></div>
        <Link href="/onboarding" className="btn-secondary-link">Create Profile Directly</Link>
      </div>
    </div>
  );
}
