import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { getDocs } from 'firebase/firestore';
import { captureError } from '../utils/observability';
import { isAdminUser } from '../utils/helpers';
import { ToastProvider } from './Toast';
import AnalyticsDashboard from './AnalyticsDashboard';

// Mock the observability bridge so the test asserts on captureError without
// pulling @sentry/react into the component test at all (never auto-mock
// @sentry/react — its export shape breaks jest auto-mock; see
// observability.test.js). This mirrors ErrorBoundary.test.js exactly.
jest.mock('../utils/observability', () => ({
  captureError: jest.fn()
}));

// Firestore stubs: collection/query/where/orderBy are identity/no-op; getDocs
// is the jest.fn we drive per-call to simulate the missing-index fallback.
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, name) => ({ __collection: name })),
  query: jest.fn((...args) => args),
  where: jest.fn((field, op, value) => ({ __where: [field, op, value] })),
  orderBy: jest.fn((field, dir) => ({ __orderBy: [field, dir] })),
  getDocs: jest.fn()
}));

// db is any object; auth.currentUser.uid drives the userId-scoped branch.
jest.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid' } }
}));

// Force the non-admin, userId-scoped fallback branch (userScoped: true).
jest.mock('../utils/helpers', () => ({
  isAdminUser: jest.fn(() => false)
}));

// Keep render light — recharts is heavy and irrelevant to the fallback path.
jest.mock('recharts', () => {
  const Stub = () => null;
  return {
    BarChart: Stub, Bar: Stub, LineChart: Stub, Line: Stub,
    PieChart: Stub, Pie: Stub, Cell: Stub, XAxis: Stub, YAxis: Stub,
    CartesianGrid: Stub, Tooltip: Stub, Legend: Stub,
    ResponsiveContainer: Stub
  };
});

describe('AnalyticsDashboard missing-index fallback (DATA-02)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isAdminUser.mockReturnValue(false);
  });

  it('reports the missing-index fallback loudly via captureError and still returns data', async () => {
    const indexError = Object.assign(
      new Error('The query requires an index.'),
      { code: 'failed-precondition' }
    );

    const resolvedSnapshot = {
      docs: [
        {
          id: 'd1',
          data: () => ({ createdAt: new Date().toISOString(), status: 'active' })
        }
      ]
    };

    // loadAllData loads deals AND properties via Promise.all → getDocs fires
    // THREE times: (1) deals-initial [REJECT], (2) properties-initial [resolve],
    // (3) deals-fallback refetch [resolve]. Only call #1 rejects; every later
    // call resolves persistently via mockResolvedValue (a single
    // mockResolvedValueOnce would leave call #3 undefined → snapshot.docs throws).
    getDocs
      .mockRejectedValueOnce(indexError)
      .mockResolvedValue(resolvedSnapshot);

    render(
      <ToastProvider>
        <AnalyticsDashboard />
      </ToastProvider>
    );

    // The load runs in a useEffect, so wait for the async work to settle.
    await waitFor(() => {
      expect(captureError).toHaveBeenCalledTimes(1);
    });

    // The fallback is loud: captureError carries the analytics-index-fallback
    // tag and the collection name (T-05A-01 — no userId value, no query data).
    const [reportedError, context] = captureError.mock.calls[0];
    expect(reportedError).toBe(indexError);
    expect(context).toEqual(
      expect.objectContaining({
        feature: 'analytics-index-fallback',
        collectionName: 'deals'
      })
    );
    // Scope is preserved on the refetch (T-05A-02 — never broadened).
    expect(context.userScoped).toBe(true);

    // Graceful degradation: after reporting, the equality-only refetch runs
    // (a THIRD getDocs call) so data still resolves.
    await waitFor(() => {
      expect(getDocs).toHaveBeenCalledTimes(3);
    });
  });
});
