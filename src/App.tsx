import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
 
const PALETTE = [
  { name: "Peony", color: "#F2CFC9" },
  { name: "Rose", color: "#DEA2A6" },
  { name: "Terracotta", color: "#DD785B" },
  { name: "Apricot", color: "#EA994D" },
  { name: "Sunshine", color: "#EFD353" },
  { name: "Olive", color: "#C4C66A" },
  { name: "Meadow", color: "#C7CE9A" },
  { name: "Sage", color: "#B8CAA5" },
  { name: "Aqua", color: "#B4D8D4" },
  { name: "Ocean", color: "#80A4AA" },
  { name: "Lilac", color: "#D2CBE3" },
  { name: "Mauve", color: "#A299B8" },
  { name: "Sand", color: "#C4B28E" },
  { name: "Linen", color: "#FBF9F2" },
  { name: "Mist", color: "#DCE6E3" },
  { name: "Periwinkle", color: "#8999D0" },
];
 
const getReadableTextColor = (background: string) => {
  const normalized = (background || DEFAULT_COLOR).replace("#", "");
  const hex = normalized.length === 3
    ? normalized.split("").map((part) => part + part).join("")
    : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "#000000";

  const channels = [0, 2, 4].map((index) =>
    parseInt(hex.slice(index, index + 2), 16) / 255
  ).map((value) => value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179 ? "#26352D" : "#FFFFFF";
};

const Icon = ({ name, size = 16 }: { name: "plus" | "chevron-left" | "chevron-right" | "close" | "check" | "pencil" | "star" | "repeat" | "settings" | "search" | "grip"; size?: number }) => {
  const paths: Record<string, React.ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    "chevron-left": <path d="m14.5 5-7 7 7 7" />,
    "chevron-right": <path d="m9.5 5 7 7-7 7" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    pencil: <><path d="m14 5 5 5" /><path d="M4 20l4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z" /></>,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
    repeat: <><path d="m17 2 4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.9.3l-.1.1h-3.4l-.1-.2a1.7 1.7 0 0 0-1.6-1.1 1.7 1.7 0 0 0-.9.3l-.2.1-2.9-1.7.1-.2a1.7 1.7 0 0 0-.3-1.9l-.1-.1v-3.4l.2-.1a1.7 1.7 0 0 0 1.1-1.6 1.7 1.7 0 0 0-.3-.9l-.1-.2 1.7-2.9.2.1a1.7 1.7 0 0 0 1.9-.3l.1-.1h3.4l.1.2a1.7 1.7 0 0 0 1.6 1.1 1.7 1.7 0 0 0 .9-.3l.2-.1 2.9 1.7-.1.2a1.7 1.7 0 0 0 .3 1.9l.1.1v3.4l-.2.1a1.7 1.7 0 0 0-1.1 1.6" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    grip: <><circle cx="8" cy="6" r="1" /><circle cx="16" cy="6" r="1" /><circle cx="8" cy="12" r="1" /><circle cx="16" cy="12" r="1" /><circle cx="8" cy="18" r="1" /><circle cx="16" cy="18" r="1" /></>,
  };
  return <svg className="minimal-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

const DEFAULT_COLOR = "#DCE6E3";
const DEFAULT_UNASSIGNED_COLUMN_ID = "unassigned-default";
const REPEAT_OPTIONS = [
  "Does not repeat",
  "Every day",
  "Every week",
  "Every month",
];
 
type Task = {
  id: string;
  seriesId?: string;
  title: string;
  notes: string;
  date: string;
  projectId: string;
  milestoneId?: string;
  unassignedColumnId?: string;
  color: string;
  customColor: boolean;
  repeat: string;
  repeatUntil: string;
  repeatUntilManual: boolean;
  steps: string[];
  done: boolean;
  important?: boolean;
  calendarKey?: string;
};
 
type Milestone = {
  id: string;
  title: string;
  done: boolean;
  date: string;
};
 
type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  deadline: string;
  milestones: Milestone[];
};

type FeedPreferences = {
  showWeeklyPlanner: boolean;
  showOverviewCards: boolean;
  showToday: boolean;
  showOverdue: boolean;
  showNextSevenDays: boolean;
  showOpenTasks: boolean;
  showUnassigned: boolean;
  showImportant: boolean;
  showActiveProjects: boolean;
  showFinishedProjects: boolean;
  plannerOverviewOrder: string[];
  plannerSectionOrder: string[];
};
 
const uid = () => Math.random().toString(36).slice(2, 10);
 
const dateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
 
const fromKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
 
const mondayOf = (date: Date) => {
  const result = new Date(date);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  result.setHours(0, 0, 0, 0);
  return result;
};
 
const formatDate = (
  date: Date,
  options: Intl.DateTimeFormatOptions
) => date.toLocaleDateString("en-GB", options);
 
const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};
 
const emptyTask = (date = ""): Task => ({
  id: uid(),
  title: "",
  notes: "",
  date,
  projectId: "",
  color: DEFAULT_COLOR,
  customColor: false,
  repeat: "Does not repeat",
  repeatUntil: "",
  repeatUntilManual: false,
  steps: [],
  done: false,
});
 
const getProjectColor = (
  projectId: string,
  projects: Project[],
  fallback = DEFAULT_COLOR
) => projects.find((p) => p.id === projectId)?.color || fallback;
 
const getRepeatEnd = (task: Task, projects: Project[]) => {
  if (task.repeatUntilManual) return task.repeatUntil;
  return (
    projects.find((p) => p.id === task.projectId)?.deadline ||
    task.repeatUntil ||
    ""
  );
};
 
function generateOccurrences(task: Task, projects: Project[]): Task[] {
  if (!task.date || task.repeat === "Does not repeat") return [task];
 
  const endDate = getRepeatEnd(task, projects);
  const start = fromKey(task.date);
  const seriesId = task.seriesId || uid();
 
  const fallback = new Date(start);
  fallback.setFullYear(fallback.getFullYear() + 1);
 
  const end = endDate ? fromKey(endDate) : fallback;
  const result: Task[] = [];
  let current = new Date(start);
  let index = 0;
 
  while (current <= end && index < 1000) {
    result.push({
      ...task,
      id: index === 0 ? task.id : uid(),
      seriesId,
      date: dateKey(current),
      done: false,
    });
 
    if (task.repeat === "Every day") {
      current.setDate(current.getDate() + 1);
    } else if (task.repeat === "Every week") {
      current.setDate(current.getDate() + 7);
    } else if (task.repeat === "Every month") {
      const day = current.getDate();
      current.setDate(1);
      current.setMonth(current.getMonth() + 1);
      const lastDay = new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        0
      ).getDate();
      current.setDate(Math.min(day, lastDay));
    }
 
    index++;
  }
 
  return result;
}
 
type ImportedCalendarEvent = { title: string; date: string; notes: string; calendarKey: string };

