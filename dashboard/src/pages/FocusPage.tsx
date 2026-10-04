import React, { useState, useEffect } from 'react';
import type { UserIntent } from '../../../desktop/shared/types.js';

interface FocusPageProps {
  intent: UserIntent | null;
  setIntent: (description: string) => void;
  clearIntent: () => void;
}

export function FocusPage({ intent, setIntent, clearIntent }: FocusPageProps) {
  const [elapsed, setElapsed] = useState(0);
  const [draftGoal, setDraftGoal] = useState('');

  // Simple timer for visual effect
  useEffect(() => {
    if (!intent) return;
    const start = intent.createdAt;
    
    const update = () => {
      setElapsed(Date.now() - start);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [intent]);

  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!intent) {
    return (
      <div className="page-container fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>What do you want to focus on?</h2>
        <input 
          type="text" 
          value={draftGoal}
          onChange={e => setDraftGoal(e.target.value)}
          placeholder="Enter your current goal..." 
          style={{ 
            padding: 'var(--space-md) var(--space-lg)', 
            width: '100%', 
            maxWidth: '480px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-color)',
            fontSize: 'var(--font-size-base)',
            marginBottom: 'var(--space-lg)'
          }} 
          onKeyDown={e => {
            if (e.key === 'Enter' && draftGoal.trim()) {
              setIntent(draftGoal.trim());
              setDraftGoal('');
            }
          }}
        />
        <button 
          className="btn btn-primary" 
          style={{ padding: 'var(--space-md) var(--space-xl)' }}
          onClick={() => {
            if (draftGoal.trim()) {
              setIntent(draftGoal.trim());
              setDraftGoal('');
            }
          }}
        >
          Start Focus
        </button>
      </div>
    );
  }

  return (
    <div className="page-container fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
      <div className="card-title" style={{ marginBottom: 'var(--space-xl)' }}>CURRENT INTENT</div>
      
      <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-xl)' }}>
        {intent.description}
      </h2>
      
      <div style={{ fontSize: '4rem', fontWeight: 300, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginBottom: 'var(--space-sm)' }}>
        {formatElapsed(elapsed)}
      </div>
      
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2xl)' }}>
        Focused time
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--accent-success)', fontWeight: 500, marginBottom: 'var(--space-2xl)' }}>
        ● On Track
      </div>
      
      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <button className="btn btn-secondary" onClick={clearIntent}>End Focus</button>
        <button className="btn btn-secondary" onClick={() => {
          const goal = window.prompt('Enter your new goal:', intent.description);
          if (goal && goal.trim()) setIntent(goal.trim());
        }}>Change Goal</button>
      </div>
    </div>
  );
}
