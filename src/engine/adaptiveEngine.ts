import { allQuestions } from '../data/index';
import type { Question } from '../data/index';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TagProfile {
  solved: number;
  failed: number;
  mastery: number; // 0–1
  lastPracticed: number; // timestamp ms
  stuckCount: number;
}

export interface SkillProfile {
  [tag: string]: TagProfile;
}

export interface QuestionAttempt {
  questionId: string;
  attempts: number;
  passed: boolean;
  hintsUsed: number;
  hintFullyRevealed: boolean;
  gaveUp: boolean;
  tags: string[];
  lastAttemptAt: number;
  timeSpentMs: number;
}

export interface AdaptiveState {
  completedIds: Set<string>;
  weakTags: Set<string>; // tags needing step-down/review
  skillProfile: SkillProfile;
  currentAttempt: QuestionAttempt | null;
  sessionStart: number;
  currentQuestionIndex: number; // position in linear track
  stuckTagHistory: Record<string, number>; // tag → consecutive stuck count
}

// ── localStorage helpers ───────────────────────────────────────────────────────

const STORAGE_KEYS = {
  skillProfile: 'sqlquest_skill_profile',
  completedIds: 'sqlquest_completed_ids',
  weakTags: 'sqlquest_weak_tags',
  questionIndex: 'sqlquest_question_index',
  stuckTagHistory: 'sqlquest_stuck_tag_history',
  xp: 'sqlquest_xp',
  level: 'sqlquest_level',
  dailyStreak: 'sqlquest_daily_streak',
  lastPlayedDate: 'sqlquest_last_played',
  badges: 'sqlquest_badges',
  sessionStreak: 'sqlquest_session_streak',
};

export function loadSkillProfile(): SkillProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.skillProfile);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveSkillProfile(profile: SkillProfile) {
  localStorage.setItem(STORAGE_KEYS.skillProfile, JSON.stringify(profile));
}

export function loadCompletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.completedIds);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export function saveCompletedIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEYS.completedIds, JSON.stringify([...ids]));
}

export function loadWeakTags(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.weakTags);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export function saveWeakTags(tags: Set<string>) {
  localStorage.setItem(STORAGE_KEYS.weakTags, JSON.stringify([...tags]));
}

export function loadQuestionIndex(): number {
  return parseInt(localStorage.getItem(STORAGE_KEYS.questionIndex) || '0', 10);
}

export function saveQuestionIndex(index: number) {
  localStorage.setItem(STORAGE_KEYS.questionIndex, String(index));
}

export function loadStuckTagHistory(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.stuckTagHistory);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveStuckTagHistory(history: Record<string, number>) {
  localStorage.setItem(STORAGE_KEYS.stuckTagHistory, JSON.stringify(history));
}

// ── XP / Level / Streak ──────────────────────────────────────────────────────

export function loadXP(): number {
  return parseInt(localStorage.getItem(STORAGE_KEYS.xp) || '0', 10);
}

export function saveXP(xp: number) {
  localStorage.setItem(STORAGE_KEYS.xp, String(xp));
}

export function computeLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50));
}

export function xpForNextLevel(currentLevel: number): number {
  return (currentLevel + 1) * (currentLevel + 1) * 50;
}

export function loadDailyStreak(): number {
  return parseInt(localStorage.getItem(STORAGE_KEYS.dailyStreak) || '0', 10);
}

export function saveDailyStreak(streak: number) {
  localStorage.setItem(STORAGE_KEYS.dailyStreak, String(streak));
}

export function loadLastPlayedDate(): string {
  return localStorage.getItem(STORAGE_KEYS.lastPlayedDate) || '';
}

export function saveLastPlayedDate(date: string) {
  localStorage.setItem(STORAGE_KEYS.lastPlayedDate, date);
}

export function loadSessionStreak(): number {
  return parseInt(localStorage.getItem(STORAGE_KEYS.sessionStreak) || '0', 10);
}

export function saveSessionStreak(streak: number) {
  localStorage.setItem(STORAGE_KEYS.sessionStreak, String(streak));
}

export function updateDailyStreak(): number {
  const today = new Date().toDateString();
  const lastPlayed = loadLastPlayedDate();
  let streak = loadDailyStreak();
  
  if (lastPlayed === today) {
    return streak; // Already updated today
  }
  
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (lastPlayed === yesterday) {
    streak += 1;
  } else {
    streak = 1; // Reset
  }
  
  saveDailyStreak(streak);
  saveLastPlayedDate(today);
  return streak;
}

