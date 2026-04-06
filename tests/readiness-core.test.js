const assert = require('node:assert/strict');
const coach = require('../scripts/readiness-core.js');

const EXERCISE_METADATA = {
  side_leg_lift_hold: { trackingType: 'hold_time', primary: ['glutes'], secondary: ['core'] }
};

function runTests() {
  {
    const result = coach.computeReadiness({
      nowIso: '2026-04-06T12:00:00Z',
      sessions: [],
      sleepHoursLastNight: 8,
      energyToday: 8
    });
    assert.equal(result.status, 'ready');
  }

  {
    const result = coach.computeReadiness({
      nowIso: '2026-04-06T12:00:00Z',
      sessions: [{ startedAt: '2026-04-06T03:00:00Z', entries: [{ intensity: 'high', primary: ['quads'], secondary: ['core'] }] }],
      sleepHoursLastNight: 5,
      energyToday: 3
    });
    assert.equal(result.status, 'caution');
  }

  {
    const result = coach.computeReadiness({
      nowIso: '2026-04-06T12:00:00Z',
      targetGroups: ['chest'],
      sessions: [{ startedAt: '2026-04-06T03:00:00Z', entries: [{ intensity: 'high', primary: ['quads'], secondary: ['core'] }] }]
    });
    assert.equal(result.status, 'ready');
    assert.equal(result.global.status, 'caution');
  }

  {
    const result = coach.computeReadiness({
      nowIso: '2026-04-06T12:00:00Z',
      exerciseMetadata: EXERCISE_METADATA,
      sessions: [{ startedAt: '2026-04-06T09:00:00Z', entries: [{ exerciseId: 'side_leg_lift_hold', intensity: 'medium', holdSec: 90 }] }]
    });
    assert.ok(result.stressedGroups.includes('glutes'));
  }

  {
    const today = coach.execute({
      action: 'show_today',
      nowIso: '2026-04-06T12:00:00Z',
      plannedWorkout: { name: 'Pull', modality: 'gym', targetGroups: ['back', 'biceps'] },
      sessions: []
    });
    assert.equal(today.result.action, 'show_today');
    assert.ok(today.result.message.includes('Heute ist Pull dran'));
  }

  {
    const log = coach.execute({
      action: 'log_workout',
      nowIso: '2026-04-06T12:00:00Z',
      sessions: [],
      newSession: {
        startedAt: '2026-04-06T11:00:00Z',
        modality: 'callanetics',
        entries: [{ intensity: 'high', trackingType: 'hold_time', holdSec: 90, primary: ['glutes'], secondary: ['core'] }]
      }
    });
    assert.equal(log.result.action, 'log_workout');
    assert.equal(log.result.logged, true);
  }

  {
    const next = coach.execute({
      action: 'suggest_next_workout',
      nowIso: '2026-04-06T12:00:00Z',
      sessions: [{ dayId: 'd1', startedAt: '2026-04-05T12:00:00Z', entries: [] }],
      planDays: [
        { dayId: 'd1', label: 'Push', modality: 'gym', targetGroups: ['chest'] },
        { dayId: 'd2', label: 'Call Core', modality: 'callanetics', targetGroups: ['core'] }
      ]
    });
    assert.equal(next.result.action, 'show_today');
    assert.equal(next.result.plannedWorkout.name, 'Call Core');
  }

  {
    const plan = coach.execute({ action: 'create_hybrid_plan', gymDays: 3, callaneticsDays: 2 });
    assert.equal(plan.result.action, 'create_hybrid_plan');
    assert.equal(plan.result.plan.length, 5);
  }

  {
    const last = coach.execute({
      action: 'show_last_workout',
      sessions: [{ startedAt: '2026-04-05T12:00:00Z', modality: 'gym', entries: [{}, {}] }]
    });
    assert.equal(last.result.action, 'show_last_workout');
  }

  console.log('All readiness-core tests passed.');
}

runTests();
