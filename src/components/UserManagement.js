import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, orderBy, query, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useToast } from './Toast';

const ROLES = ['agent', 'admin', 'buyer', 'seller'];

const roleBadgeColor = (role) => {
  if (role === 'admin') return '#00ff88';
  if (role === 'agent') return '#0088ff';
  return '#888888';
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersSnap, propertiesSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'properties'), orderBy('createdAt', 'desc'), limit(200)))
      ]);
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setProperties(propertiesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleToggleProperty = async (user, propertyId, isAssigned) => {
    setSavingUserId(user.id);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        assignedProperties: isAssigned ? arrayRemove(propertyId) : arrayUnion(propertyId),
        updatedAt: new Date().toISOString()
      });
      setUsers((prev) => prev.map((u) => {
        if (u.id !== user.id) return u;
        const current = Array.isArray(u.assignedProperties) ? u.assignedProperties : [];
        return {
          ...u,
          assignedProperties: isAssigned
            ? current.filter((id) => id !== propertyId)
            : [...current, propertyId]
        };
      }));
    } catch (error) {
      console.error('Error updating assigned properties:', error);
      toast.error('Failed to update property assignment');
    } finally {
      setSavingUserId(null);
    }
  };

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
          {users.length} user{users.length === 1 ? '' : 's'}
        </div>
        <button onClick={loadData} className="btn-secondary btn-sm">Refresh</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {users.map((user) => {
          const isSelf = user.id === auth.currentUser?.uid;
          const assigned = Array.isArray(user.assignedProperties) ? user.assignedProperties : [];
          const isExpanded = expandedUserId === user.id;
          const isSaving = savingUserId === user.id;

          return (
            <div key={user.id} className="card-surface" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: '220px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                    {user.displayName || user.email || user.id}
                    {isSelf && <span style={{ fontSize: '11px', color: '#00ff88', marginLeft: '8px' }}>(you)</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888888', marginTop: '2px' }}>{user.email}</div>
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
                      background: '#0a0a0a',
                      border: '1px solid #1a1a1a',
                      borderRadius: '4px',
                      color: isSelf ? '#555555' : '#ffffff',
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
                    onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                    className="btn-secondary btn-sm"
                  >
                    Properties ({assigned.length}) {isExpanded ? '▴' : '▾'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '15px', borderTop: '1px solid #1a1a1a', paddingTop: '15px' }}>
                  <div style={{ fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Assigned Properties
                  </div>
                  {properties.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#666666' }}>No properties available</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                      {properties.map((property) => {
                        const isAssigned = assigned.includes(property.id);
                        return (
                          <label
                            key={property.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '13px',
                              color: isAssigned ? '#ffffff' : '#888888',
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
                              onChange={() => handleToggleProperty(user, property.id, isAssigned)}
                            />
                            {propertyLabel(property)}
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
