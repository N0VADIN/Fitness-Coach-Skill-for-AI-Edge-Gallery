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
      if (Number.isNaN(hoursSince) || hoursSince < 0) {
        continue;
      }

      const entries = Array.isArray(session.entries) ? session.entries : [];
      for (const rawEntry of entries) {
        const entry = enrichEntry(payload, rawEntry);
        const baseIntensity = INTENSITY_SCORE[entry.intensity] ?? INTENSITY_SCORE.medium;
        const intensity = baseIntensity * inferLoadMultiplier(entry);

        let primaryWeight = 0;
        let secondaryWeight = 0;
        if (hoursSince <= 24) {
          primaryWeight = 1.0;
          secondaryWeight = 0.6;
        } else if (hoursSince <= 48) {
          primaryWeight = 0.5;
          secondaryWeight = 0.3;
        }

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

  function messageForStatus(status) {
    if (status === 'recover') return 'Prefer lighter training or active recovery today.';
    if (status === 'caution') return 'Train as planned, but reduce intensity on recently stressed areas.';
    return 'Training is on track.';
  }

  function scoreFromPenalty(totalPenalty, payload) {
    let score = 10 - Math.min(totalPenalty, 6);
    if (typeof payload.sleepHoursLastNight === 'number' && payload.sleepHoursLastNight < 6) {
      score -= 1;
    }
    if (typeof payload.energyToday === 'number' && payload.energyToday <= 4) {
      score -= 1;
    }
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
      targetedPenalty = targetGroups.reduce((sum, group) => sum + (groupPenalty[group] || 0), 0);
      targetedPenalty = Number(targetedPenalty.toFixed(2));
      targetedScore = scoreFromPenalty(targetedPenalty, payload);
      targetedStatus = statusForScore(targetedScore);
    }

    const effectiveScore = targetedScore ?? globalScore;
    const effectiveStatus = targetedStatus ?? globalStatus;

    return {
      status: effectiveStatus,
      score: effectiveScore,
      message: messageForStatus(effectiveStatus),
      stressedGroups,
      totalPenalty: Number(totalPenalty.toFixed(2)),
      global: {
        status: globalStatus,
        score: globalScore,
        totalPenalty: Number(totalPenalty.toFixed(2))
      },
      targeted: targetGroups.length > 0
        ? {
            targetGroups,
            status: targetedStatus,
            score: targetedScore,
            totalPenalty: targetedPenalty
          }
        : null
    };
  }

  function suggestIntensity(readiness, payload = {}) {
    const modality = payload.plannedModality || 'hybrid';

    if (readiness.status === 'ready') {
      return {
        recommendation: 'normal',
        note: 'No recovery warning needed.',
        adjustments: []
      };
    }

    if (readiness.status === 'caution') {
      if (modality === 'callanetics') {
        return {
          recommendation: 'moderate',
          note: `Keep it controlled for: ${readiness.stressedGroups.join(', ') || 'recently trained areas'}.`,
          adjustments: ['shorter_holds', 'fewer_pulses', 'longer_rest', 'smaller_rom']
        };
      }

      if (modality === 'gym') {
        return {
          recommendation: 'moderate',
          note: `Reduce load for: ${readiness.stressedGroups.join(', ') || 'recently trained areas'}.`,
          adjustments: ['lower_weight', 'reduce_sets', 'higher_rir']
        };
      }

      return {
        recommendation: 'moderate',
        note: `Reduce stress on: ${readiness.stressedGroups.join(', ') || 'recently trained areas'}.`,
        adjustments: ['reduce_intensity', 'reduce_volume']
      };
    }

    if (modality === 'callanetics') {
      return {
        recommendation: 'light_or_recovery',
        note: `Prefer gentle callanetics or mobility. Most stressed: ${readiness.stressedGroups.join(', ') || 'multiple areas'}.`,
        adjustments: ['very_short_holds', 'minimal_pulses', 'long_rest', 'mobility_focus']
      };
    }

    return {
      recommendation: 'light_or_recovery',
      note: `Prioritize recovery. Most stressed: ${readiness.stressedGroups.join(', ') || 'multiple areas'}.`,
      adjustments: ['light_session', 'active_recovery']
    };
  }

  function execute(payload) {
    const action = payload.action || 'compute_readiness';
    const readiness = computeReadiness(payload);

    if (action === 'suggest_intensity') {
      return { result: { readiness, suggestion: suggestIntensity(readiness, payload) } };
    }
    return { result: readiness };
  }

  globalScope.FitnessCoachReadiness = {
    computeReadiness,
    suggestIntensity,
    execute
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = globalScope.FitnessCoachReadiness;
  }
})(typeof window !== 'undefined' ? window : globalThis);