const parseIcsCalendar = (raw: string): ImportedCalendarEvent[] => {
  const unfolded = raw.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  const events: ImportedCalendarEvent[] = [];
  const unescapeIcs = (value: string) => value
    .replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
  const dateFromValue = (value: string): { date: Date; dateOnly: boolean } | null => {
    const clean = value.trim();
    const match = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
    if (!match) return null;
    if (!match[4]) return { date: new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])), dateOnly: true };
    if (match[7]) return { date: new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] || 0))), dateOnly: false };
    return { date: new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] || 0)), dateOnly: false };
  };
  const addDays = (date: Date, amount: number) => { const next = new Date(date); next.setDate(next.getDate() + amount); return next; };
  blocks.forEach((block) => {
    const lines = block.split(/\r?\n/);
    const getAll = (key: string) => lines.filter((line) => line.toUpperCase().startsWith(`${key}:`) || line.toUpperCase().startsWith(`${key};`));
    const get = (key: string) => getAll(key)[0] || "";
    const valueOf = (line: string) => line.split(":").slice(1).join(":");
    const parsedStart = dateFromValue(valueOf(get("DTSTART")));
    if (!parsedStart || Number.isNaN(parsedStart.date.getTime())) return;
    const uidLine = valueOf(get("UID")).trim();
    const uidValue = uidLine || `${unescapeIcs(valueOf(get("SUMMARY")))}-${dateKey(parsedStart.date)}`;
    const summary = unescapeIcs(valueOf(get("SUMMARY")) || "Calendar event").trim();
    const description = unescapeIcs(valueOf(get("DESCRIPTION"))).trim();
    const parsedEnd = dateFromValue(valueOf(get("DTEND")));
    const timeLabel = parsedStart.dateOnly ? "" : parsedStart.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + (parsedEnd && !parsedEnd.dateOnly ? `–${parsedEnd.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "");
    const notes = [timeLabel, description].filter(Boolean).join(" · ");
    const ruleLine = get("RRULE");
    const rule = Object.fromEntries((valueOf(ruleLine) || "").split(";").filter(Boolean).map((part) => { const [k, ...v] = part.split("="); return [k, v.join("=")]; }));
    const excluded = new Set<string>();
    getAll("EXDATE").forEach((line) => valueOf(line).split(",").forEach((value) => {
      const parsed = dateFromValue(value); if (parsed) excluded.add(dateKey(parsed.date));
    }));
    const freq = rule.FREQ;
    const interval = Math.max(1, Number(rule.INTERVAL || 1));
    const until = rule.UNTIL ? dateFromValue(rule.UNTIL)?.date : null;
    const count = Math.min(500, Math.max(1, Number(rule.COUNT || 500)));
    const add = (date: Date) => {
      const key = dateKey(date);
      if (!excluded.has(key)) events.push({ title: summary, date: key, notes, calendarKey: `${uidValue}:${key}` });
    };
    if (!freq) { add(parsedStart.date); return; }
    const startDate = new Date(parsedStart.date);
    const hardEnd = until || new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
    let generated = 0;
    if (freq === "WEEKLY" && rule.BYDAY) {
      const weekdayMap: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
      const weekdays = rule.BYDAY.split(",").map((day: string) => weekdayMap[day.slice(-2)]).filter((day: number) => day !== undefined);
      const weekStart = new Date(startDate); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      for (let cursor = new Date(startDate); cursor <= hardEnd && generated < count && generated < 500; cursor = addDays(cursor, 1)) {
        const weekOffset = Math.floor((mondayOf(cursor).getTime() - mondayOf(startDate).getTime()) / 604800000);
        if (weekOffset % interval === 0 && (weekdays.length ? weekdays.includes(cursor.getDay()) : cursor.getDay() === startDate.getDay()) && cursor >= startDate) { add(cursor); generated++; }
      }
    } else {
      const current = new Date(startDate);
      while (current <= hardEnd && generated < count && generated < 500) {
        add(current); generated++;
        if (freq === "DAILY") current.setDate(current.getDate() + interval);
        else if (freq === "WEEKLY") current.setDate(current.getDate() + 7 * interval);
        else if (freq === "MONTHLY") { const day = current.getDate(); current.setDate(1); current.setMonth(current.getMonth() + interval); const last = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate(); current.setDate(Math.min(day, last)); }
        else if (freq === "YEARLY") current.setFullYear(current.getFullYear() + interval);
        else break;
      }
    }
  });
  const unique = new Map<string, ImportedCalendarEvent>();
  events.sort((a, b) => a.date.localeCompare(b.date)).forEach((event) => unique.set(event.calendarKey, event));
  return [...unique.values()];
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudReady, setCloudReady] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  // Supabase invitation links return to this app with type=invite in the URL hash.
  const [inviteMode, setInviteMode] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    return hash.get("type") === "invite" || query.get("type") === "invite";
  });
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [page, setPage] = useState<"Planner" | "Projects" | "Settings">("Planner");
  const [feedPreferences, setFeedPreferences] = useState<FeedPreferences>(() => {
    const defaults = {
      showWeeklyPlanner: true, showOverviewCards: true, showToday: false, showOverdue: false, showNextSevenDays: false, showOpenTasks: false,
      showUnassigned: true, showImportant: true, showActiveProjects: true, showFinishedProjects: true,
      plannerOverviewOrder: ["Today", "Overdue", "Next 7 days", "Open tasks"],
      plannerSectionOrder: ["Weekly planner", "Overview cards", "Unassigned", "Important"],
    };
    const saved = readStorage<any>("dromhjem-feed-preferences-v1", {});
    const validSections = ["Weekly planner", "Overview cards", "Unassigned", "Important"];
    const savedSectionOrder = Array.isArray(saved.plannerSectionOrder) ? saved.plannerSectionOrder.filter((item: string) => validSections.includes(item)) : [];
    const plannerSectionOrder = [...savedSectionOrder, ...validSections.filter((item) => !savedSectionOrder.includes(item))];
    return {
      ...defaults,
      ...saved,
      plannerOverviewOrder: Array.isArray(saved.plannerOverviewOrder) ? saved.plannerOverviewOrder : defaults.plannerOverviewOrder,
      plannerSectionOrder,
    };
  });
  const [week, setWeek] = useState(() => mondayOf(new Date()));
  const [plannerView, setPlannerView] = useState<"7" | "3" | "1">(() => {
    const saved = localStorage.getItem("dromhjem-planner-view-v1");
    return saved === "3" || saved === "1" ? saved : "7";
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [importantBlockVisible, setImportantBlockVisible] = useState(() =>
    localStorage.getItem("dromhjem-important-block-visible-v1") !== "false"
  );
 
  const [tasks, setTasks] = useState<Task[]>(() => {
    const current = localStorage.getItem("dromhjem-tasks-v7");
    if (current) {
      const savedTasks = readStorage<Task[]>("dromhjem-tasks-v7", []);
      // Old versions could turn repetitions beyond a deadline into date-less
      // records. Those are not real Unassigned tasks and must be discarded.
      return savedTasks
        .filter((task) => !(task.seriesId && !task.date))
        .map((task) => !task.date && !task.seriesId && !task.unassignedColumnId
          ? { ...task, unassignedColumnId: DEFAULT_UNASSIGNED_COLUMN_ID }
          : task);
    }
 
    const old = readStorage<any[]>(
      "dromhjem-tasks-v6",
      readStorage<any[]>("dromhjem-tasks-v5", [])
    );
 
    return old.map((task) => ({
      ...emptyTask(task.date || ""),
      ...task,
      notes: task.notes || "",
      steps: task.steps || [],
      repeatUntil: task.repeatUntil || "",
      repeatUntilManual: task.repeatUntilManual || false,
      customColor: task.customColor ?? false,
      unassignedColumnId: !task.date && !task.seriesId
        ? (task.unassignedColumnId || DEFAULT_UNASSIGNED_COLUMN_ID)
        : task.unassignedColumnId,
    }));
  });
 
  const [projects, setProjects] = useState<Project[]>(() => {
    const current = localStorage.getItem("dromhjem-projects-v7");
    if (current) return readStorage("dromhjem-projects-v7", []);
 
    const old = readStorage<any[]>(
      "dromhjem-projects-v6",
      readStorage<any[]>("dromhjem-projects-v5", [])
    );
 
    return old.map((project) => ({
      ...project,
      deadline: project.deadline || "",
      milestones: (project.milestones || []).map((milestone: any) => ({ ...milestone, date: milestone.date || "", done: milestone.done || false })),
    }));
  });
 
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
 
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newStep, setNewStep] = useState("");
 
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectColor, setProjectColor] = useState(DEFAULT_COLOR);
  const [projectDeadline, setProjectDeadline] = useState("");
  const [projectMilestones, setProjectMilestones] = useState<Milestone[]>([]);
  const [newMilestone, setNewMilestone] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
 
  const [unassignedColumns, setUnassignedColumns] = useState<{ id: string; name: string }[]>(() => {
    const saved = readStorage<{ id: string; name: string }[]>("dromhjem-unassigned-columns-v1", []);
    return saved.length ? saved : [{ id: DEFAULT_UNASSIGNED_COLUMN_ID, name: "Unassigned" }];
  });
  const [unscheduledInputs, setUnscheduledInputs] = useState<Record<string, string>>({});
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [projectTaskInputs, setProjectTaskInputs] = useState<Record<string, string>>({});
  const [calendarImportOpen, setCalendarImportOpen] = useState(false);
  const [calendarImportEvents, setCalendarImportEvents] = useState<ImportedCalendarEvent[]>([]);
  const [calendarImportFileName, setCalendarImportFileName] = useState("");
  const [calendarImportMode, setCalendarImportMode] = useState<"new" | "existing">("new");
  const [calendarImportProjectName, setCalendarImportProjectName] = useState("University timetable");
  const [calendarImportProjectId, setCalendarImportProjectId] = useState("");
  const [calendarImportError, setCalendarImportError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedLayoutItem, setDraggedLayoutItem] = useState<{ list: "sections" | "overview"; label: string } | null>(null);
 
  const [pendingMove, setPendingMove] = useState<{
    taskId: string;
    newDate: string;
  } | null>(null);
 
  // Restore the Supabase session and listen for sign-in/sign-out changes.
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setAuthLoading(false);
    }).catch((error) => {
      if (!alive) return;
      setAuthError(error?.message || "Could not check your session.");
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Keep the invitation screen active while Supabase exchanges the invite link
      // for a session. PASSWORD_RECOVERY is also handled for password setup links.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      if (hash.get("type") === "invite" || query.get("type") === "invite" || event === "PASSWORD_RECOVERY") {
        setInviteMode(true);
      }
      setSession(nextSession);
      setCloudReady(false);
      setAuthError("");
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (error) setAuthError(error.message);
    } catch (error: any) {
      setAuthError(error?.message || "Login failed. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    if (authPassword.length < 8) {
      setAuthError("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (authPassword !== authPasswordConfirm) {
      setAuthError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: authPassword });
      if (error) throw error;
      setInviteMode(false);
      setAuthPassword("");
      setAuthPasswordConfirm("");
      // Remove the one-time invite tokens from the address bar without signing out.
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error: any) {
      setAuthError(error?.message || "Das Passwort konnte nicht gespeichert werden.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setCloudReady(false);
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
  };

  // Load the signed-in user's cloud state once. If no cloud record exists yet,
  // migrate the current browser's local data without overwriting existing cloud data.
  useEffect(() => {
    let cancelled = false;
    const loadCloudState = async () => {
      if (!session?.user?.id) { setCloudReady(false); return; }
      setCloudReady(false);
      setAuthError("");
      try {
        const userId = session.user.id;
        const { data, error } = await supabase
          .from("user_app_state")
          .select("state")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (data?.state && typeof data.state === "object") {
          const state = data.state as any;
          if (Array.isArray(state.tasks)) setTasks(state.tasks);
          if (Array.isArray(state.projects)) setProjects(state.projects);
          if (Array.isArray(state.unassignedColumns) && state.unassignedColumns.length) setUnassignedColumns(state.unassignedColumns);
          if (["7", "3", "1"].includes(state.plannerView)) setPlannerView(state.plannerView);
          if (typeof state.importantBlockVisible === "boolean") setImportantBlockVisible(state.importantBlockVisible);
          if (state.feedPreferences && typeof state.feedPreferences === "object") setFeedPreferences(state.feedPreferences);
        } else {
          const initialState = {
            tasks: JSON.parse(localStorage.getItem("dromhjem-tasks-v7") || "[]"),
            projects: JSON.parse(localStorage.getItem("dromhjem-projects-v7") || "[]"),
            unassignedColumns: JSON.parse(localStorage.getItem("dromhjem-unassigned-columns-v1") || "[]"),
            plannerView: localStorage.getItem("dromhjem-planner-view-v1") || "7",
            importantBlockVisible: localStorage.getItem("dromhjem-important-block-visible-v1") !== "false",
            feedPreferences: JSON.parse(localStorage.getItem("dromhjem-feed-preferences-v1") || "{}"),
          };
          const { error: saveError } = await supabase.from("user_app_state").upsert({
            user_id: userId, state: initialState, updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
          if (saveError) throw saveError;
        }
        if (!cancelled) setCloudReady(true);
      } catch (error: any) {
        if (!cancelled) {
          setAuthError(`Cloud sync could not be loaded: ${error?.message || "Unknown error"}`);
          // Keep the local planner usable even if the network is temporarily unavailable.
          setCloudReady(true);
        }
      }
    };
    loadCloudState();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // Keep local storage as an offline cache and debounce cloud writes after hydration.
  useEffect(() => {
    if (!session?.user?.id || !cloudReady) return;
    const state = { tasks, projects, unassignedColumns, plannerView, importantBlockVisible, feedPreferences };
    const timer = window.setTimeout(async () => {
      const { error } = await supabase.from("user_app_state").upsert({
        user_id: session.user.id, state, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) setAuthError(`Cloud save failed: ${error.message}`);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [session?.user?.id, cloudReady, tasks, projects, unassignedColumns, plannerView, importantBlockVisible, feedPreferences]);

  useEffect(() => {
    localStorage.setItem("dromhjem-tasks-v7", JSON.stringify(tasks));
  }, [tasks]);
 
  useEffect(() => {
    localStorage.setItem("dromhjem-projects-v7", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem("dromhjem-unassigned-columns-v1", JSON.stringify(unassignedColumns));
  }, [unassignedColumns]);
 
  useEffect(() => {
    localStorage.setItem("dromhjem-planner-view-v1", plannerView);
  }, [plannerView]);

  useEffect(() => {
    localStorage.setItem("dromhjem-important-block-visible-v1", String(importantBlockVisible));
  }, [importantBlockVisible]);

  useEffect(() => {
    localStorage.setItem("dromhjem-feed-preferences-v1", JSON.stringify(feedPreferences));
  }, [feedPreferences]);

  const updateFeedPreference = (key: "showWeeklyPlanner" | "showOverviewCards" | "showToday" | "showOverdue" | "showNextSevenDays" | "showOpenTasks" | "showUnassigned" | "showImportant" | "showActiveProjects" | "showFinishedProjects", checked: boolean) => {
    setFeedPreferences((current) => ({ ...current, [key]: checked }));
  };

  const moveOverviewCard = (label: string, direction: -1 | 1) => {
    setFeedPreferences((current) => {
      const order = [...current.plannerOverviewOrder];
      const index = order.indexOf(label);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return current;
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
      return { ...current, plannerOverviewOrder: order };
    });
  };

  const movePlannerSection = (label: string, direction: -1 | 1) => {
    setFeedPreferences((current) => {
      const order = [...current.plannerSectionOrder];
      const index = order.indexOf(label);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return current;
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
      return { ...current, plannerSectionOrder: order };
    });
  };

  const reorderLayoutItem = (list: "sections" | "overview", draggedLabel: string, targetLabel: string) => {
    if (!draggedLabel || draggedLabel === targetLabel) return;
    setFeedPreferences((current) => {
      const key = list === "sections" ? "plannerSectionOrder" : "plannerOverviewOrder";
      const order = [...current[key]];
      const from = order.indexOf(draggedLabel);
      const to = order.indexOf(targetLabel);
      if (from < 0 || to < 0) return current;
      order.splice(from, 1);
      order.splice(to, 0, draggedLabel);
      return { ...current, [key]: order };
    });
  };

  const handleLayoutDragStart = (list: "sections" | "overview", label: string, event: React.DragEvent<HTMLDivElement>) => {
    setDraggedLayoutItem({ list, label });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${list}:${label}`);
  };

  const handleLayoutDrop = (list: "sections" | "overview", targetLabel: string, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const dragged = draggedLayoutItem;
    if (dragged && dragged.list === list) reorderLayoutItem(list, dragged.label, targetLabel);
    setDraggedLayoutItem(null);
  };

  const openTasks = tasks.filter((task) => !task.done);
  const todayTasks = openTasks.filter((task) => task.date === dateKey(new Date()));
  const overdueTasks = openTasks.filter((task) => task.date && task.date < dateKey(new Date()));
  const nextSevenDays = openTasks.filter((task) => task.date >= dateKey(new Date()) && task.date <= dateKey(new Date(Date.now() + 7 * 86400000)));
  const searchTerm = searchQuery.trim().toLowerCase();
  const searchTaskResults = searchTerm ? tasks.filter((task) => `${task.title} ${task.notes}`.toLowerCase().includes(searchTerm)).slice(0, 8) : [];
  const searchProjectResults = searchTerm ? projects.filter((project) => `${project.name} ${project.description}`.toLowerCase().includes(searchTerm)).slice(0, 5) : [];

  const exportBackup = () => {
    const payload = { app: "dromhjem", schemaVersion: 1, exportedAt: new Date().toISOString(), tasks, projects, unassignedColumns, plannerView, importantBlockVisible };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `dromhjem-backup-${dateKey(new Date())}.json`; link.click();
    URL.revokeObjectURL(url);
    setBackupMessage("Backup exported successfully.");
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload.app !== "dromhjem" || !Array.isArray(payload.tasks) || !Array.isArray(payload.projects)) throw new Error("Invalid backup");
      if (!window.confirm("Restore this backup? Current tasks and projects will be replaced.")) return;
      setTasks(payload.tasks);
      setProjects(payload.projects);
      setUnassignedColumns(Array.isArray(payload.unassignedColumns) && payload.unassignedColumns.length ? payload.unassignedColumns : [{ id: DEFAULT_UNASSIGNED_COLUMN_ID, name: "Unassigned" }]);
      if (["7", "3", "1"].includes(payload.plannerView)) setPlannerView(payload.plannerView);
      setImportantBlockVisible(payload.importantBlockVisible !== false);
      setSelectedProjectId(null); setPage("Planner");
      setBackupMessage("Backup restored successfully.");
    } catch {
      setBackupMessage("This file is not a valid drømhjem backup.");
    }
  };

  const weekDays = useMemo(
    () => Array.from({ length: Number(plannerView) }, (_, i) => {
      const date = new Date(week);
      date.setDate(week.getDate() + i);
      return date;
    }),
    [week, plannerView]
  );

  const changePlannerView = (view: "7" | "3" | "1") => {
    setPlannerView(view);
    setWeek(view === "7" ? mondayOf(week) : new Date());
  };

  const shiftPlanner = (direction: number) => {
    setWeek((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + direction * Number(plannerView));
      return next;
    });
  };
 
  const today = dateKey(new Date());
 
  const weekTaskList = tasks.filter((task) =>
    weekDays.some((day) => task.date === dateKey(day))
  );
 
  const weekCompleted = weekTaskList.filter((task) => task.done).length;
  const weekProgress = weekTaskList.length
    ? Math.round((weekCompleted / weekTaskList.length) * 100)
    : 0;
 
  // Unassigned contains only genuinely undated standalone tasks.
  // Broken, date-less copies of recurring occurrences are excluded.
  const unscheduledTasks = tasks.filter(
    (task) => !task.date && !task.seriesId
  );

  // Important reminders are a separate view of the same tasks, not copies.
  // They stay in their normal calendar dates and can be opened/edited here.
  const importantTasks = tasks
    .filter((task) => task.important && !task.done)
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

  const addUnassignedColumn = () => {
    const id = uid();
    setUnassignedColumns((current) => [
      ...current,
      { id, name: `List ${current.length + 1}` },
    ]);
  };

  const startEditingColumn = (column: { id: string; name: string }) => {
    setEditingColumnId(column.id);
    setEditingColumnName(column.name);
  };

  const saveColumnName = (columnId: string) => {
    const name = editingColumnName.trim();
    if (!name) return;
    setUnassignedColumns((current) =>
      current.map((column) => column.id === columnId ? { ...column, name } : column)
    );
    setEditingColumnId(null);
    setEditingColumnName("");
  };

  const addUnassignedTask = (columnId: string) => {
    const title = (unscheduledInputs[columnId] || "").trim();
    if (!title) return;
    setTasks((current) => [
      ...current,
      { ...emptyTask(""), title, unassignedColumnId: columnId },
    ]);
    setUnscheduledInputs((current) => ({ ...current, [columnId]: "" }));
  };

  const moveTaskToUnassignedColumn = (taskId: string, columnId: string) => {
    setTasks((current) =>
      current.map((task) => task.id === taskId
        ? { ...task, date: "", unassignedColumnId: columnId, seriesId: undefined, repeat: "Does not repeat" }
        : task
      )
    );
    setDraggedTaskId(null);
  };
 
  /* TASK ACTIONS */
 
  const openNewTask = (date = "") => {
    setEditingTaskId(null);
    setTaskDraft(emptyTask(date));
    setNewStep("");
    setTaskModalOpen(true);
  };
 
  const openEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskDraft({
      ...task,
      notes: task.notes || "",
      steps: task.steps || [],
      repeatUntil: task.repeatUntil || "",
      repeatUntilManual: task.repeatUntilManual || false,
      customColor: task.customColor ?? false,
    });
    setNewStep("");
    setTaskModalOpen(true);
  };
 
  const closeTaskModal = () => {
    setTaskModalOpen(false);
    setTaskDraft(null);
    setEditingTaskId(null);
  };
 
  const updateDraft = (
    key: keyof Task,
    value: string | boolean | string[]
  ) => {
    setTaskDraft((current) =>
      current ? { ...current, [key]: value } : current
    );
  };
 
  const selectProject = (projectId: string) => {
    setTaskDraft((current) =>
      current
        ? {
            ...current,
            projectId,
            milestoneId: projectId === current.projectId ? current.milestoneId : "",
            color: projectId
              ? getProjectColor(projectId, projects)
              : DEFAULT_COLOR,
            customColor: false,
          }
        : current
    );
  };
 
  const selectTaskColor = (color: string) => {
    setTaskDraft((current) =>
      current ? { ...current, color, customColor: true } : current
    );
  };
 
  const saveTask = () => {
    if (!taskDraft || !taskDraft.title.trim()) return;

    const saved: Task = { ...taskDraft, title: taskDraft.title.trim() };

    if (saved.projectId && !saved.customColor) {
      saved.color = getProjectColor(saved.projectId, projects, saved.color);
    }

    if (editingTaskId) {
      const original = tasks.find((task) => task.id === editingTaskId);

      if (!original) {
        closeTaskModal();
        return;
      }

      // Turning repetition on later must create the complete series, not just
      // change the repeat label on one existing task.
      if (saved.repeat !== "Does not repeat") {
        const oldSeries = original.seriesId
          ? tasks.filter((task) => task.seriesId === original.seriesId)
          : [original];
        const oldAnchor = oldSeries
          .filter((task) => task.date)
          .map((task) => task.date)
          .sort()[0] || original.date;

        // If the user changes the date of one occurrence, shift the whole
        // series by the same number of days while keeping its weekday pattern.
        let anchorDate = saved.date || original.date || dateKey(new Date());
        if (original.seriesId && oldAnchor && original.date && saved.date) {
          const shift = Math.round(
            (fromKey(saved.date).getTime() - fromKey(original.date).getTime()) / 86400000
          );
          const shiftedAnchor = fromKey(oldAnchor);
          shiftedAnchor.setDate(shiftedAnchor.getDate() + shift);
          anchorDate = dateKey(shiftedAnchor);
        }

        const seriesId = original.seriesId || uid();
        const baseTask: Task = { ...saved, date: anchorDate, seriesId };
        const generated = generateOccurrences(baseTask, projects);
        const oldByDate = new Map(oldSeries.filter((task) => task.date).map((task) => {
          let preservedDate = task.date;
          if (original.seriesId && oldAnchor && original.date && saved.date) {
            const shift = Math.round(
              (fromKey(saved.date).getTime() - fromKey(original.date).getTime()) / 86400000
            );
            const shifted = fromKey(task.date);
            shifted.setDate(shifted.getDate() + shift);
            preservedDate = dateKey(shifted);
          }
          return [preservedDate, task] as const;
        }));

        const refreshedSeries = generated.map((task, index) => {
          const previous = oldByDate.get(task.date);
          return {
            ...task,
            id: previous?.id || (index === 0 ? original.id : task.id),
            done: previous?.done ?? false,
          };
        });

        setTasks((current) => [
          ...current.filter((task) => original.seriesId
            ? task.seriesId !== original.seriesId
            : task.id !== original.id),
          ...refreshedSeries,
        ]);
      } else if (original.seriesId) {
        // Turning repetition off leaves the edited occurrence as a normal task.
        const { seriesId: _seriesId, ...singleTask } = saved;
        setTasks((current) => [
          ...current.filter((task) => task.seriesId !== original.seriesId),
          { ...singleTask, repeat: "Does not repeat" },
        ]);
      } else {
        setTasks((current) =>
          current.map((task) => task.id === editingTaskId ? saved : task)
        );
      }
    } else {
      // A project task often starts without a date. When repetition is selected,
      // use today as its first occurrence so it can actually appear in the planner.
      if (saved.repeat !== "Does not repeat" && !saved.date) {
        saved.date = dateKey(new Date());
      }
      setTasks((current) => [
        ...current,
        ...generateOccurrences(saved, projects),
      ]);
    }

    closeTaskModal();
  };
 
  const deleteTask = () => {
    if (!editingTaskId) return;
    const taskToDelete = tasks.find((task) => task.id === editingTaskId);
    if (!taskToDelete) return;
    if (taskToDelete.seriesId) {
      setDeleteConfirmOpen(true);
      return;
    }
    setTasks((current) => current.filter((task) => task.id !== editingTaskId));
    closeTaskModal();
  };

  const confirmDeleteTask = (scope: "single" | "series") => {
    if (!editingTaskId) return;
    const taskToDelete = tasks.find((task) => task.id === editingTaskId);
    if (!taskToDelete) return;
    setTasks((current) => current.filter((task) => scope === "series" && taskToDelete.seriesId
      ? task.seriesId !== taskToDelete.seriesId
      : task.id !== editingTaskId));
    setDeleteConfirmOpen(false);
    closeTaskModal();
  };

  const toggleTask = (id: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  };
 
  const moveTask = (id: string, date: string) => {
    const task = tasks.find((t) => t.id === id);
 
    if (!task || task.date === date) {
      setDraggedTaskId(null);
      return;
    }
 
    if (!task.seriesId) {
      setTasks((current) =>
        current.map((t) => t.id === id
          ? { ...t, date, ...(date ? {} : { unassignedColumnId: unassignedColumns[0]?.id || DEFAULT_UNASSIGNED_COLUMN_ID }) }
          : t)
      );
      setDraggedTaskId(null);
      return;
    }
 
    setPendingMove({ taskId: id, newDate: date });
    setDraggedTaskId(null);
  };
 
  const confirmMove = (moveAll: boolean) => {
    if (!pendingMove) return;
 
    const task = tasks.find((t) => t.id === pendingMove.taskId);
 
    if (!task) {
      setPendingMove(null);
      return;
    }
 
    if (!moveAll || !task.seriesId) {
      setTasks((current) =>
        current.map((t) =>
          t.id === task.id
            ? { ...t, date: pendingMove.newDate, seriesId: undefined, repeat: "Does not repeat" }
            : t
        )
      );
    } else {
      const oldDate = fromKey(task.date);
      const newDate = fromKey(pendingMove.newDate);
      const difference = Math.round(
        (newDate.getTime() - oldDate.getTime()) / 86400000
      );
 
      const project = projects.find((p) => p.id === task.projectId);
      const endDate = task.repeatUntilManual
        ? task.repeatUntil
        : project?.deadline || task.repeatUntil || "";
 
      setTasks((current) =>
        current.flatMap((t) => {
          if (t.seriesId !== task.seriesId) return [t];
 
          const shiftedDate = fromKey(t.date);
          shiftedDate.setDate(shiftedDate.getDate() + difference);
          const shiftedKey = dateKey(shiftedDate);
 
          // Do not turn expired repetitions into undated tasks.
          // Remove occurrences beyond the applicable series end date.
          if (endDate && shiftedKey > endDate) {
            return [];
          }
 
          return [{ ...t, date: shiftedKey }];
        })
      );
    }
 
    setPendingMove(null);
  };
 
  const addStep = () => {
    if (!newStep.trim() || !taskDraft) return;
    updateDraft("steps", [...taskDraft.steps, newStep.trim()]);
    setNewStep("");
  };
 
  const openCalendarImport = () => {
    setCalendarImportEvents([]);
    setCalendarImportFileName("");
    setCalendarImportError("");
    setCalendarImportMode("new");
    setCalendarImportProjectName("University timetable");
    setCalendarImportProjectId(projects[0]?.id || "");
    setCalendarImportOpen(true);
  };

  const readCalendarFile = async (file?: File) => {
    if (!file) return;
    setCalendarImportError("");
    if (!file.name.toLowerCase().endsWith(".ics")) {
      setCalendarImportError("Please choose an iCalendar (.ics) file.");
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseIcsCalendar(text);
      if (!parsed.length) {
        setCalendarImportError("No calendar events found. Please check that this is a valid .ics export.");
        setCalendarImportEvents([]);
        return;
      }
      setCalendarImportFileName(file.name);
      setCalendarImportEvents(parsed);
    } catch {
      setCalendarImportError("The calendar file could not be read.");
    }
  };

  const importCalendarEvents = () => {
    if (!calendarImportEvents.length) return;
    let targetProjectId = calendarImportProjectId;
    let targetProject: Project | undefined;
    if (calendarImportMode === "new") {
      const name = calendarImportProjectName.trim();
      if (!name) { setCalendarImportError("Please enter a project name."); return; }
      targetProjectId = uid();
      targetProject = {
        id: targetProjectId,
        name,
        description: `Imported calendar · ${calendarImportFileName}`,
        color: "#DCE6E3",
        deadline: "",
        milestones: [],
      };
      setProjects((current) => [...current, targetProject!]);
    } else {
      targetProject = projects.find((project) => project.id === targetProjectId);
      if (!targetProject) { setCalendarImportError("Please select a project."); return; }
    }
    const importedTasks: Task[] = calendarImportEvents.map((event) => ({
      ...emptyTask(event.date),
      title: event.title,
      notes: event.notes,
      projectId: targetProjectId,
      color: targetProject?.color || DEFAULT_COLOR,
      customColor: false,
      repeat: "Does not repeat",
      repeatUntil: "",
      repeatUntilManual: false,
      steps: [],
      done: false,
      calendarKey: event.calendarKey,
    }));
    const existingCalendarKeys = new Set(tasks
      .filter((task) => task.projectId === targetProjectId && task.calendarKey)
      .map((task) => task.calendarKey));
    const freshImportedTasks = importedTasks.filter((task) => !existingCalendarKeys.has(task.calendarKey));
    if (!freshImportedTasks.length) setCalendarImportError("All events from this calendar are already imported.");
    else setTasks((current) => [...current, ...freshImportedTasks]);
    setCalendarImportOpen(false);
    setPage("Projects");
    setSelectedProjectId(targetProjectId);
  };

  /* PROJECT ACTIONS */
 
  const openNewProject = () => {
    setEditingProjectId(null);
    setProjectName("");
    setProjectDescription("");
    setProjectColor(DEFAULT_COLOR);
    setProjectDeadline("");
    setProjectMilestones([]);
    setNewMilestone("");
    setNewMilestoneDate("");
    setEditingMilestoneId(null);
    setProjectModalOpen(true);
  };
 
  const openEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setProjectName(project.name);
    setProjectDescription(project.description);
    setProjectColor(project.color);
    setProjectDeadline(project.deadline || "");
    setProjectMilestones(project.milestones || []);
    setNewMilestone("");
    setNewMilestoneDate("");
    setEditingMilestoneId(null);
    setProjectModalOpen(true);
  };
 
  const saveProject = () => {
    if (!projectName.trim()) return;
 
    if (editingProjectId) {
      const oldProject = projects.find((p) => p.id === editingProjectId);
 
      setProjects((current) =>
        current.map((project) =>
          project.id === editingProjectId
            ? {
                ...project,
                name: projectName.trim(),
                description: projectDescription.trim(),
                color: projectColor,
                deadline: projectDeadline,
                milestones: projectMilestones,
              }
            : project
        )
      );
 
      if (oldProject && oldProject.color !== projectColor) {
        setTasks((current) =>
          current.map((task) =>
            task.projectId === editingProjectId && !task.customColor
              ? { ...task, color: projectColor }
              : task
          )
        );
      }
    } else {
      setProjects((current) => [
        ...current,
        {
          id: uid(),
          name: projectName.trim(),
          description: projectDescription.trim(),
          color: projectColor,
          deadline: projectDeadline,
          milestones: projectMilestones,
        },
      ]);
    }
 
    setProjectModalOpen(false);
  };
 
  const deleteProject = () => {
    if (!editingProjectId) return;
 
    setProjects((current) => current.filter((p) => p.id !== editingProjectId));
 
    setTasks((current) =>
      current.map((task) =>
        task.projectId === editingProjectId
          ? { ...task, projectId: "", customColor: true }
          : task
      )
    );
 
    if (selectedProjectId === editingProjectId) setSelectedProjectId(null);
    setProjectModalOpen(false);
  };
 
  const addMilestone = () => {
    if (!newMilestone.trim()) return;

    if (editingMilestoneId) {
      setProjectMilestones((current) =>
        current.map((milestone) =>
          milestone.id === editingMilestoneId
            ? { ...milestone, title: newMilestone.trim(), date: newMilestoneDate }
            : milestone
        )
      );
    } else {
      setProjectMilestones((current) => [
        ...current,
        {
          id: uid(),
          title: newMilestone.trim(),
          date: newMilestoneDate,
          done: false,
        },
      ]);
    }

    setNewMilestone("");
    setNewMilestoneDate("");
    setEditingMilestoneId(null);
  };

  const startEditMilestone = (milestone: Milestone) => {
    setEditingMilestoneId(milestone.id);
    setNewMilestone(milestone.title);
    setNewMilestoneDate(milestone.date || "");
  };

  const cancelEditMilestone = () => {
    setEditingMilestoneId(null);
    setNewMilestone("");
    setNewMilestoneDate("");
  };

  const toggleMilestone = (projectId: string, milestoneId: string) => {
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              milestones: project.milestones.map((milestone) =>
                milestone.id === milestoneId
                  ? { ...milestone, done: !milestone.done }
                  : milestone
              ),
            }
          : project
      )
    );
  };

  const removeMilestone = (milestoneId: string) => {
    setProjectMilestones((current) =>
      current.filter((milestone) => milestone.id !== milestoneId)
    );
    // Keep its tasks in the project, but detach them from the deleted milestone.
    setTasks((current) => current.map((task) =>
      task.milestoneId === milestoneId ? { ...task, milestoneId: "" } : task
    ));
    if (editingMilestoneId === milestoneId) cancelEditMilestone();
  };

  const addMilestoneTask = (project: Project, milestone: Milestone) => {
    const inputKey = `milestone:${milestone.id}`;
    const title = projectTaskInputs[inputKey]?.trim();
    if (!title) return;

    setTasks((current) => [
      ...current,
      {
        ...emptyTask(""),
        title,
        projectId: project.id,
        milestoneId: milestone.id,
        color: project.color,
      },
    ]);
    setProjectTaskInputs((current) => ({ ...current, [inputKey]: "" }));
  };

  const addProjectTask = (project: Project) => {
    const title = projectTaskInputs[project.id]?.trim();
    if (!title) return;
 
    setTasks((current) => [
      ...current,
      {
        ...emptyTask(""),
        title,
        projectId: project.id,
        color: project.color,
      },
    ]);
 
    setProjectTaskInputs((current) => ({ ...current, [project.id]: "" }));
  };
 
  /* PROJECT STATISTICS */
 
  const isProjectFinished = (project: Project) => {
    const relatedTasks = tasks.filter((task) => task.projectId === project.id);
    const hasWork = relatedTasks.length > 0 || project.milestones.length > 0;
    const allTasksDone = relatedTasks.every((task) => task.done);
    const allMilestonesDone = project.milestones.every((milestone) => milestone.done);
    return hasWork && allTasksDone && allMilestonesDone;
  };

  const projectStats = (project: Project) => {
    const related = tasks.filter((task) => task.projectId === project.id);
    const total = related.length;
    const done = related.filter((task) => task.done).length;
    const percentage = total ? Math.round((done / total) * 100) : 0;
    const milestoneTotal = project.milestones.length;
    const milestoneDone = project.milestones.filter((m) => m.done).length;
    const remaining = project.deadline ? daysUntil(project.deadline) : null;
 
    return {
      total,
      done,
      percentage,
      milestoneTotal,
      milestoneDone,
      remaining,
    };
  };
 
  function daysUntil(date: string) {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const target = fromKey(date);
    target.setHours(0, 0, 0, 0);
    return Math.round(
      (target.getTime() - todayDate.getTime()) / 86400000
    );
  }
 
  /* TASK CARD */
 
  const renderTask = (task: Task, compact = false) => (
    <div
      key={task.id}
      className={`task-card ${compact ? "task-card-compact" : ""} ${task.done ? "task-done" : ""}`}
      style={{ background: task.color || DEFAULT_COLOR }}
      draggable
      onDragStart={() => setDraggedTaskId(task.id)}
      onDragEnd={() => setDraggedTaskId(null)}
      onClick={() => openEditTask(task)}
    >
      <button
        className={`task-check ${task.done ? "checked" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          toggleTask(task.id);
        }}
      >
        {task.done ? <Icon name="check" size={13} /> : ""}
      </button>
 
      <div className="task-content">
        <div className="task-title">{task.title}</div>
        <button className="task-mobile-edit" onClick={(event) => { event.stopPropagation(); openEditTask(task); }}>Edit / reschedule</button>
        {!compact && (
          <div className="task-meta">
            {task.projectId && (
              <span>{projects.find((p) => p.id === task.projectId)?.name}</span>
            )}
            {task.repeat !== "Does not repeat" && <span><Icon name="repeat" size={12} /> Repeats</span>}
            {task.steps.length > 0 && <span>{task.steps.length} subtasks</span>}
          </div>
        )}
      </div>
      <span className="task-edit"><Icon name="pencil" size={13} /></span>
    </div>
  );
 
  const renderOverviewSection = () => (<>
          {feedPreferences.showOverviewCards && (feedPreferences.showToday || feedPreferences.showOverdue || feedPreferences.showNextSevenDays || feedPreferences.showOpenTasks) && (
            <section className="dashboard-strip" aria-label="Selected overview">
              {feedPreferences.plannerOverviewOrder.map((label: string) => {
                const item = label === "Today" ? { enabled: feedPreferences.showToday, count: todayTasks.length }
                  : label === "Overdue" ? { enabled: feedPreferences.showOverdue, count: overdueTasks.length }
                  : label === "Next 7 days" ? { enabled: feedPreferences.showNextSevenDays, count: nextSevenDays.length }
                  : { enabled: feedPreferences.showOpenTasks, count: openTasks.length };
                return item.enabled ? <div className="dashboard-card" key={label}><strong>{item.count}</strong><span>{label}</span></div> : null;
              })}
            </section>
          )}


  </>);

  const renderWeeklyPlannerSection = () => (<>
          {feedPreferences.showWeeklyPlanner && <>
          <div className="week-toolbar">
            <div className="week-controls">
              <button className="icon-btn" aria-label="Previous period" onClick={() => shiftPlanner(-1)}><Icon name="chevron-left" /></button>
 
              <div className="week-label">
                {formatDate(weekDays[0], { day: "numeric", month: "short" })}
                {plannerView !== "1" && <> — {formatDate(weekDays[weekDays.length - 1], { day: "numeric", month: "short" })}</>}
              </div>
 
              <button className="icon-btn" aria-label="Next period" onClick={() => shiftPlanner(1)}><Icon name="chevron-right" /></button>
              <button className="today-btn" onClick={() => setWeek(plannerView === "7" ? mondayOf(new Date()) : new Date())}>Today</button>
              <div className="view-switch" aria-label="Planner view">
                <button className={plannerView === "7" ? "active" : ""} onClick={() => changePlannerView("7")}>7 days</button>
                <button className={plannerView === "3" ? "active" : ""} onClick={() => changePlannerView("3")}>3 days</button>
                <button className={plannerView === "1" ? "active" : ""} onClick={() => changePlannerView("1")}>1 day</button>
              </div>
            </div>
 
            <div className="week-progress">
              <div className="week-progress-copy">
                <div className="week-progress-title">Weekly progress</div>
                <div className="week-progress-detail">
                  {weekCompleted} of {weekTaskList.length} tasks completed
                </div>
              </div>
              <div
                className="week-progress-circle"
                style={{ "--progress": `${weekProgress}%` } as React.CSSProperties}
              >
                <span>{weekProgress}%</span>
              </div>
            </div>
          </div>
 
          <div className={`week-grid view-${plannerView}`} style={{ "--day-count": weekDays.length } as React.CSSProperties}>
            {weekDays.map((day) => {
              const key = dateKey(day);
              const dayTasks = tasks.filter((task) => task.date === key);
 
              return (
                <section
                  key={key}
                  className={`day-card ${key === today ? "is-today" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.currentTarget.classList.add("drag-over");
                  }}
                  onDragLeave={(event) => event.currentTarget.classList.remove("drag-over")}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.currentTarget.classList.remove("drag-over");
                    if (draggedTaskId) moveTask(draggedTaskId, key);
                  }}
                >
                  <div className="day-top">
                    <div>
                      <div className="day-name">{formatDate(day, { weekday: "short" })}</div>
                      <div className="day-number">{day.getDate()}</div>
                    </div>
                    {key === today && <div className="today-dot" />}
                  </div>
 
                  <button className="day-add" onClick={() => openNewTask(key)}>
                    <span className="day-add-symbol"><Icon name="plus" size={15} /></span>
                    <span>Add a task</span>
                  </button>
 
                  <div className="day-tasks">{dayTasks.map((task) => renderTask(task, true))}</div>
                </section>
              );
            })}
          </div>
 
          </>}


  </>);

  const renderUnassignedSection = () => (<>
          {feedPreferences.showUnassigned && <>
          <div className="section-heading">
            <h2>Unassigned</h2>
            <span>{unscheduledTasks.length} tasks</span>
          </div>

          <div className="unassigned-board">
            {unassignedColumns.map((column) => {
              const columnTasks = unscheduledTasks.filter(
                (task) => (task.unassignedColumnId || unassignedColumns[0]?.id) === column.id
              );
              return (
                <section
                  className="unassigned-column"
                  key={column.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedTaskId) moveTaskToUnassignedColumn(draggedTaskId, column.id);
                  }}
                >
                  <div className="unassigned-column-header">
                    {editingColumnId === column.id ? (
                      <form className="column-title-form" onSubmit={(event) => {
                        event.preventDefault();
                        saveColumnName(column.id);
                      }}>
                        <input autoFocus value={editingColumnName}
                          onChange={(event) => setEditingColumnName(event.target.value)}
                          aria-label="Column name" />
                        <button type="submit" title="Save column name"><Icon name="check" size={14} /></button>
                        <button type="button" title="Cancel" onClick={() => {
                          setEditingColumnId(null);
                          setEditingColumnName("");
                        }}><Icon name="close" size={14} /></button>
                      </form>
                    ) : (
                      <>
                        <h3>{column.name}</h3>
                        <button className="column-edit-btn" title="Rename column"
                          aria-label={`Rename ${column.name}`}
                          onClick={() => startEditingColumn(column)}><Icon name="pencil" size={13} /></button>
                      </>
                    )}
                    <span>{columnTasks.length}</span>
                  </div>

                  <form className="unscheduled-form" onSubmit={(event) => {
                    event.preventDefault();
                    addUnassignedTask(column.id);
                  }}>
                    <span className="day-add-symbol"><Icon name="plus" size={15} /></span>
                    <input value={unscheduledInputs[column.id] || ""}
                      onChange={(event) => setUnscheduledInputs((current) => ({
                        ...current, [column.id]: event.target.value,
                      }))}
                      placeholder="Add a task..." />
                    <button type="submit">Add</button>
                  </form>

                  <div className="unassigned-column-tasks">
                    {columnTasks.length
                      ? columnTasks.map((task) => renderTask(task))
                      : <div className="empty-hint">Drop tasks here or add a new one.</div>}
                  </div>
                </section>
              );
            })}

            <button className="add-unassigned-column" onClick={addUnassignedColumn}>
              <span><Icon name="plus" size={14} /></span><span>Add column</span>
            </button>
          </div>

          </>}


  </>);

  const renderImportantSection = () => (<>
          {feedPreferences.showImportant && <section className="important-section">
            <div className="section-heading">
              <div className="important-panel-title"><span><Icon name="star" size={15} /></span><h2>Important</h2></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="important-panel-count">{importantTasks.length} active</span>
                <button className="important-hide-btn" onClick={() => setImportantBlockVisible((visible) => !visible)}>
                  {importantBlockVisible ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {importantBlockVisible && (
              <div className="important-panel">
                {importantTasks.length > 0 ? (
                  <div className="important-task-list">
                    {importantTasks.map((task) => {
                      const remaining = task.date ? daysUntil(task.date) : null;
                      const dateLabel = remaining === null
                        ? "No date"
                        : remaining < 0
                          ? `${Math.abs(remaining)} days overdue`
                          : remaining === 0
                            ? "Today"
                            : remaining === 1
                              ? "Tomorrow"
                              : `In ${remaining} days`;
                      return (
                        <button className="important-task" key={task.id} onClick={() => openEditTask(task)}>
                          <span className="important-task-star"><Icon name="star" size={13} /></span>
                          <span className="important-task-main">
                            <span className="important-task-name">{task.title}</span>
                            {task.projectId && <span className="important-task-project">{projects.find((project) => project.id === task.projectId)?.name}</span>}
                          </span>
                          <span className={`important-task-date ${remaining !== null && remaining < 0 ? "overdue" : remaining !== null && remaining <= 2 ? "soon" : ""}`}>
                            {dateLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="important-empty">No important tasks right now. Mark a task as Important to keep it visible here.</div>
                )}
              </div>
            )}
          </section>}
  </>);

  /* Authentication gate: keep the complete planner mounted only for signed-in users. */
  if (authLoading) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FCFCED", color: "#20231F", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" }}>Loading drømhjem…</div>;
  }

  if (session && inviteMode) {
    return (
      <div style={{ minHeight: "100vh", width: "100%", background: "#FCFCED", display: "grid", placeItems: "center", padding: 24, color: "#20231F", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" }}>
        <form onSubmit={handleSetPassword} style={{ width: "100%", maxWidth: 400, background: "#FFF", border: "1px solid #E8E8DD", borderRadius: 22, padding: 30, boxShadow: "0 12px 40px rgba(40,40,20,.06)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 28, letterSpacing: "-.06em", fontWeight: 600 }}>drømhjem</div>
            <div style={{ marginTop: 8, color: "#77796F", fontSize: 13 }}>Willkommen – richte deinen Zugang ein.</div>
          </div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 7 }}>Neues Passwort</label>
          <input type="password" required minLength={8} autoComplete="new-password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Mindestens 8 Zeichen" style={{ width: "100%", padding: "13px 14px", border: "1px solid #E3E3D9", borderRadius: 11, marginBottom: 17, background: "#FCFCED", color: "#20231F", outlineColor: "#A9B7A1" }} />
          <label style={{ display: "block", fontSize: 12, marginBottom: 7 }}>Passwort wiederholen</label>
          <input type="password" required minLength={8} autoComplete="new-password" value={authPasswordConfirm} onChange={(event) => setAuthPasswordConfirm(event.target.value)} placeholder="Passwort erneut eingeben" style={{ width: "100%", padding: "13px 14px", border: "1px solid #E3E3D9", borderRadius: 11, marginBottom: 18, background: "#FCFCED", color: "#20231F", outlineColor: "#A9B7A1" }} />
          {authError && <div role="alert" style={{ color: "#A13E35", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>{authError}</div>}
          <button type="submit" disabled={authBusy} style={{ width: "100%", padding: 14, border: 0, borderRadius: 999, background: "#20231F", color: "#FFF", cursor: authBusy ? "wait" : "pointer", opacity: authBusy ? .65 : 1 }}>{authBusy ? "Passwort wird gespeichert…" : "Passwort festlegen"}</button>
        </form>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: "#FCFCED", display: "grid", placeItems: "center", padding: 24, color: "#20231F", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" }}>
        <form onSubmit={handleLogin} style={{ width: "100%", maxWidth: 380, background: "#FFF", border: "1px solid #E8E8DD", borderRadius: 22, padding: 30, boxShadow: "0 12px 40px rgba(40,40,20,.06)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 28, letterSpacing: "-.06em", fontWeight: 600 }}>drømhjem</div>
            <div style={{ marginTop: 8, color: "#77796F", fontSize: 13 }}>Less planning. More doing.</div>
          </div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 7 }}>E-Mail</label>
          <input type="email" required autoComplete="username" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" style={{ width: "100%", padding: "13px 14px", border: "1px solid #E3E3D9", borderRadius: 11, marginBottom: 17, background: "#FCFCED", color: "#20231F", outlineColor: "#A9B7A1" }} />
          <label style={{ display: "block", fontSize: 12, marginBottom: 7 }}>Passwort</label>
          <input type="password" required autoComplete="current-password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Passwort" style={{ width: "100%", padding: "13px 14px", border: "1px solid #E3E3D9", borderRadius: 11, marginBottom: 18, background: "#FCFCED", color: "#20231F", outlineColor: "#A9B7A1" }} />
          {authError && <div role="alert" style={{ color: "#A13E35", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>{authError}</div>}
          <button type="submit" disabled={authBusy} style={{ width: "100%", padding: 14, border: 0, borderRadius: 999, background: "#20231F", color: "#FFF", cursor: authBusy ? "wait" : "pointer", opacity: authBusy ? .65 : 1 }}>{authBusy ? "Anmeldung…" : "Anmelden"}</button>
          <p style={{ textAlign: "center", color: "#85867C", fontSize: 11, margin: "18px 0 0" }}>Private Beta · Zugang nur mit Einladung</p>
        </form>
      </div>
    );
  }

  /* STYLES */
 
  return (
    <div className="app">
      <style>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #FCFCED;
          color: #000000;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        .app {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          color: #000000;
          font-size: 13px;
          line-height: 1.45;
          font-kerning: normal;
        }
        .app button, .app input, .app textarea, .app select { font: inherit; letter-spacing: inherit; }
        .app h1, .app h2, .app h3, .app p, .app label, .app small, .app span, .app strong, .app button { font-family: inherit; }
        .app p { line-height: 1.5; }
        .app button { line-height: 1.35; }
        .minimal-icon { display: inline-block; vertical-align: middle; }
        button { cursor: pointer; }
        .app { min-height: 100vh; padding: 28px 4.7vw 65px; }
        .topbar {
          max-width: 1500px; margin: 0 auto 58px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .brand { display: flex; align-items: center; justify-content: flex-start; width: 52px; height: 52px; flex: 0 0 auto; }
        .brand img { display: block; width: 52px; height: 52px; object-fit: contain; object-position: center; }
        .nav {
          display: flex; align-items: center; gap: 4px; padding: 5px;
          border: 1px solid #000; border-radius: 40px;
          background: transparent;
        }
        .nav .nav-search-btn { width: 38px; min-width: 38px; height: 38px; padding: 0; display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; }
        .nav .nav-search-btn.active { background: #000; color: #fff !important; }
        .nav .nav-search-btn.active svg, .nav .nav-search-btn.active svg * { stroke: #fff !important; }
        .nav-wrap { position: relative; margin-left: auto; }
        .global-search-wrap { position: absolute; top: calc(100% + 10px); right: 0; z-index: 50; width: min(320px, 82vw); }
        .global-search { width: 100%; padding: 12px 15px; border: 1px solid #000; border-radius: 24px; background: #FCFCED; color: #000; font-size: 12px; outline: none; }
        .search-results { position: absolute; top: calc(100% + 8px); right: 0; z-index: 51; width: 100%; max-height: 340px; overflow: auto; border: 1px solid #000; border-radius: 14px; background: #FCFCED; box-shadow: 0 12px 30px rgba(0,0,0,.12); padding: 6px; }
        .search-results button { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 12px; padding: 11px; border: 0; border-radius: 8px; background: transparent; text-align: left; color: #000; font-size: 12px; }
        .search-results button:hover { background: rgba(0,0,0,.07); }
        .search-results small, .search-empty { color: #000; opacity: .6; font-size: 10px; }
        .search-empty { padding: 12px; }
        .overview-order-list { display: flex; flex-direction: column; gap: 0; }
        .overview-order-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(0,0,0,.14); font-size: 12px; }
        .overview-order-actions { display: flex; gap: 5px; }
        .overview-order-actions button { width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid #000; border-radius: 50%; background: transparent; }
        .overview-order-actions button:disabled { opacity: .2; cursor: default; }
        .overview-order-actions button:first-child svg { transform: rotate(90deg); }
        .overview-order-actions button:last-child svg { transform: rotate(90deg); }
        .overview-order-row.is-draggable { border: 1px solid rgba(0,0,0,.16); border-radius: 12px; padding: 11px 12px; margin-top: 8px; background: rgba(255,255,255,.22); cursor: grab; transition: background .15s ease, border-color .15s ease, opacity .15s ease; }
        .overview-order-row.is-draggable:active { cursor: grabbing; }
        .overview-order-row.is-draggable.dragging { opacity: .42; border-style: dashed; }
        .overview-order-row.is-draggable.drag-over { border-color: #000; background: rgba(0,0,0,.07); }
        .overview-order-row.is-draggable.is-hidden { opacity: .58; background: transparent; }
        .layout-drag-label { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .layout-item-copy { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .layout-item-copy strong { font-size: 13px; line-height: 1.35; font-weight: 650; color: #000; text-align: left; }
        .layout-item-copy small { font-size: 12px; line-height: 1.4; opacity: .62; color: #000; text-align: left; }
        .layout-row-controls { display: flex; align-items: center; gap: 12px; }
        .layout-visibility-toggle { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; line-height: 1.3; white-space: nowrap; cursor: pointer; color: #000; }
        .layout-visibility-toggle input { width: 16px; height: 16px; accent-color: #000; margin: 0; }
        .layout-visibility-toggle span { opacity: .72; }
        .layout-drag-handle { display: grid; place-items: center; width: 28px; height: 30px; flex: 0 0 28px; color: #000; opacity: .62; cursor: grab; }
        .layout-drag-hint { margin: 10px 0 0; font-size: 12px; line-height: 1.45; opacity: .58; text-align: left; }
        @media (max-width: 650px) { .overview-order-row.is-draggable { padding: 10px; } .layout-drag-handle { width: 34px; height: 36px; flex-basis: 34px; } }
        .nav button {
          border: 0; background: transparent; color: #8B9189;
          padding: 12px 25px; border-radius: 30px; font-size: 13px;
        }
        .nav button.active { background: #19323B; color: white; }
        .page { max-width: 1500px; margin: 0 auto; }
        .page-heading {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 30px;
        }
        h1 { margin: 0; font-size: 29px; font-weight: 500; letter-spacing: -1px; color: #19323B; }
        .primary-btn {
          background: #19323B; color: white; border: 0;
          border-radius: 30px; padding: 13px 21px; font-size: 12px;
        }
        .primary-btn:hover { background: #294650; }
        .week-toolbar {
          display: flex; justify-content: space-between; align-items: center;
          gap: 20px; margin-bottom: 19px;
        }
        .week-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .view-switch { display: flex; gap: 3px; padding: 4px; border: 1px solid #E9E7DF; border-radius: 24px; background: rgba(255,255,255,.8); }
        .view-switch button { border: 0; border-radius: 18px; padding: 8px 12px; background: transparent; color: #89938A; font-size: 11px; transition: .18s; }
        .view-switch button.active { background: #19323B; color: #fff; }
        .week-label { min-width: 135px; text-align: center; font-size: 13px; color: #747E76; }
        .icon-btn {
          width: 39px; height: 39px; border: 1px solid #E8E7DF;
          border-radius: 50%; background: white; color: #52635A; font-size: 20px;
        }
        .today-btn { border: 0; background: transparent; color: #7D8B80; font-size: 12px; }
        .week-progress {
          display: flex; align-items: center; gap: 12px;
          min-width: 220px; justify-content: flex-end;
        }
        .week-progress-copy { text-align: right; }
        .week-progress-title { color: #66736A; font-size: 11px; }
        .week-progress-detail { color: #A0A59C; font-size: 9px; margin-top: 3px; }
        .week-progress-circle {
          width: 43px; height: 43px; border-radius: 50%;
          display: grid; place-items: center; position: relative;
          background: conic-gradient(#829A81 var(--progress), #E4E8DF 0);
          flex-shrink: 0;
        }
        .week-progress-circle::before {
          content: ""; position: absolute; inset: 4px;
          background: #FCFCED; border-radius: 50%;
        }
        .week-progress-circle span {
          position: relative; z-index: 1; font-size: 10px; color: #526157;
        }
        .week-grid {
          display: grid; grid-template-columns: repeat(var(--day-count, 7), minmax(0, 1fr)); gap: 13px;
        }
        .week-grid.view-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .week-grid.view-1 { grid-template-columns: minmax(0, 1fr); }
        .day-card {
          min-height: 425px; background: rgba(255,255,255,.82);
          border: 1px solid #E9E7E0; border-radius: 21px;
          padding: 19px 14px 14px; box-shadow: 0 4px 17px rgba(40,50,40,.025);
          transition: .2s;
        }
        .day-card.is-today { border-color: #B9CBAF; background: #FFFEFA; }
        .day-card.drag-over { border-color: #A6B78B; background: #F0F3E4; }
        .day-top {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 3px 16px;
        }
        .day-name { color: #969B92; font-size: 10px; letter-spacing: 1.3px; text-transform: uppercase; }
        .day-number { margin-top: 6px; font-size: 25px; font-weight: 500; color: #35443B; }
        .today-dot { width: 8px; height: 8px; border-radius: 50%; background: #A1B58A; }
        .day-add {
          display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 10px 3px 13px; margin-bottom: 12px;
          border: 0; border-bottom: 1px solid #EFEEE8; background: transparent;
          text-align: left; color: #9AA69A; font-size: 11px;
        }
        .day-add:hover { color: #19323B; }
        .day-add-symbol { font-size: 20px; color: #879E8C; }
        .day-tasks { display: flex; flex-direction: column; gap: 8px; min-height: 240px; }
        .task-card {
          display: flex; align-items: flex-start; gap: 9px; padding: 11px 9px;
          border-radius: 10px; cursor: pointer; min-width: 0; transition: .18s;
        }
        .task-card:hover { transform: translateY(-1px); box-shadow: 0 4px 11px rgba(40,50,40,.07); }
        .task-card-compact { align-items: center; padding: 10px 9px; }
        .task-card-compact .task-title { font-size: 11px; }
        .task-card-compact .task-edit { display: none; }
        .task-check {
          flex: 0 0 16px; width: 16px; height: 16px;
          border: 1px solid rgba(50,70,60,.4); border-radius: 50%;
          background: rgba(255,255,255,.5); padding: 0;
          color: #405A4A; font-size: 10px; line-height: 14px; margin-top: 1px;
        }
        .task-check.checked { background: #87936B; border-color: #87936B; color: white; }
        .task-content { flex: 1; min-width: 0; }
        .task-title { color: #414B45; font-size: 11px; line-height: 1.5; overflow-wrap: anywhere; }
        .task-done .task-title { text-decoration: line-through; opacity: .6; }
        .task-meta { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; color: #7C867D; font-size: 9px; }
        .task-meta span:not(:last-child)::after { content: "·"; margin-left: 5px; }
        .task-edit { color: #718477; opacity: 0; font-size: 11px; }
        .task-card:hover .task-edit { opacity: 1; }
        .unassigned-board {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(235px, 1fr));
          align-items: start; gap: 14px;
        }
        .unassigned-column {
          min-width: 0; min-height: 190px; padding: 14px;
          border: 1px solid #E9E7E0; border-radius: 15px;
          background: rgba(255,255,255,.58);
        }
        .unassigned-column-header {
          display: flex; align-items: center; gap: 9px;
          min-height: 30px; margin-bottom: 11px;
        }
        .unassigned-column-header h3 {
          flex: 1; min-width: 0; margin: 0; color: #35443B;
          font-size: 13px; font-weight: 600; overflow-wrap: anywhere;
        }
        .unassigned-column-header > span { color: #A0A59C; font-size: 10px; }
        .column-edit-btn, .column-title-form button {
          border: 0; background: transparent; color: #829487;
          padding: 4px 6px; font-size: 15px;
        }
        .column-title-form { display: flex; flex: 1; gap: 4px; }
        .column-title-form input {
          flex: 1; min-width: 0; border: 1px solid #DDE3DA;
          border-radius: 7px; padding: 6px 8px; font-size: 11px;
          outline: none; color: #35443B; background: white;
        }
        .unassigned-column .unscheduled-form { margin-bottom: 11px; }
        .unassigned-column-tasks { display: flex; flex-direction: column; gap: 8px; }
        .unassigned-column-tasks .task-card { width: 100%; }
        .add-unassigned-column {
          min-height: 190px; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px;
          border: 1px dashed #D2DAD0; border-radius: 15px;
          background: rgba(255,255,255,.25); color: #89998A; font-size: 11px;
        }
        .add-unassigned-column:hover { background: #F4F5EF; border-color: #AEBDAA; }
        .add-unassigned-column span:first-child { font-size: 24px; }
        .important-toggle-field { margin-top: 4px; }
        .important-toggle {
          display: flex; align-items: center; gap: 12px; padding: 13px 15px;
          border: 1px solid #E7E5DC; border-radius: 13px; background: #FBFAF6;
          cursor: pointer;
        }
        .important-toggle input { accent-color: #A68B58; width: 16px; height: 16px; }
        .important-toggle-copy { display: flex; flex: 1; flex-direction: column; gap: 3px; }
        .important-toggle-copy strong { color: #48544B; font-size: 12px; font-weight: 600; }
        .important-toggle-copy small { color: #929990; font-size: 10px; line-height: 1.5; }
        .important-star { color: #B49A62; font-size: 17px; }
        .important-section { margin-top: 30px; }
        .important-panel {
          padding: 15px; border: 1px solid #E9E4D8; border-radius: 16px;
          background: rgba(250,248,241,.78);
        }
        .important-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .important-panel-title { display: flex; align-items: center; gap: 8px; }
        .important-panel-title h2 { margin: 0; color: #465248; font-size: 14px; font-weight: 600; }
        .important-panel-title span { color: #B49A62; font-size: 15px; }
        .important-panel-count { color: #A0A59C; font-size: 10px; }
        .important-hide-btn { border: 0; background: transparent; color: #8D968B; font-size: 10px; padding: 6px 8px; }
        .important-task-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 9px; }
        .important-task {
          display: flex; align-items: center; gap: 10px; min-width: 0; padding: 11px 12px;
          border: 1px solid #EAE6DC; border-radius: 11px; background: rgba(255,255,255,.76);
          cursor: pointer; text-align: left;
        }
        .important-task:hover { border-color: #D5C7A7; background: #FFFEFA; }
        .important-task-star { flex: 0 0 auto; color: #B49A62; font-size: 13px; }
        .important-task-main { display: flex; flex: 1; flex-direction: column; gap: 3px; min-width: 0; }
        .important-task-name { color: #465148; font-size: 11px; line-height: 1.45; overflow-wrap: anywhere; }
        .important-task-project { color: #9AA196; font-size: 9px; }
        .important-task-date { flex: 0 0 auto; color: #8D968B; font-size: 10px; text-align: right; }
        .important-task-date.soon { color: #A17E43; }
        .important-task-date.overdue { color: #A66D64; }
        .important-empty { padding: 12px 2px 3px; color: #9AA196; font-size: 11px; }
        .unscheduled {
          display: flex; flex-wrap: wrap; gap: 10px; min-height: 90px;
          padding: 13px; border: 1px dashed #D9DED5;
          border-radius: 14px; background: rgba(255,255,255,.35);
        }
        .unscheduled .task-card { width: 220px; }
        .unscheduled-form {
          display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 5px 3px 12px; border-bottom: 1px solid #EFEEE8;
        }
        .unscheduled-form input {
          flex: 1; min-width: 0; border: 0; outline: 0;
          background: transparent; color: #414B45; font-size: 12px;
        }
        .unscheduled-form input::placeholder { color: #A0A59C; }
        .unscheduled-form button {
          border: 0; border-radius: 20px; background: #19323B;
          color: white; padding: 8px 14px; font-size: 11px;
        }
        .section-heading {
          display: flex; align-items: center; justify-content: space-between;
          margin: 35px 0 15px;
        }
        .section-heading h2 { margin: 0; color: #19323B; font-size: 20px; font-weight: 500; }
        .section-heading span { color: #999F96; font-size: 11px; }
        .empty-hint { padding: 10px 3px; color: #A0A59C; font-size: 11px; }
 
        .projects-grid {
          display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 17px;
        }
        .project-card {
          min-height: 215px; padding: 22px 23px;
          border: 1px solid rgba(80,90,80,.07); border-radius: 18px;
          cursor: pointer; transition: .2s;
        }
        .project-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(50,60,50,.07); }
        .project-card-top { display: flex; justify-content: space-between; align-items: center; }
        .project-mark {
          display: grid; place-items: center; width: 31px; height: 31px;
          border-radius: 50%; background: rgba(255,255,255,.55); color: #536C59;
        }
        .project-deadline { color: #5D6D62; font-size: 10px; }
        .project-name { margin-top: 18px; color: #35443B; font-size: 21px; font-weight: 500; }
        .project-description {
          margin-top: 6px; color: #737B70; font-size: 11px;
          line-height: 1.5; min-height: 17px;
        }
        .project-stat-row {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 21px; color: #657267; font-size: 10px;
        }
        .project-progress-track {
          height: 5px; margin-top: 10px; background: rgba(255,255,255,.65);
          border-radius: 10px; overflow: hidden;
        }
        .project-progress-fill { height: 100%; border-radius: 10px; background: #617C68; }
        .project-card-bottom {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 12px; color: #778177; font-size: 10px;
        }
        .finished-projects-section { margin-top: 48px; }
        .finished-projects-heading {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 12px; margin: 0 0 16px;
        }
        .finished-projects-heading h2 {
          margin: 0; color: #19323B; font-size: 20px; font-weight: 500;
        }
        .finished-projects-heading span { color: #999F96; font-size: 11px; }
        .finished-project-card { opacity: .88; }
        .finished-label {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 9px; border-radius: 20px;
          background: rgba(255,255,255,.62); color: #526C58;
          font-size: 9px; letter-spacing: .3px;
        }
        .finished-empty {
          padding: 22px; border: 1px dashed #DCE0D8;
          border-radius: 14px; color: #A0A59C; font-size: 11px;
          background: rgba(255,255,255,.3);
        }
        .project-detail {
          margin-top: 22px; padding: 25px;
          border: 1px solid #EAE8DF; border-radius: 16px;
          background: rgba(255,255,255,.7);
        }
        .project-detail-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 15px; margin-bottom: 25px;
        }
        .project-detail-header h2 { margin: 0; font-size: 25px; font-weight: 500; color: #19323B; }
        .project-detail-header p { margin: 7px 0 0; color: #92978E; font-size: 11px; }
        .project-detail-actions { display: flex; gap: 8px; align-items: center; }
        .text-btn { border: 0; background: transparent; color: #7C8D7F; font-size: 11px; }
        .back-btn {
          border: 0; background: transparent; color: #718477;
          padding: 0; margin-bottom: 22px; font-size: 12px;
        }
        .detail-stats {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 12px; margin-bottom: 25px;
        }
        .detail-stat {
          padding: 16px; border-radius: 11px; background: #F4F4ED;
        }
        .detail-stat strong { display: block; color: #34463B; font-size: 22px; font-weight: 500; }
        .detail-stat span { display: block; margin-top: 5px; color: #899187; font-size: 10px; }
        .project-section-title {
          display: flex; justify-content: space-between; align-items: center;
          margin: 27px 0 13px;
        }
        .project-section-title h3 { margin: 0; font-size: 15px; font-weight: 500; color: #35443B; }
        .project-section-title span { color: #929990; font-size: 10px; }
        .project-task-list {
          display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px;
        }
        .project-completed-task {
          display: flex; align-items: center; justify-content: space-between; gap: 14px;
          min-width: 0; padding: 14px 16px; border-radius: 11px;
          background: #F4F4ED; color: #35443B;
        }
        .project-completed-task-name {
          min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          font-size: 12px; text-decoration: line-through; text-decoration-color: #AAB2A8;
        }
        .project-completed-task-date { flex: 0 0 auto; color: inherit; opacity: .82; font-size: 10px; }
        .project-add { display: flex; gap: 8px; margin-top: 15px; }
        .project-add input {
          flex: 1; min-width: 0; border: 1px solid #E8E7DF;
          border-radius: 9px; padding: 11px; background: white;
          outline: 0; font-size: 11px;
        }
        .project-add button {
          padding: 0 16px; border: 0; border-radius: 9px;
          background: #19323B; color: white; font-size: 11px;
        }
        .milestone-list { display: flex; flex-direction: column; gap: 9px; }
        .milestone-item {
          display: flex; align-items: center; gap: 11px;
          padding: 13px 14px; border: 1px solid rgba(65,80,65,.09);
          border-radius: 12px; background: #F0F2EA;
        }
        .milestone-item input { accent-color: #526B58; flex-shrink: 0; }
        .milestone-title { flex: 1; min-width: 0; font-size: 12px; color: #35443B; overflow-wrap: anywhere; }
        .milestone-title.done { text-decoration: line-through; color: #748176; opacity: .7; }
        .milestone-date { color: #596B5D; font-size: 10px; white-space: nowrap; }
        .milestone-actions { display: flex; gap: 5px; }
        .milestone-actions button {
          border: 0; background: rgba(255,255,255,.55); color: #53675A;
          border-radius: 7px; padding: 5px 8px; font-size: 10px;
        }
        .milestone-actions button:hover { background: rgba(255,255,255,.9); }
        .milestone-task-area {
          margin: -3px 0 8px 28px; padding: 11px 13px 13px;
          border-left: 2px solid rgba(70,90,70,.18);
        }
        .milestone-task-list { display: flex; flex-direction: column; gap: 7px; }
        .milestone-task-list .task-card { border: 1px solid rgba(65,80,65,.08); }
        .milestone-task-add { display: flex; gap: 7px; margin-top: 9px; }
        .milestone-task-add input {
          flex: 1; min-width: 0; border: 1px solid #DDE3D9;
          border-radius: 8px; padding: 9px 10px; background: rgba(255,255,255,.9);
          color: #35443B; outline: 0; font-size: 11px;
        }
        .milestone-task-add button {
          border: 0; border-radius: 8px; padding: 0 13px;
          background: #19323B; color: white; font-size: 10px;
        }
        .milestone-task-empty { color: #718073; font-size: 10px; padding: 3px 0 7px; }
        .milestone-form {
          display: grid; grid-template-columns: minmax(0,1fr) 150px auto auto;
          gap: 8px; margin-top: 13px;
        }
        .milestone-form input {
          min-width: 0; border: 1px solid #DDE3D9; border-radius: 9px;
          padding: 11px 12px; background: #FFFFFF; color: #35443B;
          outline: 0; font-size: 12px;
        }
        .milestone-form input::placeholder { color: #929D92; }
        .milestone-form button {
          border: 0; border-radius: 9px; padding: 0 15px;
          background: #19323B; color: white; font-size: 11px;
        }
        .milestone-form .milestone-cancel {
          background: #EEF0E9; color: #617264;
        }
 
        .modal-backdrop {
          position: fixed; inset: 0; z-index: 50;
          display: flex; align-items: center; justify-content: center;
          padding: 20px; background: rgba(22,34,37,.35);
          backdrop-filter: blur(4px);
        }
        .modal {
          width: min(100%, 760px); max-height: 92vh; overflow-y: auto;
          padding: 34px 36px; border: 1px solid #E8E7E1;
          border-radius: 18px; background: #FFFEFA;
          box-shadow: 0 20px 70px rgba(25,40,43,.18);
          animation: modalIn .18s ease;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 27px;
        }
        .modal-kicker { color: #879199; font-size: 12px; font-weight: 600; letter-spacing: 2px; }
        .close-btn { width: 32px; height: 32px; border: 0; background: transparent; color: #747E80; font-size: 25px; }
        .modal-prompt {
          margin: 0 0 27px; color: #AAB4B8;
          font-size: clamp(25px, 4vw, 38px); font-weight: 400; letter-spacing: -1.1px;
        }
        .modal-label {
          display: block; margin-bottom: 9px; color: #929DA2;
          font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase;
        }
        .modal-field { margin-bottom: 24px; }
        .modal-input, .modal-select, .modal-textarea {
          width: 100%; border: 1px solid #E1E4E1; border-radius: 12px;
          padding: 14px 16px; outline: none; background: white;
          color: #374145; font-size: 14px;
        }
        .modal-input:focus, .modal-select:focus, .modal-textarea:focus { border-color: #B9CBAF; }
        .modal-textarea { min-height: 95px; resize: vertical; }
        .modal-input::placeholder, .modal-textarea::placeholder { color: #A8B0B3; }
        .date-project-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 27px; }
        .color-list { display: flex; flex-wrap: wrap; gap: 12px; }
        .color-option {
          width: 37px; height: 37px; border: 2px solid rgba(30,40,40,.08);
          border-radius: 50%; padding: 0; transition: transform .15s;
        }
        .color-option:hover { transform: scale(1.08); }
        .color-option.selected { outline: 2px solid #899A91; outline-offset: 3px; }
        .color-note { margin-top: 9px; color: #929DA2; font-size: 10px; }
        .steps-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
        .step-item {
          display: flex; align-items: center; gap: 9px; padding: 10px 12px;
          border-radius: 9px; background: #F3F3ED; color: #4F5B57; font-size: 12px;
        }
        .step-bullet { width: 7px; height: 7px; border-radius: 50%; background: #A4B59C; flex-shrink: 0; }
        .step-item span:nth-child(2) { flex: 1; }
        .step-remove { border: 0; background: transparent; color: #A0A49E; font-size: 16px; }
        .step-add { display: flex; gap: 8px; }
        .step-add input {
          flex: 1; min-width: 0; border: 1px solid #E1E4E1;
          border-radius: 9px; padding: 11px; outline: none; font-size: 12px;
        }
        .step-add button {
          border: 1px solid #E1E4E1; border-radius: 9px;
          background: white; color: #53645A; padding: 0 15px; font-size: 12px;
        }
        .modal-footer {
          display: flex; justify-content: space-between; align-items: center;
          gap: 10px; margin-top: 30px; padding-top: 20px;
          border-top: 1px solid #EEEDE7;
        }
        .modal-footer-right { display: flex; gap: 9px; }
        .secondary-btn {
          border: 1px solid #E1E4E1; border-radius: 25px;
          padding: 12px 18px; background: white; color: #66716C; font-size: 12px;
        }
        .delete-btn { border: 0; background: transparent; color: #A58D87; font-size: 11px; }
        .confirm-modal { width: min(100%, 430px); padding: 30px; border-radius: 22px; background: #FFFEFA; border: 1px solid #E8E7E1; box-shadow: 0 24px 80px rgba(25,40,43,.2); animation: modalIn .18s ease; }
        .confirm-kicker { color: #91A18F; font-size: 10px; letter-spacing: 1.8px; font-weight: 600; text-transform: uppercase; }
        .confirm-title { margin: 12px 0 8px; color: #19323B; font-size: 23px; font-weight: 500; letter-spacing: -.6px; }
        .confirm-copy { margin: 0 0 23px; color: #879188; font-size: 12px; line-height: 1.6; }
        .confirm-actions { display: flex; flex-direction: column; gap: 9px; }
        .confirm-actions button { width: 100%; border-radius: 12px; padding: 13px 15px; font-size: 12px; text-align: left; }
        .confirm-single { border: 1px solid #E3E7DF; background: #F7F8F2; color: #42564A; }
        .confirm-series { border: 1px solid #E7D8D3; background: #F8EFEC; color: #9A6258; }
        .confirm-cancel { border: 0; background: transparent; color: #929B91; text-align: center !important; }
        .empty-state {
          grid-column: 1 / -1; padding: 55px 20px; text-align: center;
          border: 1px dashed #DCE0D8; border-radius: 16px;
          background: rgba(255,255,255,.4);
        }
        .empty-state h3 { margin: 0 0 10px; color: #19323B; font-size: 20px; font-weight: 500; }
        .empty-state p { margin: 0 auto 18px; max-width: 300px; color: #929990; font-size: 12px; line-height: 1.6; }
 
        /* DRØMHJEM THEME: unified black UI on warm ivory canvas */
        body, #root, .app { background: #FCFCED !important; color: #000000 !important; }
        .app { --ink: #000000; --canvas: #FCFCED; }
        .app, .app * { color: #000000 !important; }
        .app svg, .app svg * { color: #000000 !important; stroke: #000000 !important; }
        .app .minimal-icon { display: inline-block; flex: 0 0 auto; vertical-align: middle; stroke: #000000 !important; fill: none !important; stroke-width: 1.7; }
        .app button, .app [role="button"], .app input, .app textarea, .app select { color: #000000 !important; }
        .app button, .app [role="button"], .app input, .app textarea, .app select,
        .app .day-card, .app .nav, .app .view-switch, .app .icon-btn,
        .app .project-card, .app .important-panel, .app .important-task,
        .app .unassigned-column, .app .milestone-item, .app .detail-stat,
        .app .empty-state, .app .confirm-modal, .app .modal-content {
          border-color: #000000 !important;
        }
        .app .nav, .app .view-switch, .app .icon-btn,
        .app .nav button, .app .view-switch button,
        .app .day-add, .app .day-add-symbol, .app .task-edit,
        .app .text-btn, .app .close-btn, .app .important-hide-btn,
        .app .milestone-actions button, .app .delete-btn { color: #000000 !important; }
        /* Einheitliche schwarze Füllung für aktive Navigationsleisten und Aktions-Elemente */
        .app .settings-nav-btn.active, .app .settings-nav-btn.active svg, .app .settings-nav-btn.active svg * { color: #FFFFFF !important; stroke: #FFFFFF !important; }
        .app .nav button.active, .app .view-switch button.active,
        .app .primary-btn, .app .confirm-series, .app .confirm-single,
        .app .task-check.checked, .app .unscheduled-form button,
        .app .milestone-form button, .app .modal-footer .save-btn,
        .app .modal-footer .primary-btn {
          background: #000000 !important;
          color: #FFFFFF !important;
          border: 1px solid #000000 !important;
        }
        .app .project-completed-task,
        .app .project-completed-task * { color: var(--readable-color, #000000) !important; }
        .app input::placeholder, .app textarea::placeholder { color: #000000 !important; opacity: .5; }
        .app input[type="checkbox"], .app input[type="radio"] { accent-color: #000000; }
        .app .day-card, .app .nav, .app .view-switch, .app .icon-btn { border-color: #000000 !important; }
        .app .day-name, .app .day-number, .app .week-label, .app .today-btn,
        .app .section-heading h2, .app .project-detail-header h2,
        .app .project-name, .app .project-deadline, .app .project-progress,
        .app .finished-projects-heading, .app .finished-projects-heading span,
        .app .important-panel-title, .app .important-panel-count,
        .app .important-task-name, .app .important-task-project,
        .app .important-task-date, .app .empty-hint, .app .empty-state,
        .app .unassigned-column-title, .app .milestone-title,
        .app .milestone-date, .app .project-section-title,
        .app .project-section-title span { color: #000000 !important; }
        .app .task-card:not(.project-completed-task) *,
        .app .project-card *, .app .unassigned-column *,
        .app .important-panel *, .app .important-task *,
        .app .milestone-item * { color: #000000 !important; }
        .app .task-card svg, .app .project-card svg,
        .app .unassigned-column svg, .app .important-panel svg,
        .app .milestone-item svg { stroke: #000000 !important; }
        .app .modal-overlay { background: rgba(0,0,0,.28) !important; }
        .app .modal, .app .confirm-modal { background: #FCFCED !important; }


        /* Consistent typography and alignment across the app */
        .app, .app * { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
        .app { color: #000000; }
        .app h1, .app h2, .app h3 { color: #000000; letter-spacing: -0.025em; }
        .app p, .app label, .app small, .app button, .app input, .app textarea, .app select { letter-spacing: 0; }
        .settings-page { width: 100%; max-width: 1120px; margin-left: auto; margin-right: auto; }
        .settings-page .page-heading { margin-bottom: 10px; }
        .settings-page .page-heading h1 { font-size: 30px; line-height: 1.2; font-weight: 600; }
        .settings-intro { max-width: 760px; margin: 0 0 28px; color: #000; opacity: .62; font-size: 13px; line-height: 1.55; text-align: left; }
        .settings-group { margin: 20px 0; padding: 26px 28px; border: 1px solid #000; border-radius: 16px; text-align: left; }
        .settings-group h2 { margin: 0 0 6px; color: #000; font-size: 18px; line-height: 1.3; font-weight: 650; text-align: left; }
        .settings-group > p { margin: 0 0 18px; color: #000; opacity: .62; font-size: 13px; line-height: 1.5; text-align: left; }
        .settings-options { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 0 24px; }
        .settings-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; padding: 12px 2px; border-top: 1px solid rgba(0,0,0,.14); color: #000; font-size: 13px; line-height: 1.4; text-align: left; }
        .settings-row input { width: 18px; height: 18px; accent-color: #000; flex: 0 0 auto; }
        .settings-section-label { margin: 26px 0 8px; color: #000; font-size: 11px; line-height: 1.3; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; text-align: left; }
        .dashboard-strip { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,160px),1fr)); gap: 10px; margin: 28px 0 26px; padding-top: 4px; align-items: stretch; }
        .dashboard-card { display: flex; min-width: 0; min-height: 92px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 15px 14px 13px; border: 1px solid #000; border-radius: 13px; background: transparent; text-align: center; overflow: visible; }
        .dashboard-card strong { display: block; margin: 0; font-size: 23px; line-height: 1.2; font-weight: 500; color: #000; }
        .dashboard-card span { display: block; margin: 0; font-size: 11px; line-height: 1.4; font-weight: 500; color: #000; opacity: .72; }
        .backup-tools { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-top: 35px; padding: 17px; border: 1px solid #000; border-radius: 13px; }
        .backup-tools > div:first-child { display: flex; flex-direction: column; gap: 4px; }
        .backup-tools strong { font-size: 12px; color: #000; }
        .backup-tools span, .backup-message { font-size: 10px; color: #000; opacity: .65; }
        .backup-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .backup-import-label { position: relative; overflow: hidden; display: inline-flex; align-items: center; }
        .backup-import-label input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
        .task-mobile-edit { display: none; border: 0; padding: 5px 0 0; background: transparent; color: inherit; opacity: .65; font-size: 10px; text-align: left; }
        .task-card { touch-action: pan-y; }

        @media (max-width: 1100px) {
          .week-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .week-grid.view-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .week-grid.view-1 { grid-template-columns: minmax(0, 1fr); }
          .projects-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 650px) {
          .app { padding: 20px 15px 45px; }
          .topbar { margin-bottom: 32px; flex-wrap: wrap; gap: 14px; }
          .settings-options { grid-template-columns: 1fr; }
          .settings-group { padding: 20px 16px; margin: 16px 0; }
          .settings-group h2 { font-size: 17px; }
          .settings-group > p, .settings-intro { font-size: 12px; }
          .settings-section-label { margin-top: 22px; }
          .overview-order-row.is-draggable { align-items: flex-start; }
          .layout-row-controls { gap: 8px; }
          .layout-visibility-toggle span { display: none; }
          .nav-wrap { margin-left: auto; }
          .nav button { padding: 9px 12px; font-size: 11px; }
          .dashboard-strip { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 9px; margin-top: 24px; padding-top: 4px; }
          .dashboard-card { min-height: 78px; padding: 10px 8px; }
          .task-mobile-edit { display: inline-block; }
          .backup-tools { align-items: flex-start; flex-direction: column; }
          .backup-actions { width: 100%; }
          .backup-actions > * { flex: 1; justify-content: center; }
          .brand { width: 125px; height: 42px; }
          .nav button { padding: 10px 13px; font-size: 11px; }
          .week-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .week-grid.view-1 { grid-template-columns: minmax(0, 1fr); }
          .day-card { min-height: 300px; }
          .day-tasks { min-height: 150px; }
          .projects-grid, .project-task-list { grid-template-columns: 1fr; }
          .week-toolbar { align-items: flex-start; flex-direction: column; }
          .week-progress { justify-content: flex-start; }
          .week-progress-copy { text-align: left; }
          .date-project-row { grid-template-columns: 1fr; gap: 0; }
          .modal { padding: 25px 20px; }
          .modal-footer { align-items: flex-start; }
          .detail-stats { grid-template-columns: 1fr 1fr; }
          .milestone-form { grid-template-columns: 1fr 1fr; }
          .milestone-form input:first-child { grid-column: 1 / -1; }
          .project-detail-header { flex-direction: column; }
          .unassigned-board { grid-template-columns: 1fr; }
        }
      `}</style>
 
      <header className="topbar">
        <div className="brand"><img src="/dromhjem_icon.svg" alt="drømhjem" /></div>
        <div className="nav-wrap">
          <nav className="nav" aria-label="Main navigation">
            <button className={page === "Planner" ? "active" : ""} onClick={() => setPage("Planner")}>Planner</button>
            <button className={page === "Projects" ? "active" : ""} onClick={() => setPage("Projects")}>Projects</button>
            <button className={page === "Settings" ? "active" : ""} onClick={() => setPage("Settings")}>Settings</button>
            <button className={`nav-search-btn ${searchOpen ? "active" : ""}`} onClick={() => { setSearchOpen((open) => !open); setSearchQuery(""); }} aria-label="Search" title="Search"><Icon name="search" size={17} /></button>
            <button className="nav-search-btn" onClick={handleLogout} title="Sign out" aria-label="Sign out">↪</button>
          </nav>
          {searchOpen && <div className="global-search-wrap">
            <input autoFocus className="global-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search..." aria-label="Search tasks and projects" />
            {searchTerm && <div className="search-results">
              {searchTaskResults.map((task) => <button key={task.id} onClick={() => { setPage("Planner"); openEditTask(task); setSearchQuery(""); setSearchOpen(false); }}><span>{task.title}</span><small>{task.date || "Unassigned"}</small></button>)}
              {searchProjectResults.map((project) => <button key={project.id} onClick={() => { setPage("Projects"); setSelectedProjectId(project.id); setSearchQuery(""); setSearchOpen(false); }}><span>{project.name}</span><small>Project</small></button>)}
              {!searchTaskResults.length && !searchProjectResults.length && <div className="search-empty">No results found.</div>}
            </div>}
          </div>}
        </div>
      </header>

      {page === "Planner" && (
        <main className="page">
          <div className="page-heading">
            <h1>Weekly planner</h1>
            <button className="secondary-btn" onClick={openCalendarImport}><Icon name="plus" size={14} /> Import calendar</button>
          </div>
 
          {feedPreferences.plannerSectionOrder.map((section: string) => {
            if (section === "Weekly planner" && feedPreferences.showWeeklyPlanner) {
              return <React.Fragment key={section}>{renderWeeklyPlannerSection()}</React.Fragment>;
            }
            if (section === "Overview cards" && feedPreferences.showOverviewCards && (feedPreferences.showToday || feedPreferences.showOverdue || feedPreferences.showNextSevenDays || feedPreferences.showOpenTasks)) {
              return <React.Fragment key={section}>{renderOverviewSection()}</React.Fragment>;
            }
            if (section === "Unassigned" && feedPreferences.showUnassigned) {
              return <React.Fragment key={section}>{renderUnassignedSection()}</React.Fragment>;
            }
            if (section === "Important" && feedPreferences.showImportant) {
              return <React.Fragment key={section}>{renderImportantSection()}</React.Fragment>;
            }
            return null;
          })}

        </main>
      )}
 
      {deleteConfirmOpen && taskDraft && (
        <div className="modal-backdrop" style={{ zIndex: 70 }} onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDeleteConfirmOpen(false);
        }}>
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
            <div className="confirm-kicker">Recurring task</div>
            <h2 className="confirm-title" id="delete-confirm-title">What would you like to delete?</h2>
            <p className="confirm-copy">“{taskDraft.title}” is part of a recurring series. Choose whether this change should affect just this date or every occurrence.</p>
            <div className="confirm-actions">
              <button className="confirm-single" onClick={() => confirmDeleteTask("single")}>Only this event</button>
              <button className="confirm-series" onClick={() => confirmDeleteTask("series")}>All events in this series</button>
              <button className="confirm-cancel" onClick={() => setDeleteConfirmOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {page === "Settings" && (
        <main className="page settings-page">
          <div className="page-heading"><h1>Settings</h1></div>
          <p className="settings-intro">Customize what appears in your Planner and Projects feeds. Your choices are saved on this device.</p>

          <section className="settings-group">
            <h2>Planner feed</h2>
            <p>Choose which sections appear in your Planner and arrange their order to match your workflow.</p>
            <div className="settings-section-label">Planner sections</div>
            <p>Turn each section on or off, then drag it into the order you prefer. Hidden sections stay in your list, so you can bring them back at any time.</p>
            <div className="overview-order-list">
              {feedPreferences.plannerSectionOrder.map((label: string, index: number) => {
                const preferenceKey = label === "Weekly planner" ? "showWeeklyPlanner" : label === "Overview cards" ? "showOverviewCards" : label === "Unassigned" ? "showUnassigned" : "showImportant";
                const isVisible = Boolean(feedPreferences[preferenceKey]);
                return (
                  <div
                    className={`overview-order-row is-draggable ${!isVisible ? "is-hidden" : ""} ${draggedLayoutItem?.list === "sections" && draggedLayoutItem.label === label ? "dragging" : ""}`}
                    key={label}
                    draggable
                    onDragStart={(event) => handleLayoutDragStart("sections", label, event)}
                    onDragOver={(event) => { event.preventDefault(); if (draggedLayoutItem?.list === "sections" && draggedLayoutItem.label !== label) event.currentTarget.classList.add("drag-over"); }}
                    onDragLeave={(event) => event.currentTarget.classList.remove("drag-over")}
                    onDrop={(event) => { event.currentTarget.classList.remove("drag-over"); handleLayoutDrop("sections", label, event); }}
                    onDragEnd={() => setDraggedLayoutItem(null)}
                  >
                    <span className="layout-drag-label"><span className="layout-drag-handle" aria-hidden="true"><Icon name="grip" size={17} /></span><span className="layout-item-copy"><strong>{label}</strong><small>{label === "Weekly planner" ? "Your calendar and scheduled tasks" : label === "Overview cards" ? "Quick summaries such as Today and Overdue" : label === "Unassigned" ? "Tasks without a scheduled date" : "Your priority tasks"}</small></span></span>
                    <div className="layout-row-controls">
                      <label className="layout-visibility-toggle" title={isVisible ? "Hide section" : "Show section"}>
                        <input type="checkbox" checked={isVisible} onChange={(e) => updateFeedPreference(preferenceKey, e.target.checked)} aria-label={`${isVisible ? "Hide" : "Show"} ${label}`} />
                        <span>{isVisible ? "Shown" : "Hidden"}</span>
                      </label>
                      <div className="overview-order-actions">
                        <button type="button" aria-label={`Move ${label} up`} title="Move up" disabled={index === 0} onClick={() => movePlannerSection(label, -1)}><Icon name="chevron-left" size={13} /></button>
                        <button type="button" aria-label={`Move ${label} down`} title="Move down" disabled={index === feedPreferences.plannerSectionOrder.length - 1} onClick={() => movePlannerSection(label, 1)}><Icon name="chevron-right" size={13} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="settings-section-label">Overview cards</div>
            <div className="settings-options">
              <label className="settings-row"><span>Today</span><input type="checkbox" checked={feedPreferences.showToday} onChange={(e) => updateFeedPreference("showToday", e.target.checked)} /></label>
              <label className="settings-row"><span>Overdue</span><input type="checkbox" checked={feedPreferences.showOverdue} onChange={(e) => updateFeedPreference("showOverdue", e.target.checked)} /></label>
              <label className="settings-row"><span>Next 7 days</span><input type="checkbox" checked={feedPreferences.showNextSevenDays} onChange={(e) => updateFeedPreference("showNextSevenDays", e.target.checked)} /></label>
              <label className="settings-row"><span>Open tasks</span><input type="checkbox" checked={feedPreferences.showOpenTasks} onChange={(e) => updateFeedPreference("showOpenTasks", e.target.checked)} /></label>
            </div>
            <div className="settings-section-label">Display order</div>
            <p>Drag the cards into your preferred order. The arrows are available as an alternative.</p>
            <div className="overview-order-list">
              {feedPreferences.plannerOverviewOrder.map((label: string, index: number) => (
                <div
                  className={`overview-order-row is-draggable ${draggedLayoutItem?.list === "overview" && draggedLayoutItem.label === label ? "dragging" : ""}`}
                  key={label}
                  draggable
                  onDragStart={(event) => handleLayoutDragStart("overview", label, event)}
                  onDragOver={(event) => { event.preventDefault(); if (draggedLayoutItem?.list === "overview" && draggedLayoutItem.label !== label) event.currentTarget.classList.add("drag-over"); }}
                  onDragLeave={(event) => event.currentTarget.classList.remove("drag-over")}
                  onDrop={(event) => { event.currentTarget.classList.remove("drag-over"); handleLayoutDrop("overview", label, event); }}
                  onDragEnd={() => setDraggedLayoutItem(null)}
                >
                  <span className="layout-drag-label"><span className="layout-drag-handle" aria-hidden="true"><Icon name="grip" size={17} /></span><span>{index + 1}. {label}</span></span>
                  <div className="overview-order-actions">
                    <button type="button" aria-label={`Move ${label} up`} title="Move up" disabled={index === 0} onClick={() => moveOverviewCard(label, -1)}><Icon name="chevron-left" size={13} /></button>
                    <button type="button" aria-label={`Move ${label} down`} title="Move down" disabled={index === feedPreferences.plannerOverviewOrder.length - 1} onClick={() => moveOverviewCard(label, 1)}><Icon name="chevron-right" size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="settings-group">
            <h2>Projects feed</h2>
            <p>Choose which project groups are visible.</p>
            <div className="settings-options">
              <label className="settings-row"><span>Active projects</span><input type="checkbox" checked={feedPreferences.showActiveProjects} onChange={(e) => updateFeedPreference("showActiveProjects", e.target.checked)} /></label>
              <label className="settings-row"><span>Finished projects</span><input type="checkbox" checked={feedPreferences.showFinishedProjects} onChange={(e) => updateFeedPreference("showFinishedProjects", e.target.checked)} /></label>
            </div>
          </section>

          <section className="settings-group">
            <h2>Data & backup</h2>
            <p>Export your drømhjem data or restore a previous backup.</p>
            <div className="backup-actions">
              <button className="secondary-btn" onClick={exportBackup}>Export backup</button>
              <label className="secondary-btn backup-import-label">Restore backup<input type="file" accept="application/json,.json" onChange={(event) => importBackup(event.target.files?.[0])} /></label>
            </div>
            {backupMessage && <small className="backup-message">{backupMessage}</small>}
          </section>
        </main>
      )}

      {page === "Projects" && (
        <main className="page">
          {selectedProjectId ? (() => {
            const project = projects.find((p) => p.id === selectedProjectId);
            if (!project) return null;
 
            const related = tasks.filter((task) => task.projectId === project.id);
            const stats = projectStats(project);
 
            return (
              <>
                <button className="back-btn" onClick={() => setSelectedProjectId(null)}>
                  ← All projects
                </button>
 
                <div className="project-detail">
                  <div className="project-detail-header">
                    <div>
                      <h2>{project.name}</h2>
                      <p>{project.description}</p>
                    </div>
                    <div className="project-detail-actions">
                      <button className="text-btn" onClick={() => openEditProject(project)}>
                        Edit project
                      </button>
                    </div>
                  </div>
 
                  <div className="detail-stats">
                    <div className="detail-stat">
                      <strong>{stats.percentage}%</strong>
                      <span>Project progress</span>
                    </div>
                    <div className="detail-stat">
                      <strong>{stats.done}/{stats.total}</strong>
                      <span>Tasks completed</span>
                    </div>
                    <div className="detail-stat">
                      <strong>
                        {stats.remaining === null ? "—" :
                          stats.remaining < 0 ? `${Math.abs(stats.remaining)}d` :
                          `${stats.remaining}d`}
                      </strong>
                      <span>
                        {stats.remaining === null ? "No deadline" :
                          stats.remaining < 0 ? "Overdue" : "Until deadline"}
                      </span>
                    </div>
                  </div>
 
                  <div className="project-progress-track">
                    <div className="project-progress-fill" style={{ width: `${stats.percentage}%` }} />
                  </div>
 
                  <div className="project-section-title">
                    <h3>Tasks</h3>
                    <span>{stats.done} of {stats.total} completed</span>
                  </div>
 
                  <div className="project-task-list">
                    {related.filter((task) => task.done && !task.milestoneId).map((task) => (
                      <div
                        className="project-completed-task"
                        key={task.id}
                        style={{ background: project.color, color: getReadableTextColor(project.color), "--readable-color": getReadableTextColor(project.color) } as React.CSSProperties}
                      >
                        <span className="project-completed-task-name">{task.title}</span>
                        <span className="project-completed-task-date">
                          {task.date
                            ? formatDate(fromKey(task.date), { day: "numeric", month: "short", year: "numeric" })
                            : "No date"}
                        </span>
                      </div>
                    ))}
                    {related.filter((task) => task.done && !task.milestoneId).length === 0 && (
                      <div className="empty-hint">No completed tasks yet. Open tasks without a milestone stay in the Planner.</div>
                    )}
                  </div>
 
                  <form
                    className="project-add"
                    onSubmit={(event) => {
                      event.preventDefault();
                      addProjectTask(project);
                    }}
                  >
                    <input
                      value={projectTaskInputs[project.id] || ""}
                      onChange={(event) => setProjectTaskInputs((current) => ({
                        ...current,
                        [project.id]: event.target.value,
                      }))}
                      placeholder="Add a task to this project..."
                    />
                    <button type="submit">Add</button>
                  </form>
 
                  <div className="project-section-title">
                    <h3>Milestones</h3>
                    <span>
                      {stats.milestoneDone} of {stats.milestoneTotal} completed
                    </span>
                  </div>

                  {project.milestones.length > 0 ? (
                    <div className="milestone-list">
                      {project.milestones.map((milestone) => {
                        const milestoneTasks = related.filter((task) => task.milestoneId === milestone.id);
                        const milestoneDone = milestoneTasks.filter((task) => task.done).length;
                        const inputKey = `milestone:${milestone.id}`;
                        return (
                          <div key={milestone.id}>
                            <div
                              className="milestone-item"
                              style={{ background: project.color }}
                            >
                              <input
                                type="checkbox"
                                checked={milestone.done}
                                onChange={() => toggleMilestone(project.id, milestone.id)}
                                aria-label={`Complete milestone ${milestone.title}`}
                              />
                              <span className={`milestone-title ${milestone.done ? "done" : ""}`}>
                                {milestone.title}
                              </span>
                              <span className="milestone-date">
                                {milestoneTasks.length ? `${milestoneDone}/${milestoneTasks.length} tasks` : "No tasks"}
                              </span>
                              {milestone.date && (
                                <span className="milestone-date">
                                  {formatDate(fromKey(milestone.date), { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              )}
                              <div className="milestone-actions">
                                <button type="button" onClick={() => startEditMilestone(milestone)}>Edit</button>
                                <button type="button" onClick={() => removeMilestone(milestone.id)}>Delete</button>
                              </div>
                            </div>
                            <div className="milestone-task-area">
                              <div className="milestone-task-list">
                                {milestoneTasks.map((task) => renderTask(task))}
                                {milestoneTasks.length === 0 && (
                                  <div className="milestone-task-empty">No tasks linked to this milestone yet.</div>
                                )}
                              </div>
                              <form
                                className="milestone-task-add"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  addMilestoneTask(project, milestone);
                                }}
                              >
                                <input
                                  value={projectTaskInputs[inputKey] || ""}
                                  onChange={(event) => setProjectTaskInputs((current) => ({ ...current, [inputKey]: event.target.value }))}
                                  placeholder="Add a task to this milestone..."
                                />
                                <button type="submit"><Icon name="plus" size={13} /> Add task</button>
                              </form>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-hint">No milestones yet. Add milestones in Edit project.</div>
                  )}
                </div>
              </>
            );
          })() : (
            <>
              <div className="page-heading">
                <h1>Projects</h1>
                <button className="primary-btn" onClick={openNewProject}>
                  + New project
                </button>
              </div>
 
              {(() => {
                const activeProjects = projects.filter((project) => !isProjectFinished(project));
                const finishedProjects = projects.filter(isProjectFinished);

                const renderProjectCard = (project: Project, finished = false) => {
                  const stats = projectStats(project);
                  return (
                    <div
                      key={project.id}
                      className={`project-card ${finished ? "finished-project-card" : ""}`}
                      style={{ background: project.color }}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <div className="project-card-top">
                        <div className="project-mark"><Icon name={finished ? "check" : "star"} size={15} /></div>
                        {finished ? (
                          <span className="finished-label"><Icon name="check" size={12} /> Finished</span>
                        ) : (
                          <div className="project-deadline">
                            {stats.remaining === null
                              ? "No deadline"
                              : stats.remaining < 0
                                ? `${Math.abs(stats.remaining)} days overdue`
                                : stats.remaining === 0
                                  ? "Due today"
                                  : `${stats.remaining} days left`}
                          </div>
                        )}
                      </div>

                      <div className="project-name">{project.name}</div>
                      <div className="project-description">
                        {project.description || "Your project"}
                      </div>

                      <div className="project-stat-row">
                        <span>{finished ? "Completed" : "Progress"}</span>
                        <span>{stats.percentage}%</span>
                      </div>

                      <div className="project-progress-track">
                        <div
                          className="project-progress-fill"
                          style={{ width: `${stats.percentage}%` }}
                        />
                      </div>

                      <div className="project-card-bottom">
                        <span>{stats.done} / {stats.total} tasks completed</span>
                        <span>
                          {stats.milestoneTotal > 0
                            ? `${stats.milestoneDone}/${stats.milestoneTotal} milestones`
                            : "View project →"}
                        </span>
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {feedPreferences.showActiveProjects && <div className="projects-grid">
                      {activeProjects.map((project) => renderProjectCard(project))}
                      {activeProjects.length === 0 && (
                        <div className="empty-state">
                          <h3>No active projects</h3>
                          <p>Create a new project or revisit one from your finished projects.</p>
                          <button className="primary-btn" onClick={openNewProject}>
                            Create project
                          </button>
                        </div>
                      )}
                    </div>}

                    {feedPreferences.showFinishedProjects && <section className="finished-projects-section">
                      <div className="finished-projects-heading">
                        <h2>Finished Projects</h2>
                        <span>{finishedProjects.length} completed</span>
                      </div>
                      {finishedProjects.length > 0 ? (
                        <div className="projects-grid">
                          {finishedProjects.map((project) => renderProjectCard(project, true))}
                        </div>
                      ) : (
                        <div className="finished-empty">
                          Completed projects will appear here once all their tasks and milestones are finished.
                        </div>
                      )}
                    </section>}
                    {!feedPreferences.showActiveProjects && !feedPreferences.showFinishedProjects && <div className="empty-hint">Both project sections are hidden. You can show them in Settings.</div>}
                  </>
                );
              })()}
            </>
          )}
        </main>
      )}
 
      {calendarImportOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCalendarImportOpen(false); }}>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div className="modal-kicker">EXTERNAL CALENDAR</div>
              <button className="close-btn" aria-label="Close" onClick={() => setCalendarImportOpen(false)}><Icon name="close" size={17} /></button>
            </div>
            <h2 className="modal-prompt">Import calendar</h2>
            <p style={{ color: "#89918B", fontSize: 12, lineHeight: 1.65 }}>
              Import a university timetable, training plan or another calendar as project tasks.
              Choose an exported iCalendar (.ics) file.
            </p>
            <div className="modal-field">
              <label className="modal-label">Calendar file</label>
              <input type="file" accept=".ics,text/calendar" onChange={(event) => readCalendarFile(event.target.files?.[0])} />
              {calendarImportFileName && <div className="empty-hint">{calendarImportFileName} · {calendarImportEvents.length} events found</div>}
            </div>
            {calendarImportEvents.length > 0 && (
              <>
                <div className="modal-field">
                  <label className="modal-label">Add events to</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className={calendarImportMode === "new" ? "primary-btn" : "secondary-btn"} onClick={() => setCalendarImportMode("new")}>New project</button>
                    <button className={calendarImportMode === "existing" ? "primary-btn" : "secondary-btn"} onClick={() => setCalendarImportMode("existing")} disabled={!projects.length}>Existing project</button>
                  </div>
                </div>
                {calendarImportMode === "new" ? (
                  <div className="modal-field">
                    <label className="modal-label">Project name</label>
                    <input className="modal-input" value={calendarImportProjectName} onChange={(event) => setCalendarImportProjectName(event.target.value)} placeholder="e.g. University timetable" />
                  </div>
                ) : (
                  <div className="modal-field">
                    <label className="modal-label">Select project</label>
                    <select className="modal-input" value={calendarImportProjectId} onChange={(event) => setCalendarImportProjectId(event.target.value)}>
                      <option value="">Choose a project</option>
                      {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="modal-field">
                  <label className="modal-label">Preview · first events</label>
                  <div style={{ maxHeight: 150, overflowY: "auto", border: "1px solid #EEEDE7", borderRadius: 12, padding: 10 }}>
                    {calendarImportEvents.slice(0, 5).map((event, index) => (
                      <div key={`${event.date}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 2px", borderBottom: index < Math.min(calendarImportEvents.length, 5) - 1 ? "1px solid #F0EFEA" : 0 }}>
                        <span style={{ color: "#465148", fontSize: 11 }}>{event.title}</span>
                        <span style={{ color: "#929990", fontSize: 10, whiteSpace: "nowrap" }}>{formatDate(fromKey(event.date), { day: "numeric", month: "short" })}</span>
                      </div>
                    ))}
                    {calendarImportEvents.length > 5 && <div className="empty-hint">and {calendarImportEvents.length - 5} more events…</div>}
                  </div>
                </div>
              </>
            )}
            {calendarImportError && <p style={{ color: "#A66D64", fontSize: 11 }}>{calendarImportError}</p>}
            <p style={{ color: "#9AA196", fontSize: 10, lineHeight: 1.5 }}>
              Imported entries appear as dated tasks in the Planner. Event times are saved in the task notes; the current planner displays tasks by day, not by hour. Daily, weekly (including selected weekdays), monthly and yearly recurrence rules are expanded for up to one year. EXDATE exceptions are skipped, and repeated imports into the same project are checked for duplicates.
            </p>
            <div className="modal-footer">
              <span />
              <div className="modal-footer-right">
                <button className="secondary-btn" onClick={() => setCalendarImportOpen(false)}>Cancel</button>
                <button className="primary-btn" onClick={importCalendarEvents} disabled={!calendarImportEvents.length}>Import {calendarImportEvents.length || ""} events</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {taskModalOpen && taskDraft && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeTaskModal();
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div className="modal-kicker">{editingTaskId ? "EDIT TASK" : "NEW TASK"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {editingTaskId && (
                  <button className="delete-btn" onClick={deleteTask}>
                    Delete
                  </button>
                )}
                <button className="close-btn" aria-label="Close" onClick={closeTaskModal}><Icon name="close" size={17} /></button>
              </div>
            </div>
 
            <h2 className="modal-prompt">What would you like to do?</h2>
 
            <div className="modal-field">
              <textarea
                className="modal-textarea"
                autoFocus
                value={taskDraft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                placeholder="Task title"
                rows={2}
                style={{ minHeight: 70, fontSize: 17, fontWeight: 500 }}
              />
            </div>
 
            <div className="modal-field">
              <textarea
                className="modal-textarea"
                value={taskDraft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
                placeholder="Notes (optional)"
              />
            </div>
 
            <div className="date-project-row">
              <div className="modal-field">
                <label className="modal-label">Date</label>
                <input
                  className="modal-input"
                  type="date"
                  value={taskDraft.date}
                  onChange={(event) => updateDraft("date", event.target.value)}
                />
              </div>
 
              <div className="modal-field">
                <label className="modal-label">Project</label>
                <select
                  className="modal-select"
                  value={taskDraft.projectId}
                  onChange={(event) => selectProject(event.target.value)}
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {taskDraft.projectId && (projects.find((project) => project.id === taskDraft.projectId)?.milestones.length || 0) > 0 && (
              <div className="modal-field">
                <label className="modal-label">Milestone</label>
                <select
                  className="modal-select"
                  value={taskDraft.milestoneId || ""}
                  onChange={(event) => updateDraft("milestoneId", event.target.value)}
                >
                  <option value="">No milestone</option>
                  {projects.find((project) => project.id === taskDraft.projectId)?.milestones.map((milestone) => (
                    <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
                  ))}
                </select>
                <div className="color-note">Link this task to a project milestone if it belongs there.</div>
              </div>
            )}
 
            <div className="modal-field">
              <label className="modal-label">Colour</label>
              <div className="color-list">
                {PALETTE.map((item) => (
                  <button
                    key={item.color}
                    className={`color-option ${taskDraft.color === item.color ? "selected" : ""}`}
                    style={{ background: item.color }}
                    title={item.name}
                    aria-label={item.name}
                    onClick={() => selectTaskColor(item.color)}
                  />
                ))}
              </div>
              <div className="color-note">
                {taskDraft.customColor
                  ? "Custom task colour"
                  : taskDraft.projectId
                    ? "Automatically inherited from project"
                    : "Choose a colour for this task"}
              </div>
            </div>
 
            <div className="modal-field">
              <label className="modal-label">Repeat</label>
              <select
                className="modal-select"
                value={taskDraft.repeat}
                onChange={(event) => {
                  const repeat = event.target.value;
                  setTaskDraft((current) => current
                    ? {
                        ...current,
                        repeat,
                        // Project tasks without a date need a starting point
                        // before a daily/weekly/monthly series can be generated.
                        date: repeat !== "Does not repeat" && !current.date
                          ? dateKey(new Date())
                          : current.date,
                      }
                    : current
                  );
                }}
              >
                {REPEAT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
 
            {taskDraft.repeat !== "Does not repeat" && (
              <div className="modal-field">
                <label className="modal-label">Repeat until</label>
                <input
                  className="modal-input"
                  type="date"
                  value={
                    taskDraft.repeatUntilManual
                      ? taskDraft.repeatUntil
                      : projects.find((p) => p.id === taskDraft.projectId)?.deadline ||
                        taskDraft.repeatUntil
                  }
                  onChange={(event) => {
                    setTaskDraft((current) =>
                      current
                        ? {
                            ...current,
                            repeatUntil: event.target.value,
                            repeatUntilManual: true,
                          }
                        : current
                    );
                  }}
                />
                <div className="color-note">
                  {taskDraft.repeatUntilManual
                    ? "Custom end date"
                    : taskDraft.projectId
                      ? "Automatically follows the project deadline"
                      : "Choose an end date or use the one-year default"}
                </div>
              </div>
            )}
 
            <div className="modal-field important-toggle-field">
              <label className="important-toggle">
                <input
                  type="checkbox"
                  checked={!!taskDraft.important}
                  onChange={(event) => updateDraft("important", event.target.checked)}
                />
                <span className="important-toggle-copy">
                  <strong>Important</strong>
                  <small>Show this task in the reminders section below Unassigned.</small>
                </span>
                <span className="important-star"><Icon name="star" size={15} /></span>
              </label>
            </div>

            <div className="modal-field">
              <label className="modal-label">Subtasks</label>
              <div className="steps-list">
                {taskDraft.steps.map((step, index) => (
                  <div className="step-item" key={`${step}-${index}`}>
                    <span className="step-bullet" />
                    <span>{step}</span>
                    <button
                      className="step-remove"
                      onClick={() => updateDraft(
                        "steps",
                        taskDraft.steps.filter((_, i) => i !== index)
                      )}
                    >
                      <Icon name="close" size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="step-add">
                <input
                  value={newStep}
                  onChange={(event) => setNewStep(event.target.value)}
                  placeholder="Add a subtask..."
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addStep();
                    }
                  }}
                />
                <button onClick={addStep}><Icon name="plus" size={13} /> Add</button>
              </div>
            </div>
 
            <div className="modal-field">
              <label style={{ display: "flex", alignItems: "center", gap: 9, color: "#65716B", fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={taskDraft.done}
                  onChange={(event) => updateDraft("done", event.target.checked)}
                />
                Mark as completed
              </label>
            </div>
 
            <div className="modal-footer">
              <span />
 
              <div className="modal-footer-right">
                <button className="secondary-btn" onClick={closeTaskModal}>Cancel</button>
                <button className="primary-btn" onClick={saveTask} disabled={!taskDraft.title.trim()}>
                  {editingTaskId ? "Save changes" : "Create task"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {projectModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setProjectModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div className="modal-kicker">{editingProjectId ? "EDIT PROJECT" : "NEW PROJECT"}</div>
              <button className="close-btn" aria-label="Close" onClick={() => setProjectModalOpen(false)}><Icon name="close" size={17} /></button>
            </div>
 
            <h2 className="modal-prompt">What are you working on?</h2>
 
            <div className="modal-field">
              <label className="modal-label">Project name</label>
              <input
                className="modal-input"
                autoFocus
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Project name"
              />
            </div>
 
            <div className="modal-field">
              <label className="modal-label">Description</label>
              <textarea
                className="modal-textarea"
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                placeholder="Notes (optional)"
              />
            </div>
 
            <div className="modal-field">
              <label className="modal-label">Deadline</label>
              <input
                className="modal-input"
                type="date"
                value={projectDeadline}
                onChange={(event) => setProjectDeadline(event.target.value)}
              />
            </div>
 
            <div className="modal-field">
              <label className="modal-label">Project colour</label>
              <div className="color-list">
                {PALETTE.map((item) => (
                  <button
                    key={item.color}
                    className={`color-option ${projectColor === item.color ? "selected" : ""}`}
                    style={{ background: item.color }}
                    title={item.name}
                    aria-label={item.name}
                    onClick={() => setProjectColor(item.color)}
                  />
                ))}
              </div>
            </div>
 
            <div className="modal-field">
              <label className="modal-label">Milestones · Optional</label>

              {projectMilestones.length > 0 && (
                <div className="milestone-list">
                  {projectMilestones.map((milestone) => (
                    <div
                      className="milestone-item"
                      key={milestone.id}
                      style={{ background: projectColor }}
                    >
                      <input
                        type="checkbox"
                        checked={milestone.done}
                        onChange={() => setProjectMilestones((current) =>
                          current.map((item) => item.id === milestone.id
                            ? { ...item, done: !item.done } : item)
                        )}
                      />
                      <span className={`milestone-title ${milestone.done ? "done" : ""}`}>
                        {milestone.title}
                      </span>
                      {milestone.date && (
                        <span className="milestone-date">
                          {formatDate(fromKey(milestone.date), { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                      <div className="milestone-actions">
                        <button type="button" onClick={() => startEditMilestone(milestone)}>Edit</button>
                        <button type="button" onClick={() => removeMilestone(milestone.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="milestone-form">
                <input
                  value={newMilestone}
                  onChange={(event) => setNewMilestone(event.target.value)}
                  placeholder="Milestone name"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addMilestone();
                    }
                  }}
                />
                <input
                  type="date"
                  value={newMilestoneDate}
                  onChange={(event) => setNewMilestoneDate(event.target.value)}
                  aria-label="Milestone date"
                />
                <button type="button" onClick={addMilestone}>
                  {editingMilestoneId ? "Save" : "Add"}
                </button>
                {editingMilestoneId && (
                  <button type="button" className="milestone-cancel" onClick={cancelEditMilestone}>Cancel</button>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {editingProjectId
                ? <button className="delete-btn" onClick={deleteProject}>Delete project</button>
                : <span />}
 
              <div className="modal-footer-right">
                <button className="secondary-btn" onClick={() => setProjectModalOpen(false)}>Cancel</button>
                <button className="primary-btn" onClick={saveProject}>
                  {editingProjectId ? "Save changes" : "Create project"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {pendingMove && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 470 }}>
            <div className="modal-header">
              <div className="modal-kicker">MOVE TASK</div>
              <button className="close-btn" onClick={() => setPendingMove(null)}>
                <Icon name="close" size={16} />
              </button>
            </div>
 
            <h2 className="modal-prompt">Move this task?</h2>
 
            <p style={{
              color: "#89918B",
              fontSize: 13,
              lineHeight: 1.7,
              marginBottom: 25
            }}>
              This task is part of a recurring series. How would you like to
              apply this change?
            </p>
 
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="secondary-btn"
                style={{ textAlign: "left", padding: 17 }}
                onClick={() => confirmMove(false)}
              >
                <strong style={{ display: "block", marginBottom: 5 }}>
                  Only this task
                </strong>
                <span style={{ color: "#929990", fontSize: 11 }}>
                  Move just this occurrence. Keep all other dates unchanged.
                </span>
              </button>
 
              <button
                className="secondary-btn"
                style={{
                  textAlign: "left",
                  padding: 17,
                  borderColor: "#B9CBAF",
                  background: "#F2F4EC"
                }}
                onClick={() => confirmMove(true)}
              >
                <strong style={{ display: "block", marginBottom: 5 }}>
                  All repetitions
                </strong>
                <span style={{ color: "#929990", fontSize: 11 }}>
                  Shift the entire series by the same number of days.
                </span>
              </button>
            </div>
 
            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button className="text-btn" onClick={() => setPendingMove(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}