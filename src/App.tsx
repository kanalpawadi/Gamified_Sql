import React, { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';
import { allQuestions } from './data/index';
import type { Question } from './data/index';
import { gradeQuery } from './engine/sqlEngine';
import type { GradingResult, QueryResult } from './engine/sqlEngine';
import { classifyError, analyzePostMortem } from './engine/classifier';
import type { Classification } from './engine/classifier';
import {
  loadXP, saveXP, computeLevel, xpForNextLevel,
  loadDailyStreak, updateDailyStreak,
  loadSessionStreak, saveSessionStreak,
  loadWeakTags, saveWeakTags,
  loadQuestionIndex, saveQuestionIndex,
  loadStuckTagHistory, saveStuckTagHistory,
  updateTagProfile, markTagStuck, selectNextQuestion,
  getSessionRecap, checkAndAwardBadges,
  loadBadges, BADGE_DEFINITIONS,
  type BadgeId, type SkillProfile
} from './engine/adaptiveEngine';
import { getMicroLessonForTag } from './data/microLessons';
// ── Supabase-backed layer ──────────────────────────────────────────────────
import { useAuth } from './auth/AuthContext';
import {
  loadProgress, recordAttempt, touchLastActive, issueMilestoneCertificatesIfEarned,
} from './progress/progressApi';
import { LabsSection } from './labs/LabsSection';
import { CertificatesSection } from './certificates/CertificatesSection';
import { CopyGuard } from './components/CopyGuard';
import { SqlEditor } from './components/SqlEditor';
import { ResultsGrid } from './components/ResultsGrid';
import { SchemaBlock } from './components/SchemaBlock';

// ── Types ────────────────────────────────────────────────────────────────────

interface QueryLogEntry {
  id: string;
  sql: string;
  passed: boolean | null;
  isError: boolean;
  errorMsg?: string;
  timestamp: Date;
  rowCount?: number;
}

interface SessionState {
  attemptCount: number;
  hintsUsed: number[];   // indices of shown hints
  hintFullyRevealed: boolean;
  startTime: number;
  lastQueryAt: number;
  confidencePending: number | null; // index of hint awaiting confidence
}

// ── Main App ─────────────────────────────────────────────────────────────────

export function StudentApp() {
  const { session: authSession, profile, signOut } = useAuth();
  const uid = authSession!.user.id;

  // ── Persistent state ────────────────────────────────────────────────────
  // XP / streaks / drafts stay in localStorage (device-local gamification,
  // namespaced by user via the switch-reset in the init effect below).
  // completedIds + skillProfile are the SOURCE OF TRUTH in Supabase and are
  // derived from question_attempts on load.
  const [xp, setXP] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [skillProfile, setSkillProfile] = useState<SkillProfile>({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [weakTags, setWeakTags] = useState<Set<string>>(new Set());
  const [questionIndex, setQuestionIndex] = useState(0);
  const [stuckTagHistory, setStuckTagHistory] = useState<Record<string, number>>({});
  const [badges, setBadges] = useState(() => loadBadges());

  // Supabase-derived / view state
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [completedByCategory, setCompletedByCategory] = useState({ basic: 0, intermediate: 0, advanced: 0 });
  const [studentView, setStudentView] = useState<'quest' | 'labs' | 'certs'>('quest');
  const [certToast, setCertToast] = useState<string | null>(null);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryLog, setQueryLog] = useState<QueryLogEntry[]>([]);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [runResult, setRunResult] = useState<QueryResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [session, setSession] = useState<SessionState>({
    attemptCount: 0,
    hintsUsed: [],
    hintFullyRevealed: false,
    startTime: Date.now(),
    lastQueryAt: Date.now(),
    confidencePending: null
  });
  const [xpPulse, setXpPulse] = useState(false);
  const [schemaCollapsed, setSchemaCollapsed] = useState(false);
  const [sampleCollapsed, setSampleCollapsed] = useState(true);
  const [hintsCollapsed, setHintsCollapsed] = useState(false);
  const [skillCollapsed, setSkillCollapsed] = useState(false);
  const [showModal, setShowModal] = useState<'badges' | 'recap' | 'browser' | 'microlesson' | null>(null);
  const [newBadgeNotification, setNewBadgeNotification] = useState<BadgeId | null>(null);
  const [microLessonTag, setMicroLessonTag] = useState<string>('');
  const [postMortemTip, setPostMortemTip] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<'linear' | 'weak_tag' | 'review'>('linear');
  const [isStuck, setIsStuck] = useState(false);
  const [hintsNoUsed, setHintsNoUsed] = useState<boolean[]>([]); // track last 5 hint usage

  const queryRef = useRef(sqlQuery);
  queryRef.current = sqlQuery;

  // ── Init: load Supabase progress + local gamification ────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      // If a different user last used this browser, clear their device-local
      // gamification (XP / streak / drafts) so nothing bleeds across accounts.
      const prevUid = localStorage.getItem('sqlquest_active_uid');
      if (prevUid !== uid) {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('sqlquest_'))
          .forEach((k) => localStorage.removeItem(k));
        localStorage.setItem('sqlquest_active_uid', uid);
      }

      const streak = updateDailyStreak();
      if (!active) return;
      setDailyStreak(streak);
      setSessionStreak(loadSessionStreak());
      setWeakTags(loadWeakTags());
      setQuestionIndex(loadQuestionIndex());
      setStuckTagHistory(loadStuckTagHistory());
      setBadges(loadBadges());

      // Supabase source of truth for graded progress.
      const prog = await loadProgress(uid);
      if (!active) return;
      setCompletedIds(prog.completedIds);
      setSkillProfile(prog.skillProfile);
      setCompletedByCategory(prog.completedByCategory);
      const xp0 = Math.max(loadXP(), prog.derivedXp);
      setXP(xp0);
      saveXP(xp0);
      setProgressLoaded(true);
      touchLastActive(uid);
      // Retroactively issue any milestone certificate already earned (e.g. a
      // student who crossed a threshold before this feature existed).
      issueMilestoneCertificatesIfEarned(prog.completedByCategory)
        .then((titles) => { if (titles.length) { setCertToast(titles[0]); setTimeout(() => setCertToast(null), 6000); } })
        .catch(() => {});
    })();
    return () => { active = false; };
  }, [uid]);

  // Load the first question once progress is ready.
  useEffect(() => {
    if (progressLoaded && !currentQuestion) loadNextQuestion(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressLoaded]);

  // ── Idle stuck detection ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentQuestion) return;
    
    const checkIdle = setInterval(() => {
      const now = Date.now();
      const idleSecs = (now - session.lastQueryAt) / 1000;
      
      if (idleSecs > 90 && session.attemptCount > 0 && !isStuck) {
        triggerStuck('idle');
      }
    }, 10000);
    
    return () => clearInterval(checkIdle);
  }, [session, currentQuestion, isStuck]);

  // ── Load question ─────────────────────────────────────────────────────────
  const loadNextQuestion = useCallback((fromNextButton: boolean) => {
    const { question, newIndex, type } = selectNextQuestion(
      completedIds,
      weakTags,
      skillProfile,
      questionIndex
    );
    
    if (question) {
      setCurrentQuestion(question);
      setQuestionType(type);
      if (fromNextButton || newIndex !== questionIndex) {
        setQuestionIndex(newIndex);
        saveQuestionIndex(newIndex);
      }
      resetSessionState();
      
      // Load saved draft
      const draft = localStorage.getItem(`sqlquest_draft_${question.id}`);
      setSqlQuery(draft || `-- Write your SQL query here\n-- Ctrl/Cmd + Enter to execute\n\n`);
    }
  }, [completedIds, weakTags, skillProfile, questionIndex]);

  const loadQuestion = useCallback((question: Question) => {
    setCurrentQuestion(question);
    resetSessionState();
    const draft = localStorage.getItem(`sqlquest_draft_${question.id}`);
    setSqlQuery(draft || `-- Write your SQL query here\n\n`);
    setShowModal(null);
  }, []);

  const resetSessionState = () => {
    setGradingResult(null);
    setClassification(null);
    setRunResult(null);
    setQueryLog([]);
    setPostMortemTip(null);
    setIsStuck(false);
    setSession({
      attemptCount: 0,
      hintsUsed: [],
      hintFullyRevealed: false,
      startTime: Date.now(),
      lastQueryAt: Date.now(),
      confidencePending: null
    });
  };

  // ── Execute query ─────────────────────────────────────────────────────────
  const executeQuery = useCallback(async () => {
    if (!currentQuestion || !sqlQuery.trim() || isRunning) return;
    
    setIsRunning(true);
    setSession(s => ({ ...s, lastQueryAt: Date.now() }));
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timed out (10s limit).')), 10000)
      );

      // Grade against solution
      const grade = await Promise.race([
        gradeQuery(
          currentQuestion.schemaSQL,
          currentQuestion.seedSQL,
          sqlQuery,
          currentQuestion.solutionSQL,
          currentQuestion.solutionSQL.toUpperCase().includes('ORDER BY')
        ),
        timeoutPromise
      ]);
      
      setGradingResult(grade);
      setRunResult(grade.learnerResult || null);
      
      const logEntry: QueryLogEntry = {
        id: Date.now().toString(),
        sql: sqlQuery.trim(),
        passed: grade.passed,
        isError: !grade.learnerResult && !!grade.errorMessage,
        errorMsg: grade.errorMessage,
        timestamp: new Date(),
        rowCount: grade.learnerResult?.rows.length
      };
      
      setQueryLog(prev => [logEntry, ...prev].slice(0, 20));
      
      if (grade.passed) {
        // Central progress tracking (Supabase source of truth).
        await recordAttempt({ question: currentQuestion, passed: true, errorClass: null, sql: sqlQuery });
        await handlePass(currentQuestion, sqlQuery);
      } else {
        const cls = classifyError(sqlQuery, currentQuestion, grade);
        setClassification(cls);
        recordAttempt({ question: currentQuestion, passed: false, errorClass: cls.errorClass, sql: sqlQuery })
          .catch(() => {});

        const newAttempts = session.attemptCount + 1;
        setSession(s => ({ ...s, attemptCount: newAttempts, lastQueryAt: Date.now() }));
        
        // Check stuck conditions
        if (newAttempts >= 3 && !isStuck) {
          triggerStuck('attempts');
        }
      }
    } catch (err: any) {
      const logEntry: QueryLogEntry = {
        id: Date.now().toString(),
        sql: sqlQuery.trim(),
        passed: null,
        isError: true,
        errorMsg: err.message,
        timestamp: new Date()
      };
      setQueryLog(prev => [logEntry, ...prev].slice(0, 20));
    } finally {
      setIsRunning(false);
    }
  }, [currentQuestion, sqlQuery, isRunning, session]);

  // ── Handle pass ───────────────────────────────────────────────────────────
  const handlePass = async (question: Question, sql: string) => {
    const earnedXP = question.points;
    const newXP = xp + earnedXP;
    setXP(newXP);
    saveXP(newXP);
    
    // XP pulse animation
    setXpPulse(true);
    setTimeout(() => setXpPulse(false), 700);
    
    // Update streaks
    const newSessionStreak = sessionStreak + 1;
    setSessionStreak(newSessionStreak);
    saveSessionStreak(newSessionStreak);
    
    // Update skill profile (in-memory; Supabase question_attempts is the store)
    const updatedProfile = updateTagProfile(skillProfile, question.tags, true);
    setSkillProfile(updatedProfile);

    // Mark completed (in-memory)
    const wasCompleted = completedIds.has(question.id);
    const updatedCompleted = new Set<string>(completedIds);
    updatedCompleted.add(question.id);
    setCompletedIds(updatedCompleted);

    // Milestone certificates — update per-category counts + auto-issue.
    if (!wasCompleted && question.category in completedByCategory) {
      const cat = question.category as 'basic' | 'intermediate' | 'advanced';
      const nextByCat = { ...completedByCategory };
      nextByCat[cat] = nextByCat[cat] + 1;
      setCompletedByCategory(nextByCat);
      const newCerts = await issueMilestoneCertificatesIfEarned(nextByCat);
      if (newCerts.length > 0) {
        setCertToast(newCerts[0]);
        setTimeout(() => setCertToast(null), 6000);
      }
    }
    touchLastActive(uid);
    
    // Remove from weak tags if it was there
    const updatedWeak = new Set<string>(weakTags);
    for (const tag of question.tags) {
      updatedWeak.delete(tag);
    }
    setWeakTags(updatedWeak);
    saveWeakTags(updatedWeak);
    
    // Post-mortem tip
    const tip = analyzePostMortem(sql, question.solutionSQL);
    if (tip) setPostMortemTip(tip.suggestion);
    
    // Check badges
    const firstQuery = completedIds.size === 0;
    const solveTimeMs = Date.now() - session.startTime;
    const noHintHistory = [...hintsNoUsed, session.hintsUsed.length === 0].slice(-5);
    setHintsNoUsed(noHintHistory);
    
    const newBadgeIds = checkAndAwardBadges(
      updatedCompleted,
      updatedProfile,
      dailyStreak,
      noHintHistory,
      firstQuery,
      solveTimeMs
    );
    
    if (newBadgeIds.length > 0) {
      setBadges(loadBadges());
      setNewBadgeNotification(newBadgeIds[0]);
      setTimeout(() => setNewBadgeNotification(null), 4000);
    }
  };

  // ── Stuck detection ────────────────────────────────────────────────────────
  const triggerStuck = useCallback((reason: 'attempts' | 'hints' | 'idle') => {
    if (!currentQuestion || isStuck) return;
    setIsStuck(true);
    
    const tags = currentQuestion.tags;
    const { updatedProfile, updatedHistory, weakTags: newWeakTags } = markTagStuck(
      skillProfile,
      stuckTagHistory,
      tags
    );
    
    setSkillProfile(updatedProfile);
    // (skill profile is derived from Supabase question_attempts; stuck history
    // stays in localStorage as a session-adaptive aid.)
    setStuckTagHistory(updatedHistory);
    saveStuckTagHistory(updatedHistory);
    
    const updatedWeak = new Set<string>(weakTags);
    for (const t of newWeakTags) updatedWeak.add(t);
    setWeakTags(updatedWeak);
    saveWeakTags(updatedWeak);
    
    // Check if 2nd stuck event on this tag → show micro-lesson
    const primaryTag = tags[0];
    const stuckCount = updatedHistory[primaryTag] || 0;
    
    if (stuckCount >= 2) {
      const lesson = getMicroLessonForTag(primaryTag);
      if (lesson) {
        setMicroLessonTag(primaryTag);
        setShowModal('microlesson');
      }
    }
  }, [currentQuestion, skillProfile, stuckTagHistory, weakTags, isStuck]);

  // ── Hint system ────────────────────────────────────────────────────────────
  const requestHint = (index: number) => {
    setSession(s => ({ ...s, confidencePending: index }));
  };

  const revealHint = (index: number, confidence: 'low' | 'high') => {
    setSession(s => ({
      ...s,
      hintsUsed: [...s.hintsUsed, index],
      confidencePending: null,
      hintFullyRevealed: currentQuestion 
        ? index >= (currentQuestion.hints.length - 1)
        : false
    }));
    
    // Deduct XP cost
    if (currentQuestion) {
      const hint = currentQuestion.hints[index];
      if (hint && hint.xpCost > 0 && xp >= hint.xpCost) {
        const newXP = xp - hint.xpCost;
        setXP(newXP);
        saveXP(newXP);
      }
    }
    
    // If high confidence + last hint → check stuck hint condition
    if (confidence === 'high' && currentQuestion && 
        index >= currentQuestion.hints.length - 1) {
      triggerStuck('hints');
    }
  };

  // ── Save draft ─────────────────────────────────────────────────────────────
  const saveDraft = () => {
    if (currentQuestion) {
      localStorage.setItem(`sqlquest_draft_${currentQuestion.id}`, sqlQuery);
    }
  };

  const loadDraft = () => {
    if (currentQuestion) {
      const draft = localStorage.getItem(`sqlquest_draft_${currentQuestion.id}`);
      if (draft) setSqlQuery(draft);
    }
  };

  const formatQuery = async () => {
    try {
      const { format } = await import('sql-formatter');
      setSqlQuery(format(sqlQuery, { language: 'sqlite', tabWidth: 2, keywordCase: 'upper' }));
    } catch {
      // sql-formatter may fail on some queries; silently ignore
    }
  };

  const resetQuery = () => {
    setSqlQuery('-- Write your SQL query here\n-- Ctrl/Cmd + Enter to execute\n\n');
  };

  // ── Recap ─────────────────────────────────────────────────────────────────
  const [recapData, setRecapData] = useState<ReturnType<typeof getSessionRecap> | null>(null);

  const openRecap = () => {
    setRecapData(getSessionRecap(skillProfile, weakTags, completedIds));
    setShowModal('recap');
  };

  // ── Computed values ────────────────────────────────────────────────────────
  const level = computeLevel(xp);
  const nextLevelXP = xpForNextLevel(level);
  const prevLevelXP = level > 0 ? level * level * 50 : 0;
  const levelProgress = nextLevelXP > prevLevelXP 
    ? (xp - prevLevelXP) / (nextLevelXP - prevLevelXP) 
    : 0;
  const badgesData = loadBadges();
  const unlockedCount = Object.values(badgesData).filter(Boolean).length;

  if (!progressLoaded) {
    return (
      <div className="welcome-screen">
        <div className="loading-spinner" />
        <p className="text-muted">Loading your progress…</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="app-header" role="banner">
        <a href="#" className="header-logo" onClick={e => e.preventDefault()}>
          SQLQuest<span>ByKP</span>
        </a>
        <div className="header-sep" aria-hidden />
        {studentView === 'quest' && currentQuestion ? (
          <>
            <div className="header-question-title" aria-label={`Current question: ${currentQuestion.title}`}>
              {currentQuestion.title}
            </div>
            <div className="pill pill-easy" style={{ marginLeft: '8px' }}>
              {currentQuestion.difficulty}
            </div>
            <div className={`pill pill-${currentQuestion.category}`}>
              {currentQuestion.category}
            </div>
            <div className="points-badge">
              ★ {currentQuestion.points} pts
            </div>
          </>
        ) : (
          <div className="header-question-title">
            {studentView === 'labs' ? '🧪 Lab Experiments' : '📜 Certificates'}
            {profile?.full_name ? ` · ${profile.full_name}` : ''}
          </div>
        )}

        <div className="header-right">
          <div className="streak-display" aria-label={`${dailyStreak} day streak`}>
            <span className="streak-fire" aria-hidden>🔥</span>
            <span>{dailyStreak}</span>
          </div>
          <div className={`xp-display ${xpPulse ? 'xp-pulse' : ''}`} aria-label={`${xp} XP, Level ${level}`}>
            <span>Lv.{level}</span>
            <span className="xp-value">{xp.toLocaleString()} XP</span>
          </div>

          <div className="view-nav" role="tablist" aria-label="Sections">
            <button className={`btn btn-sm ${studentView === 'quest' ? 'btn-gold' : 'btn-ghost-inv'}`} onClick={() => setStudentView('quest')} aria-pressed={studentView === 'quest'}>⚔️ Quest</button>
            <button className={`btn btn-sm ${studentView === 'labs' ? 'btn-gold' : 'btn-ghost-inv'}`} onClick={() => setStudentView('labs')} aria-pressed={studentView === 'labs'}>🧪 Labs</button>
            <button className={`btn btn-sm ${studentView === 'certs' ? 'btn-gold' : 'btn-ghost-inv'}`} onClick={() => setStudentView('certs')} aria-pressed={studentView === 'certs'}>📜 Certs</button>
          </div>

          {studentView === 'quest' && (
            <>
              <button className="btn btn-ghost-inv btn-sm" onClick={() => setShowModal('badges')}>
                🏆 {unlockedCount}
              </button>
              <button className="btn btn-ghost-inv btn-sm" onClick={openRecap}>
                📊 Recap
              </button>
              <button className="btn btn-ghost-inv btn-sm" onClick={() => setShowModal('browser')}>
                📚 Questions
              </button>
              <button
                className="btn btn-gold btn-sm"
                onClick={() => loadNextQuestion(true)}
                aria-label="Load next question"
              >
                Next →
              </button>
            </>
          )}
          <button className="btn btn-ghost-inv btn-sm" onClick={signOut} aria-label="Sign out" title={profile?.prn ? `Signed in as ${profile.prn}` : 'Sign out'}>
            ⎋ Sign out
          </button>
        </div>
      </header>

      {/* ── Labs view ───────────────────────────────────────────────────── */}
      {studentView === 'labs' && (
        <main className="mam-main" role="main">
          <LabsSection
            section={profile?.class_section ?? null}
            isApproved={profile?.is_approved === true}
            onCompletion={() => {
              setCertToast('Lab completed — badge & certificate awarded!');
              setTimeout(() => setCertToast(null), 6000);
            }}
          />
        </main>
      )}

      {/* ── Certificates view ────────────────────────────────────────────── */}
      {studentView === 'certs' && (
        <main className="mam-main" role="main">
          <CertificatesSection
            fullName={profile?.full_name ?? 'Student'}
            prn={profile?.prn}
            completedByCategory={completedByCategory}
          />
        </main>
      )}

      {/* ── Quest view (two-column layout) ──────────────────────────────── */}
      {studentView === 'quest' && currentQuestion && (
      <main className="app-layout" role="main">
        {/* ── Left: Problem Panel ─────────────────────────────────────── */}
        <div className="panel-left" role="region" aria-label="Problem Panel">
          <div className="question-reveal">
            {/* Problem statement — copy-protected (prompt + expected output) */}
            <CopyGuard className="ledger-card card">
              <div className="card-header">
                <span aria-hidden>📋</span> Problem Statement
              </div>
              <div className="card-body">
                <p className="problem-statement">{currentQuestion.prompt}</p>
                <div className="expected-output-box mt-12">
                  <span className="icon" aria-hidden>🎯</span>
                  <div>
                    <strong>Expected Output:</strong> {currentQuestion.expectedOutputDescription}
                  </div>
                </div>
              </div>
            </CopyGuard>

            {/* Schema — copy-protected */}
            <CopyGuard className="ledger-card card">
              <div className="card-header">
                <button
                  className="collapsible-trigger"
                  onClick={() => setSchemaCollapsed(c => !c)}
                  aria-expanded={!schemaCollapsed}
                  aria-controls="schema-body"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span aria-hidden>🗄️</span> Database Schema
                  </span>
                  <span className={`collapsible-chevron ${schemaCollapsed ? '' : 'open'}`} aria-hidden>▼</span>
                </button>
              </div>
              {!schemaCollapsed && (
                <div className="card-body" id="schema-body">
                  <SchemaBlock sql={currentQuestion.schemaSQL} />
                </div>
              )}
            </CopyGuard>

            {/* Sample data — copy-protected */}
            <CopyGuard className="ledger-card card">
              <div className="card-header">
                <button
                  className="collapsible-trigger"
                  onClick={() => setSampleCollapsed(c => !c)}
                  aria-expanded={!sampleCollapsed}
                  aria-controls="sample-body"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span aria-hidden>📊</span> Sample Data
                  </span>
                  <span className={`collapsible-chevron ${sampleCollapsed ? '' : 'open'}`} aria-hidden>▼</span>
                </button>
              </div>
              {!sampleCollapsed && (
                <div className="card-body" id="sample-body">
                  <SchemaBlock sql={currentQuestion.seedSQL.slice(0, 1200) + (currentQuestion.seedSQL.length > 1200 ? '\n-- (truncated for display)' : '')} />
                </div>
              )}
            </CopyGuard>

            {/* Hints */}
            {currentQuestion.hints.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <button
                    className="collapsible-trigger"
                    onClick={() => setHintsCollapsed(c => !c)}
                    aria-expanded={!hintsCollapsed}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span aria-hidden>💡</span> Hints
                    </span>
                    <span className={`collapsible-chevron ${hintsCollapsed ? '' : 'open'}`} aria-hidden>▼</span>
                  </button>
                </div>
                {!hintsCollapsed && (
                  <div className="card-body">
                    <HintsPanel
                      hints={currentQuestion.hints}
                      session={session}
                      onRequest={requestHint}
                      onReveal={revealHint}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Skill snapshot */}
            <div className="card">
              <div className="card-header">
                <button
                  className="collapsible-trigger"
                  onClick={() => setSkillCollapsed(c => !c)}
                  aria-expanded={!skillCollapsed}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span aria-hidden>📈</span> Skill Snapshot
                  </span>
                  <span className={`collapsible-chevron ${skillCollapsed ? '' : 'open'}`} aria-hidden>▼</span>
                </button>
              </div>
              {!skillCollapsed && (
                <div className="card-body">
                  <SkillSnapshot skillProfile={skillProfile} highlightTags={currentQuestion.tags} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: SQL Editor ───────────────────────────────────────── */}
        <div className="panel-right" role="region" aria-label="SQL Query Editor">
          {/* Toolbar */}
          <div className="ledger-card card" style={{ flexShrink: 0 }}>
            <EditorToolbar
              onSave={saveDraft}
              onLoad={loadDraft}
              onFormat={formatQuery}
              onReset={resetQuery}
            />
          </div>

          {/* CodeMirror editor */}
          <div className="ledger-card card" style={{ flex: 1, minHeight: '220px' }}>
            <div className="card-header">
              <span aria-hidden>✏️</span> SQL Editor
              <span className="shortcut-hint" aria-label="Shortcut: Ctrl or Cmd + Enter to run">
                Ctrl/⌘ + Enter to run
              </span>
            </div>
            <SqlEditor
              value={sqlQuery}
              onChange={setSqlQuery}
              onExecute={executeQuery}
            />
          </div>

          {/* Execute CTA */}
          <button
            className="btn-execute"
            onClick={executeQuery}
            disabled={isRunning || !sqlQuery.trim()}
            aria-label="Execute query and see results"
            id="execute-query-btn"
          >
            {isRunning ? (
              <>
                <span className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: '#fff' }} />
                Running…
              </>
            ) : (
              <>▶ Execute Query &amp; See Results</>
            )}
          </button>

          {/* Verdict banner */}
          {gradingResult && (
            <VerdictBanner
              gradingResult={gradingResult}
              classification={classification}
              question={currentQuestion}
              earnedPoints={gradingResult.passed ? currentQuestion.points : 0}
            />
          )}

          {/* Post-mortem tip */}
          {gradingResult?.passed && postMortemTip && (
            <div className="post-mortem-tip">
              <span aria-hidden>💡</span>
              <span>{postMortemTip}</span>
            </div>
          )}

          {/* Stuck indicator */}
          {isStuck && !gradingResult?.passed && (
            <div className="verdict-banner verdict-error" role="alert">
              <span className="verdict-icon" aria-hidden>🧭</span>
              <div className="verdict-body">
                <div className="verdict-title">Looks like you're stuck!</div>
                <div className="verdict-detail">
                  Tag marked as weak. Click "Next →" for a step-down question, or keep trying here.
                </div>
              </div>
            </div>
          )}

          {/* Results grid */}
          {runResult && (
            <div className="ledger-card card">
              <div className="card-header">
                <span aria-hidden>📊</span> Your Result
                <span className="text-muted text-sm" style={{ marginLeft: '8px' }}>
                  ({runResult.rows.length} row{runResult.rows.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="card-body" style={{ padding: '0' }}>
                <ResultsGrid result={runResult} diff={gradingResult?.diff} />
              </div>
            </div>
          )}

          {/* Expected vs actual diff — copy-protected (expected output) */}
          {gradingResult && !gradingResult.passed && gradingResult.expectedResult && gradingResult.diff && (
            <CopyGuard className="ledger-card card ledger-error">
              <div className="card-header">
                <span aria-hidden>🎯</span> Expected Result
                <span className="text-muted text-sm" style={{ marginLeft: '8px' }}>
                  ({gradingResult.expectedResult.rows.length} rows)
                </span>
              </div>
              <div className="card-body" style={{ padding: '0' }}>
                <ResultsGrid result={gradingResult.expectedResult} />
              </div>
            </CopyGuard>
          )}

          {/* Query log */}
          {queryLog.length > 0 && (
            <div className="ledger-card card">
              <div className="card-header">
                <span aria-hidden>📜</span> Query Log
                <span className="text-muted text-sm" style={{ marginLeft: '4px' }}>
                  this session
                </span>
              </div>
              <div className="card-body">
                <QueryLog entries={queryLog} onReload={setSqlQuery} />
              </div>
            </div>
          )}
        </div>
      </main>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showModal === 'badges' && (
        <BadgesModal
          badges={badgesData}
          onClose={() => setShowModal(null)}
        />
      )}

      {showModal === 'recap' && recapData && (
        <SessionRecapModal
          data={recapData}
          completedCount={completedIds.size}
          totalQuestions={allQuestions.length}
          onClose={() => setShowModal(null)}
          onPickQuestion={loadQuestion}
        />
      )}

      {showModal === 'browser' && (
        <QuestionBrowserModal
          completedIds={completedIds}
          currentId={currentQuestion?.id}
          onSelect={loadQuestion}
          onClose={() => setShowModal(null)}
        />
      )}

      {showModal === 'microlesson' && (
        <MicroLessonModal
          tag={microLessonTag}
          onClose={() => {
            setShowModal(null);
            // After micro-lesson, suggest moving to step-down
          }}
        />
      )}

      {/* Badge toast notification */}
      {newBadgeNotification && (() => {
        const badge = BADGE_DEFINITIONS.find(b => b.id === newBadgeNotification);
        return badge ? (
          <div className="badge-toast" role="alert" aria-live="polite">
            <span className="badge-toast-emoji" aria-hidden>{badge.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Badge Unlocked!</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>{badge.name}</div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Certificate toast notification */}
      {certToast && (
        <div className="badge-toast" role="alert" aria-live="polite" style={{ background: 'var(--gold)' }}>
          <span className="badge-toast-emoji" aria-hidden>📜</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Certificate Earned!</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{certToast}</div>
          </div>
        </div>
      )}
    </>
  );
}

// SchemaBlock / SqlEditor / ResultsGrid now live in src/components and are
// imported at the top of this file (shared with the Labs UI).

// ── Editor Toolbar ────────────────────────────────────────────────────────────

function EditorToolbar({
  onSave, onLoad, onFormat, onReset
}: {
  onSave: () => void;
  onLoad: () => void;
  onFormat: () => void;
  onReset: () => void;
}) {
  return (
    <div className="editor-toolbar">
      <div className="toolbar-group">
        <button className="btn btn-ghost btn-sm" onClick={onSave} id="save-draft-btn" aria-label="Save draft to local storage">
          💾 Save
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onLoad} id="load-draft-btn" aria-label="Load saved draft">
          📂 Load
        </button>
      </div>
      <div className="toolbar-sep" aria-hidden />
      <div className="toolbar-group">
        <button className="btn btn-ghost btn-sm" onClick={onFormat} id="format-query-btn" aria-label="Format SQL query">
          ✨ Format
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onReset} id="reset-query-btn" aria-label="Reset query to blank">
          ↩ Reset
        </button>
      </div>
    </div>
  );
}

// ── Verdict Banner ────────────────────────────────────────────────────────────

function VerdictBanner({
  gradingResult,
  classification,
  question,
  earnedPoints
}: {
  gradingResult: GradingResult;
  classification: Classification | null;
  question: Question;
  earnedPoints: number;
}) {
  if (gradingResult.passed) {
    return (
      <div className="verdict-banner verdict-pass" role="status" aria-live="polite">
        <span className="verdict-icon" aria-hidden>✅</span>
        <div className="verdict-body">
          <div className="verdict-title">Correct! Well done.</div>
          <div className="verdict-detail">
            Your query matches the expected output exactly.
          </div>
        </div>
        <span className="verdict-xp" aria-label={`${earnedPoints} points earned`}>+{earnedPoints} XP</span>
      </div>
    );
  }

  if (gradingResult.errorMessage) {
    return (
      <div className="verdict-banner verdict-error" role="alert" aria-live="polite">
        <span className="verdict-icon" aria-hidden>⚠️</span>
        <div className="verdict-body">
          <div className="verdict-title">SQL Error</div>
          <div className="verdict-detail" style={{ fontFamily: 'var(--font-code)', fontSize: '0.82rem' }}>
            {gradingResult.errorMessage}
          </div>
          {classification?.suggestion && (
            <div className="verdict-detail mt-8">{classification.suggestion}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="verdict-banner verdict-fail" role="alert" aria-live="polite">
      <span className="verdict-icon" aria-hidden>❌</span>
      <div className="verdict-body">
        <div className="verdict-title">
          {classification ? `Incorrect — ${classification.errorClass.replace(/_/g, ' ')}` : 'Incorrect'}
        </div>
        {classification && (
          <div className="verdict-detail">{classification.message}</div>
        )}
        {classification?.suggestion && (
          <div className="verdict-detail mt-8" style={{ opacity: 0.75 }}>
            💡 {classification.suggestion}
          </div>
        )}
        {gradingResult.diff && (
          <div className="diff-info mt-8">
            <span className="diff-matched">✓ {gradingResult.diff.matchingRows} matching</span>
            {gradingResult.diff.missingRows.length > 0 && (
              <span className="diff-missing">✗ {gradingResult.diff.missingRows.length} missing</span>
            )}
            {gradingResult.diff.extraRows.length > 0 && (
              <span className="diff-extra">+ {gradingResult.diff.extraRows.length} extra</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hints Panel ───────────────────────────────────────────────────────────────

function HintsPanel({
  hints,
  session,
  onRequest,
  onReveal
}: {
  hints: Question['hints'];
  session: SessionState;
  onRequest: (i: number) => void;
  onReveal: (i: number, confidence: 'low' | 'high') => void;
}) {
  return (
    <div>
      {hints.map((hint, i) => {
        const isRevealed = session.hintsUsed.includes(i);
        const isPending = session.confidencePending === i;
        const prevRevealed = i === 0 || session.hintsUsed.includes(i - 1);

        if (isRevealed) {
          return (
            <div key={i} className="hint-item">
              <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Hint {i + 1}</span>
                <span className="hint-xp-cost">
                  <span aria-hidden>✦</span> {hint.xpCost} XP used
                </span>
              </div>
              <div className="hint-revealed">{hint.text}</div>
            </div>
          );
        }

        if (isPending) {
          return (
            <div key={i} className="hint-confidence-prompt">
              <p>How confident are you right now?</p>
              <div className="hint-confidence-btns">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onReveal(i, 'low')}
                  id={`hint-low-confidence-${i}`}
                >
                  😕 Not sure — show me more
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onReveal(i, 'high')}
                  id={`hint-high-confidence-${i}`}
                >
                  🤔 I think I know — just check
                </button>
              </div>
            </div>
          );
        }

        if (!prevRevealed) return null;

        return (
          <div key={i} className="hint-item">
            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onRequest(i)}
                id={`reveal-hint-${i}`}
                aria-label={`Reveal hint ${i + 1}, costs ${hint.xpCost} XP`}
              >
                💡 Show Hint {i + 1}
              </button>
              <span className="hint-xp-cost">
                <span aria-hidden>✦</span> costs {hint.xpCost} XP
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Skill Snapshot ────────────────────────────────────────────────────────────

function SkillSnapshot({
  skillProfile,
  highlightTags
}: {
  skillProfile: SkillProfile;
  highlightTags: string[];
}) {
  const allTags = [
    'select', 'where', 'order_by', 'limit', 'distinct', 'aggregates',
    'group_by', 'having', 'join', 'subquery', 'cte', 'window_functions', 'exists', 'case'
  ];

  const tagsToShow = [
    ...highlightTags,
    ...allTags.filter(t => !highlightTags.includes(t) && skillProfile[t])
  ].slice(0, 10);

  if (tagsToShow.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Complete questions to see your skill profile.</p>;
  }

  return (
    <div className="skill-snapshot">
      {tagsToShow.map(tag => {
        const p = skillProfile[tag] || { solved: 0, failed: 0, mastery: 0 };
        const pct = Math.round(p.mastery * 100);
        const isHighlighted = highlightTags.includes(tag);
        const masteryClass = pct >= 70 ? 'mastery-high' : pct >= 40 ? 'mastery-mid' : 'mastery-low';
        
        return (
          <div
            key={tag}
            className="skill-tag-row"
            style={{ fontWeight: isHighlighted ? 700 : 400 }}
            aria-label={`${tag}: ${pct}% mastery`}
          >
            <span className="skill-tag-name" title={tag.replace(/_/g, ' ')}>
              {tag.replace(/_/g, ' ')}
            </span>
            <div className="skill-bar-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={`skill-bar-fill ${masteryClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="skill-pct">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Query Log ──────────────────────────────────────────────────────────────────

function QueryLog({ entries, onReload }: { entries: QueryLogEntry[]; onReload: (sql: string) => void }) {
  return (
    <div>
      {entries.map(entry => (
        <div
          key={entry.id}
          className={`query-log-entry ${entry.passed === true ? 'log-pass' : entry.isError ? 'log-error' : 'log-fail'}`}
          onClick={() => onReload(entry.sql)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onReload(entry.sql)}
          aria-label={`Query at ${entry.timestamp.toLocaleTimeString()}: ${entry.passed ? 'Passed' : 'Failed'}. Click to reload.`}
          title="Click to reload this query"
        >
          <div className="log-header">
            <span className="log-status">
              {entry.passed === true ? '✅ PASS' : entry.isError ? '⚠️ ERROR' : '❌ FAIL'}
            </span>
            {entry.rowCount !== undefined && (
              <span>{entry.rowCount} row{entry.rowCount !== 1 ? 's' : ''}</span>
            )}
            <span style={{ marginLeft: 'auto' }}>
              {entry.timestamp.toLocaleTimeString()}
            </span>
          </div>
          <div className="log-query-preview">{entry.sql}</div>
        </div>
      ))}
    </div>
  );
}

// ── Badges Modal ──────────────────────────────────────────────────────────────

function BadgesModal({
  badges,
  onClose
}: {
  badges: Record<string, number | null>;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal aria-label="Badges" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span style={{ fontSize: '1.5rem' }}>🏆</span>
          <h2>Your Badges</h2>
          <button className="btn btn-ghost btn-sm modal-close" onClick={onClose} aria-label="Close badges">✕</button>
        </div>
        <div className="modal-body">
          <div className="badges-grid">
            {BADGE_DEFINITIONS.map(badge => {
              const isUnlocked = !!badges[badge.id];
              return (
                <div key={badge.id} className={`badge-item ${isUnlocked ? 'unlocked' : 'locked'}`}>
                  <span className="badge-emoji" aria-hidden>{badge.emoji}</span>
                  <span className="badge-name">{badge.name}</span>
                  <span className="badge-desc">{badge.description}</span>
                  {isUnlocked && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700 }}>
                      ✓ Unlocked
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Session Recap Modal ────────────────────────────────────────────────────────

function SessionRecapModal({
  data,
  completedCount,
  totalQuestions,
  onClose,
  onPickQuestion
}: {
  data: ReturnType<typeof getSessionRecap>;
  completedCount: number;
  totalQuestions: number;
  onClose: () => void;
  onPickQuestion: (q: Question) => void;
}) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal aria-label="Session Recap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span style={{ fontSize: '1.5rem' }}>📊</span>
          <h2>Session Recap</h2>
          <button className="btn btn-ghost btn-sm modal-close" onClick={onClose} aria-label="Close recap">✕</button>
        </div>
        <div className="modal-body">
          <div className="recap-section">
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {completedCount}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Questions Done</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: '2rem', fontWeight: 800, color: 'var(--gold)' }}>
                  {Math.round(completedCount / totalQuestions * 100)}%
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Progress</div>
              </div>
            </div>
          </div>

          {data.strongTags.length > 0 && (
            <div className="recap-section">
              <h3>💪 Strong Tags</h3>
              <div className="tag-chips">
                {data.strongTags.map(t => (
                  <span key={t} className="tag-chip strong">{t.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          )}

          {data.weakTagsList.length > 0 && (
            <div className="recap-section">
              <h3>🎯 Needs Work</h3>
              <div className="tag-chips">
                {data.weakTagsList.map(t => (
                  <span key={t} className="tag-chip weak">{t.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          )}

          {data.reviewQueue.length > 0 && (
            <div className="recap-section">
              <h3>📚 Review Queue for Next Time</h3>
              <div className="qbrowser-list">
                {data.reviewQueue.map(q => (
                  <div
                    key={q.id}
                    className="qbrowser-item"
                    onClick={() => onPickQuestion(q)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && onPickQuestion(q)}
                  >
                    <span className="qbrowser-item-title">{q.title}</span>
                    <div className="qbrowser-item-meta">
                      <span className={`pill pill-${q.difficulty}`}>{q.difficulty}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Back to Learning</button>
        </div>
      </div>
    </div>
  );
}

// ── Question Browser Modal ────────────────────────────────────────────────────

function QuestionBrowserModal({
  completedIds,
  currentId,
  onSelect,
  onClose
}: {
  completedIds: Set<string>;
  currentId?: string;
  onSelect: (q: Question) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'basic' | 'intermediate' | 'advanced'>('all');
  const [search, setSearch] = useState('');

  const filtered = allQuestions.filter(q => {
    if (filter !== 'all' && q.category !== filter) return false;
    if (search && !q.title.toLowerCase().includes(search.toLowerCase()) &&
        !q.tags.some(t => t.includes(search.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="modal-overlay" role="dialog" aria-modal aria-label="Question Browser" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <span style={{ fontSize: '1.5rem' }}>📚</span>
          <h2>Question Browser ({allQuestions.length} total)</h2>
          <button className="btn btn-ghost btn-sm modal-close" onClick={onClose} aria-label="Close browser">✕</button>
        </div>
        <div className="modal-body">
          <input
            type="search"
            placeholder="Search questions or tags…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              marginBottom: '12px',
              background: 'var(--bg)'
            }}
            aria-label="Search questions"
          />
          <div className="qbrowser-filters">
            {(['all', 'basic', 'intermediate', 'advanced'] as const).map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && ` (${allQuestions.filter(q => q.category === f).length})`}
              </button>
            ))}
          </div>
          <div className="qbrowser-list">
            {filtered.slice(0, 100).map(q => {
              const done = completedIds.has(q.id);
              const isCurrent = q.id === currentId;
              return (
                <div
                  key={q.id}
                  className={`qbrowser-item ${done ? 'done' : ''}`}
                  onClick={() => onSelect(q)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onSelect(q)}
                  style={{ outline: isCurrent ? '2px solid var(--primary)' : undefined }}
                  aria-current={isCurrent}
                >
                  {done && <span aria-hidden title="Completed">✅</span>}
                  <span className="qbrowser-item-title">{q.title}</span>
                  <div className="qbrowser-item-meta">
                    <span className={`pill pill-${q.difficulty}`}>{q.difficulty}</span>
                    <span className="points-badge">★ {q.points}</span>
                  </div>
                </div>
              );
            })}
            {filtered.length > 100 && (
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'center', padding: '8px' }}>
                Showing first 100 of {filtered.length}. Refine your search.
              </p>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Micro Lesson Modal ────────────────────────────────────────────────────────

function MicroLessonModal({ tag, onClose }: { tag: string; onClose: () => void }) {
  const lesson = getMicroLessonForTag(tag);
  const [seconds, setSeconds] = useState(lesson?.readTimeSecs || 45);

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  if (!lesson) {
    onClose();
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal aria-label={`Micro-lesson: ${lesson.title}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span style={{ fontSize: '1.5rem' }}>📖</span>
          <h2>{lesson.title}</h2>
          <div className="micro-lesson-timer" aria-live="polite">
            ⏱ {seconds}s read
          </div>
          <button className="btn btn-ghost btn-sm modal-close" onClick={onClose} style={{ marginLeft: '8px' }} aria-label="Close lesson">✕</button>
        </div>
        <div className="modal-body">
          <MicroLessonContent markdown={lesson.body} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose} id="continue-after-lesson">
            Got it — keep going
          </button>
        </div>
      </div>
    </div>
  );
}

function MicroLessonContent({ markdown }: { markdown: string }) {
  // Simple markdown to JSX conversion for our lessons
  const lines = markdown.split('\n');
  const html = lines.map(line => {
    if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
    if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
    if (line.startsWith('| ')) return line; // handled below
    if (line.startsWith('- ')) return `<li>${line.slice(2).replace(/`([^`]+)`/g, '<code>$1</code>')}</li>`;
    if (line.startsWith('```')) return line === '```' ? '</pre>' : '<pre>';
    if (line.trim() === '') return '<br>';
    return `<p>${line.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</p>`;
  }).join('\n');

  return (
    <div
      className="micro-lesson-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
