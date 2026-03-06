import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Bell, User, Search, Settings, LogOut } from './Icons';
import { NAV_ITEMS } from './Icons';

// Sidebar Component
const Sidebar = ({ activeTab, setActiveTab }) => {

  return (
    <div className="sidebar">
      <div className="logo">
        <img src="/dealcenter-logo.png" alt="DealCenter" className="logo-image" />
      </div>
      <div className="nav-items">
        {NAV_ITEMS.slice(0, -1).map((item) => (
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
  return (
    <div className="bottom-nav">
      <div className="bottom-nav-inner">
        {NAV_ITEMS.map((item) => (
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
const TopBar = ({ title, searchQuery, onSearchChange, showSearch }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);

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
            onClick={() => setShowNotifications((prev) => !prev)}
            title="Notifications"
          >
            <Bell size={18} color="#888888" />
          </button>
          {showNotifications && (
            <div className="notification-panel">
              <div className="notification-header">Notifications</div>
              <div className="notification-empty">No notifications yet.</div>
              <div className="notification-footer">You are all caught up.</div>
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
