/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { UserProfile, WaterIntake, HydrationReminder, SystemSettings, UserRole } from "./src/types.js";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "temp_db.json");

interface DBStructure {
  users: UserProfile[];
  passwords: Record<string, string>; // userId -> password
  intakes: WaterIntake[];
  reminders: HydrationReminder[];
  settings: SystemSettings;
}

// Generates 30 days of historic logs for a preloaded user
function generateHistory(userId: string): WaterIntake[] {
  const list: WaterIntake[] = [];
  const sources: ("Glass" | "Small Bottle" | "Large Bottle" | "Flask" | "Custom")[] = [
    "Glass",
    "Small Bottle",
    "Large Bottle",
    "Flask",
    "Custom"
  ];
  const amounts = [250, 500, 750, 1000, 300];

  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    
    // Determine random number of drinking logs per day (2 to 5 logs)
    const logsCount = Math.floor(Math.random() * 4) + 2; 
    let baseHour = 8;

    for (let j = 0; j < logsCount; j++) {
      const idx = Math.floor(Math.random() * sources.length);
      const source = sources[idx];
      const amountMl = amounts[idx];

      const logDate = new Date(date);
      baseHour += Math.floor(Math.random() * 3) + 1; // Increment hour
      logDate.setHours(baseHour, Math.floor(Math.random() * 60), 0, 0);

      list.push({
        id: `init-log-${i}-${j}`,
        userId,
        amountMl,
        timestamp: logDate.toISOString(),
        source,
        notes: j === 0 ? "Morning rehydration" : undefined
      });
    }
  }
  return list;
}

// Load or Seed DB
function loadDB(): DBStructure {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("DB parsing error. Resetting database to baseline seed.", e);
    }
  }

  // Create baseline seed database
  const user1Id = "user-123";
  const adminId = "admin-999";

  const initialUsers: UserProfile[] = [
    {
      id: user1Id,
      name: "Sabit Shovon",
      email: "user@acqua.com",
      role: "User",
      dailyGoalMl: 2500,
      weightKg: 72,
      gender: "Male",
      remindersEnabled: true,
      reminderIntervalMinutes: 60,
      createdAt: new Date().toISOString()
    },
    {
      id: adminId,
      name: "System Administrator",
      email: "admin@acqua.com",
      role: "Admin",
      dailyGoalMl: 3000,
      weightKg: 80,
      gender: "Male",
      remindersEnabled: false,
      reminderIntervalMinutes: 120,
      createdAt: new Date().toISOString()
    }
  ];

  const initialPasswords: Record<string, string> = {
    [user1Id]: "user123",
    [adminId]: "admin123"
  };

  const initialReminders: HydrationReminder[] = [
    { id: "rem-1", userId: user1Id, time: "08:30", label: "Morning Sip", enabled: true },
    { id: "rem-2", userId: user1Id, time: "11:30", label: "Noon Refreshment", enabled: true },
    { id: "rem-3", userId: user1Id, time: "14:30", label: "Post-Lunch Hydration", enabled: true },
    { id: "rem-4", userId: user1Id, time: "17:30", label: "Late Afternoon Flask", enabled: true },
    { id: "rem-5", userId: user1Id, time: "20:30", label: "Evening Water Break", enabled: true }
  ];

  const initialSettings: SystemSettings = {
    allowSelfRegistration: true,
    defaultDailyGoalMl: 2200,
    reminderTemplateEmail: "Friendly reminder from Acqua Track: Time to drink a refreshing glass of water!",
    maintenanceMode: false
  };

  const initialIntakes = generateHistory(user1Id);

  const db: DBStructure = {
    users: initialUsers,
    passwords: initialPasswords,
    intakes: initialIntakes,
    reminders: initialReminders,
    settings: initialSettings
  };

  saveDB(db);
  return db;
}

function saveDB(db: DBStructure) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving to db file:", e);
  }
}

// Init local store
let db = loadDB();

