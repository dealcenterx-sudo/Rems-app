import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { getDocs, updateDoc } from 'firebase/firestore';
import { isAdminUser } from '../utils/helpers';
import { ToastProvider } from './Toast';
import TasksPage from './TasksPage';

// Firestore stubs: collection/query/where/orderBy/limit/startAfter/doc are
// identity/no-op; getDocs + updateDoc are jest.fns we drive per test to
// simulate the initial load and the optimistic-toggle write.
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, name) => ({ __collection: name })),
  query: jest.fn((...args) => args),
  where: jest.fn((field, op, value) => ({ __where: [field, op, value] })),
  orderBy: jest.fn((field, dir) => ({ __orderBy: [field, dir] })),
  limit: jest.fn((n) => ({ __limit: n })),
  startAfter: jest.fn((cursor) => ({ __startAfter: cursor })),
  doc: jest.fn((_db, coll, id) => ({ __doc: [coll, id] })),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn()
}));

// db is any object; auth.currentUser.uid drives the userId-scoped branch (unused
// here because we force admin).
jest.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid' } }
}));

// Force the admin branch so loadTasks fires a single unscoped tasks query.
jest.mock('../utils/helpers', () => {
  const actual = jest.requireActual('../utils/helpers');
  return { ...actual, isAdminUser: jest.fn(() => true) };
});

const PENDING_TASK = {
  id: 'task-1',
  title: 'Call the seller',
  status: 'pending',
  priority: 'high',
  type: 'call',
  dueDate: '2099-01-01',
  completedDate: null,
  assignedToName: 'Agent Smith'
};

// A tasks snapshot shaped like a Firestore QuerySnapshot: `.docs` is an array
// of `{ id, data() }` (loadTasks slices `.docs`).
const makeTasksSnapshot = (tasks) => ({
  docs: tasks.map((t) => ({ id: t.id, data: () => t })),
  forEach(cb) {
    this.docs.forEach(cb);
  }
});

const renderTasksPage = () =>
  render(
    <ToastProvider>
      <TasksPage globalSearch="" onSearchChange={() => {}} />
    </ToastProvider>
  );

describe('TasksPage optimistic toggle (UI-06, D-12/D-13)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isAdminUser.mockReturnValue(true);
    getDocs.mockResolvedValue(makeTasksSnapshot([PENDING_TASK]));
  });

  it('updates the toggle optimistically before the write resolves', async () => {
    // updateDoc stays pending so we can observe the optimistic state.
    let resolveWrite;
    updateDoc.mockImplementation(() => new Promise((res) => { resolveWrite = res; }));

    renderTasksPage();

    const toggle = await screen.findByRole('button', { name: 'Mark task complete' });
    fireEvent.click(toggle);

    // Optimistic: the control flips to the completed state immediately, while
    // the write is still in flight (no await on the success path).
    expect(
      await screen.findByRole('button', { name: 'Mark task incomplete' })
    ).toBeInTheDocument();

    resolveWrite();
  });

  it('reverts the toggle and shows a mapped error toast when the write fails', async () => {
    updateDoc.mockRejectedValue(Object.assign(new Error('nope'), { code: 'permission-denied' }));

    renderTasksPage();

    const toggle = await screen.findByRole('button', { name: 'Mark task complete' });
    const callsBefore = getDocs.mock.calls.length;
    fireEvent.click(toggle);

    // Silent revert: the control returns to its prior (incomplete) state.
    expect(
      await screen.findByRole('button', { name: 'Mark task complete' })
    ).toBeInTheDocument();

    // One error toast, copy sourced from errorMessages (message + recovery),
    // never the raw SDK message.
    expect(await screen.findByText(/You do not have access to this\./)).toBeInTheDocument();
    expect(screen.queryByText(/nope/)).not.toBeInTheDocument();

    // Rollback is state-only — no Firestore reload was triggered.
    expect(getDocs.mock.calls.length).toBe(callsBefore);
  });

  it('does not reload tasks from Firestore on the success hot path', async () => {
    updateDoc.mockResolvedValue(undefined);

    renderTasksPage();

    const toggle = await screen.findByRole('button', { name: 'Mark task complete' });
    const callsBefore = getDocs.mock.calls.length;
    fireEvent.click(toggle);

    expect(
      await screen.findByRole('button', { name: 'Mark task incomplete' })
    ).toBeInTheDocument();

    // The optimistic state is authoritative until the next natural load; the
    // old anti-optimistic loadData() reload must be gone.
    expect(getDocs.mock.calls.length).toBe(callsBefore);
  });
});
