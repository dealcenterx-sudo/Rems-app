import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, orderBy, query, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useToast } from './Toast';
import { logActivity } from '../utils/auditLog';
import { notifyUsers } from '../utils/notifications';

const ROLES = ['agent', 'admin', 'buyer', 'seller'];

const roleBadgeColor = (role) => {
  if (role === 'admin') return 'var(--accent)';
  if (role === 'agent') return 'var(--info)';
  return 'var(--text-muted-2)';
};

const propertyLabel = (property) => {
  const address = typeof property.address === 'string'
    ? property.address
    : property.address?.street;
  const city = property.city || property.address?.city;
  return [address, city].filter(Boolean).join(', ') || `Property ${property.id.slice(0, 6)}`;
};

const UserManagement = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [expandedSection, setExpandedSection] = useState('properties');
  const [deals, setDeals] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersSnap, propertiesSnap, dealsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'properties'), orderBy('createdAt', 'desc'), limit(200))),
        getDocs(query(collection(db, 'deals'), orderBy('createdAt', 'desc'), limit(200)))
      ]);
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setProperties(propertiesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setDeals(dealsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRoleChange = async (user, newRole) => {
    setSavingUserId(user.id);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
      toast.success(`${user.email} is now ${newRole}`);
      logActivity('role_changed', 'user', user.id,
        `Role of ${user.email} changed to ${newRole}`,
        { field: 'role', oldValue: user.role || 'agent', newValue: newRole });
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleToggleAssignment = async (user, field, itemId, isAssigned) => {
    setSavingUserId(user.id);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        [field]: isAssigned ? arrayRemove(itemId) : arrayUnion(itemId),
        updatedAt: new Date().toISOString()
      });

      if (field === 'assignedDeals') {
        // Mirror onto the deal so portal actions can notify participants.
        await updateDoc(doc(db, 'deals', itemId), {
          participantIds: isAssigned ? arrayRemove(user.id) : arrayUnion(user.id),
          updatedAt: new Date().toISOString()
        }).catch((error) => {
          console.error('Failed to mirror participantIds:', error);
          toast.error('Deal assignment saved, but portal notifications may not reach this user — toggle the deal off and on to retry.');
        });

        if (!isAssigned) {
          const deal = deals.find((d) => d.id === itemId);
          notifyUsers([user.id], {
            type: 'deal-shared',
            title: 'A deal was shared with you',
            body: deal?.propertyAddress ? `You now have portal access to "${deal.propertyAddress}".` : 'Open Deals to view it.',
            dealId: itemId
          });
        }
      }
      setUsers((prev) => prev.map((u) => {
        if (u.id !== user.id) return u;
        const current = Array.isArray(u[field]) ? u[field] : [];
        return {
          ...u,
          [field]: isAssigned
            ? current.filter((id) => id !== itemId)
            : [...current, itemId]
        };
      }));
      logActivity(isAssigned ? 'unassigned' : 'assigned', 'user', user.id,
        `${field === 'assignedDeals' ? 'Deal' : 'Property'} ${itemId} ${isAssigned ? 'removed from' : 'assigned to'} ${user.email}`,
        { field, entityId: itemId });
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    } finally {
      setSavingUserId(null);
    }
  };

  const dealLabel = (deal) =>
    [deal.propertyAddress, deal.status ? `(${deal.status})` : '']
      .filter(Boolean).join(' ') || `Deal ${deal.id.slice(0, 6)}`;

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
        <div style={{ fontSize: '13px', color: 'var(--text-muted-2)' }}>
          {users.length} user{users.length === 1 ? '' : 's'}
        </div>
        <button onClick={loadData} className="btn-secondary btn-sm">Refresh</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {users.map((user) => {
          const isSelf = user.id === auth.currentUser?.uid;
          const assigned = Array.isArray(user.assignedProperties) ? user.assignedProperties : [];
          const assignedDeals = Array.isArray(user.assignedDeals) ? user.assignedDeals : [];
          const isExpanded = expandedUserId === user.id;
          const isSaving = savingUserId === user.id;

          return (
            <div key={user.id} className="card-surface" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: '220px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)' }}>
                    {user.displayName || user.email || user.id}
                    {isSelf && <span style={{ fontSize: '11px', color: 'var(--accent)', marginLeft: '8px' }}>(you)</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted-2)', marginTop: '2px' }}>{user.email}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: roleBadgeColor(user.role),
                    border: `1px solid ${roleBadgeColor(user.role)}40`,
                    borderRadius: '999px',
                    padding: '4px 10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {user.role || 'agent'}
                  </span>

                  <select
                    value={user.role || 'agent'}
                    onChange={(e) => handleRoleChange(user, e.target.value)}
                    disabled={isSelf || isSaving}
                    title={isSelf ? 'You cannot change your own role' : 'Change role'}
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--skeleton-highlight)',
                      borderRadius: '4px',
                      color: isSelf ? 'var(--gray-555)' : 'var(--white)',
                      padding: '8px 10px',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      cursor: isSelf ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => { setExpandedUserId(isExpanded && expandedSection === 'properties' ? null : user.id); setExpandedSection('properties'); }}
                    className="btn-secondary btn-sm"
                  >
                    Properties ({assigned.length}) {isExpanded && expandedSection === 'properties' ? '▴' : '▾'}
                  </button>
                  <button
                    onClick={() => { setExpandedUserId(isExpanded && expandedSection === 'deals' ? null : user.id); setExpandedSection('deals'); }}
                    className="btn-secondary btn-sm"
                  >
                    Deals ({assignedDeals.length}) {isExpanded && expandedSection === 'deals' ? '▴' : '▾'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '15px', borderTop: '1px solid var(--skeleton-highlight)', paddingTop: '15px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted-2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    {expandedSection === 'deals' ? 'Assigned Deals (deal portal access)' : 'Assigned Properties'}
                  </div>
                  {(expandedSection === 'deals' ? deals : properties).length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-faint)' }}>
                      No {expandedSection === 'deals' ? 'deals' : 'properties'} available
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                      {(expandedSection === 'deals' ? deals : properties).map((item) => {
                        const isDeals = expandedSection === 'deals';
                        const isAssigned = (isDeals ? assignedDeals : assigned).includes(item.id);
                        return (
                          <label
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '13px',
                              color: isAssigned ? 'var(--white)' : 'var(--text-muted-2)',
                              cursor: isSaving ? 'wait' : 'pointer',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              background: isAssigned ? '#00ff8810' : 'transparent',
                              border: isAssigned ? '1px solid #00ff8830' : '1px solid transparent'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              disabled={isSaving}
                              onChange={() => handleToggleAssignment(
                                user,
                                isDeals ? 'assignedDeals' : 'assignedProperties',
                                item.id,
                                isAssigned
                              )}
                            />
                            {isDeals ? dealLabel(item) : propertyLabel(item)}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserManagement;
