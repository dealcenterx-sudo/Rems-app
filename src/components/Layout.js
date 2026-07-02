import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, limit, doc, updateDoc } from 'firebase/firestore';
import { Bell, User, Search, Settings, LogOut } from './Icons';
import { getNavItemsForRole } from './Icons';
import useUserDoc from '../utils/useUserDoc';

// Sidebar Component
const Sidebar = ({ activeTab, setActiveTab }) => {
  const { userDoc } = useUserDoc();
  const navItems = getNavItemsForRole(userDoc?.role);

  return (
    <div className="sidebar">
      <div className="logo">
        <img src="/dealcenter-logo.png" alt="DealCenter" className="logo-image" />
      </div>
      <div className="nav-items">
        {navItems.filter((item) => item.id !== 'settings').map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            title={item.label}
          >
            <item.icon size={20} color={activeTab === item.id ? '#00ff88' : '#888888'} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div
        onClick={() => setActiveTab('settings')}
        className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
        title="Settings"
      >
        <Settings size={20} color={activeTab === 'settings' ? '#00ff88' : '#888888'} />
        <span>Settings</span>
      </div>

    </div>
  );
};

// Bottom Nav for Mobile
const BottomNav = ({ activeTab, setActiveTab }) => {
  const { userDoc } = useUserDoc();
  const navItems = getNavItemsForRole(userDoc?.role);

  return (
    <div className="bottom-nav">
      <div className="bottom-nav-inner">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`bottom-nav-item ${activeTab === item.id ? 'active' : ''}`}
          >
            <item.icon size={18} color={activeTab === item.id ? '#00ff88' : '#888888'} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Top Bar Component
const formatNotificationTime = (iso) => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  const diffMinutes = Math.floor((Date.now() - parsed.getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 60 * 24) return `${Math.floor(diffMinutes / 60)}h ago`;
  return parsed.toLocaleDateString();
};

const TopBar = ({ title, searchQuery, onSearchChange, showSearch }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      // Equality-only filter avoids composite index requirements; sort client-side.
      const snap = await getDocs(
        query(collection(db, 'notifications'), where('recipientId', '==', uid), limit(50))
      );
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 20);
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleToggleNotifications = async () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (!opening) return;
    await loadNotifications();
    // Mark everything read once seen; badge clears immediately.
    setUnreadCount(0);
    notifications
      .filter((n) => !n.read)
      .forEach((n) =>
        updateDoc(doc(db, 'notifications', n.id), { read: true }).catch(() => {})
      );
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const date = now.getDate();
    const year = now.getFullYear();

    return `${dayName}, ${monthName} ${date}, ${year}`;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <h1>{title}</h1>
        <span className="date-time">{getCurrentDateTime()}</span>
      </div>
      <div className="top-bar-right">
        {showSearch && (
          <div className="search-box">
            <Search size={18} color="#666666" />
            <input
              type="text"
              placeholder="Search current page..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        <div className="notification-wrapper" ref={notificationsRef}>
          <button
            type="button"
            className="btn-icon"
            onClick={handleToggleNotifications}
            title="Notifications"
            style={{ position: 'relative' }}
          >
            <Bell size={18} color={unreadCount > 0 ? '#00ff88' : '#888888'} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                minWidth: '16px',
                height: '16px',
                borderRadius: '8px',
                background: 'var(--accent)',
                color: '#000000',
                fontSize: '10px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="notification-panel">
              <div className="notification-header">Notifications</div>
              {notifications.length === 0 ? (
                <div className="notification-empty">No notifications yet.</div>
              ) : (
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: n.read ? 'transparent' : 'var(--accent-soft)'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#ffffff' }}>
                        {n.title}
                      </div>
                      {n.body && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' }}>
                        {formatNotificationTime(n.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="notification-footer">
                {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}
              </div>
            </div>
          )}
        </div>
        <div className="user-profile" style={{ position: 'relative' }}>
          <div className="user-avatar">
            <User size={18} color="#00ff88" />
          </div>
          <span>{auth.currentUser?.email || 'Admin'}</span>
          <button
            onClick={() => signOut(auth)}
            className="btn-ghost"
            title="Sign Out"
          >
            <LogOut size={16} color="#888888" />
          </button>
        </div>
      </div>
    </div>
  );
};

export { Sidebar, BottomNav, TopBar };
