import { canUserAccess, canUserManageProperty, getEditableFields, canEditField, ALL_FIELDS } from './permissions';
import { ADMIN_EMAIL } from '../config';

// helpers.js pulls auth from firebase; keep the SDK out of unit tests
jest.mock('../firebase', () => ({
  auth: { currentUser: null },
  db: {}
}));

const admin = { userId: 'admin-1', email: ADMIN_EMAIL, role: 'admin', assignedProperties: [] };
const agent = { userId: 'agent-1', email: 'agent@example.com', role: 'agent', assignedProperties: ['prop-9'] };
const buyer = { userId: 'buyer-1', email: 'buyer@example.com', role: 'buyer', assignedProperties: ['prop-9'] };

describe('canUserAccess', () => {
  it('admin can access any resource', () => {
    expect(canUserAccess(admin, { userId: 'someone-else' })).toBe(true);
  });

  it('admin email counts even without the admin role', () => {
    const legacyAdmin = { ...admin, role: 'agent' };
    expect(canUserAccess(legacyAdmin, { userId: 'someone-else' })).toBe(true);
  });

  it('owner can access their own resource', () => {
    expect(canUserAccess(agent, { userId: 'agent-1' })).toBe(true);
  });

  it('non-owner is denied', () => {
    expect(canUserAccess(agent, { userId: 'other-agent' })).toBe(false);
  });

  it('denies on missing user or resource', () => {
    expect(canUserAccess(null, { userId: 'agent-1' })).toBe(false);
    expect(canUserAccess(agent, null)).toBe(false);
  });
});

describe('canUserManageProperty', () => {
  it('admin manages any property', () => {
    expect(canUserManageProperty(admin, { id: 'prop-1', userId: 'x' })).toBe(true);
  });

  it('listing owner manages their property', () => {
    expect(canUserManageProperty(agent, { id: 'prop-1', userId: 'agent-1' })).toBe(true);
  });

  it('assigned user manages an assigned property', () => {
    expect(canUserManageProperty(agent, { id: 'prop-9', userId: 'other' })).toBe(true);
  });

  it('unassigned non-owner is denied', () => {
    expect(canUserManageProperty(agent, { id: 'prop-2', userId: 'other' })).toBe(false);
  });

  it('handles missing assignedProperties gracefully', () => {
    const bare = { userId: 'u1', role: 'agent' };
    expect(canUserManageProperty(bare, { id: 'prop-1', userId: 'other' })).toBe(false);
  });
});

describe('getEditableFields', () => {
  it('admin gets full access marker', () => {
    expect(getEditableFields(admin, 'lead')).toEqual([ALL_FIELDS]);
  });

  it('agent gets lead fields', () => {
    expect(getEditableFields(agent, 'lead')).toContain('notes');
    expect(getEditableFields(agent, 'property')).toContain('listPrice');
  });

  it('buyer and seller get nothing', () => {
    expect(getEditableFields(buyer, 'lead')).toEqual([]);
    expect(getEditableFields(buyer, 'property')).toEqual([]);
  });

  it('unknown role or resource gets nothing', () => {
    expect(getEditableFields({ userId: 'x', role: 'mystery' }, 'lead')).toEqual([]);
    expect(getEditableFields(agent, 'unknown-type')).toEqual([]);
    expect(getEditableFields(null, 'lead')).toEqual([]);
  });
});

describe('canEditField', () => {
  it('admin can edit any field', () => {
    expect(canEditField(admin, 'lead', 'anything-at-all')).toBe(true);
  });

  it('agent can edit listed fields only', () => {
    expect(canEditField(agent, 'lead', 'notes')).toBe(true);
    expect(canEditField(agent, 'lead', 'userId')).toBe(false);
  });

  it('buyer cannot edit anything', () => {
    expect(canEditField(buyer, 'lead', 'notes')).toBe(false);
  });
});
