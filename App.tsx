/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Droplet,
  Plus,
  Trash2,
  Edit,
  Settings,
  Users,
  TrendingUp,
  Calendar,
  Bell,
  User,
  Shield,
  LogOut,
  FileText,
  PlusCircle,
  Search,
  Filter,
  Check,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Sparkles,
  Info,
  Sliders,
  Database,
  Printer,
  ChevronRight,
  Activity,
  Heart
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Cell
} from "recharts";
import { UserProfile, WaterIntake, HydrationReminder, SystemSettings, UserRole } from "./types";
import AuthScreen from "./components/AuthScreen";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("acqua_token"));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "reminders" | "profile" | "admin">("dashboard");

  // App metrics & lists
  const [allIntakes, setAllIntakes] = useState<WaterIntake[]>([]);
  const [reminders, setReminders] = useState<HydrationReminder[]>([]);
  const [loadingIntakes, setLoadingIntakes] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<{ type: "success" | "info" | "error"; text: string } | null>(null);

  // Quick reminder system
  const [hourlyReminderTimer, setHourlyReminderTimer] = useState<any>(null);

  // New Intake log state
  const [quickAmount, setQuickAmount] = useState<number>(250);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<"Glass" | "Small Bottle" | "Large Bottle" | "Flask" | "Custom">("Glass");
  const [drinkNotes, setDrinkNotes] = useState("");
  const [drinkTime, setDrinkTime] = useState("");
  const [drinkDate, setDrinkDate] = useState("");

  // Edit intake state
  const [editingIntake, setEditingIntake] = useState<WaterIntake | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editSource, setEditSource] = useState<"Glass" | "Small Bottle" | "Large Bottle" | "Flask" | "Custom">("Glass");
  const [editNotes, setEditNotes] = useState("");
  const [editDatetime, setEditDatetime] = useState("");

  // Reminder states
  const [newReminderTime, setNewReminderTime] = useState("09:00");
  const [newReminderLabel, setNewReminderLabel] = useState("");

  // History Filter states
  const [historySearch, setHistorySearch] = useState("");
  const [historySourceFilter, setHistorySourceFilter] = useState("all");
  const [historyDateFilter, setHistoryDateFilter] = useState<"all" | "today" | "week" | "month">("all");

  // Admin section states
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminSettings, setAdminSettings] = useState<SystemSettings | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminUserEdit, setAdminUserEdit] = useState<UserProfile | null>(null);
  const [adminUserEditRole, setAdminUserEditRole] = useState<UserRole>("User");
  const [adminUserEditGoal, setAdminUserEditGoal] = useState<string>("");

  // Theme support
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    localStorage.getItem("acqua_theme") === "dark"
  );

  // Fetch logged in profile
  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  // Load water data on valid user login
  useEffect(() => {
    if (currentUser) {
      fetchIntakes();
      fetchReminders();
      if (currentUser.role === "Admin") {
        fetchAdminData();
      }
      
      // Auto prefill current date/time on loads
      const now = new Date();
      setDrinkDate(now.toISOString().substring(0, 10));
      setDrinkTime(now.toTimeString().substring(0, 5));
    }
  }, [currentUser]);

  // Theme Sync effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("acqua_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("acqua_theme", "light");
    }
  }, [isDarkMode]);

  // Push hydration tracker random notifications simulator
  useEffect(() => {
    if (currentUser?.remindersEnabled) {
      const intervalMl = currentUser.reminderIntervalMinutes * 60 * 1000;
      const interval = setInterval(() => {
        triggerStatusNotification("info", "Time for hydration! Tap 'Quick Log' to track your next water intake.");
      }, intervalMl);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const triggerStatusNotification = (type: "success" | "info" | "error", text: string) => {
    setNotificationMessage({ type, text });
    setTimeout(() => {
      setNotificationMessage(null);
    }, 5000);
  };

  const fetchProfile = async () => {
    if (!token) return;
    setLoadingUser(true);
    try {
      const resp = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setCurrentUser(data);
      } else {
        // Clear stale credentials safely
        handleLogout();
      }
    } catch (e) {
      console.error(e);
      triggerStatusNotification("error", "Failed to connect to full-stack server.");
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchIntakes = async () => {
    if (!token) return;
    setLoadingIntakes(true);
    try {
      const resp = await fetch("/api/intakes", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        // Sort newest logs first
        data.sort((a: WaterIntake, b: WaterIntake) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAllIntakes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingIntakes(false);
    }
  };

  const fetchReminders = async () => {
    if (!token) return;
    try {
      const resp = await fetch("/api/reminders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setReminders(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminData = async () => {
    if (!token || currentUser?.role !== "Admin") return;
    setAdminLoading(true);
    try {
      const [uResp, stResp, sResp] = await Promise.all([
        fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/settings", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (uResp.ok) setAdminUsers(await uResp.json());
      if (stResp.ok) setAdminStats(await stResp.json());
      if (sResp.ok) setAdminSettings(await sResp.json());
    } catch (e) {
      console.error("Failed to load admin telemetry dashboard.", e);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleLoginSuccess = (userToken: string, user: UserProfile) => {
    localStorage.setItem("acqua_token", userToken);
    setToken(userToken);
    setCurrentUser(user);
    triggerStatusNotification("success", `Welcome back, ${user.name}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem("acqua_token");
    setToken(null);
    setCurrentUser(null);
    setAllIntakes([]);
    setReminders([]);
    setActiveTab("dashboard");
    triggerStatusNotification("info", "Successfully logged out of server session.");
  };

  // Profile management submission
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const resp = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: currentUser.name,
          dailyGoalMl: currentUser.dailyGoalMl,
          weightKg: currentUser.weightKg,
          gender: currentUser.gender,
          remindersEnabled: currentUser.remindersEnabled,
          reminderIntervalMinutes: currentUser.reminderIntervalMinutes
        })
      });

      if (resp.ok) {
        const updated = await resp.json();
        setCurrentUser(updated);
        triggerStatusNotification("success", "Personal goals and biological parameters updated successfully!");
      } else {
        const err = await resp.json();
        triggerStatusNotification("error", err.error || "Failed to update profile.");
      }
    } catch (e) {
      triggerStatusNotification("error", "Error connecting to backend server.");
    }
  };

  // Adding single water intake
  const handleAddIntake = async (amount: number, source: typeof selectedSource, customNotes?: string) => {
    if (!token) return;

    // Calculate dynamic accurate ISO timestamp
    let targetIso = new Date().toISOString();
    if (drinkDate && drinkTime) {
      const dateObj = new Date(`${drinkDate}T${drinkTime}:00`);
      if (!isNaN(dateObj.getTime())) {
        targetIso = dateObj.toISOString();
      }
    }

    try {
      const resp = await fetch("/api/intakes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amountMl: amount,
          source,
          notes: customNotes || drinkNotes,
          timestamp: targetIso
        })
      });

      if (resp.ok) {
        const newLog = await resp.json();
        setAllIntakes((prev) => [newLog, ...prev]);
        setDrinkNotes("");
        setCustomAmount("");
        
        // Reset timers to focus state
        const now = new Date();
        setDrinkDate(now.toISOString().substring(0, 10));
        setDrinkTime(now.toTimeString().substring(0, 5));

        // Celebrate goals met or status update
        const totalToday = getTotalToday([...allIntakes, newLog]);
        if (currentUser && totalToday >= currentUser.dailyGoalMl) {
          triggerStatusNotification("success", `Excellent hydration! Daily goal of ${currentUser.dailyGoalMl} ml has been unlocked today! 🌟 🎉`);
        } else {
          triggerStatusNotification("success", `Recorded ${amount} ml of water intake via ${source}. Drink in progress!`);
        }

        // Refresh analytics on the fly
        if (currentUser?.role === "Admin") {
          fetchAdminData();
        }
      }
    } catch (e) {
      triggerStatusNotification("error", "Failed to register water logging.");
    }
  };

  // Submit custom intake option
  const handleCustomIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(customAmount || "0");
    if (parsedAmount <= 0) {
      triggerStatusNotification("error", "Water volume must be a positive number.");
      return;
    }
    handleAddIntake(parsedAmount, selectedSource);
  };

  // Inline edit submission
  const handleEditIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIntake || !token) return;

    const parsedAmount = parseInt(editAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      triggerStatusNotification("error", "Volume size must be valid");
      return;
    }

    try {
      const resp = await fetch(`/api/intakes/${editingIntake.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amountMl: parsedAmount,
          source: editSource,
          notes: editNotes,
          timestamp: editDatetime ? new Date(editDatetime).toISOString() : editingIntake.timestamp
        })
      });

      if (resp.ok) {
        const updated = await resp.json();
        setAllIntakes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setEditingIntake(null);
        triggerStatusNotification("success", "Intake log correction updated on the database cloud successfully.");
        // Refresh admin metrics matching
        if (currentUser?.role === "Admin") fetchAdminData();
      } else {
        triggerStatusNotification("error", "Unable to update log details.");
      }
    } catch (e) {
      triggerStatusNotification("error", "Network connection issues.");
    }
  };

  // Handle drink log deletes
  const handleDeleteIntake = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this water intake entry?") || !token) return;

    try {
      const resp = await fetch(`/api/intakes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.ok) {
        setAllIntakes((prev) => prev.filter((item) => item.id !== id));
        triggerStatusNotification("success", "Hydration entry removed successfully.");
        if (currentUser?.role === "Admin") fetchAdminData();
      } else {
        triggerStatusNotification("error", "Failed to remove entry from server.");
      }
    } catch (e) {
      triggerStatusNotification("error", "Failed to connect to database host.");
    }
  };

  // Reminder alarm creation
  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const resp = await fetch("/api/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          time: newReminderTime,
          label: newReminderLabel || "Clean Sip Break"
        })
      });

      if (resp.ok) {
        const entry = await resp.json();
        setReminders((prev) => [...prev, entry]);
        setNewReminderLabel("");
        triggerStatusNotification("success", `Created clock reminder at ${newReminderTime}.`);
      }
    } catch (e) {
      triggerStatusNotification("error", "Error creating alert reminder.");
    }
  };

  // Toggle alert on/off
  const handleToggleReminder = async (item: HydrationReminder) => {
    if (!token) return;
    try {
      const resp = await fetch(`/api/reminders/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled: !item.enabled
        })
      });

      if (resp.ok) {
        const updated = await resp.json();
        setReminders((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        triggerStatusNotification("success", `Reminder alert state toggled!`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete dynamic alarm
  const handleDeleteReminder = async (id: string) => {
    if (!token) return;
    try {
      const resp = await fetch(`/api/reminders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
        triggerStatusNotification("success", "Alarm deleted.");
      }
    } catch (e) {
       console.error("failed reminder delete");
    }
  };

  // Admin user edit submit
  const handleAdminUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUserEdit || !token) return;

    try {
      const resp = await fetch(`/api/admin/users/${adminUserEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          role: adminUserEditRole,
          dailyGoalMl: parseInt(adminUserEditGoal)
        })
      });

      if (resp.ok) {
        const updated = await resp.json();
        setAdminUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setAdminUserEdit(null);
        triggerStatusNotification("success", `User account ${updated.name} updated with custom metadata on database cloud.`);
        fetchAdminData();
      } else {
        const err = await resp.json();
        triggerStatusNotification("error", err.error || "Update denied.");
      }
    } catch (e) {
      triggerStatusNotification("error", "Error loading payload configuration.");
    }
  };

  // Admin remove user
  const handleAdminUserDelete = async (targetId: string) => {
    if (!confirm("Are you sure you want to completely erase this user account? All historical intake records and customized scheduler elements will be permanently deleted.") || !token) return;

    try {
      const resp = await fetch(`/api/admin/users/${targetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.ok) {
        setAdminUsers((prev) => prev.filter((u) => u.id !== targetId));
        triggerStatusNotification("success", "User profile and entire logs deleted from database.");
        fetchAdminData();
      } else {
        const err = await resp.json();
        triggerStatusNotification("error", err.error || "Error during removal.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Admin settings update
  const handleAdminSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSettings || !token) return;

    try {
      const resp = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(adminSettings)
      });

      if (resp.ok) {
        const updated = await resp.json();
        setAdminSettings(updated);
        triggerStatusNotification("success", "Enterprise application microservice settings updated.");
      }
    } catch (e) {
      triggerStatusNotification("error", "Failed to synchronize system settings.");
    }
  };

  // Helper date metrics & calculations
  const isToday = (timestampStr: string): boolean => {
    const today = new Date();
    const testDate = new Date(timestampStr);
    return (
      today.getDate() === testDate.getDate() &&
      today.getMonth() === testDate.getMonth() &&
      today.getFullYear() === testDate.getFullYear()
    );
  };

  const getDrunkOnDate = (date: Date): number => {
    return allIntakes
      .filter((i) => {
        const d = new Date(i.timestamp);
        return (
          d.getDate() === date.getDate() &&
          d.getMonth() === date.getMonth() &&
          d.getFullYear() === date.getFullYear()
        );
      })
      .reduce((sum, item) => sum + item.amountMl, 0);
  };

  const getTotalToday = (list: WaterIntake[] = allIntakes): number => {
    return list.filter((item) => isToday(item.timestamp)).reduce((sum, item) => sum + item.amountMl, 0);
  };

  const computeActiveStreak = (): number => {
    if (allIntakes.length === 0) return 0;
    
    let streakCount = 0;
    const now = new Date();
    
    // Check backwards from today
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date();
      checkDate.setDate(now.getDate() - i);
      const consumedOnDay = getDrunkOnDate(checkDate);
      
      const targetGoal = currentUser?.dailyGoalMl || 2500;
      if (consumedOnDay >= targetGoal) {
        streakCount++;
      } else {
        // If it's today and not yet met, we can keep the yesterday streak alive.
        // But if we broke yesterday state, then we stop.
        if (i === 0) {
          // If today has some water but goal not met, streak continues from yesterday's check
          continue;
        } else {
          break;
        }
      }
    }
    return streakCount;
  };

  // Process charting data for last 7 days
  const getWeeklyChronicleData = () => {
    const data = [];
    const daysArr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const totalMl = getDrunkOnDate(date);
      const dayName = daysArr[date.getDay()];
      const dayStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      
      data.push({
        dayName: `${dayName} (${dayStr})`,
        amountMl: totalMl,
        goalMl: currentUser?.dailyGoalMl || 2500
      });
    }
    return data;
  };

  // Area chart data (30 days partitioned by days or weeks)
  const getMonthlyAggregateData = () => {
    const data = [];
    const now = new Date();
    for (let i = 29; i >= 0; i -= 3) {
      const tDate = new Date();
      tDate.setDate(now.getDate() - i);
      let cumulativeSum = 0;
      
      // Calculate avg of these 3 days
      for (let j = 0; j < 3; j++) {
        const d = new Date();
        d.setDate(now.getDate() - i - j);
        cumulativeSum += getDrunkOnDate(d);
      }

      const meanMl = Math.round(cumulativeSum / 3);
      const dateStr = tDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      data.push({
        dateRange: dateStr,
        averageVolume: meanMl
      });
    }
    return data;
  };

  // Calculate generic water break reminders for dynamic alerts
  const todayTotal = getTotalToday();
  const currentGoal = currentUser?.dailyGoalMl || 2200;
  const currentPercentage = Math.min(Math.round((todayTotal / currentGoal) * 100), 100);
  const remainingMl = Math.max(currentGoal - todayTotal, 0);

  // Compute historic container breakdown metrics
  const getContainerAesthetics = (source: WaterIntake["source"]) => {
    switch (source) {
      case "Glass": return { bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800", text: "text-blue-600 dark:text-blue-400", ml: "250 ml" };
      case "Small Bottle": return { bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-600 dark:text-emerald-400", ml: "500 ml" };
      case "Flask": return { bg: "bg-purple-50 dark:bg-purple-950/20", border: "border-purple-200 dark:border-purple-800", text: "text-purple-600 dark:text-purple-400", ml: "750 ml" };
      case "Large Bottle": return { bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-600 dark:text-amber-400", ml: "1000 ml" };
      default: return { bg: "bg-indigo-50 dark:bg-indigo-950/20", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-600 dark:text-indigo-400", ml: "Custom" };
    }
  };

  // Filtered History list
  const getFilteredIntakes = () => {
    return allIntakes.filter((item) => {
      // Search note matching
      const targetText = (item.notes || "").toLowerCase() + " " + item.source.toLowerCase() + " " + item.amountMl;
      if (historySearch && !targetText.includes(historySearch.toLowerCase())) {
        return false;
      }

      // Container filter
      if (historySourceFilter !== "all" && item.source !== historySourceFilter) {
        return false;
      }

      // Date filtering
      if (historyDateFilter === "today") {
        return isToday(item.timestamp);
      } else if (historyDateFilter === "week") {
        const weekLimit = new Date();
        weekLimit.setDate(weekLimit.getDate() - 7);
        return new Date(item.timestamp).getTime() >= weekLimit.getTime();
      } else if (historyDateFilter === "month") {
        const monthLimit = new Date();
        monthLimit.setDate(monthLimit.getDate() - 30);
        return new Date(item.timestamp).getTime() >= monthLimit.getTime();
      }

      return true;
    });
  };

  // Dynamic file exporter
  const triggerCSVDownload = () => {
    const list = getFilteredIntakes();
    const headers = ["ID", "Email", "Volume (ML)", "Source Type", "Timestamp (UTC)", "Custom Notes"];
    const rows = list.map((item) => [
      item.id,
      currentUser?.email || "",
      item.amountMl,
      item.source,
      item.timestamp,
      item.notes ? `"${item.notes.replace(/"/g, '""')}"` : ""
    ]);

    const content = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AcquaTrack_Hydration_Logs_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerStatusNotification("success", "CSV Report compiled and file download initiated.");
  };

  // Render Login state if not authorized
  if (!token || !currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const filteredLogs = getFilteredIntakes();

  return (
    <div id="main-applet-root" className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300 antialiased font-sans">
      
      {/* Toast Notification Widget */}
      {notificationMessage && (
        <div
          id="toast-alert"
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 max-w-sm px-4 py-3.5 rounded-2xl shadow-2xl border text-sm animate-in fade-in slide-in-from-top-4 duration-300 ${
            notificationMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-150 dark:border-emerald-800"
              : notificationMessage.type === "error"
              ? "bg-red-50 dark:bg-red-950/80 text-red-800 dark:text-red-200 border-red-150 dark:border-red-800"
              : "bg-blue-50 dark:bg-slate-800 text-blue-900 dark:text-blue-100 border-blue-150 dark:border-slate-700"
          }`}
        >
          {notificationMessage.type === "success" && <Check className="w-5 h-5 text-emerald-500 shrink-0" />}
          {notificationMessage.type === "error" && <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />}
          {notificationMessage.type === "info" && <Bell className="w-5 h-5 text-blue-500 shrink-0" />}
          <p className="font-medium">{notificationMessage.text}</p>
        </div>
      )}

      {/* Main Responsive Header */}
      <header id="nav-header" className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-150 dark:border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-tr from-blue-600 to-sky-500 text-white p-2 rounded-xl shadow-md">
            <Droplet className="w-6 h-6 fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
              Acqua Track
            </h1>
            <span className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider">
              ASP.NET Core 8 Web API
            </span>
          </div>
        </div>

        {/* Navigation Tabs - Desktop styled */}
        <nav className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl" id="header-desktop-tabs">
          <button
            id="tab-btn-dashboard"
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "dashboard"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Dashboard
          </button>
          <button
            id="tab-btn-history"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "history"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            History & Records
          </button>
          <button
            id="tab-btn-reminders"
            onClick={() => setActiveTab("reminders")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "reminders"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Reminders
          </button>
          <button
            id="tab-btn-profile"
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "profile"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            My Goals
          </button>
          {currentUser.role === "Admin" && (
            <button
              id="tab-btn-admin"
              onClick={() => {
                setActiveTab("admin");
                fetchAdminData();
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === "admin"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Panel
            </button>
          )}
        </nav>

        {/* Right header actions controls */}
        <div id="header-user-controls" className="flex items-center gap-3 ml-auto md:ml-0">
          
          {/* Light/Dark Toggle */}
          <button
            id="theme-toggler"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
            title="Toggle Visual Theme"
          >
            {isDarkMode ? (
              <span className="text-xs font-medium px-1 flex items-center gap-1">☀ <span className="hidden sm:inline">Light</span></span>
            ) : (
              <span className="text-xs font-medium px-1 flex items-center gap-1">🌙 <span className="hidden sm:inline">Dark</span></span>
            )}
          </button>

          {/* User profile dropdown badge */}
          <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800 pl-3 pr-2 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col items-end text-right">
              <span className="text-xs font-bold leading-tight max-w-[120px] truncate">{currentUser.name}</span>
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded leading-none ${
                currentUser.role === "Admin" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
              }`}>
                {currentUser.role}
              </span>
            </div>
            
            <button
              id="header-logout-btn"
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg bg-white dark:bg-slate-700"
              title="Logout Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Tabs Bar (Fixed to bottom for easy touch target controls matching requirements) */}
      <div id="mobile-bottom-tabs" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-950 border-t border-slate-150 dark:border-slate-800 px-4 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all ${
            activeTab === "dashboard" ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all ${
            activeTab === "history" ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-bold">History</span>
        </button>
        <button
          onClick={() => setActiveTab("reminders")}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all ${
            activeTab === "reminders" ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
          }`}
        >
          <Bell className="w-5 h-5" />
          <span className="text-[10px] font-bold">Alerts</span>
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all ${
            activeTab === "profile" ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold">Goals</span>
        </button>
        {currentUser.role === "Admin" && (
          <button
            onClick={() => {
              setActiveTab("admin");
              fetchAdminData();
            }}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all ${
              activeTab === "admin" ? "text-red-500" : "text-slate-400"
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-bold">Admin</span>
          </button>
        )}
      </div>

      {/* Main View Container */}
      <main id="tab-body-container" className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 mb-16 md:mb-6">

        {/* Global Banner for maintenance mode */}
        {adminSettings?.maintenanceMode && (
          <div id="maintenance-banner" className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border-l-4 border-amber-500 rounded-xl p-4 mb-6 flex gap-3 text-xs leading-relaxed">
            <Info className="w-5 h-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-bold">System Maintenance Mode Triggered</p>
              <p>The system is currently undergoing optimizations. All logged water items are safe. Database operations will synchronize upon termination.</p>
            </div>
          </div>
        )}

        {/* TAB 1: DASHBOARD VIEW */}
        {activeTab === "dashboard" && (
          <div id="dashboard-tab-space" className="space-y-6">
            
            {/* Top row: Goal Visual Card and Quick Logger layout */}
            <div className="grid lg:grid-cols-12 gap-6">
              
              {/* Daily Progress Target (Col-5) */}
              <div id="progress-indicator-card" className="lg:col-span-5 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-md shadow-slate-100 dark:shadow-none flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <div className="absolute top-3 left-4 text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded-full">
                  Status Hydration
                </div>

                {/* Animated Water Bubble background effects inside card */}
                <div className="absolute -bottom-16 w-full h-24 bg-blue-500/5 rounded-[40%] animate-[spin_10s_linear_infinite] group-hover:scale-110 transition-transform"></div>
                <div className="absolute -bottom-12 w-full h-24 bg-sky-500/5 rounded-[45%] animate-[spin_12s_linear_infinite] group-hover:scale-110 transition-transform"></div>

                {/* Interactive Ring */}
                <div className="relative my-6 w-52 h-52 flex items-center justify-center">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="84"
                      className="text-slate-100 dark:text-slate-700"
                      strokeWidth="11"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="84"
                      className="text-blue-500 transition-all duration-1000 ease-out"
                      strokeWidth="11"
                      strokeDasharray={`${2 * Math.PI * 84}`}
                      strokeDashoffset={`${2 * Math.PI * 84 * (1 - currentPercentage / 100)}`}
                      strokeLinecap="round"
                      stroke="url(#blue-gradient)"
                      fill="transparent"
                    />
                    <defs>
                      <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="105%" y2="105%">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="absolute flex flex-col items-center">
                    <Droplet className="w-9 h-9 text-blue-500 fill-blue-500/10 mb-1" />
                    <span className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                      {currentPercentage}%
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Target Completed
                    </span>
                  </div>
                </div>

                <div className="space-y-1 z-10">
                  <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">
                    {todayTotal} <span className="text-xs text-slate-400 font-medium font-mono">ml</span>
                    <span className="text-slate-300 dark:text-slate-600 px-1.5 font-normal">/</span>
                    <span className="text-sm text-slate-500 font-mono font-medium">{currentGoal} ml</span>
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {remainingMl > 0 ? (
                      <span className="flex items-center gap-1 justify-center">
                        Drink <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold">{remainingMl} ml</strong> more to unlock daily task!
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 justify-center">
                        ✨ Daily Goal Met! Marvelous Hydration Accomplished.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Quick Logger Actions and Entry Form (Col-7) */}
              <div id="quick-add-panel" className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-md shadow-slate-100 dark:shadow-none flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Rapid Daily Intake Tracker
                    </h3>
                    <span className="text-[11px] font-bold text-blue-500 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                      Auto-Save Active
                    </span>
                  </div>

                  {/* Standard rapid tap options matching enterprise criteria */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" id="quick-drink-buttons">
                    <button
                      id="rapid-250-ml"
                      onClick={() => handleAddIntake(250, "Glass", "Rapid log check")}
                      className="p-3 bg-blue-50/40 dark:bg-blue-950/20 border-2 border-slate-100 hover:border-blue-400 dark:border-slate-700/60 dark:hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center text-center transition-all group scale-98 active:scale-95"
                    >
                      <span className="text-xl mr-0.5">🥛</span>
                      <span className="text-[13px] font-extrabold text-blue-800 dark:text-blue-400 mt-1">250 ml</span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Glass</span>
                    </button>

                    <button
                      id="rapid-500-ml"
                      onClick={() => handleAddIntake(500, "Small Bottle", "Active refresh")}
                      className="p-3 bg-emerald-50/30 dark:bg-emerald-950/20 border-2 border-slate-100 hover:border-emerald-400 dark:border-slate-700/60 dark:hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center text-center transition-all scale-98 active:scale-95"
                    >
                      <span className="text-xl">🥤</span>
                      <span className="text-[13px] font-extrabold text-emerald-800 dark:text-emerald-400 mt-1">500 ml</span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase text-center">Small Bottle</span>
                    </button>

                    <button
                      id="rapid-750-ml"
                      onClick={() => handleAddIntake(750, "Flask", "Gym hydration session")}
                      className="p-3 bg-purple-50/40 dark:bg-purple-950/20 border-2 border-slate-100 hover:border-purple-400 dark:border-slate-700/60 dark:hover:border-purple-500 rounded-2xl flex flex-col items-center justify-center text-center transition-all scale-98 active:scale-95"
                    >
                      <span className="text-xl">🏺</span>
                      <span className="text-[13px] font-extrabold text-purple-800 dark:text-purple-400 mt-1">750 ml</span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Flask</span>
                    </button>

                    <button
                      id="rapid-1000-ml"
                      onClick={() => handleAddIntake(1000, "Large Bottle", "Daily routine backup")}
                      className="p-3 bg-amber-50/30 dark:bg-amber-950/20 border-2 border-slate-100 hover:border-amber-400 dark:border-slate-700/60 dark:hover:border-amber-500 rounded-2xl flex flex-col items-center justify-center text-center transition-all scale-98 active:scale-95"
                    >
                      <span className="text-xl">🧴</span>
                      <span className="text-[13px] font-extrabold text-amber-800 dark:text-amber-400 mt-1">1000 ml</span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Large Bottle</span>
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 block">
                    Custom Hydration Input Settings & Target Override
                  </h4>
                </div>

                <form onSubmit={handleCustomIntakeSubmit} className="space-y-4" id="custom-log-form">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">Intake Volume (ml)</label>
                      <input
                        id="custom-amount-input"
                        type="number"
                        placeholder="e.g. 350"
                        min="10"
                        max="5000"
                        required
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">Drinking Vessel</label>
                      <select
                        id="custom-source-select"
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white px-2 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none font-medium text-slate-700 dark:text-slate-300"
                      >
                        <option value="Glass">🥛 Glass</option>
                        <option value="Small Bottle">🥤 Small Bottle</option>
                        <option value="Flask">🏺 Flask</option>
                        <option value="Large Bottle">🧴 Large Bottle</option>
                        <option value="Custom">☕ Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">Drink Notes / Activity</label>
                      <input
                        id="custom-notes-input"
                        type="text"
                        placeholder="e.g. After cardio"
                        value={drinkNotes}
                        onChange={(e) => setDrinkNotes(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Datetime override option details */}
                  <div className="p-3 bg-slate-55 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-2 h-3 uppercase">⏱ Retrofit Timestamp Adjustment (Optional)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          id="adjust-date-input"
                          type="date"
                          value={drinkDate}
                          onChange={(e) => setDrinkDate(e.target.value)}
                          className="w-full bg-transparent text-slate-650 dark:text-slate-300 text-xs focus:outline-none border-b border-dashed border-slate-200"
                        />
                      </div>
                      <div>
                        <input
                          id="adjust-time-input"
                          type="time"
                          value={drinkTime}
                          onChange={(e) => setDrinkTime(e.target.value)}
                          className="w-full bg-transparent text-slate-650 dark:text-slate-300 text-xs focus:outline-none border-b border-dashed border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    id="submit-drink-action-btn"
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2.5 rounded-xl shadow-lg shadow-blue-500/10 active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Record Custom Hydration Log Entry
                  </button>
                </form>
              </div>
            </div>

            {/* Quick General Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-ribbon">
              <div className="bg-white dark:bg-slate-800 p-4.5 rounded-2xl border border-slate-150 dark:border-slate-700/60 shadow-sm">
                <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Weekly Average</div>
                <div id="metric-week-avg" className="text-xl font-extrabold text-slate-950 dark:text-white">
                  {Math.round(getWeeklyChronicleData().reduce((s, c) => s + c.amountMl, 0) / 7)} <span className="text-xs font-mono font-normal text-slate-400">ml/day</span>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4.5 rounded-2xl border border-slate-150 dark:border-slate-700/60 shadow-sm">
                <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Goal Streak</div>
                <div id="metric-streak" className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  🔥 {computeActiveStreak()} <span className="text-xs font-mono font-normal text-slate-400">days</span>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4.5 rounded-2xl border border-slate-150 dark:border-slate-700/60 shadow-sm">
                <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Biological Target</div>
                <div id="metric-weight-goal" className="text-xl font-extrabold text-slate-950 dark:text-white">
                  {currentUser.weightKg ? `${currentUser.weightKg} kg` : "N/A"}{" "}
                  <span className="text-xs font-mono text-slate-400 font-normal">({currentUser.gender || "Any"})</span>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4.5 rounded-2xl border border-slate-150 dark:border-slate-700/60 shadow-sm">
                <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Intake Entries</div>
                <div id="metric-total-records" className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                  {allIntakes.length} <span className="text-xs font-mono text-slate-400 font-normal">records</span>
                </div>
              </div>
            </div>

            {/* Recharts Analytics Charts Section */}
            <div className="grid lg:grid-cols-12 gap-6" id="dashboard-charts-space">

              {/* Weekly bar chart (Col-8) */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-md">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Weekly Consumption Statistics
                    </h3>
                    <p className="text-xs font-medium text-slate-500">Hydration trends for current week</p>
                  </div>

                  <span className="text-[11px] bg-blue-50 dark:bg-slate-900 px-3 py-1 text-blue-600 dark:text-blue-400 rounded-lg font-bold">
                    Ideal: {currentUser.dailyGoalMl}ml
                  </span>
                </div>

                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getWeeklyChronicleData()} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="dayName"
                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        unit="ml"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                          borderColor: isDarkMode ? "#334155" : "#e2e8f0",
                          borderRadius: "12px",
                          color: isDarkMode ? "#f8fafc" : "#0f172a",
                          fontSize: "12px"
                        }}
                        formatter={(value: any) => [`${value} ml`, "Water Drunk"]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Bar dataKey="amountMl" fill="#2563eb" radius={[6, 6, 0, 0]}>
                        {getWeeklyChronicleData().map((entry, index) => {
                          const metGoal = entry.amountMl >= entry.goalMl;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={metGoal ? "url(#emeraldGrad)" : "url(#blueGrad)"}
                            />
                          );
                        })}
                      </Bar>
                      <defs>
                        <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                        <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#047857" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Average Area Chart (Col-4) */}
              <div className="lg:col-span-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-md">
                <div className="mb-6">
                  <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    30-Day Outlook
                  </h3>
                  <p className="text-xs font-medium text-slate-500">Intake volume average trends</p>
                </div>

                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getMonthlyAggregateData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="dateRange"
                        tick={{ fill: "#94a3b8", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#94a3b8", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          borderColor: "#334155",
                          borderRadius: "10px",
                          color: "#fff",
                          fontSize: "11px"
                        }}
                      />
                      <Area type="monotone" dataKey="averageVolume" stroke="#6366f1" fillOpacity={0.1} fill="#6366f1" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Biological Standard:</span>
                    <span className="font-bold text-slate-650 dark:text-slate-300">2200 - 3000 ml</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total Month Drunk:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {(allIntakes.reduce((tot, i) => tot + i.amountMl, 0) / 1000).toFixed(1)} Liters
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick history snippet */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Recent Hydration Checklist (Daily)
                </h3>
                <button
                  onClick={() => setActiveTab("history")}
                  className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  View full logs history &rarr;
                </button>
              </div>

              {allIntakes.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs text-medium">
                  No logged tracks recorded. Tap quick buttons above to track your hydration!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60" id="recent-logs-list">
                  {allIntakes.slice(0, 5).map((item) => {
                    const styling = getContainerAesthetics(item.source);
                    return (
                      <div key={item.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-850 px-2 rounded-xl transition-all">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1.5 rounded-xl border font-black text-[13px] ${styling.bg} ${styling.border} ${styling.text}`}>
                            🥛 {item.amountMl} ml
                          </span>
                          <div>
                            <span className="font-bold block text-slate-800 dark:text-slate-200">{item.source}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(item.timestamp).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {item.notes && (
                            <span className="italic text-[11px] text-slate-400 max-w-[150px] truncate bg-slate-100 dark:bg-slate-900/50 px-2 py-0.5 rounded">
                              {item.notes}
                            </span>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingIntake(item);
                                setEditAmount(item.amountMl.toString());
                                setEditSource(item.source);
                                setEditNotes(item.notes || "");
                                setEditDatetime(new Date(item.timestamp).toISOString().slice(0, 16));
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-500 transition-all bg-slate-50 dark:bg-slate-900 rounded"
                              title="Edit Entry"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteIntake(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 transition-all bg-slate-50 dark:bg-slate-900 rounded"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: HISTORY & EXPORTS TAB */}
        {activeTab === "history" && (
          <div id="history-tab-space" className="space-y-6">
            
            {/* Action Headers with multi-format exporters */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Full Hydration Logs & Reports
                  </h3>
                  <p className="text-xs text-slate-400">Review database logs, filter criteria, and download reports.</p>
                </div>

                <div className="flex flex-wrap gap-2" id="report-exporter-actions">
                  <button
                    id="export-to-csv-btn"
                    onClick={triggerCSVDownload}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/10 active:scale-98 transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    Export Excel (CSV)
                  </button>
                  <button
                    id="print-report-btn"
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow active:scale-98 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Print PDF Sheet
                  </button>
                </div>
              </div>

              {/* Filtering Controls Row */}
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-4 gap-4" id="history-filter-controls">
                
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    id="filter-search-input"
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search logs notes..."
                    className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none"
                  />
                </div>

                {/* Container selector */}
                <div>
                  <select
                    id="filter-source-select"
                    value={historySourceFilter}
                    onChange={(e) => setHistorySourceFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none font-semibold text-slate-650 dark:text-slate-350"
                  >
                    <option value="all">🍶 All Vessels</option>
                    <option value="Glass">Glass (250ml)</option>
                    <option value="Small Bottle">Small Bottle (500ml)</option>
                    <option value="Flask">Flask (750ml)</option>
                    <option value="Large Bottle">Large Bottle (1000ml)</option>
                    <option value="Custom">Custom Volume</option>
                  </select>
                </div>

                {/* Predefined Range Target */}
                <div>
                  <select
                    id="filter-range-select"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none font-semibold text-slate-650 dark:text-slate-350"
                  >
                    <option value="all">🗓 All Historic Logs</option>
                    <option value="today">Today's logs</option>
                    <option value="week">Past 7 days logs</option>
                    <option value="month">Past 30 days logs</option>
                  </select>
                </div>

                {/* Static indicator for quantity filtered */}
                <div className="flex items-center justify-end text-xs font-semibold text-slate-400">
                  Matches found:{" "}
                  <strong className="text-blue-600 dark:text-blue-400 ml-1">
                    {filteredLogs.length} records
                  </strong>
                </div>
              </div>
            </div>

            {/* Logs Table / List layout matching Requirements */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-md overflow-hidden" id="full-history-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="history-data-table">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-150 dark:border-slate-800">
                      <th className="py-4 px-6">Intake Portion</th>
                      <th className="py-4 px-6">Vessel Category</th>
                      <th className="py-4 px-6">Log Timestamp</th>
                      <th className="py-4 px-6">Drinking Notes</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs text-medium">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                          No logged records matches the criteria. Try lowering filters or insert custom intakes.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((item) => {
                        const style = getContainerAesthetics(item.source);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-all font-medium text-slate-700 dark:text-slate-350">
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-1.5 rounded-xl font-mono text-[13px] font-bold border block w-max ${style.bg} ${style.border} ${style.text}`}>
                                {item.amountMl} ml
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1.5 font-bold">
                                {item.source}
                              </div>
                            </td>
                            <td className="py-4 px-6 font-mono text-slate-400">
                              {new Date(item.timestamp).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short"
                              })}
                            </td>
                            <td className="py-4 px-6 block max-w-[200px] truncate mt-1">
                              {item.notes ? (
                                <span className="p-1 px-2 text-[11px] bg-slate-50 dark:bg-slate-900 text-slate-550 rounded font-normal italic">
                                  {item.notes}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-650">—</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingIntake(item);
                                    setEditAmount(item.amountMl.toString());
                                    setEditSource(item.source);
                                    setEditNotes(item.notes || "");
                                    setEditDatetime(new Date(item.timestamp).toISOString().slice(0, 16));
                                  }}
                                  className="p-2 text-slate-400 hover:text-blue-500 transition-colors bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-750"
                                  title="Edit Record"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteIntake(item.id)}
                                  className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-750"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: REMINDERS SCHEDULER VIEW */}
        {activeTab === "reminders" && (
          <div id="reminders-tab-space" className="space-y-6">
            
            <div className="grid lg:grid-cols-12 gap-6">
              
              {/* Reminder configurations card */}
              <div className="lg:col-span-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-md">
                <div className="mb-6">
                  <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Configure Interval Alerts
                  </h3>
                  <p className="text-xs text-slate-500">Configure simulated drinking push timers and periodic alerts.</p>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-5">
                  <div className="space-y-4">
                    
                    {/* Enable toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                      <div>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Active reminders push</span>
                        <span className="text-[10px] text-slate-400">Simulate browser alerts on timer run</span>
                      </div>
                      <input
                        id="reminders-toggle"
                        type="checkbox"
                        checked={currentUser.remindersEnabled}
                        onChange={(e) => {
                          if (currentUser) {
                            setCurrentUser({
                              ...currentUser,
                              remindersEnabled: e.target.checked
                            });
                          }
                        }}
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                    </div>

                    {/* Interval dropdown */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Push Timer Period</label>
                      <select
                        id="interval-selector"
                        value={currentUser.reminderIntervalMinutes}
                        onChange={(e) => {
                          if (currentUser) {
                            setCurrentUser({
                              ...currentUser,
                              reminderIntervalMinutes: parseInt(e.target.value)
                            });
                          }
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none font-bold text-slate-650"
                      >
                        <option value="15">Every 15 minutes (Demo)</option>
                        <option value="30">Every 30 minutes</option>
                        <option value="45">Every 45 minutes</option>
                        <option value="60">Every hour</option>
                        <option value="120">Every 2 hours</option>
                      </select>
                    </div>

                  </div>

                  <button
                    id="save-interval-btn"
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-xs"
                  >
                    Save Interval Settings
                  </button>
                </form>
              </div>

              {/* Set custom alarms scheduler */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Timed Reminders Alarm Sequence
                    </h3>
                    <p className="text-xs text-slate-500">Add custom alarms for targeted drinking goals matching the .NET design specification.</p>
                  </div>
                  
                  <span className="text-[10px] bg-indigo-50 dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded font-bold uppercase tracking-wider">
                    {reminders.filter((r) => r.enabled).length} Alarms set
                  </span>
                </div>

                <form onSubmit={handleAddReminder} id="add-reminder-form" className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl mb-6">
                  <div className="w-full sm:w-1/3">
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Alert Time Slot</label>
                    <input
                      id="reminder-time-input"
                      type="time"
                      required
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 text-slate-950 dark:text-white px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                  <div className="w-full">
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Message Label</label>
                    <input
                      id="reminder-label-input"
                      type="text"
                      placeholder="e.g. Afternoon hydration flask..."
                      value={newReminderLabel}
                      onChange={(e) => setNewReminderLabel(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 text-slate-950 dark:text-white px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      id="add-reminder-btn"
                      type="submit"
                      className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs py-2 px-5 h-[34px] rounded-xl font-mono"
                    >
                      Add Alarm
                    </button>
                  </div>
                </form>

                {/* Alarm cards list */}
                <div className="grid sm:grid-cols-2 gap-3" id="reminders-list-container">
                  {reminders.length === 0 ? (
                    <div className="col-span-2 py-10 text-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-3xl">
                      No personalized timing alarms registered. Standard clock checks will default to configured intervals.
                    </div>
                  ) : (
                    reminders.map((alarm) => (
                      <div
                        key={alarm.id}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                          alarm.enabled
                            ? "bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-950/60 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${alarm.enabled ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500" : "bg-slate-100 text-slate-400"}`}>
                            <Clock className="w-5 h-5" />
                          </div>

                          <div>
                            <span className="block text-sm font-black font-mono text-slate-950 dark:text-white leading-tight">
                              {alarm.time}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400 block truncate max-w-[150px]">
                              {alarm.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Simulated active state */}
                          <button
                            id={`toggle-alarm-${alarm.id}`}
                            onClick={() => handleToggleReminder(alarm)}
                            className={`p-1 text-xs font-bold rounded-lg ${
                              alarm.enabled
                                ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                                : "text-slate-400 bg-slate-100 dark:bg-slate-900"
                            }`}
                          >
                            {alarm.enabled ? "Active" : "Paused"}
                          </button>
                          
                          <button
                            id={`delete-alarm-${alarm.id}`}
                            onClick={() => handleDeleteReminder(alarm.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                            title="Delete alarm slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 4: PROFILE & TARGETS EDITING */}
        {activeTab === "profile" && (
          <div id="profile-tab-space" className="max-w-2xl mx-auto space-y-6">
            
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-md">
              <div className="flex items-center gap-3.5 mb-6 pb-6 border-b border-slate-100 dark:border-slate-700/60">
                <div className="p-3 bg-gradient-to-tr from-blue-600 to-sky-500 text-white rounded-2xl shadow">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    BiodATA & Goals Configuration
                  </h3>
                  <p className="text-xs text-slate-400">Manage daily targeted ml water goals based on weight and biological parameters.</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-5" id="profile-update-form">
                
                {/* Fixed login parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Registered Email Space (Immutable)</label>
                    <input
                      type="text"
                      className="w-full bg-slate-100 dark:bg-slate-900 text-slate-400 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-750 font-mono"
                      value={currentUser.email}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">User Role Scope (Admin Lock)</label>
                    <input
                      type="text"
                      className="w-full bg-slate-100 dark:bg-slate-900 text-slate-400 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-750 font-semibold"
                      value={currentUser.role}
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    id="profile-name-input"
                    type="text"
                    required
                    value={currentUser.name}
                    onChange={(e) => {
                      if (currentUser) setCurrentUser({ ...currentUser, name: e.target.value });
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Body Weight (kg)</label>
                    <input
                      id="profile-weight-input"
                      type="number"
                      min="10"
                      max="300"
                      value={currentUser.weightKg || ""}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                        if (currentUser) setCurrentUser({ ...currentUser, weightKg: val });
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Biological Sex Identification</label>
                    <select
                      id="profile-gender-select"
                      value={currentUser.gender || "Male"}
                      onChange={(e) => {
                        if (currentUser) setCurrentUser({ ...currentUser, gender: e.target.value as any });
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hydration Daily Volume Target (ml)</label>
                    <button
                      type="button"
                      onClick={() => {
                        // Calculate typical water goal based on body weight (approx 35ml per kg)
                        const autoCalc = (currentUser.weightKg || 70) * 35;
                        if (currentUser) {
                          setCurrentUser({ ...currentUser, dailyGoalMl: Math.max(autoCalc, 2000) });
                          triggerStatusNotification("info", `Recalculated scientific daily hydration target of ${Math.max(autoCalc, 2000)} ml matching your weight profile.`);
                        }
                      }}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      ⚡ Recalculate from body weight
                    </button>
                  </div>
                  <input
                    id="profile-goal-input"
                    type="number"
                    min="500"
                    max="10000"
                    required
                    value={currentUser.dailyGoalMl}
                    onChange={(e) => {
                      if (currentUser) setCurrentUser({ ...currentUser, dailyGoalMl: parseInt(e.target.value) || 2000 });
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-950 dark:text-white px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <button
                  id="profile-update-btn"
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-all text-xs flex justify-center items-center gap-2 shadow"
                >
                  <Check className="w-4 h-4" />
                  Synchronize BiodATA Goals Dashboard
                </button>
              </form>
            </div>

          </div>
        )}

        {/* TAB 5: ADMIN WORKSPACE PANEL */}
        {activeTab === "admin" && currentUser.role === "Admin" && (
          <div id="admin-tab-space" className="space-y-6 animate-in fade-in duration-300">
            
            {/* Telemetry stats ribbon */}
            {adminLoading ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div>
                {/* Stats Ribbon */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white dark:bg-slate-800 p-4.5 rounded-2xl border border-slate-150 dark:border-slate-700/60 shadow-sm">
                    <div className="text-slate-400 text-[10px] font-black uppercase mb-1">Total System Users</div>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400" id="admin-telemetry-users">
                      {adminStats?.totalUsers || 2}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4.5 rounded-2xl border border-slate-150 dark:border-slate-700/60 shadow-sm">
                    <div className="text-slate-400 text-[10px] font-black uppercase mb-1">Total Global Intake Logs</div>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400" id="admin-telemetry-records">
                      {adminStats?.totalIntakeRecords || 120}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4.5 rounded-2xl border border-slate-150 dark:border-slate-700/60 shadow-sm">
                    <div className="text-slate-400 text-[10px] font-black uppercase mb-1">Total Fluid Tracked Volume</div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400" id="admin-telemetry-volume">
                      {((adminStats?.globalVolumeDrunkMl || 300000) / 1000).toFixed(1)} <span className="text-xs font-semibold">Liters</span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4.5 rounded-2xl border border-slate-150 dark:border-slate-700/60 shadow-sm">
                    <div className="text-slate-400 text-[10px] font-black uppercase mb-1">Active Server Engine</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-300 font-mono mt-1" id="admin-telemetry-tech">
                      ASP.NET WebAPI v8.0 CodeFirst
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-6">
                  
                  {/* Users table list (Col-8) */}
                  <div className="lg:col-span-8 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-md">
                    <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                      Active User Records Management
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-medium text-xs text-slate-700 dark:text-slate-300">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-150 dark:border-slate-800">
                            <th className="py-3.5 px-4 rounded-l-xl">User Name</th>
                            <th className="py-3.5 px-4">System Role</th>
                            <th className="py-3.5 px-4">Intake Goal (ml)</th>
                            <th className="py-3.5 px-4 text-right rounded-r-xl">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 dark:divide-slate-750">
                          {adminUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                              <td className="py-3.5 px-4">
                                <span className="block font-bold text-slate-900 dark:text-white">{user.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono block">{user.email}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  user.role === "Admin" ? "bg-red-100 text-red-700 dark:bg-red-950/40" : "bg-blue-100 text-blue-700 dark:bg-blue-950/40"
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold">
                                {user.dailyGoalMl} ml
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => {
                                      setAdminUserEdit(user);
                                      setAdminUserEditRole(user.role);
                                      setAdminUserEditGoal(user.dailyGoalMl.toString());
                                    }}
                                    className="p-1.5 text-blue-600 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-150 hover:bg-blue-100 transition-colors"
                                    title="Edit Authorization"
                                  >
                                    Edit Role
                                  </button>
                                  <button
                                    onClick={() => handleAdminUserDelete(user.id)}
                                    className="p-1.5 text-red-600 bg-red-50 dark:bg-red-950/30 rounded border border-red-150 hover:bg-red-100 transition-colors"
                                    title="Erase Account"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Settings Override Form (Col-4) */}
                  <div className="lg:col-span-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-md">
                    <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                      Global App Microservice Config
                    </h3>

                    {adminSettings && (
                      <form onSubmit={handleAdminSettingsSave} className="space-y-4">
                        <div className="space-y-3">
                          
                          {/* Self registration */}
                          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                            <div>
                              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Self Registration</span>
                              <span className="text-[10px] text-slate-400">Allow users to register accounts</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={adminSettings.allowSelfRegistration}
                              onChange={(e) => setAdminSettings({ ...adminSettings, allowSelfRegistration: e.target.checked })}
                              className="accent-blue-600 w-4 h-4 font-semibold"
                            />
                          </div>

                          {/* Maintenance mode */}
                          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                            <div>
                              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Maintenance Lock</span>
                              <span className="text-[10px] text-slate-400 text-medium">Notify everyone on telemetry status</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={adminSettings.maintenanceMode}
                              onChange={(e) => setAdminSettings({ ...adminSettings, maintenanceMode: e.target.checked })}
                              className="accent-blue-600 w-4 h-4 font-semibold"
                            />
                          </div>

                          {/* Default Target goal */}
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Baseline Daily Target (ml)</label>
                            <input
                              id="admin-default-goal-input"
                              type="number"
                              className="w-full bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white px-3 py-2 text-xs rounded-xl border border-slate-250 dark:border-slate-700 focus:outline-none"
                              value={adminSettings.defaultDailyGoalMl}
                              onChange={(e) => setAdminSettings({ ...adminSettings, defaultDailyGoalMl: parseInt(e.target.value) || 2000 })}
                            />
                          </div>

                          {/* Notification Email Template */}
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 font-mono">Notification Template Message</label>
                            <textarea
                              id="admin-template-message-input"
                              rows={3}
                              className="w-full bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white p-2.5 text-xs rounded-xl border border-slate-250 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={adminSettings.reminderTemplateEmail}
                              onChange={(e) => setAdminSettings({ ...adminSettings, reminderTemplateEmail: e.target.value })}
                            />
                          </div>

                        </div>

                        <button
                          id="admin-save-settings-btn"
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2.5 rounded-xl shadow transition-all"
                        >
                          Update Global Configuration
                        </button>
                      </form>
                    )}
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer id="applet-footer" className="bg-white dark:bg-slate-950 border-t border-slate-150 dark:border-slate-800/80 p-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left font-medium">
            <p className="font-extrabold text-slate-650 dark:text-slate-300">Acqua Track System Architecture</p>
            <p className="text-[10px] block mt-0.5">Built on clean Entity Framework Core & Blazor WebUI simulator matching robust SaaS designs</p>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold">
            <span>Powered by</span>
            <span className="text-blue-500 fill-blue-500 font-black">Acqua Core </span>
            <span>&bull; Secure Authentication Enabled</span>
          </div>
        </div>
      </footer>

      {/* SLIDING MODALS / BACKDROPS */}

      {/* 1. Modal: Edit Water Intake entry */}
      {editingIntake && (
        <div id="edit-modal-backdrop" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div id="edit-modal-box" className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Edit Hydration Track Entry
              </h3>
              <button
                type="button"
                onClick={() => setEditingIntake(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditIntakeSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 font-mono">Fluid Portion (ml)</label>
                <input
                  id="edit-amount-input"
                  type="number"
                  required
                  min="10"
                  max="5000"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Vessel Type</label>
                <select
                  id="edit-source-select"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 text-slate-750 dark:text-slate-300 px-3 py-2 text-xs rounded-xl border border-slate-200"
                >
                  <option value="Glass">Glass</option>
                  <option value="Small Bottle">Small Bottle</option>
                  <option value="Flask">Flask</option>
                  <option value="Large Bottle">Large Bottle</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Intake Timestamp Option</label>
                <input
                  id="edit-datetime-input"
                  type="datetime-local"
                  value={editDatetime}
                  onChange={(e) => setEditDatetime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Notes / Description</label>
                <input
                  id="edit-notes-input"
                  type="text"
                  placeholder="e.g. workout session hydration"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIntake(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-650 text-slate-700 dark:text-white font-medium text-xs py-2 px-4 rounded-xl"
                >
                  Discard Changes
                </button>
                <button
                  id="save-edited-intake-btn"
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2 px-4 rounded-xl"
                >
                  Commit Log Corrections
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Admin edit user parameters */}
      {adminUserEdit && (
        <div id="admin-user-modal-backdrop" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div id="admin-user-modal-box" className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                Authorize User Target & Roles
              </h3>
              <button
                type="button"
                onClick={() => setAdminUserEdit(null)}
                className="text-slate-400 hover:text-slate-650 text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAdminUserUpdate} className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl">
                <span className="block text-xs font-black text-slate-900 dark:text-white">{adminUserEdit.name}</span>
                <span className="text-[10px] text-slate-400 block font-mono">{adminUserEdit.email}</span>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 font-mono">Elevate Role authorization</label>
                <select
                  id="admin-role-select"
                  value={adminUserEditRole}
                  onChange={(e) => setAdminUserEditRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 dark:bg-slate-900 text-slate-750 dark:text-slate-350 px-3 py-2 text-xs rounded-xl border border-slate-200"
                >
                  <option value="User">Standard User</option>
                  <option value="Admin">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 font-mono">Daily Target Override (ml)</label>
                <input
                  id="admin-modify-goal-input"
                  type="number"
                  min="500"
                  max="10000"
                  required
                  value={adminUserEditGoal}
                  onChange={(e) => setAdminUserEditGoal(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAdminUserEdit(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-650 text-slate-700 dark:text-white font-medium text-xs py-2 px-4 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  id="admin-user-save-btn"
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2 px-4 rounded-xl"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
