import { NAV_ITEMS, EXTERNAL_ROLE_NAV_IDS, isExternalRole, getNavItemsForRole } from './Icons';

describe('isExternalRole', () => {
  it('buyer and seller are external', () => {
    expect(isExternalRole('buyer')).toBe(true);
    expect(isExternalRole('seller')).toBe(true);
  });

  it('agent, admin, and missing roles are internal', () => {
    expect(isExternalRole('agent')).toBe(false);
    expect(isExternalRole('admin')).toBe(false);
    expect(isExternalRole(undefined)).toBe(false);
    expect(isExternalRole(null)).toBe(false);
  });
});

describe('getNavItemsForRole', () => {
  it('buyers and sellers only get client-facing tabs', () => {
    for (const role of ['buyer', 'seller']) {
      const ids = getNavItemsForRole(role).map((item) => item.id);
      expect(ids).toEqual(expect.arrayContaining(['home', 'deals', 'properties', 'settings']));
      expect(ids).not.toContain('crm');
      expect(ids).not.toContain('analytics');
      expect(ids).not.toContain('contacts');
      expect(ids).not.toContain('documents');
      expect(ids).not.toContain('websites');
      expect(ids).not.toContain('tasks');
    }
  });

  it('agents and admin get the full workspace', () => {
    expect(getNavItemsForRole('agent')).toEqual(NAV_ITEMS);
    expect(getNavItemsForRole('admin')).toEqual(NAV_ITEMS);
  });

  it('unknown or missing role defaults to the full workspace (userDoc still loading)', () => {
    expect(getNavItemsForRole(undefined)).toEqual(NAV_ITEMS);
  });

  it('every external nav id exists in NAV_ITEMS', () => {
    const allIds = NAV_ITEMS.map((item) => item.id);
    for (const id of EXTERNAL_ROLE_NAV_IDS) {
      expect(allIds).toContain(id);
    }
  });
});
