/**
 * Dashboard hooks — wired up to the Node.js Express backend.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  DailyStatistics,
  ReclaimScore,
  InterventionState,
  InterventionAction,
  ActivityEntry,
  UserIntent,
} from '../../desktop/shared/types.js';

const API_BASE = 'http://localhost:3001/api';

export function useStatistics(): DailyStatistics {
  const [stats, setStats] = useState<DailyStatistics>({
    date: new Date().toISOString().split('T')[0],
    screenTime: { totalMs: 0, activeMs: 0, date: '' },
    appUsage: [],
    focusTime: { totalFocusMs: 0, totalDistractionMs: 0, focusPercentage: 0, longestFocusStreakMs: 0 },
    driftStats: { totalDrifts: 0, successfulReturns: 0, returnRate: 0 }
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/statistics`);
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (err) {
        console.error('Error fetching statistics', err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return stats;
}

export function useReclaimScore(): ReclaimScore {
  const [score, setScore] = useState<ReclaimScore>({
    score: 100,
    breakdown: { focusScore: 100, distractionPenalty: 0, driftPenalty: 0, recoveryBonus: 0 },
    explanation: 'No data yet.',
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0]!
  });

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const res = await fetch(`${API_BASE}/score`);
        if (res.ok) {
          setScore(await res.json());
        }
      } catch (err) {
        console.error('Error fetching score', err);
      }
    };
    fetchScore();
    const interval = setInterval(fetchScore, 5000);
    return () => clearInterval(interval);
  }, []);

  return score;
}

export function useCurrentIntent() {
  const [intent, setIntentState] = useState<UserIntent | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/intent`)
      .then(res => res.json())
      .then(data => setIntentState(data))
      .catch(console.error);
  }, []);

  const setIntent = useCallback(async (description: string) => {
    try {
      const res = await fetch(`${API_BASE}/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      if (res.ok) {
        setIntentState(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const clearIntent = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: '' })
      });
      setIntentState(null);
    } catch (err) {
      console.error(err);
    }
  }, []);

  return { intent, setIntent, clearIntent };
}

export function useInterventionState() {
  const [state, setState] = useState<InterventionState>({
    isActive: false,
    currentLevel: null,
    currentDriftEvent: null,
    lastInterventionTime: null,
    interventionCount: 0
  });

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(`${API_BASE}/intervention`);
        if (res.ok) {
          setState(await res.json());
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchState();
    const interval = setInterval(fetchState, 2000); // Check often for interventions
    return () => clearInterval(interval);
  }, []);

  const respond = useCallback(async (action: InterventionAction) => {
    try {
      const res = await fetch(`${API_BASE}/intervention/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        // optimistically fetch new state
        fetch(`${API_BASE}/intervention`).then(r => r.json()).then(setState);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const triggerMockDrift = useCallback(() => {
    // In the real system, you'd probably test this differently, but we can hit an endpoint if we added one,
    // or just leave it unimplemented since drift is now real.
    console.warn("triggerMockDrift is deprecated in live mode");
  }, []);

  return { state, respond, triggerMockDrift };
}

export function useRecentActivity(): ActivityEntry[] {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch(`${API_BASE}/recent_activity`);
        if (res.ok) {
          setActivity(await res.json());
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchActivity();
    const interval = setInterval(fetchActivity, 5000);
    return () => clearInterval(interval);
  }, []);

  return activity;
}

export function useBrowserStatus(): boolean {
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/browser_status`);
        if (res.ok) {
          const data = await res.json();
          setConnected(data.connected);
        }
      } catch (err) {
        console.error('Error fetching browser status', err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return connected;
}
