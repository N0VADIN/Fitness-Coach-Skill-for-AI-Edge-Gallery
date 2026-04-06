(function (globalScope) {
  const INTENSITY_SCORE = { low: 1.0, medium: 1.5, high: 2.0 };

  function parseIso(isoString) {
    return new Date(isoString);
  }

  function hoursBetween(later, earlier) {
    return (later.getTime() - earlier.getTime()) / (1000 * 60 * 60);
  }

  function computeReadiness(payload) {
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
      for (const entry of entries) {
        const intensity = INTENSITY_SCORE[entry.intensity] ?? INTENSITY_SCORE.medium;

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

    const totalPenalty = Object.values(groupPenalty).reduce((acc, n) => acc + n, 0);

    let score = 10 - Math.min(totalPenalty, 6);
    if (typeof payload.sleepHoursLastNight === 'number' && payload.sleepHoursLastNight < 6) {
      score -= 1;
    }
    if (typeof payload.energyToday === 'number' && payload.energyToday <= 4) {
      score -= 1;
    }

    score = Math.max(0, Number(score.toFixed(2)));

    let status = 'ready';
    let message = 'Training is on track.';
    if (score < 4) {
      status = 'recover';
      message = 'Prefer lighter training or active recovery today.';
    } else if (score < 7) {
      status = 'caution';
      message = 'Train as planned, but reduce intensity on recently stressed areas.';
    }

    const stressedGroups = Object.entries(groupPenalty)
      .filter(([, penalty]) => penalty >= 1)
      .sort((a, b) => b[1] - a[1])
      .map(([group]) => group);

    return {
      status,
      score,
      message,
      stressedGroups,
      totalPenalty: Number(totalPenalty.toFixed(2))
    };
  }

  function suggestIntensity(readiness) {
    if (readiness.status === 'ready') {
      return { recommendation: 'normal', note: 'No recovery warning needed.' };
    }
    if (readiness.status === 'caution') {
      return {
        recommendation: 'moderate',
        note: `Reduce load for: ${readiness.stressedGroups.join(', ') || 'recently trained areas'}.`
      };
    }
    return {
      recommendation: 'light_or_recovery',
      note: `Prioritize recovery. Most stressed: ${readiness.stressedGroups.join(', ') || 'multiple areas'}.`
    };
  }

  function execute(payload) {
    const action = payload.action || 'compute_readiness';
    const readiness = computeReadiness(payload);

    if (action === 'suggest_intensity') {
      return { result: { readiness, suggestion: suggestIntensity(readiness) } };
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
