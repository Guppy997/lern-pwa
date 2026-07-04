import { useEffect, useState } from 'react';
import { api } from './api.js';
import {
  timeSystemMinutes,
  breakMinutesFor,
  methodIdForMinutes,
  parseDbDate,
  notificationPermission,
  requestNotificationPermission,
  primeAudio
} from './constants.js';
import ProjectBoard from './components/ProjectBoard.jsx';
import ProjectDashboard from './components/ProjectDashboard.jsx';
import FocusTimer from './components/FocusTimer.jsx';
import BreakTimer from './components/BreakTimer.jsx';
import FeedbackForm from './components/FeedbackForm.jsx';
import StatsView from './components/StatsView.jsx';
import AppFooter from './components/AppFooter.jsx';

const DEFAULT_QUICKSTART_METHOD = 'sprint';

// view: 'loading' | 'board' | 'project' | 'timer' | 'feedback' | 'break' | 'stats'
export default function App() {
  const [view, setView] = useState('loading');
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [dayPlan, setDayPlan] = useState(null);
  const [dayPlans, setDayPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [totals, setTotals] = useState({ session_count: 0, focus_seconds: 0 });
  const [activeSession, setActiveSession] = useState(null);
  const [notifPermission, setNotifPermission] = useState(notificationPermission());
  const [error, setError] = useState(null);

  // Jede Nutzeraktion landet bei Fehlern (z. B. Netzwerk weg) in der Fehlerkarte
  // statt in einer stummen unhandled rejection
  const guard = (fn) => (...args) => Promise.resolve(fn(...args)).catch((err) => setError(err.message));

  const loadBoard = async () => {
    const { projects: list } = await api.getProjects();
    setProjects(list);
    setView('board');
  };

  const loadProject = async (id) => {
    const data = await api.getProject(id);
    setActiveProject(data.project);
    setDayPlan(data.dayPlan);
    setDayPlans(data.dayPlans || []);
    setSessions(data.sessions);
    setTotals(data.totals);
    setView('project');
  };

  useEffect(() => {
    loadBoard().catch((err) => setError(err.message));
  }, []);

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
  };

  const handleCreateProject = async (name) => {
    await api.createProject(name);
    await loadBoard();
  };

  const handleMoveProject = guard(async (project, status) => {
    await api.setProjectStatus(project.id, status);
    await loadBoard();
  });

  const handleDeleteProject = guard(async (project) => {
    await api.deleteProject(project.id);
    await loadBoard();
  });

  // Heutigen Plan auch in der Verlaufsliste aktuell halten, ohne neu zu laden
  const upsertDayPlan = (plan) =>
    setDayPlans((prev) =>
      [plan, ...prev.filter((p) => p.date !== plan.date)].sort((a, b) => b.date.localeCompare(a.date))
    );

  const handleSavePlan = async (data) => {
    const { dayPlan: saved } = await api.setDayPlan(activeProject.id, data);
    setDayPlan(saved);
    upsertDayPlan(saved);
  };

  const handleDayPlanCompleted = guard(async (completed) => {
    const { dayPlan: updated } = await api.setDayPlanCompleted(activeProject.id, completed);
    setDayPlan(updated);
    upsertDayPlan(updated);
  });

  const handleStart = guard(async ({ withoutPlan }) => {
    // Muss synchron vor dem ersten await laufen — das ist der Teil der
    // Klick-Geste, in dem der Browser eine AudioContext-Erzeugung erlaubt.
    primeAudio();
    const usePlan = dayPlan && !withoutPlan && !dayPlan.completed_at;
    const methodId = usePlan ? dayPlan.method : DEFAULT_QUICKSTART_METHOD;
    const plannedMinutes = timeSystemMinutes(methodId);

    const { session } = await api.startSession({
      projectId: activeProject.id,
      dayPlanId: usePlan ? dayPlan.id : null,
      plannedMinutes
    });
    setActiveSession({ ...session, plannedMinutes, methodId, startedAtMs: Date.now() });
    setView('timer');
  });

  // Eine offene Session (App wurde unterwegs beendet/neu geladen) weiterlaufen lassen —
  // der Timer rechnet ab dem ursprünglichen Start weiter
  const handleResume = (openSession) => {
    primeAudio();
    setActiveSession({
      ...openSession,
      plannedMinutes: openSession.planned_minutes,
      methodId: methodIdForMinutes(openSession.planned_minutes),
      startedAtMs: parseDbDate(openSession.started_at).getTime()
    });
    setView('timer');
  };

  const handleDiscardSession = guard(async (sessionId) => {
    await api.deleteSession(sessionId);
    setActiveSession(null);
    await loadProject(activeProject.id);
  });

  const handleTimerFinish = ({ focusSeconds, pausedSeconds, methodData }) => {
    setActiveSession((prev) => ({ ...prev, focusSeconds, pausedSeconds, methodData }));
    setView('feedback');
  };

  // Bewusst ohne guard: das FeedbackForm fängt Fehler selbst ab und bietet Retry,
  // damit Rating und Texte nicht verloren gehen
  const handleFeedback = async (feedback) => {
    await api.finishSession(activeSession.id, {
      ...feedback,
      focusSeconds: activeSession.focusSeconds,
      pausedSeconds: activeSession.pausedSeconds || 0,
      methodData: activeSession.methodData?.length ? activeSession.methodData : null
    });
    const breakMinutes = breakMinutesFor(activeSession.methodId);
    if (breakMinutes) {
      setView('break');
    } else {
      setActiveSession(null);
      await loadProject(activeProject.id);
    }
  };

  const finishBreak = guard(async () => {
    setActiveSession(null);
    await loadProject(activeProject.id);
  });

  const renderView = () => {
  if (error) {
    return (
      <div className="card">
        <h1>Fehler</h1>
        <p className="error">{error}</p>
        <button onClick={() => { setError(null); loadBoard().catch((err) => setError(err.message)); }}>
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  switch (view) {
    case 'loading':
      return <div className="card"><p>Lade…</p></div>;

    case 'board':
      return (
        <ProjectBoard
          projects={projects}
          onOpen={guard((p) => loadProject(p.id))}
          onMove={handleMoveProject}
          onDelete={handleDeleteProject}
          onCreate={handleCreateProject}
          onShowStats={() => setView('stats')}
          notifPermission={notifPermission}
          onEnableNotifications={handleEnableNotifications}
        />
      );

    case 'stats':
      return <StatsView onBack={guard(loadBoard)} />;

    case 'project':
      return (
        <ProjectDashboard
          project={activeProject}
          dayPlan={dayPlan}
          dayPlans={dayPlans}
          sessions={sessions}
          totals={totals}
          onSavePlan={handleSavePlan}
          onPlanCompleted={handleDayPlanCompleted}
          onStart={handleStart}
          onBack={guard(loadBoard)}
          onDelete={handleDeleteProject}
          onResume={handleResume}
          onDiscardSession={handleDiscardSession}
        />
      );

    case 'timer':
      return (
        <FocusTimer
          key={activeSession.id}
          plannedMinutes={activeSession.plannedMinutes}
          methodId={activeSession.methodId}
          startedAtMs={activeSession.startedAtMs}
          onFinish={handleTimerFinish}
          onDiscard={() => handleDiscardSession(activeSession.id)}
        />
      );

    case 'break':
      return (
        <BreakTimer
          minutes={breakMinutesFor(activeSession.methodId)}
          onDone={finishBreak}
          onSkip={finishBreak}
        />
      );

    case 'feedback':
      return <FeedbackForm onSubmit={handleFeedback} />;

    default:
      return null;
  }
  };

  return (
    <>
      {renderView()}
      <AppFooter />
    </>
  );
}
