const assert = require('node:assert/strict');
const readiness = require('../scripts/readiness-core.js');

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
          entries: [
            {
              intensity: 'high',
              primary: ['quads'],
              secondary: ['core']
            }
          ]
        }
      ],
      sleepHoursLastNight: 5,
      energyToday: 3
    });

    assert.equal(result.status, 'caution');
    assert.ok(result.score < 7 && result.score >= 4);
    assert.ok(result.stressedGroups.includes('quads'));
  }

  {
    // Targeted readiness: lower-body fatigue should not penalize upper-body target strongly.
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
    // Callanetics hold-time metadata should increase effective load modestly.
    const base = readiness.computeReadiness({
      nowIso: '2026-04-06T12:00:00Z',
      sessions: [
        {
          startedAt: '2026-04-06T08:00:00Z',
          entries: [{ intensity: 'medium', trackingType: 'hold_time', holdSec: 30, primary: ['glutes'], secondary: [] }]
        }
      ]
    });

    const extendedHold = readiness.computeReadiness({
      nowIso: '2026-04-06T12:00:00Z',
      sessions: [
        {
          startedAt: '2026-04-06T08:00:00Z',
          entries: [{ intensity: 'medium', trackingType: 'hold_time', holdSec: 90, primary: ['glutes'], secondary: [] }]
        }
      ]
    });

    assert.ok(extendedHold.totalPenalty > base.totalPenalty);
  }

  {
    const wrapped = readiness.execute({
      action: 'suggest_intensity',
      nowIso: '2026-04-06T12:00:00Z',
      sessions: [
        {
          startedAt: '2026-04-05T18:30:00Z',
          entries: [{ intensity: 'medium', primary: ['glutes'], secondary: [] }]
        }
      ]
    });

    assert.equal(typeof wrapped.result.readiness.status, 'string');
    assert.equal(typeof wrapped.result.suggestion.recommendation, 'string');
  }

  {
    // Future-dated sessions should not affect readiness.
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
