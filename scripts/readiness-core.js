(function (globalScope) {
  const INTENSITY_SCORE = { low: 1.0, medium: 1.5, high: 2.0 };

  function parseIso(isoString) {
    return new Date(isoString);
  }

  function hoursBetween(later, earlier) {
    return (later.getTime() - earlier.getTime()) / (1000 * 60 * 60);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getExerciseMeta(payload, exerciseId) {
    const metadata = payload.exerciseMetadata || {};
    return metadata[exerciseId] || null;
  }

  function enrichEntry(payload, entry) {
    const meta = getExerciseMeta(payload, entry.exerciseId);
    if (!meta) return entry;

    return {
      ...entry,
      trackingType: entry.trackingType || meta.trackingType,
      primary: Array.isArray(entry.primary) ? entry.primary : meta.primary || [],
      secondary: Array.isArray(entry.secondary) ? entry.secondary : meta.secondary || []
    };
  }

  function inferLoadMultiplier(entry) {
    let multiplier = 1.0;

    if (entry.trackingType === 'duration' && typeof entry.durationSec === 'number') {
      if (entry.durationSec >= 120) multiplier += 0.25;
      else if (entry.durationSec >= 60) multiplier += 0.15;
    }

    if (entry.trackingType === 'hold_time' && typeof entry.holdSec === 'number') {
      if (entry.holdSec >= 90) multiplier += 0.3;
      else if (entry.holdSec >= 60) multiplier += 0.2;
    }

    if (entry.trackingType === 'pulses_reps' && typeof entry.pulses === 'number') {
      if (entry.pulses >= 60) multiplier += 0.3;
      else if (entry.pulses >= 40) multiplier += 0.2;
    }

    if (typeof entry.rangeOfMotion === 'number') {
      if (entry.rangeOfMotion >= 8) multiplier += 0.1;
      if (entry.rangeOfMotion <= 3) multiplier -= 0.1;
    }

    if (typeof entry.controlQuality === 'number') {
      if (entry.controlQuality >= 8) multiplier += 0.1;
      if (entry.controlQuality <= 3) multiplier -= 0.1;
    }

    if (typeof entry.formQuality === 'number' && entry.formQuality <= 3) {
      multiplier -= 0.05;
    }

    return clamp(multiplier, 0.7, 1.6);
  }

  function computePenaltyBuckets(payload) {
    const now = parseIso(payload.nowIso);
    const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
    const groupPenalty = {};

    for (const session of sessions) {
      const startedAt = parseIso(session.startedAt);
      const hoursSince = hoursBetween(now, startedAt);
      if (Number.isNaN(hoursSince) || hoursSince < 0) continue;

      const entries = Array.isArray(session.entries) ? session.entries : [];
      for (const rawEntry of entries) {
        const entry = enrichEntry(payload, rawEntry);
        const baseIntensity = INTENSITY_SCORE[entry.intensity] ?? INTENSITY_SCORE.medium;
        const intensity = baseIntensity * inferLoadMultiplier(entry);

        const primaryWeight = hoursSince <= 24 ? 1.0 : hoursSince <= 48 ? 0.5 : 0.0;
        const secondaryWeight = hoursSince <= 24 ? 0.6 : hoursSince <= 48 ? 0.3 : 0.0;

        for (const g of entry.primary || []) {
          groupPenalty[g] = (groupPenalty[g] || 0) + primaryWeight * intensity;
        }
        for (const g of entry.secondary || []) {
          groupPenalty[g] = (groupPenalty[g] || 0) + secondaryWeight * intensity;
        }
      }
    }

    return groupPenalty;
  }

  function statusForScore(score) {
    if (score < 4) return 'recover';
    if (score < 7) return 'caution';
    return 'ready';
  }

  function scoreFromPenalty(totalPenalty, payload) {
    let score = 10 - Math.min(totalPenalty, 6);
    if (typeof payload.sleepHoursLastNight === 'number' && payload.sleepHoursLastNight < 6) score -= 1;
    if (typeof payload.energyToday === 'number' && payload.energyToday <= 4) score -= 1;
    return Math.max(0, Number(score.toFixed(2)));
  }

  function computeReadiness(payload) {
    const groupPenalty = computePenaltyBuckets(payload);
    const totalPenalty = Object.values(groupPenalty).reduce((acc, n) => acc + n, 0);

    const globalScore = scoreFromPenalty(totalPenalty, payload);
    const globalStatus = statusForScore(globalScore);

    const stressedGroups = Object.entries(groupPenalty)
      .filter(([, penalty]) => penalty >= 1)
      .sort((a, b) => b[1] - a[1])
      .map(([group]) => group);

    const targetGroups = Array.isArray(payload.targetGroups) ? payload.targetGroups : [];
    let targetedPenalty = null;
    let targetedScore = null;
    let targetedStatus = null;

    if (targetGroups.length > 0) {
      targetedPenalty = Number(targetGroups.reduce((sum, group) => sum + (groupPenalty[group] || 0), 0).toFixed(2));
      targetedScore = scoreFromPenalty(targetedPenalty, payload);
      targetedStatus = statusForScore(targetedScore);
    }

    const effectiveScore = targetedScore ?? globalScore;
    const effectiveStatus = targetedStatus ?? globalStatus;

    return {
      status: effectiveStatus,
      score: effectiveScore,
      stressedGroups,
      totalPenalty: Number(totalPenalty.toFixed(2)),
      global: { status: globalStatus, score: globalScore, totalPenalty: Number(totalPenalty.toFixed(2)) },
      targeted: targetGroups.length > 0
        ? { targetGroups, status: targetedStatus, score: targetedScore, totalPenalty: targetedPenalty }
        : null
    };
  }

  function suggestIntensity(readiness, payload = {}) {
    const modality = payload.plannedModality || 'hybrid';

    if (readiness.status === 'ready') {
      return { recommendation: 'normal', note: 'No recovery warning needed.', adjustments: [] };
    }

    if (readiness.status === 'caution') {
      if (modality === 'callanetics') {
        return {
          recommendation: 'moderate',
          note: `Go easier on: ${readiness.stressedGroups.join(', ') || 'recently trained areas'}.`,
          adjustments: ['shorter_holds', 'fewer_pulses', 'longer_rest', 'smaller_rom']
        };
      }
      if (modality === 'gym') {
        return {
          recommendation: 'moderate',
          note: `Go easier on: ${readiness.stressedGroups.join(', ') || 'recently trained areas'}.`,
          adjustments: ['lower_weight', 'reduce_sets', 'higher_rir']
        };
      }
      return {
        recommendation: 'moderate',
        note: `Go easier on: ${readiness.stressedGroups.join(', ') || 'recently trained areas'}.`,
        adjustments: ['reduce_intensity', 'reduce_volume']
      };
    }

    return {
      recommendation: 'light_or_recovery',
      note: `A lighter session is likely better today (${readiness.stressedGroups.join(', ') || 'overall fatigue'}).`,
      adjustments: payload.plannedModality === 'callanetics'
        ? ['very_short_holds', 'minimal_pulses', 'long_rest', 'mobility_focus']
        : ['light_session', 'active_recovery']
    };
  }

  function getLastSession(sessions) {
    return [...(sessions || [])].sort((a, b) => parseIso(b.startedAt) - parseIso(a.startedAt))[0] || null;
  }

  function showToday(payload) {
    const planned = payload.plannedWorkout || { name: 'Workout', modality: payload.plannedModality || 'hybrid' };
    const readiness = computeReadiness({ ...payload, targetGroups: payload.targetGroups || planned.targetGroups || [] });
    const suggestion = suggestIntensity(readiness, { plannedModality: planned.modality });

    let message = `Heute ist ${planned.name} dran.`;
    if (readiness.status !== 'ready') {
      message += ` ${suggestion.note}`;
    }

    return {
      result: {
        action: 'show_today',
        plannedWorkout: planned,
        readiness,
        suggestion,
        message
      }
    };
  }

  function showLastWorkout(payload) {
    const last = getLastSession(payload.sessions || []);
    if (!last) {
      return { result: { action: 'show_last_workout', message: 'Noch kein Workout geloggt.' } };
    }

    const entryCount = Array.isArray(last.entries) ? last.entries.length : 0;
    return {
      result: {
        action: 'show_last_workout',
        session: last,
        message: `Letztes Workout: ${last.modality || 'training'} am ${last.startedAt} mit ${entryCount} Übungen.`
      }
    };
  }

  function logWorkout(payload) {
    const newSession = payload.newSession || null;
    const sessions = Array.isArray(payload.sessions) ? [...payload.sessions] : [];
    if (newSession) sessions.push(newSession);

    const readiness = computeReadiness({ ...payload, sessions });
    const suggestion = suggestIntensity(readiness, { plannedModality: newSession?.modality || payload.plannedModality });

    let message = 'Workout gespeichert.';
    if (readiness.status !== 'ready') message += ` ${suggestion.note}`;

    return {
      result: {
        action: 'log_workout',
        logged: Boolean(newSession),
        readiness,
        suggestion,
        message
      }
    };
  }

  function suggestNextWorkout(payload) {
    const plan = Array.isArray(payload.planDays) ? payload.planDays : [];
    if (plan.length === 0) {
      return { result: { action: 'suggest_next_workout', message: 'Kein Plan hinterlegt.' } };
    }

    const last = getLastSession(payload.sessions || []);
    const lastId = last?.dayId;
    const idx = plan.findIndex((d) => d.dayId === lastId);
    const next = idx >= 0 ? plan[(idx + 1) % plan.length] : plan[0];

    return showToday({
      ...payload,
      plannedWorkout: {
        name: next.label || next.dayId || 'Next Workout',
        modality: next.modality || 'hybrid',
        targetGroups: next.targetGroups || []
      }
    });
  }

  function createHybridPlan(payload) {
    const gymDays = Math.max(0, Number(payload.gymDays || 3));
    const callDays = Math.max(0, Number(payload.callaneticsDays || 2));
    const plan = [];

    const gymTemplates = [
      { label: 'Push (Gym)', targetGroups: ['chest', 'shoulders', 'triceps'] },
      { label: 'Pull (Gym)', targetGroups: ['back', 'biceps'] },
      { label: 'Legs (Gym)', targetGroups: ['quads', 'hamstrings', 'glutes', 'core'] }
    ];
    const callTemplates = [
      { label: 'Callanetics Lower + Core', targetGroups: ['glutes', 'hamstrings', 'core'] },
      { label: 'Callanetics Mobility + Core', targetGroups: ['core', 'lower_back'] }
    ];

    for (let i = 0; i < gymDays; i += 1) {
      const t = gymTemplates[i % gymTemplates.length];
      plan.push({ dayId: `gym_${i + 1}`, modality: 'gym', ...t });
    }
    for (let i = 0; i < callDays; i += 1) {
      const t = callTemplates[i % callTemplates.length];
      plan.push({ dayId: `call_${i + 1}`, modality: 'callanetics', ...t });
    }

    return { result: { action: 'create_hybrid_plan', plan } };
  }

  function execute(payload) {
    const action = payload.action || 'compute_readiness';

    if (action === 'compute_readiness') return { result: computeReadiness(payload) };
    if (action === 'suggest_intensity') {
      const readiness = computeReadiness(payload);
      return { result: { readiness, suggestion: suggestIntensity(readiness, payload) } };
    }
    if (action === 'show_today') return showToday(payload);
    if (action === 'log_workout') return logWorkout(payload);
    if (action === 'show_last_workout') return showLastWorkout(payload);
    if (action === 'suggest_next_workout') return suggestNextWorkout(payload);
    if (action === 'create_hybrid_plan') return createHybridPlan(payload);

    return { error: `Unsupported action: ${action}` };
  }

  globalScope.FitnessCoachReadiness = {
    computeReadiness,
    suggestIntensity,
    execute,
    showToday,
    logWorkout,
    showLastWorkout,
    suggestNextWorkout,
    createHybridPlan
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = globalScope.FitnessCoachReadiness;
  }
})(typeof window !== 'undefined' ? window : globalThis);