// ── Badges ────────────────────────────────────────────────────────────────────

export type BadgeId = 
  | 'first_query'
  | 'join_master'
  | 'window_wizard'
  | 'club_150'
  | 'no_hint_run'
  | 'streak_7'
  | 'streak_30'
  | 'cte_champion'
  | 'perfect_session'
  | 'speed_solver';

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  emoji: string;
  unlockedAt?: number;
}

export const BADGE_DEFINITIONS: Badge[] = [
  { id: 'first_query', name: 'First Query', description: 'Execute your very first SQL query', emoji: '🎯' },
  { id: 'join_master', name: 'JOIN Master', description: 'Complete 10 JOIN-tagged questions', emoji: '🔗' },
  { id: 'window_wizard', name: 'Window Function Wizard', description: 'Complete 5 window function questions', emoji: '🧙' },
  { id: 'club_150', name: '150 Club', description: 'Complete 150 questions total', emoji: '🏆' },
  { id: 'no_hint_run', name: 'No-Hint Run', description: 'Complete 5 questions in a row without using any hints', emoji: '🎯' },
  { id: 'streak_7', name: 'Week Warrior', description: '7-day daily streak', emoji: '🔥' },
  { id: 'streak_30', name: 'Monthly Master', description: '30-day daily streak', emoji: '⚡' },
  { id: 'cte_champion', name: 'CTE Champion', description: 'Complete all CTE-tagged questions', emoji: '🌲' },
  { id: 'perfect_session', name: 'Perfect Session', description: 'Complete 10 questions in a row correctly on first attempt', emoji: '✨' },
  { id: 'speed_solver', name: 'Speed Solver', description: 'Solve a question correctly in under 60 seconds', emoji: '⚡' },
];

export function loadBadges(): Record<string, number | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.badges);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveBadges(badges: Record<string, number | null>) {
  localStorage.setItem(STORAGE_KEYS.badges, JSON.stringify(badges));
}

export function checkAndAwardBadges(
  completedIds: Set<string>,
  skillProfile: SkillProfile,
  dailyStreak: number,
  hintsUsedLastFive: boolean[],
  firstQuery: boolean,
  solveTimeMs?: number
): BadgeId[] {
  const badges = loadBadges();
  const newBadges: BadgeId[] = [];
  const now = Date.now();
  
  const award = (id: BadgeId) => {
    if (!badges[id]) {
      badges[id] = now;
      newBadges.push(id);
    }
  };
  
  // First Query
  if (firstQuery) award('first_query');
  
  // 150 Club
  if (completedIds.size >= 150) award('club_150');
  
  // JOIN Master - 10 join questions
  const joinSolved = Object.entries(skillProfile)
    .filter(([tag]) => tag === 'join' || tag === 'inner_join' || tag === 'left_join')
    .reduce((acc, [, p]) => acc + p.solved, 0);
  if (joinSolved >= 10) award('join_master');
  
  // Window Wizard
  const windowSolved = (skillProfile['window_functions']?.solved || 0);
  if (windowSolved >= 5) award('window_wizard');
  
  // CTE Champion
  const cteSolved = (skillProfile['cte']?.solved || 0);
  const cteTotal = allQuestions.filter(q => q.tags.includes('cte')).length;
  if (cteSolved >= cteTotal && cteTotal > 0) award('cte_champion');
  
  // Daily Streak badges
  if (dailyStreak >= 7) award('streak_7');
  if (dailyStreak >= 30) award('streak_30');
  
  // No-Hint Run (last 5 no hints)
  if (hintsUsedLastFive.length >= 5 && hintsUsedLastFive.every(h => !h)) award('no_hint_run');
  
  // Speed solver
  if (solveTimeMs && solveTimeMs < 60000) award('speed_solver');
  
  saveBadges(badges);
  return newBadges;
}

// ── Adaptive Progression Engine ────────────────────────────────────────────────

export function updateTagProfile(
  profile: SkillProfile,
  tags: string[],
  passed: boolean
): SkillProfile {
  const updated = { ...profile };
  const now = Date.now();
  
  for (const tag of tags) {
    const existing = updated[tag] || { solved: 0, failed: 0, mastery: 0, lastPracticed: 0, stuckCount: 0 };
    const newSolved = passed ? existing.solved + 1 : existing.solved;
    const newFailed = passed ? existing.failed : existing.failed + 1;
    const total = newSolved + newFailed;
    const mastery = total === 0 ? 0 : Math.min(1, newSolved / Math.max(total, 1));
    
    updated[tag] = {
      ...existing,
      solved: newSolved,
      failed: newFailed,
      mastery,
      lastPracticed: now
    };
  }
  
  return updated;
}

