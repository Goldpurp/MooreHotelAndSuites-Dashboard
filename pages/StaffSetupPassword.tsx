import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import Logo from "../components/Logo";
import { api } from "../lib/api";
import type { PasswordRecoveryMode } from "../lib/passwordRecovery";

function readSetupParameters() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return {
    userId: params.get("userId")?.trim() ?? "",
    token: params.get("token") ?? "",
  };
}

const PasswordControl = ({
  id,
  label,
  value,
  visible,
  onChange,
  onToggle,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  disabled: boolean;
}) => (
  <label className="block space-y-2" htmlFor={id}>
    <span className="text-xs font-normal uppercase tracking-normal text-slate-400">{label}</span>
    <span className="relative block min-w-0">
      <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
      <input
        id={id}
        required
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        maxLength={128}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-14 text-sm text-white outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
      />
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="absolute inset-y-0 right-1 grid w-12 place-items-center text-slate-400 transition-colors hover:text-white"
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  </label>
);

const StaffSetupPassword: React.FC<{ mode: PasswordRecoveryMode }> = ({ mode }) => {
  const isReset = mode === "reset-password";
  const [setupParameters] = useState(readSetupParameters);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const incompleteLink = !setupParameters.userId || !setupParameters.token;
  const [error, setError] = useState(() => incompleteLink ? "This password link is incomplete. Return to sign in to request a new link." : "");

  useEffect(() => {
    // Remove the single-use secret without changing to a server path that may
    // 404 when the static host is refreshed directly.
    window.history.replaceState(null, "", `/#route=${mode}`);
  }, [mode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || completed) return;
    if (incompleteLink) {
      setError("This password link is incomplete. Return to sign in to request a new link.");
      return;
    }
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError("Use 12+ characters with upper and lowercase, a number, and a symbol.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.post(isReset ? "/api/Auth/reset-password" : "/api/Auth/setup-password", {
        userId: setupParameters.userId,
        token: setupParameters.token,
        newPassword: password,
        confirmNewPassword: confirmation,
      });
      setPassword("");
      setConfirmation("");
      setCompleted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This password link is invalid or expired. Request a new link from sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-[100dvh] place-items-center overflow-x-hidden bg-slate-950 px-4 py-6 text-slate-50 sm:px-6">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-6">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
            {completed ? <CheckCircle2 size={26} /> : <KeyRound size={26} />}
          </span>
          <p className="mt-5 text-xs font-normal uppercase tracking-normal text-blue-400">{isReset ? "Dashboard account recovery" : "Staff account setup"}</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {completed ? "Your password is ready" : isReset ? "Reset your password" : "Create your staff password"}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
            {completed
              ? "Your account is secured. Sign in with the password you just created."
              : isReset ? "Choose a new password for your Moore Hotels dashboard account." : "Choose a private password for your new Moore Hotels staff account."}
          </p>
        </div>

        {completed ? (
          <button
            type="button"
            onClick={() => window.location.replace("/")}
            className="w-full rounded-2xl bg-blue-600 py-4 text-xs font-medium uppercase tracking-normal text-white transition-colors hover:bg-blue-500 active:scale-[0.98]"
          >
            Continue to dashboard sign in
          </button>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <PasswordControl id="staffPassword" label="New password" value={password} visible={showPassword} onChange={setPassword} onToggle={() => setShowPassword((current) => !current)} disabled={loading} />
            <PasswordControl id="staffPasswordConfirmation" label="Confirm password" value={confirmation} visible={showConfirmation} onChange={setConfirmation} onToggle={() => setShowConfirmation((current) => !current)} disabled={loading} />

            {error && (
              <div className="flex items-start gap-3 text-rose-300" role="alert">
                <AlertCircle className="mt-0.5 shrink-0" size={18} />
                <p className="min-w-0 text-sm leading-5">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || incompleteLink}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 py-4 text-xs font-medium uppercase tracking-normal text-white transition-colors hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 active:scale-[0.98]"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              {loading ? "Saving password" : isReset ? "Reset password" : "Create password"}
            </button>
          </form>
        )}

        {!completed && (
          <p className="mt-7 text-center text-xs leading-5 text-slate-500">
            This secure link is single-use and expires after two hours.
            {isReset ? " If it expires, request a new reset link from sign in." : " If it expires, ask your administrator to send another setup link."}
            <a href="/" className="mt-3 block text-blue-400 hover:text-blue-300">Back to sign in</a>
          </p>
        )}
      </section>
    </main>
  );
};

export default StaffSetupPassword;
