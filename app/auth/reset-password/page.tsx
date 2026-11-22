"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Choose a password with at least 8 characters.");
    if (password !== confirmPassword) return setError("The passwords do not match.");
    setBusy(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      router.replace("/dashboard");
    } catch {
      setError("The reset link may be expired. Request a new password reset email and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1 className="auth-heading">Choose a new password</h1>
        <p className="auth-subtext">Set a new password for your AvasarSetu account.</p>
        {error && <div className="error-box" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={submit}>
          <label className="form-field">
            <span className="form-label">New password</span>
            <input className="form-input" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-label">Confirm password</span>
            <input className="form-input" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
          </label>
          <button className="btn-submit" disabled={busy}>{busy ? "Updating..." : "Update password"}</button>
        </form>
        <Link href="/login" className="btn-secondary-link">Back to sign in</Link>
      </section>
    </main>
  );
}