export function markTagStuck(
  profile: SkillProfile,
  history: Record<string, number>,
  tags: string[]
): { updatedProfile: SkillProfile; updatedHistory: Record<string, number>; weakTags: string[] } {
  const updatedProfile = { ...profile };
  const updatedHistory = { ...history };
  const weakTags: string[] = [];
  
  for (const tag of tags) {
    const existing = updatedProfile[tag] || { solved: 0, failed: 0, mastery: 0, lastPracticed: Date.now(), stuckCount: 0 };
    updatedHistory[tag] = (updatedHistory[tag] || 0) + 1;
    updatedProfile[tag] = { ...existing, stuckCount: existing.stuckCount + 1 };
    weakTags.push(tag);
  }
  
  return { updatedProfile, updatedHistory, weakTags };
}

export function selectNextQuestion(
  completedIds: Set<string>,
  weakTags: Set<string>,
  skillProfile: SkillProfile,
  currentIndex: number
): { question: Question | null; newIndex: number; type: 'weak_tag' | 'linear' | 'review' } {
  const now = Date.now();
  const available = allQuestions.filter(q => !completedIds.has(q.id));
  
  if (available.length === 0) return { question: null, newIndex: currentIndex, type: 'linear' };
  
  // Priority 1: Unresolved weak tags - serve step-down or same-tag easier question
  for (const tag of weakTags) {
    const candidates = available.filter(q => 
      q.tags.includes(tag) && q.category === 'basic'
    );
    if (candidates.length > 0) {
      return {
        question: candidates[Math.floor(Math.random() * candidates.length)],
        newIndex: currentIndex,
        type: 'weak_tag'
      };
    }
  }
  
  // Priority 2: ~1-in-6 picks — decay-weighted review from completed questions
  const shouldReview = Math.random() < 1/6;
  if (shouldReview) {
    const completedList = allQuestions.filter(q => completedIds.has(q.id));
    if (completedList.length > 0) {
      // Weight by time since last practiced (older = higher weight)
      const weighted = completedList.map(q => {
        const tag = q.tags[0] || '';
        const lastPracticed = skillProfile[tag]?.lastPracticed || 0;
        const daysSince = (now - lastPracticed) / (1000 * 60 * 60 * 24);
        return { q, weight: Math.max(1, daysSince) };
      });
      
      const totalWeight = weighted.reduce((acc, w) => acc + w.weight, 0);
      let rand = Math.random() * totalWeight;
      
      for (const w of weighted) {
        rand -= w.weight;
        if (rand <= 0) {
          return { question: w.q, newIndex: currentIndex, type: 'review' };
        }
      }
      
      return { 
        question: weighted[0].q, 
        newIndex: currentIndex, 
        type: 'review' 
      };
    }
  }
  
  // Priority 3: Linear progression (basic → intermediate → advanced)
  const linearOrder = allQuestions; // Already ordered basic → intermediate → advanced
  const nextInOrder = linearOrder.find((q, i) => i >= currentIndex && !completedIds.has(q.id));
  
  if (nextInOrder) {
    const newIndex = linearOrder.indexOf(nextInOrder);
    return { question: nextInOrder, newIndex: newIndex + 1, type: 'linear' };
  }
  
  // Fallback: any available question
  return { question: available[0], newIndex: currentIndex, type: 'linear' };
}

export function getSessionRecap(
  skillProfile: SkillProfile,
  weakTags: Set<string>,
  completedIds: Set<string>
): { strongTags: string[]; weakTagsList: string[]; reviewQueue: Question[] } {
  const strongTags = Object.entries(skillProfile)
    .filter(([, p]) => p.mastery >= 0.7 && p.solved >= 2)
    .sort((a, b) => b[1].mastery - a[1].mastery)
    .map(([tag]) => tag)
    .slice(0, 5);
  
  const weakTagsList = Object.entries(skillProfile)
    .filter(([, p]) => p.mastery < 0.5 && p.failed > 0)
    .sort((a, b) => a[1].mastery - b[1].mastery)
    .map(([tag]) => tag)
    .slice(0, 5);
  
  // Queue up review questions for weak tags
  const reviewQueue = allQuestions
    .filter(q => q.tags.some(t => weakTagsList.includes(t)) && !completedIds.has(q.id))
    .slice(0, 5);
  
  return { strongTags, weakTagsList, reviewQueue };
}
