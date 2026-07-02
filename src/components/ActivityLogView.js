import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from './Toast';

const ACTION_COLORS = {
  created: 'var(--accent)',
  deleted: 'var(--danger)',
  status_changed: 'var(--info)',
  role_changed: 'var(--warning)',
  assigned: 'var(--accent)',
  unassigned: 'var(--warning)',
  signed: 'var(--accent)'
};

const formatWhen = (iso) => {
  if (!iso) return '—';
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
};

// Admin-only viewer for the append-only activity_log audit trail.
const ActivityLogView = () => {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'activity_log'), orderBy('createdAt', 'desc'), limit(100))
      );
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error loading activity log:', error);
      toast.error('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', color: '#888888' }}>
          Last {entries.length} events · log entries are permanent and cannot be edited
        </div>
        <button onClick={loadEntries} className="btn-secondary btn-sm">Refresh</button>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-title">No activity yet</div>
          <div className="empty-state-subtitle">
            Deal status changes, deletions, and role/assignment changes are recorded here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="card-surface"
              style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}
            >
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: ACTION_COLORS[entry.action] || 'var(--text-muted)',
                border: `1px solid currentColor`,
                borderRadius: '999px',
                padding: '3px 10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
                opacity: 0.9
              }}>
                {(entry.action || 'event').replace('_', ' ')}
              </span>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ fontSize: '13px', color: '#ffffff' }}>{entry.description || `${entry.entity} ${entry.entityId}`}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>
                  {entry.userEmail || entry.userId} · {formatWhen(entry.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityLogView;
