const assert = require('node:assert/strict');
const readiness = require('../scripts/readiness-core.js');

const EXERCISE_METADATA = {
  side_leg_lift_hold: {
    trackingType: 'hold_time',
    primary: ['glutes'],
    secondary: ['core']
  },
  tiny_leg_pulses: {
    trackingType: 'pulses_reps',
    primary: ['glutes', 'hamstrings'],
    secondary: ['core']
  }
};

function runTests() {
  {
    const result = readiness.computeReadiness({
      nowIso: '2026-04-06T12:00:00Z',
      sessions: [],
      sleepHoursLastNight: 8,
      energyToday: 8
    });

    assert.equal(result.status, 'ready');
    assert.equal(result.score, 10);
    assert.deepEqual(result.stressedGroups, []);
    assert.equal(result.targeted, null);
  }

  {
    const result = readiness.computeReadiness({
      nowIso: '2026-04-06T12:00:00Z',
      sessions: [
        {
          startedAt: '2026-04-06T03:00:00Z',
          entries: [{ intensity: 'high', primary: ['quads'], secondary: ['core'] }]
        }
      ],
      sleepHoursLastNight: 5,
      energyToday: 3
    });

    assert.equal(result.status, 'caution');
    assert.ok(result.score < 7 && result.score >= 4);
  }

  {
    const result = readiness.computeReadiness({
      nowIso: '2026-04-06T12:00:00Z',
      targetGroups: ['chest', 'triceps'],
      sessions: [
        {
          startedAt: '2026-04-06T02:00:00Z',
          entries: [{ intensity: 'high', primary: ['quads', 'glutes'], secondary: ['core'] }]
        }
      ]
    });

    assert.equal(result.global.status, 'caution');
    assert.equal(result.targeted.status, 'ready');
    assert.equal(result.status, 'ready');
  }

  {
    // Metadata wiring: derive trackingType and muscle groups from exerciseMetadata.
    const result = readiness.computeReadiness({
      nowIso: '2026-04-06T12:00:00Z',
      exerciseMetadata: EXERCISE_METADATA,
      sessions: [
        {
          startedAt: '2026-04-06T09:00:00Z',
          entries: [{ exerciseId: 'side_leg_lift_hold', intensity: 'medium', holdSec: 90 }]
        }
      ]
    });

    assert.ok(result.stressedGroups.includes('glutes'));
    assert.ok(result.totalPenalty > 1);
  }

  {
    // Higher ROM/control should increase effective load modestly.
    const lowRom = readiness.computeReadiness({
      nowIso: '2026-04-06T12:00:00Z',
      sessions: [
        {
          startedAt: '2026-04-06T08:00:00Z',
          entries: [{ intensity: 'medium', trackingType: 'pulses_reps', pulses: 40, rangeOfMotion: 3, controlQuality: 3, primary: ['glutes'], secondary: [] }]
        }
      ]
    });

    const highRom = readiness.computeReadiness({
      nowIso: '2026-04-06T12:00:00Z',
      sessions: [
        {
          startedAt: '2026-04-06T08:00:00Z',
          entries: [{ intensity: 'medium', trackingType: 'pulses_reps', pulses: 40, rangeOfMotion: 8, controlQuality: 8, primary: ['glutes'], secondary: [] }]
        }
      ]
    });

    assert.ok(highRom.totalPenalty > lowRom.totalPenalty);
  }

  {
    const wrapped = readiness.execute({
      action: 'suggest_intensity',
      nowIso: '2026-04-06T12:00:00Z',
      plannedModality: 'callanetics',
      sessions: [
        {
          startedAt: '2026-04-06T02:00:00Z',
          entries: [{ intensity: 'high', trackingType: 'hold_time', holdSec: 90, primary: ['glutes'], secondary: ['core'] }]
        }
      ]
    });

    assert.equal(wrapped.result.readiness.status, 'caution');
    assert.ok(wrapped.result.suggestion.adjustments.includes('shorter_holds'));
  }

  {
    const result = readiness.computeReadiness({
      nowIso: '2026-04-06T12:00:00Z',
      sessions: [
        {
          startedAt: '2026-04-07T12:00:00Z',
          entries: [{ intensity: 'high', primary: ['back'], secondary: ['biceps'] }]
        }
      ]
    });

    assert.equal(result.score, 10);
    assert.equal(result.status, 'ready');
  }

  console.log('All readiness-core tests passed.');
}

runTests();