async function startServer() {
  const app = express();
  app.use(express.json());

  // Simple tokenless header/bearer simulator for simplicity and bulletproof operation in sandbox.
  // Clients will pass 'Authorization: Bearer <USER_ID>' or send a login token.
  function getAuthenticatedUserId(req: express.Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;
    const token = parts[1];
    
    // Check if user exists in the db
    const found = db.users.find((u) => u.id === token || u.email === token);
    return found ? found.id : null;
  }

  // --- API ROUTES ---

  // Auth: Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
       res.status(400).json({ error: "Email and password are required" });
       return;
    }

    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
       res.status(401).json({ error: "User not found with this email" });
       return;
    }

    const correctPassword = db.passwords[user.id];
    if (correctPassword !== password) {
       res.status(401).json({ error: "Incorrect password" });
       return;
    }

    // In this model, we return the user ID as token for transparent security simulator
    res.json({
      token: user.id,
      user
    });
  });

  // Auth: Register
  app.post("/api/auth/register", (req, res) => {
    const { name, email, password, dailyGoalMl, weightKg, gender } = req.body;
    if (!name || !email || !password) {
       res.status(400).json({ error: "Name, email, and password are required" });
       return;
    }

    if (!db.settings.allowSelfRegistration) {
       res.status(403).json({ error: "Self-registration is currently disabled by administrator" });
       return;
    }

    const exists = db.users.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
       res.status(400).json({ error: "Email already exists" });
       return;
    }

    const newId = `user-${Date.now()}`;
    const newUser: UserProfile = {
      id: newId,
      name,
      email: email.toLowerCase(),
      role: "User",
      dailyGoalMl: Number(dailyGoalMl) || db.settings.defaultDailyGoalMl,
      weightKg: weightKg ? Number(weightKg) : undefined,
      gender,
      remindersEnabled: true,
      reminderIntervalMinutes: 60,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    db.passwords[newId] = password;

    // Seed 1-2 intake history items so new accounts aren't completely blank
    db.intakes.push({
      id: `reg-seed-${Date.now()}`,
      userId: newId,
      amountMl: 250,
      timestamp: new Date().toISOString(),
      source: "Glass",
      notes: "First hydration goal tracking started!"
    });

    saveDB(db);

    res.status(201).json({
      token: newUser.id,
      user: newUser
    });
  });

  // Auth: Reset Password Request
  app.post("/api/auth/forgot-password", (req, res) => {
    const { email } = req.body;
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
       res.status(404).json({ error: "No account found with this email" });
       return;
    }
    // Return mock success with reset token simulation
    res.json({ message: "Verification link sent to email", resetToken: `reset-${user.id}` });
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { resetToken, password } = req.body;
    if (!resetToken || !password) {
       res.status(400).json({ error: "Reset token and new password are required" });
       return;
    }
    const userId = resetToken.replace("reset-", "");
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
       res.status(400).json({ error: "Invalid or expired reset token" });
       return;
    }
    db.passwords[user.id] = password;
    saveDB(db);
    res.json({ message: "Password updated successfully" });
  });

  // Auth: Fetch Active User Profile
  app.get("/api/auth/me", (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
       return;
    }
    const user = db.users.find((u) => u.id === userId);
    res.json(user);
  });

  // Put: Update profile
  app.put("/api/auth/profile", (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
       return;
    }

    const { name, dailyGoalMl, weightKg, gender, remindersEnabled, reminderIntervalMinutes } = req.body;
    const idx = db.users.findIndex((u) => u.id === userId);
    if (idx === -1) {
       res.status(404).json({ error: "User not found" });
       return;
    }

    db.users[idx] = {
      ...db.users[idx],
      name: name ?? db.users[idx].name,
      dailyGoalMl: dailyGoalMl !== undefined ? Number(dailyGoalMl) : db.users[idx].dailyGoalMl,
      weightKg: weightKg !== undefined ? (weightKg ? Number(weightKg) : undefined) : db.users[idx].weightKg,
      gender: gender ?? db.users[idx].gender,
      remindersEnabled: remindersEnabled !== undefined ? Boolean(remindersEnabled) : db.users[idx].remindersEnabled,
      reminderIntervalMinutes: reminderIntervalMinutes !== undefined ? Number(reminderIntervalMinutes) : db.users[idx].reminderIntervalMinutes,
    };

    saveDB(db);
    res.json(db.users[idx]);
  });

  // --- WATER INTAKE MANAGEMENT ---

  // Get: User's intake list
  app.get("/api/intakes", (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
       return;
    }
    const list = db.intakes.filter((i) => i.userId === userId);
    res.json(list);
  });

  // Post: Add a new hydration entry
  app.post("/api/intakes", (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
       return;
    }

    const { amountMl, source, notes, timestamp } = req.body;
    if (!amountMl || !source) {
       res.status(400).json({ error: "Amount (ml) and container type are required" });
       return;
    }

    const newRecord: WaterIntake = {
      id: `log-${Date.now()}`,
      userId,
      amountMl: Number(amountMl),
      source,
      notes: notes || "",
      timestamp: timestamp || new Date().toISOString()
    };

    db.intakes.push(newRecord);
    saveDB(db);
    res.status(201).json(newRecord);
  });

  // Put: Update existing entry
  app.put("/api/intakes/:id", (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
       return;
    }

    const { id } = req.params;
    const { amountMl, source, notes, timestamp } = req.body;

    const idx = db.intakes.findIndex((i) => i.id === id && i.userId === userId);
    if (idx === -1) {
       res.status(404).json({ error: "Intake record not found or access denied" });
       return;
    }

    db.intakes[idx] = {
      ...db.intakes[idx],
      amountMl: amountMl !== undefined ? Number(amountMl) : db.intakes[idx].amountMl,
      source: source || db.intakes[idx].source,
      notes: notes !== undefined ? notes : db.intakes[idx].notes,
      timestamp: timestamp || db.intakes[idx].timestamp
    };

    saveDB(db);
    res.json(db.intakes[idx]);
  });

  // Delete: Remove entry
  app.delete("/api/intakes/:id", (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
       return;
    }

    const { id } = req.params;
    const beforeCount = db.intakes.length;
    db.intakes = db.intakes.filter((i) => !(i.id === id && i.userId === userId));

    if (db.intakes.length === beforeCount) {
       res.status(404).json({ error: "Intake record not found" });
       return;
    }

    saveDB(db);
    res.json({ success: true, message: "Record removed successfully" });
  });

  // --- REMINDERS MANAGEMENT ---

  // Get: Reminders
  app.get("/api/reminders", (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
       return;
    }
    const list = db.reminders.filter((r) => r.userId === userId);
    res.json(list);
  });

  // Post: Add reminder
  app.post("/api/reminders", (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
       return;
    }

    const { time, label } = req.body;
    if (!time || !label) {
       res.status(400).json({ error: "Time and reminder title are required" });
       return;
    }

    const newReminder: HydrationReminder = {
      id: `rem-${Date.now()}`,
      userId,
      time,
      label,
      enabled: true
    };

    db.reminders.push(newReminder);
    saveDB(db);
    res.status(201).json(newReminder);
  });

  // Put: Update reminder (e.g. toggle active state)
  app.put("/api/reminders/:id", (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
       return;
    }

    const { id } = req.params;
    const { time, label, enabled } = req.body;

    const idx = db.reminders.findIndex((r) => r.id === id && r.userId === userId);
    if (idx === -1) {
       res.status(404).json({ error: "Reminder not found" });
       return;
    }

    db.reminders[idx] = {
      ...db.reminders[idx],
      time: time ?? db.reminders[idx].time,
      label: label ?? db.reminders[idx].label,
      enabled: enabled !== undefined ? Boolean(enabled) : db.reminders[idx].enabled
    };

    saveDB(db);
    res.json(db.reminders[idx]);
  });

  // Delete reminder
  app.delete("/api/reminders/:id", (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
       return;
    }

    const { id } = req.params;
    db.reminders = db.reminders.filter((r) => !(r.id === id && r.userId === userId));
    saveDB(db);
    res.json({ success: true });
  });


  // --- ADMIN PANEL API ---

  // Admin Verification middleware checks role
  function verifyAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
       res.status(401).json({ error: "Unauthorized" });
       return;
    }
    const user = db.users.find((u) => u.id === userId);
    if (!user || user.role !== "Admin") {
       res.status(403).json({ error: "Access denied: Requires administrator credentials" });
       return;
    }
    next();
  }

  // Get: System Users
  app.get("/api/admin/users", verifyAdmin, (req, res) => {
    res.json(db.users);
  });

  // Put: Edit user role or status
  app.put("/api/admin/users/:id", verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { role, dailyGoalMl } = req.body;

    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) {
       res.status(404).json({ error: "User not found" });
       return;
    }

    db.users[idx] = {
      ...db.users[idx],
      role: role ?? db.users[idx].role,
      dailyGoalMl: dailyGoalMl !== undefined ? Number(dailyGoalMl) : db.users[idx].dailyGoalMl
    };

    saveDB(db);
    res.json(db.users[idx]);
  });

  // Delete User
  app.delete("/api/admin/users/:id", verifyAdmin, (req, res) => {
    const { id } = req.params;
    const selfUser = getAuthenticatedUserId(req);

    if (id === selfUser) {
       res.status(400).json({ error: "You cannot delete your own Administrator account" });
       return;
    }

    db.users = db.users.filter((u) => u.id !== id);
    db.intakes = db.intakes.filter((i) => i.userId !== id);
    db.reminders = db.reminders.filter((r) => r.userId !== id);
    if (db.passwords[id]) {
      delete db.passwords[id];
    }

    saveDB(db);
    res.json({ success: true, message: "User deleted successfully" });
  });

  // Get/Set global core settings
  app.get("/api/admin/settings", verifyAdmin, (req, res) => {
    res.json(db.settings);
  });

  app.put("/api/admin/settings", verifyAdmin, (req, res) => {
    const { allowSelfRegistration, defaultDailyGoalMl, reminderTemplateEmail, maintenanceMode } = req.body;

    db.settings = {
      ...db.settings,
      allowSelfRegistration: allowSelfRegistration !== undefined ? Boolean(allowSelfRegistration) : db.settings.allowSelfRegistration,
      defaultDailyGoalMl: defaultDailyGoalMl !== undefined ? Number(defaultDailyGoalMl) : db.settings.defaultDailyGoalMl,
      reminderTemplateEmail: reminderTemplateEmail ?? db.settings.reminderTemplateEmail,
      maintenanceMode: maintenanceMode !== undefined ? Boolean(maintenanceMode) : db.settings.maintenanceMode
    };

    saveDB(db);
    res.json(db.settings);
  });

  // System Stats Analytics
  app.get("/api/admin/stats", verifyAdmin, (req, res) => {
    const totalDrunkMl = db.intakes.reduce((sum, item) => sum + item.amountMl, 0);
    const sourcesCount: Record<string, number> = {};
    db.intakes.forEach((item) => {
      sourcesCount[item.source] = (sourcesCount[item.source] || 0) + 1;
    });

    res.json({
      totalUsers: db.users.length,
      totalIntakeRecords: db.intakes.length,
      globalVolumeDrunkMl: totalDrunkMl,
      sourcesDistribution: sourcesCount,
      systemsActive: true,
      serverUptimeMs: process.uptime() * 1000,
      databaseVersion: "Local EF File Persistence v2.0"
    });
  });


  // --- VITE WEB APPLICATION SERVING ---

  // For testing the dev build or production files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Acqua Track Server] Active and running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
