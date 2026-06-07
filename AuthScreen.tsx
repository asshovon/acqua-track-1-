/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Droplet, Lock, Mail, User, ShieldAlert, CheckCircle, RefreshCw, Key } from "lucide-react";
import { UserProfile } from "../types";

interface AuthScreenProps {
  onLoginSuccess: (token: string, user: UserProfile) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot">("login");
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regWeight, setRegWeight] = useState("");
  const [regGender, setRegGender] = useState<"Male" | "Female" | "Other">("Male");
  const [regGoal, setRegGoal] = useState("2500");

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<"request" | "reset">("request");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick Demo logins helpers
  const handleQuickLogin = async (role: "user" | "admin") => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    const email = role === "user" ? "user@acqua.com" : "admin@acqua.com";
    const password = role === "user" ? "user123" : "admin123";

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login simulation failed");
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setErrorMessage("Please fill in all layout fields.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to log in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setErrorMessage("Please complete Name, Email and Password fields.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          dailyGoalMl: parseInt(regGoal),
          weightKg: regWeight ? parseInt(regWeight) : undefined,
          gender: regGender
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }
      setSuccessMessage("Registration successful! Hydrate in progress...");
      setTimeout(() => {
        onLoginSuccess(data.token, data.user);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to register new account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setErrorMessage("Email is required.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Password reset request failed");
      }
      setSuccessMessage(`Reset code generated! Please enter password with secret code.`);
      setResetToken(data.resetToken);
      setForgotStep("reset");
    } catch (err: any) {
      setErrorMessage(err.message || "Email address is not registered.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !resetToken) {
      setErrorMessage("New password is required.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }
      setSuccessMessage("Password reset successfully! Proceeding to Login...");
      setTimeout(() => {
        setForgotStep("request");
        setActiveTab("login");
        setLoginEmail(forgotEmail);
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete password reset.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="min-h-screen grid lg:grid-cols-12 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Brand Column */}
      <div id="brand-panel" className="lg:col-span-5 bg-gradient-to-br from-blue-600 to-sky-500 text-white flex flex-col justify-between p-8 xl:p-12 relative overflow-hidden">
        {/* Floating circles decoration */}
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-blue-400 opacity-20 blur-2xl"></div>
        <div className="absolute bottom-20 -right-20 w-80 h-80 rounded-full bg-sky-200 opacity-10 blur-3xl"></div>

        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md border border-white/20">
            <Droplet className="w-8 h-8 text-white fill-white animate-pulse" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Acqua Track</span>
        </div>

        <div className="my-auto py-12">
          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-tight mb-6">
            Master Your Hydration. <br />
            <span className="text-blue-100">Own Your Health.</span>
          </h1>
          <p className="text-blue-50 text-base xl:text-lg leading-relaxed max-w-md">
            Acqua Track integrates secure profile goal setting, daily trackers, weekly hydration statistics, reports, reminders, and admin tools in one responsive platform.
          </p>

          <div className="mt-8 space-y-4 max-w-sm">
            <div className="flex items-start gap-3.5 bg-white/10 p-3.5 rounded-xl backdrop-blur-sm border border-white/5">
              <span className="text-white text-xs font-bold leading-none bg-blue-400 px-2 py-1 rounded">✔</span>
              <p className="text-xs text-blue-100">Daily smart progress target based on age, sex & body-weight parameters.</p>
            </div>
            <div className="flex items-start gap-3.5 bg-white/10 p-3.5 rounded-xl backdrop-blur-sm border border-white/5">
              <span className="text-white text-xs font-bold leading-none bg-blue-400 px-2 py-1 rounded">✔</span>
              <p className="text-xs text-blue-100">Intake analytics charts, exportable PDF sheets & hourly notifications.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/15 pt-6 text-xs text-blue-150 flex justify-between">
          <span>Enterprise Water Analytics Platform</span>
          <span>v2.1 .NET Clean-styled Core</span>
        </div>
      </div>

      {/* Form Column */}
      <div id="form-panel" className="lg:col-span-7 flex flex-col justify-center items-center py-12 px-6 xl:px-16">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-slate-700/50">
          
          {/* Header tabs toggle (only show if not resetting pass) */}
          {forgotStep === "request" && (
            <div className="flex border-b border-slate-100 dark:border-slate-700 mb-8" id="auth-tabs">
              <button
                id="tab-login-btn"
                className={`flex-1 pb-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === "login"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                onClick={() => {
                  setActiveTab("login");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                Sign In
              </button>
              <button
                id="tab-register-btn"
                className={`flex-1 pb-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === "register"
                    ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                onClick={() => {
                  setActiveTab("register");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Feedback banners */}
          {errorMessage && (
            <div id="auth-error-banner" className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs p-3.5 rounded-xl mb-6 border border-red-100 dark:border-red-950/80">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div id="auth-success-banner" className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs p-3.5 rounded-xl mb-6 border border-emerald-100 dark:border-emerald-950/80 animate-bounce">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Tab 1: LOGIN */}
          {activeTab === "login" && forgotStep === "request" && (
            <form onSubmit={handleLoginSubmit} id="login-form" className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    id="login-email-input"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. user@acqua.com"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    id="forgot-password-link"
                    className="text-xs text-blue-600 hover:underline font-semibold"
                    onClick={() => {
                      setActiveTab("forgot");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    id="login-password-input"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-sky-500 text-white font-medium py-3 px-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/10 active:scale-98 transition-all disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Sign In to Workspace"}
              </button>
            </form>
          )}

          {/* Tab 2: REGISTER */}
          {activeTab === "register" && forgotStep === "request" && (
            <form onSubmit={handleRegisterSubmit} id="register-form" className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    id="reg-name-input"
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white pl-11 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    id="reg-email-input"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. Sabit@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white pl-11 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    id="reg-password-input"
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white pl-11 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Weight (Kg)</label>
                  <input
                    id="reg-weight-input"
                    type="number"
                    value={regWeight}
                    onChange={(e) => setRegWeight(e.target.value)}
                    placeholder="e.g. 70"
                    min="10"
                    max="300"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Gender</label>
                  <select
                    id="reg-gender-input"
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Daily Goal (ml)</label>
                <input
                  id="reg-goal-input"
                  type="number"
                  value={regGoal}
                  onChange={(e) => setRegGoal(e.target.value)}
                  placeholder="e.g. 2500"
                  min="500"
                  max="10000"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  required
                />
              </div>

              <button
                id="register-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-sky-500 text-white font-medium py-2.5 px-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/10 active:scale-98 transition-all disabled:opacity-50 mt-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Register Profile"}
              </button>
            </form>
          )}

          {/* Tab 3: FORGOT PASSWORD */}
          {activeTab === "forgot" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  id="back-to-login-btn"
                  onClick={() => {
                    setActiveTab("login");
                    setForgotStep("request");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-blue-600 font-semibold hover:underline"
                >
                  &larr; Back to Sign In
                </button>
              </div>

              {forgotStep === "request" ? (
                <form onSubmit={handleForgotSubmit} id="forgot-form" className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recover Password</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Provide the email associated with your Acqua Track account and we'll fetch your secret security restore token to reset the password.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Registered Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        id="forgot-email-input"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="user@acqua.com"
                        className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                  <button
                    id="forgot-submit-btn"
                    type="submit"
                    className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition-all text-sm"
                  >
                    Request Security Token
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} id="reset-form" className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Enter Security Token</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Security Code</label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        id="reset-token-input"
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="reset-xxxxx"
                        className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-200"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Create New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        id="reset-password-input"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-200"
                        required
                      />
                    </div>
                  </div>
                  <button
                    id="reset-submit-btn"
                    type="submit"
                    className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition-all"
                  >
                    Authorize Password Reset
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Quick Evaluate - Auto Login helpers for testers */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/60" id="dev-quick-logins">
            <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-3">Enterprise Quick Portal Logins</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="dev-login-user-btn"
                onClick={() => handleQuickLogin("user")}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50/50 dark:bg-slate-900/30 border border-blue-100/50 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-900/60 transition-all font-medium text-left"
              >
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Standard User</span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">user@acqua.com</span>
              </button>
              <button
                type="button"
                id="dev-login-admin-btn"
                onClick={() => handleQuickLogin("admin")}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-50/30 dark:bg-slate-900/30 border border-emerald-105/50 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-900/60 transition-all font-medium text-left"
              >
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Administrator</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">admin@acqua.com</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
