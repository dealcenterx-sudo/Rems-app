import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { useToast } from './Toast';

// Icons
const UserIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const LockIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const BuildingIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
    <path d="M9 22v-4h6v4"/>
    <path d="M8 6h.01"/>
    <path d="M16 6h.01"/>
    <path d="M12 6h.01"/>
    <path d="M12 10h.01"/>
    <path d="M12 14h.01"/>
    <path d="M16 10h.01"/>
    <path d="M16 14h.01"/>
    <path d="M8 10h.01"/>
    <path d="M8 14h.01"/>
  </svg>
);

const BellIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const ConnectorIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 1 0-7.07-7.07L10.6 5.34"/>
    <path d="M14 11a5 5 0 0 0-7.07 0l-1.41 1.41a5 5 0 1 0 7.07 7.07l.81-.82"/>
  </svg>
);

const SettingsPage = () => {
  const toast = useToast();
  const [activeSection, setActiveSection] = useState('profile');
  const [profileData, setProfileData] = useState({
    displayName: '',
    email: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (auth.currentUser) {
      setProfileData({
        displayName: auth.currentUser.displayName || '',
        email: auth.currentUser.email || ''
      });
    }
  }, []);

  const handleUpdateProfile = async () => {
    if (!profileData.displayName) {
      toast.error('Display name is required');
      return;
    }

    setSaving(true);

    try {
      await updateProfile(auth.currentUser, {
        displayName: profileData.displayName
      });

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!profileData.email) {
      toast.error('Email is required');
      return;
    }

    setSaving(true);

    try {
      await updateEmail(auth.currentUser, profileData.email);
      toast.success('Email updated successfully! Please verify your new email.');
    } catch (error) {
      console.error('Error updating email:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please sign out and sign in again before changing your email.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);

    try {
      await updatePassword(auth.currentUser, passwordData.newPassword);
      toast.success('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please sign out and sign in again before changing your password.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'security', label: 'Security', icon: LockIcon },
    { id: 'company', label: 'Company', icon: BuildingIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'connector', label: 'Connector', icon: ConnectorIcon }
  ];

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff', margin: '0 0 5px 0' }}>
          Settings
        </h2>
        <p style={{ fontSize: '13px', color: '#888888', margin: 0 }}>
          Manage your account and preferences
        </p>
      </div>

      {/* Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '30px' }}>
        {/* Sidebar Navigation */}
        <div className="card-surface" style={{ height: 'fit-content' }}>
          {sections.map(section => (
            <div
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 15px',
                borderRadius: '4px',
                marginBottom: '5px',
                cursor: 'pointer',
                background: activeSection === section.id ? '#0f0f0f' : 'transparent',
                border: activeSection === section.id ? '1px solid #0088ff' : '1px solid transparent',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (activeSection !== section.id) {
                  e.currentTarget.style.background = '#0f0f0f';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== section.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <section.icon size={18} color={activeSection === section.id ? '#0088ff' : '#888888'} />
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: activeSection === section.id ? '#ffffff' : '#888888'
              }}>
                {section.label}
              </span>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="card-surface" style={{ padding: '30px' }}>
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', marginBottom: '20px' }}>
                Profile Information
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px' }}>
                <div className="form-field">
                  <label>Display Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={profileData.displayName}
                    onChange={(e) => setProfileData({...profileData, displayName: e.target.value})}
                  />
                </div>

                <div className="form-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  />
                  <div style={{ fontSize: '11px', color: '#666666', marginTop: '5px' }}>
                    Changing your email requires re-authentication
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? 'Saving...' : 'Update Profile'}
                  </button>

                  {profileData.email !== auth.currentUser?.email && (
                    <button
                      onClick={handleUpdateEmail}
                      disabled={saving}
                      className="btn-secondary"
                    >
                      {saving ? 'Updating...' : 'Update Email'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', marginBottom: '20px' }}>
                Change Password
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px' }}>
                <div className="form-field">
                  <label>New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  />
                </div>

                <div className="form-field">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  />
                </div>

                <button
                  onClick={handleUpdatePassword}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          )}

          {/* Company Section */}
          {activeSection === 'company' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', marginBottom: '20px' }}>
                Company Settings
              </h3>

              <div className="empty-state-card">
                <BuildingIcon size={48} color="#666666" />
                <div className="empty-state-title">Company settings</div>
                <div className="empty-state-subtitle">Company management features coming soon</div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', marginBottom: '20px' }}>
                Notification Preferences
              </h3>

              <div className="empty-state-card">
                <BellIcon size={48} color="#666666" />
                <div className="empty-state-title">Notifications</div>
                <div className="empty-state-subtitle">Notification settings coming soon</div>
              </div>
            </div>
          )}

          {activeSection === 'connector' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', marginBottom: '20px' }}>
                Connector Settings
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div className="card-surface" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Lead Delivery
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '8px' }}>
                    XML Push + API Routing
                  </div>
                  <div style={{ fontSize: '13px', color: '#888888', lineHeight: '1.6' }}>
                    Configure inbound lead feeds, XML endpoints, API authentication, and partner delivery routing from Settings.
                  </div>
                </div>

                <div className="card-surface" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Status
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid #1a3c2a', background: '#0b1710', color: '#00ff88', borderRadius: '999px', padding: '8px 12px', fontSize: '12px', fontWeight: '700' }}>
                    Admin Setup Pending
                  </div>
                  <div style={{ fontSize: '13px', color: '#888888', lineHeight: '1.6', marginTop: '12px' }}>
                    This area is ready to become the central place for compliant connector configuration.
                  </div>
                </div>
              </div>

              <div className="empty-state-card">
                <ConnectorIcon size={48} color="#666666" />
                <div className="empty-state-title">Connector moved to Settings</div>
                <div className="empty-state-subtitle">
                  XML push and API lead communication settings will be managed here instead of the CRM tab.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
