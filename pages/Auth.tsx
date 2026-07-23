import React, { useState } from "react";
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useHotel } from "../store/HotelContext";
import { sileo } from "sileo";
import Logo from "../components/Logo";
import { api } from "../lib/api";
import { calculateStrength } from "../lib/utils";

const Auth: React.FC = () => {
  const { login } = useHotel();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [resetEmail, setResetEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      sileo.success({
        title: 'Logged In',
        description: 'You have successfully logged in.'
      });
    } catch (err: any) {
      sileo.error({
        title: 'Login Failed',
        description: err.message || "Check your details and try again."
      });
      setError(err.message || "Wrong email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      await api.post("/api/Auth/forgot-password", { email: resetEmail });
      sileo.success({
        title: 'Email Sent',
        description: 'We sent a reset link to your email.'
      });
      setSuccess(
        "Please check your email for reset instructions.",
      );
      setResetEmail("");
    } catch (err: any) {
      sileo.error({
        title: 'Error',
        description: err.message || "Something went wrong. Please try again."
      });
      setError(
        err.message || "Could not reset password.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-950 p-3 sm:p-6 font-sans text-slate-50">
      <div className="w-full max-w-6xl min-h-[560px] lg:h-[700px] flex overflow-hidden rounded-3xl sm:rounded-[3rem] glass-card shadow-2xl animate-in zoom-in-95 duration-700">
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-550 to-indigo-900 p-16 flex-col justify-between relative border-r border-white/5">
          <div className="relative z-10">
            <Logo size="2xl" className="mb-8" />
            <h1 className="text-4xl font-black text-white tracking-tight leading-tight uppercase">
              Moore Hotels <br /> & Suites
            </h1>
            <p className="text-blue-100/80 text-md mt-6 font-medium max-w-sm leading-relaxed">
              Log in to your account.
            </p>
          </div>
          <div className="relative z-10">
            <div className="max-w-fit flex items-center gap-4 p-4 bg-black/20 rounded-2xl border border-white/10 backdrop-blur-md">
              <p className="text-blue-200 text-xs font-black uppercase tracking-widest leading-relaxed">
                Welcome to Moore Hotels.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-slate-900/40 p-5 sm:p-10 lg:p-20 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            {mode === "login" ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-3xl font-black text-white tracking-tight uppercase mb-2">
                  Log In
                </h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-10">
                  Enter your email and password
                </p>
                
                {error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 mb-6 animate-in shake">
                    <AlertCircle size={18} />
                    <p className="text-[11px] font-black uppercase tracking-tight leading-snug">
                      {error}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
                        size={18}
                      />
                      <input
                        type="email"
                        required
                        placeholder="name@moorehotels.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setMode("reset")}
                        className="text-[9px] text-blue-400 font-black uppercase tracking-widest hover:text-blue-300 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
                        size={18}
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-all z-20 p-1"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400">
                      <AlertCircle size={18} />
                      <p className="text-[11px] font-black uppercase tracking-tight leading-snug">
                        {error}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 mt-10 shadow-2xl active:scale-95"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        Login <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                <button
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest mb-8"
                >
                  <ChevronLeft size={16} /> Back to Login
                </button>

                <h2 className="text-3xl font-black text-white tracking-tight uppercase mb-2">
                  Reset Password
                </h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-10">
                  Enter your email below.
                </p>

                {error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 mb-6 animate-in shake">
                    <AlertCircle size={18} />
                    <p className="text-[11px] font-black uppercase tracking-tight leading-snug">
                      {error}
                    </p>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
                        size={18}
                      />
                      <input
                        type="email"
                        required
                        placeholder="name@moorehotels.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>

                  {success && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-400">
                      <CheckCircle2 size={18} />
                      <p className="text-[11px] font-black uppercase tracking-tight leading-snug">
                        {success}
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400">
                      <AlertCircle size={18} />
                      <p className="text-[11px] font-black uppercase tracking-tight leading-snug">
                        {error}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !!success}
                    className="w-full bg-white text-slate-950 hover:bg-slate-200 disabled:bg-slate-800 disabled:text-slate-500 font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 mt-10 shadow-2xl active:scale-95"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        Send Reset Link <RefreshCw size={18} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
