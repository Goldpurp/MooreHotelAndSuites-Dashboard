import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import Logo from "../components/Logo";
import { api } from "../lib/api";

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
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
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

const StaffSetupPassword: React.FC = () => {
  const [setupParameters] = useState(readSetupParameters);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.history.replaceState(null, "", "/setup-password");
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || completed) return;
    if (!setupParameters.userId || !setupParameters.token) {
      setError("This staff setup link is incomplete or expired. Ask an administrator to send a new setup link.");
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
      await api.post("/api/Auth/setup-password", {
        userId: setupParameters.userId,
        token: setupParameters.token,
        newPassword: password,
        confirmNewPassword: confirmation,
      });
      setPassword("");
      setConfirmation("");
      setCompleted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The staff setup link is invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-[100dvh] place-items-center overflow-x-hidden bg-slate-950 px-4 py-10 text-slate-50 sm:px-6">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
            {completed ? <CheckCircle2 size={26} /> : <KeyRound size={26} />}
          </span>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-blue-400">Staff account setup</p>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {completed ? "Your password is ready" : "Create your staff password"}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
            {completed
              ? "Your account is secured. Sign in with the password you just created."
              : "Choose a private password for your new Moore Hotels staff account."}
          </p>
        </div>

        {completed ? (
          <button
            type="button"
            onClick={() => window.location.replace("/")}
            className="w-full rounded-2xl bg-blue-600 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-blue-500 active:scale-[0.98]"
          >
            Continue to staff sign in
          </button>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <PasswordControl id="staffPassword" label="New password" value={password} visible={showPassword} onChange={setPassword} onToggle={() => setShowPassword((current) => !current)} disabled={loading} />
            <PasswordControl id="staffPasswordConfirmation" label="Confirm password" value={confirmation} visible={showConfirmation} onChange={setConfirmation} onToggle={() => setShowConfirmation((current) => !current)} disabled={loading} />

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-300" role="alert">
                <AlertCircle className="mt-0.5 shrink-0" size={18} />
                <p className="min-w-0 text-sm leading-5">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 active:scale-[0.98]"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              {loading ? "Creating password" : "Create password"}
            </button>
          </form>
        )}

        {!completed && (
          <p className="mt-7 text-center text-xs leading-5 text-slate-500">
            This secure link is single-use and expires after two hours. If it fails, ask your administrator to send another setup link.
          </p>
        )}
      </section>
    </main>
  );
};

export default StaffSetupPassword;
