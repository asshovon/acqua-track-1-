/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "Admin" | "User";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  dailyGoalMl: number; // e.g. 2500
  weightKg?: number;
  gender?: "Male" | "Female" | "Other";
  remindersEnabled: boolean;
  reminderIntervalMinutes: number; // e.g. 60 minutes
  createdAt: string;
}

export interface WaterIntake {
  id: string;
  userId: string;
  amountMl: number; // in milliliters
  timestamp: string; // ISO string
  source: "Glass" | "Small Bottle" | "Large Bottle" | "Flask" | "Custom";
  notes?: string;
}

export interface HydrationReminder {
  id: string;
  userId: string;
  time: string; // "HH:MM" e.g., "08:30"
  label: string;
  enabled: boolean;
}

export interface DashboardStats {
  todayTotalMl: number;
  todayGoalMl: number;
  todayPercent: number;
  weeklyAverageMl: number;
  monthlyAverageMl: number;
  streakDays: number;
}

export interface WeeklyChartData {
  dayName: string; // "Mon", "Tue", etc.
  dateStr: string; // "YYYY-MM-DD"
  amountMl: number;
  goalMl: number;
}

export interface MonthlyChartData {
  weekName: string; // "Week 1", etc.
  amountMl: number;
}

export interface SystemSettings {
  allowSelfRegistration: boolean;
  defaultDailyGoalMl: number;
  reminderTemplateEmail: string;
  maintenanceMode: boolean;
}
