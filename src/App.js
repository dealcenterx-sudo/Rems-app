import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { db } from './firebase';
import DealsDashboard from './components/DealsDashboard';
import ActiveDealsPage from './components/ActiveDealsPage';
import ClosedDealsPage from './components/ClosedDealsPage';
import PropertiesPage from './components/PropertiesPage';
import CRMDashboard from './components/CRMDashboard';
import TasksPage from './components/TasksPage';
import SettingsPage from './components/SettingsPage';
import DocumentsPage from './components/DocumentsPage';
import WebsitesPage from './components/WebsitesPage';
import { ToastProvider, useToast } from './components/Toast';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { auth, googleProvider } from './firebase';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';


// Icon Components
const Home = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const TrendingUp = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
);

const Users = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const FileText = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const Building2 = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
    <path d="M10 6h4"/>
    <path d="M10 10h4"/>
    <path d="M10 14h4"/>
    <path d="M10 18h4"/>
  </svg>
);

const Globe = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const Settings = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const UserPlus = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/>
    <line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
);

const ShoppingCart = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/>
    <circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const Key = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="m21 2-9.6 9.6"/>
    <path d="m15.5 7.5 3 3L22 7l-3-3"/>
  </svg>
);

const Bell = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  </svg>
);

const User = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const Search = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const Check = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const List = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const Plus = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const BarChart = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10"/>
    <line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
);

const CheckSquare = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);

const ClipboardCheck = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <path d="m9 14 2 2 4-4"/>
  </svg>
);

const FilePlus = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);

const FolderIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const BuyerIcon = ({ size = 80, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const SellerIcon = ({ size = 80, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const PropertyIcon = ({ size = 80, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const LogOut = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// Unused Lock icon component removed

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'crm', label: 'CRM', icon: TrendingUp },
  { id: 'analytics', label: 'Analytics', icon: BarChart },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'buyers', label: 'Buyers', icon: UserPlus },
  { id: 'deals', label: 'Deals', icon: FileText },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'tasks', label: 'Tasks', icon: ClipboardCheck },
  { id: 'documents', label: 'Documents', icon: FolderIcon },
  { id: 'websites', label: 'Websites', icon: Globe },
  { id: 'settings', label: 'Settings', icon: Settings }
];

// Sidebar Component
const Sidebar = ({ activeTab, setActiveTab }) => {

  return (
    <div className="sidebar">
      <div className="logo">
        <span className="logo-mark">R</span>
        <span className="logo-text">REMS</span>
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
            <Search size={16} color="#666666" />
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
            <User size={16} color="#00ff88" />
          </div>
          <span>{auth.currentUser?.email || 'Admin'}</span>
          <button
            onClick={() => signOut(auth)}
            className="btn-ghost"
            title="Sign Out"
          >
            <LogOut size={14} color="#888888" />
          </button>
        </div>
      </div>
    </div>
  );
};

// HOME PAGE - WITH LIVE FIREBASE DATA
const HomePage = ({ onNavigateToContacts }) => {
  const [stats, setStats] = useState({
    totalContacts: 0,
    totalSellers: 0,
    totalBuyers: 0,
    activeBuyers: 0,
    totalDeals: 0,
    activeDeals: 0,
    flippers: 0,
    builders: 0,
    holders: 0,
    totalTasks: 0
  });
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load all data from Firebase
  React.useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';
        
        // Load contacts
        const contactsQuery = isAdmin
          ? query(collection(db, 'contacts'))
          : query(collection(db, 'contacts'), where('userId', '==', auth.currentUser.uid));
        
        const contactsSnapshot = await getDocs(contactsQuery);
        const contactsData = [];
        contactsSnapshot.forEach((doc) => {
          contactsData.push({ id: doc.id, ...doc.data() });
        });

        // Load deals
        const dealsQuery = isAdmin
          ? query(collection(db, 'deals'))
          : query(collection(db, 'deals'), where('userId', '==', auth.currentUser.uid));
        
        const dealsSnapshot = await getDocs(dealsQuery);
        const dealsData = [];
        dealsSnapshot.forEach((doc) => {
          dealsData.push({ id: doc.id, ...doc.data() });
        });

        // Load tasks
        const tasksQuery = isAdmin
          ? query(collection(db, 'tasks'), orderBy('dueDate', 'asc'))
          : query(collection(db, 'tasks'), where('userId', '==', auth.currentUser.uid), orderBy('dueDate', 'asc'));
        
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksData = [];
        tasksSnapshot.forEach((doc) => {
          tasksData.push({ id: doc.id, ...doc.data() });
        });

        // Calculate stats
        const sellers = contactsData.filter(c => c.contactType === 'seller');
        const buyers = contactsData.filter(c => c.contactType === 'buyer');
        const activeBuyers = buyers.filter(b => b.activelyBuying);
        const flippers = buyers.filter(b => b.buyerType === 'flipper');
        const builders = buyers.filter(b => b.buyerType === 'builder');
        const holders = buyers.filter(b => b.buyerType === 'holder');
        const activeDeals = dealsData.filter(d => d.status !== 'closed');

        setStats({
          totalContacts: contactsData.length,
          totalSellers: sellers.length,
          totalBuyers: buyers.length,
          activeBuyers: activeBuyers.length,
          totalDeals: dealsData.length,
          activeDeals: activeDeals.length,
          flippers: flippers.length,
          builders: builders.length,
          holders: holders.length,
          totalTasks: tasksData.length
        });

        setTasks(tasksData.slice(0, 4));
        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const quickLinks = [
    { label: 'New Seller', icon: UserPlus, color: '#00ff88', action: () => onNavigateToContacts('seller') },
    { label: 'New Buyer', icon: UserPlus, color: '#0088ff', action: () => onNavigateToContacts('buyer') },
    { label: 'New Deal', icon: FileText, color: '#ffaa00' },
    { label: 'Inventory Retail', icon: ShoppingCart, color: '#ff6600' },
    { label: 'Properties Owned', icon: Key, color: '#aa00ff' }
  ];

  if (loading) {
    return (
      <div className="page-content">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '400px',
          color: '#666666',
          fontSize: '14px'
        }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="section">
        <div className="section-title">Quick Links</div>
        <div className="quick-links-grid">
          {quickLinks.map((link, idx) => (
            <div key={idx} className="quick-link-card" onClick={link.action}>
              <div className="quick-link-icon" style={{ background: `${link.color}15` }}>
                <link.icon size={18} color={link.color} />
              </div>
              <span>{link.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-title">Key Performance Indicators</div>
        <div className="kpi-grid">
          <div className="kpi-container">
            <div className="kpi-title" style={{ color: '#00ff88' }}>Seller Leads</div>
            <div className="kpi-items">
              <div className="kpi-item">
                <span className="kpi-label">Total Number of Sellers</span>
                <span className="kpi-value">{stats.totalSellers}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Total Contacts</span>
                <span className="kpi-value">{stats.totalContacts}</span>
              </div>
            </div>
          </div>

          <div className="kpi-container">
            <div className="kpi-title" style={{ color: '#0088ff' }}>Active Deals</div>
            <div className="kpi-items">
              <div className="kpi-item">
                <span className="kpi-label">Total Deals</span>
                <span className="kpi-value">{stats.totalDeals}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Active Deals</span>
                <span className="kpi-value">{stats.activeDeals}</span>
              </div>
            </div>
          </div>

          <div className="kpi-container">
            <div className="kpi-title" style={{ color: '#ffaa00' }}>Tasks</div>
            <div className="kpi-items">
              <div className="kpi-item">
                <span className="kpi-label">Total Tasks</span>
                <span className="kpi-value">{stats.totalTasks}</span>
              </div>
            </div>
          </div>

          <div className="kpi-container">
            <div className="kpi-title" style={{ color: '#ff6600' }}>Buyers</div>
            <div className="kpi-items">
              <div className="kpi-item">
                <span className="kpi-label">Total Number of Buyers</span>
                <span className="kpi-value">{stats.totalBuyers}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Active Buyers</span>
                <span className="kpi-value">{stats.activeBuyers}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Buyers that are Flippers</span>
                <span className="kpi-value">{stats.flippers}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Buyers that are Builders</span>
                <span className="kpi-value">{stats.builders}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Buyers that are Holders</span>
                <span className="kpi-value">{stats.holders}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Recent Tasks</div>
        {tasks.length === 0 ? (
          <div style={{ 
            background: '#0a0a0a', 
            border: '1px solid #1a1a1a', 
            borderRadius: '4px',
            padding: '40px',
            textAlign: 'center',
            color: '#666666'
          }}>
            No tasks yet. Add one from the Tasks page!
          </div>
        ) : (
          <div className="tasks-table">
            <div className="table-header">
              <div>Task</div>
              <div>Due Date</div>
              <div>Status</div>
            </div>
            {tasks.map((task) => (
              <div key={task.id} className="table-row">
                <div data-label="Task">{task.title || task.description}</div>
                <div data-label="Due Date">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</div>
                <div data-label="Status">
                  <span style={{
                    fontSize: '10px',
                    color: task.completed ? '#00ff88' : '#ffaa00',
                    background: task.completed ? '#00ff8815' : '#ffaa0015',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    textTransform: 'uppercase',
                    fontWeight: '700'
                  }}>
                    {task.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// CONTACTS PAGE - WITH EDIT/DELETE
const ContactsPage = ({ contactType = 'buyer', editContactId = null, globalSearch = '', onSearchChange }) => {
  const [selectedContactType, setSelectedContactType] = useState(contactType);
  const [formData, setFormData] = useState({ 
    firstName: '', 
    lastName: '', 
    phone: '', 
    email: '', 
    buyerType: '', 
    activelyBuying: false 
  });
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(editContactId);
  const [searchTerm, setSearchTerm] = useState(globalSearch);
  const toast = useToast();
  // Load contacts from Firebase
  React.useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    setSearchTerm(globalSearch || '');
  }, [globalSearch]);

  // Load contact for editing if editContactId is provided
  React.useEffect(() => {
    if (editContactId && contacts.length > 0) {
      const contactToEdit = contacts.find(c => c.id === editContactId);
      if (contactToEdit) {
        setFormData({
          firstName: contactToEdit.firstName,
          lastName: contactToEdit.lastName,
          phone: contactToEdit.phone,
          email: contactToEdit.email,
          buyerType: contactToEdit.buyerType || '',
          activelyBuying: contactToEdit.activelyBuying || false
        });
        setSelectedContactType(contactToEdit.contactType);
        setEditingId(editContactId);
      }
    }
  }, [editContactId, contacts]);

  const loadContacts = async () => {
    try {
      // Admin sees all, regular users see only their data
const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';

const querySnapshot = isAdmin 
  ? await getDocs(query(collection(db, 'contacts'), orderBy('createdAt', 'desc')))
  : await getDocs(
      query(
        collection(db, 'contacts'), 
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      )
    );
      
      const contactsData = [];
      querySnapshot.forEach((doc) => {
        contactsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setContacts(contactsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setLoading(false);
    }
  };

const handleSaveContact = async () => {
  if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email) {
    toast.error('Please fill in all required fields');
    return;
  }

  setSaving(true);
  
  try {
    if (editingId) {
      // Update existing contact
      await updateDoc(doc(db, 'contacts', editingId), {
        ...formData,
        contactType: selectedContactType,
        userId: auth.currentUser.uid,
        updatedAt: new Date().toISOString()
      });
      toast.success('Contact updated successfully!');
      setEditingId(null);
    } else {
      // Create new contact
      await addDoc(collection(db, 'contacts'), {
        ...formData,
        contactType: selectedContactType,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      toast.success('Contact saved successfully!');
    }
    
    // Reset form
    setFormData({
      firstName: '', 
      lastName: '', 
      phone: '', 
      email: '', 
      buyerType: '', 
      activelyBuying: false 
    });
    
    // Reload contacts
    loadContacts();
  } catch (error) {
    console.error('Error saving contact:', error);
    toast.error('Error saving contact. Check console.');
  } finally {
    setSaving(false);
  }
};

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'contacts', contactId));
      toast.success('Contact deleted successfully!');
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Error deleting contact. Check console.');
    }
  };

  const handleEditContact = (contact) => {
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      email: contact.email,
      buyerType: contact.buyerType || '',
      activelyBuying: contact.activelyBuying || false
    });
    setSelectedContactType(contact.contactType);
    setEditingId(contact.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      firstName: '', 
      lastName: '', 
      phone: '', 
      email: '', 
      buyerType: '', 
      activelyBuying: false 
    });
  };

  const contactTypes = [
    { id: 'buyer', label: 'New Buyer' },
    { id: 'seller', label: 'New Seller' },
    { id: 'agent', label: 'Agent' },
    { id: 'lender', label: 'Lender' },
    { id: 'investor', label: 'Investor' }
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>{editingId ? 'Edit Contact' : 'Add New Contact'}</h2>
        <p>Select contact type and enter details</p>
      </div>

      <div className="section">
        <div className="section-title">Contact Type</div>
        <div className="contact-type-selector">
          {contactTypes.map((type) => (
            <div
              key={type.id}
              onClick={() => setSelectedContactType(type.id)}
              className={`contact-type-option ${selectedContactType === type.id ? 'selected' : ''}`}
            >
              <div className="checkbox">
                {selectedContactType === type.id && <Check size={12} color="#000000" />}
              </div>
              <span>{type.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="contact-form">
        <div className="section-title">Contact Information</div>
        <div className="form-grid">
          <div className="form-field">
            <label>First Name *</label>
            <input 
              type="text" 
              placeholder="Enter first name" 
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            />
          </div>
          <div className="form-field">
            <label>Last Name *</label>
            <input 
              type="text" 
              placeholder="Enter last name" 
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            />
          </div>
          <div className="form-field">
            <label>Phone Number *</label>
            <input 
              type="tel" 
              placeholder="(555) 555-5555" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div className="form-field">
            <label>Email *</label>
            <input 
              type="email" 
              placeholder="email@example.com" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          {selectedContactType === 'buyer' && (
            <>
              <div className="form-field">
                <label>Buyer Type</label>
                <select 
                  value={formData.buyerType}
                  onChange={(e) => setFormData({...formData, buyerType: e.target.value})}
                >
                  <option value="">Select type</option>
                  <option value="flipper">Flipper</option>
                  <option value="builder">Builder</option>
                  <option value="holder">Holder</option>
                </select>
              </div>
              <div className="form-field">
                <label>Actively Buying</label>
                <div 
                  onClick={() => setFormData({...formData, activelyBuying: !formData.activelyBuying})} 
                  className="checkbox-field"
                >
                  <div className={`checkbox ${formData.activelyBuying ? 'checked' : ''}`}>
                    {formData.activelyBuying && <Check size={14} color="#000000" />}
                  </div>
                  <span>Yes, actively buying</span>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="header-actions">
          <button 
            className="btn-primary" 
            onClick={handleSaveContact}
            disabled={saving}
          >
            {saving ? 'Saving...' : editingId ? 'Update Contact' : 'Save Contact'}
          </button>
          {editingId && (
            <button 
              className="btn-secondary" 
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Contacts List */}
      <div className="section" style={{ marginTop: '40px' }}>
        <div className="section-title">All Contacts</div>

        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Search contacts by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (onSearchChange) onSearchChange(e.target.value);
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px'
            }}
          />
        </div>
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ 
            background: '#0a0a0a', 
            border: '1px solid #1a1a1a', 
            borderRadius: '4px',
            padding: '40px',
            textAlign: 'center',
            color: '#666666'
          }}>
            No contacts yet. Add one above!
          </div>
        ) : (
          (() => {
            const filteredContacts = contacts.filter((contact) => {
              if (!searchTerm) return true;
              const search = searchTerm.toLowerCase();
              return (
                `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(search) ||
                contact.email?.toLowerCase().includes(search) ||
                contact.phone?.toLowerCase().includes(search)
              );
            });

            if (filteredContacts.length === 0) {
              return (
                <div style={{ 
                  background: '#0a0a0a', 
                  border: '1px solid #1a1a1a', 
                  borderRadius: '4px',
                  padding: '40px',
                  textAlign: 'center',
                  color: '#666666'
                }}>
                  No contacts match your search.
                </div>
              );
            }

            return (
              <div className="tasks-table">
                <div className="table-header" style={{ 
                  gridTemplateColumns: '200px 120px 150px 180px 120px 150px' 
                }}>
                  <div>Name</div>
                  <div>Type</div>
                  <div>Phone</div>
                  <div>Email</div>
                  <div>Date Added</div>
                  <div>Actions</div>
                </div>

                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="table-row"
                    style={{ gridTemplateColumns: '200px 120px 150px 180px 120px 150px' }}
                  >
                    <div data-label="Name" style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                      {contact.firstName} {contact.lastName}
                    </div>

                    <div data-label="Type" style={{ fontSize: '12px', color: '#00ff88', textTransform: 'capitalize' }}>
                      {contact.contactType}
                    </div>

                    <div data-label="Phone" style={{ fontSize: '12px', color: '#888888' }}>
                      {contact.phone}
                    </div>

                    <div data-label="Email" style={{ fontSize: '12px', color: '#888888' }}>
                      {contact.email}
                    </div>

                    <div data-label="Date Added" style={{ fontSize: '12px', color: '#888888' }}>
                      {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'N/A'}
                    </div>

                    <div data-label="Actions" style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEditContact(contact)}
                        className="btn-secondary btn-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

// BUYERS LIST PAGE
const BuyersListPage = ({ globalSearch = '', onSearchChange }) => {
  // Filters removed - not used in BuyersListPage
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(globalSearch);

  // Load buyers from Firebase
  React.useEffect(() => {
    const loadBuyers = async () => {
      try {
const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';

const querySnapshot = isAdmin
  ? await getDocs(query(collection(db, 'contacts'), orderBy('createdAt', 'desc')))
  : await getDocs(
      query(
        collection(db, 'contacts'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      )
    );
        
        const buyersData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Only show contacts that are buyers
          if (data.contactType === 'buyer') {
            buyersData.push({
              id: doc.id,
              name: `${data.firstName} ${data.lastName}`,
              entity: data.email,
              active: data.activelyBuying || false,
              state: 'N/A',
              zipcode: 'N/A',
              type: data.buyerType || 'N/A',
              ...data
            });
          }
        });
        
        setBuyers(buyersData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading buyers:', error);
        setLoading(false);
      }
    };

    loadBuyers();
  }, []);

  useEffect(() => {
    setSearchTerm(globalSearch || '');
  }, [globalSearch]);

  return (
    <div className="page-content">
      <div className="section">
        <div className="section-title">Buyers List</div>

        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Search buyers by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (onSearchChange) onSearchChange(e.target.value);
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px'
            }}
          />
        </div>
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        ) : buyers.length === 0 ? (
          <div style={{ 
            background: '#0a0a0a', 
            border: '1px solid #1a1a1a', 
            borderRadius: '4px',
            padding: '40px',
            textAlign: 'center',
            color: '#666666'
          }}>
            No buyers yet. Add one from the Contacts page!
          </div>
        ) : (
          (() => {
            const filteredBuyers = buyers.filter((buyer) => {
              if (!searchTerm) return true;
              const search = searchTerm.toLowerCase();
              return (
                buyer.name?.toLowerCase().includes(search) ||
                buyer.entity?.toLowerCase().includes(search) ||
                buyer.phone?.toLowerCase().includes(search)
              );
            });

            if (filteredBuyers.length === 0) {
              return (
                <div style={{ 
                  background: '#0a0a0a', 
                  border: '1px solid #1a1a1a', 
                  borderRadius: '4px',
                  padding: '40px',
                  textAlign: 'center',
                  color: '#666666'
                }}>
                  No buyers match your search.
                </div>
              );
            }

            return (
              <div className="tasks-table">
                <div className="table-header" style={{ 
                  gridTemplateColumns: '250px 100px 120px 150px 150px' 
                }}>
                  <div>Name / Email</div>
                  <div>Active</div>
                  <div>Phone</div>
                  <div>Buyer Type</div>
                  <div>Date Added</div>
                </div>

                {filteredBuyers.map((buyer) => (
                  <div
                    key={buyer.id}
                    className="table-row"
                    style={{ gridTemplateColumns: '250px 100px 120px 150px 150px' }}
                  >
                    <div data-label="Name / Email" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                        {buyer.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#666666' }}>
                        {buyer.entity}
                      </span>
                    </div>

                    <div data-label="Active">
                      <span style={{
                        fontSize: '10px',
                        color: buyer.active ? '#00ff88' : '#ff6600',
                        background: buyer.active ? '#00ff8815' : '#ff660015',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                        fontWeight: '700'
                      }}>
                        {buyer.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div data-label="Phone" style={{ fontSize: '12px', color: '#888888' }}>
                      {buyer.phone}
                    </div>

                    <div data-label="Buyer Type" style={{ fontSize: '12px', color: '#0088ff' }}>
                      {buyer.type}
                    </div>

                    <div data-label="Date Added" style={{ fontSize: '12px', color: '#888888' }}>
                      {buyer.createdAt ? new Date(buyer.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

// BUYERS PAGE with sub-nav
const BuyersPage = ({ subTab, setSubTab, onNavigateToContacts, globalSearch, onSearchChange }) => {
  return (
    <div className="page-with-subnav">
      <div className="subnav">
        <div className="subnav-title">Buyers</div>
        <div className="subnav-items">
          <div
            onClick={() => onNavigateToContacts('buyer')}
            className="subnav-item"
          >
            <UserPlus size={16} color="#888888" />
            <span>Add New Buyer</span>
          </div>
          <div
            onClick={() => setSubTab('list')}
            className={`subnav-item ${subTab === 'list' ? 'active' : ''}`}
          >
            <List size={16} color={subTab === 'list' ? '#00ff88' : '#888888'} />
            <span>Buyers List</span>
          </div>
        </div>
      </div>
      <div className="subnav-content">
        {subTab === 'list' && <BuyersListPage globalSearch={globalSearch} onSearchChange={onSearchChange} />}
      </div>
    </div>
  );
};

// DEALS PAGE - New Deal (IMPROVED UX)
const NewDealPage = () => {
  const [dealData, setDealData] = useState({
    buyer: '',
    seller: '',
    property: ''
  });
  const [contacts, setContacts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [propertyInput, setPropertyInput] = useState('');
  const toast = useToast();
  // Load contacts from Firebase
  React.useEffect(() => {
    const loadContacts = async () => {
      try {
const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';

const querySnapshot = isAdmin
  ? await getDocs(collection(db, 'contacts'))
  : await getDocs(
      query(
        collection(db, 'contacts'),
        where('userId', '==', auth.currentUser.uid)
      )
    );
        const contactsData = [];
        querySnapshot.forEach((doc) => {
          contactsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setContacts(contactsData);
      } catch (error) {
        console.error('Error loading contacts:', error);
      }
    };
    loadContacts();
  }, []);

  const handleSaveDeal = async () => {
    if (!dealData.buyer || !dealData.seller || !dealData.property) {
      toast.error('Please select a buyer, seller, and property');
      return;
    }

    setSaving(true);
    
    try {
      const buyer = contacts.find(c => c.id === dealData.buyer);
      const seller = contacts.find(c => c.id === dealData.seller);
      
      await addDoc(collection(db, 'deals'), {
  buyerId: dealData.buyer,
  buyerName: `${buyer.firstName} ${buyer.lastName}`,
  sellerId: dealData.seller,
  sellerName: `${seller.firstName} ${seller.lastName}`,
  propertyAddress: dealData.property,
  status: 'new',
  userId: auth.currentUser.uid,
  createdAt: new Date().toISOString()
});
      
      toast.success('Deal created successfully!');
      
      // Reset form
      setDealData({
        buyer: '',
        seller: '',
        property: ''
      });
      setPropertyInput('');
    } catch (error) {
      console.error('Error saving deal:', error);
      toast.error('Error saving deal. Check console.');
    } finally {
      setSaving(false);
    }
  };

  const buyers = contacts.filter(c => c.contactType === 'buyer');
  const sellers = contacts.filter(c => c.contactType === 'seller');

  const getSelectedBuyer = () => contacts.find(c => c.id === dealData.buyer);
  const getSelectedSeller = () => contacts.find(c => c.id === dealData.seller);

  return (
    <div className="new-deal-page">
      <div className="deal-cards-grid">
        {/* Buyer Card */}
        <div 
          className="deal-card"
          onClick={() => setShowBuyerModal(true)}
          style={{
            background: dealData.buyer ? '#0f0f0f' : '#0a0a0a',
            borderColor: dealData.buyer ? '#0088ff' : '#1a1a1a'
          }}
        >
          <div className="deal-icon-circle" style={{ background: '#0088ff15' }}>
            <BuyerIcon size={80} color="#0088ff" />
          </div>
          
          {dealData.buyer ? (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <div style={{
                background: '#0088ff',
                color: '#000000',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '24px',
                marginBottom: '15px'
              }}>✓</div>
              <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', marginBottom: '4px' }}>
                {getSelectedBuyer()?.firstName} {getSelectedBuyer()?.lastName}
              </div>
              <div style={{ fontSize: '11px', color: '#888888' }}>
                {getSelectedBuyer()?.email}
              </div>
            </div>
          ) : (
            <>
              <div className="deal-plus-button" style={{ background: '#0088ff' }}>
                <Plus size={32} color="#000000" />
              </div>
              <h3>Add Buyer</h3>
            </>
          )}
        </div>

        {/* Seller Card */}
        <div 
          className="deal-card"
          onClick={() => setShowSellerModal(true)}
          style={{
            background: dealData.seller ? '#0f0f0f' : '#0a0a0a',
            borderColor: dealData.seller ? '#00ff88' : '#1a1a1a'
          }}
        >
          <div className="deal-icon-circle" style={{ background: '#00ff8815' }}>
            <SellerIcon size={80} color="#00ff88" />
          </div>
          
          {dealData.seller ? (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <div style={{
                background: '#00ff88',
                color: '#000000',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '24px',
                marginBottom: '15px'
              }}>✓</div>
              <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', marginBottom: '4px' }}>
                {getSelectedSeller()?.firstName} {getSelectedSeller()?.lastName}
              </div>
              <div style={{ fontSize: '11px', color: '#888888' }}>
                {getSelectedSeller()?.email}
              </div>
            </div>
          ) : (
            <>
              <div className="deal-plus-button" style={{ background: '#00ff88' }}>
                <Plus size={32} color="#000000" />
              </div>
              <h3>Add Seller</h3>
            </>
          )}
        </div>

        {/* Property Card */}
        <div 
          className="deal-card"
          onClick={() => setShowPropertyModal(true)}
          style={{
            background: dealData.property ? '#0f0f0f' : '#0a0a0a',
            borderColor: dealData.property ? '#ffaa00' : '#1a1a1a'
          }}
        >
          <div className="deal-icon-circle" style={{ background: '#ffaa0015' }}>
            <PropertyIcon size={80} color="#ffaa00" />
          </div>
          
          {dealData.property ? (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <div style={{
                background: '#ffaa00',
                color: '#000000',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '24px',
                marginBottom: '15px'
              }}>✓</div>
              <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', wordBreak: 'break-word', padding: '0 10px' }}>
                {dealData.property}
              </div>
            </div>
          ) : (
            <>
              <div className="deal-plus-button" style={{ background: '#ffaa00' }}>
                <Plus size={32} color="#000000" />
              </div>
              <h3>Add Property</h3>
            </>
          )}
        </div>
      </div>

      {/* Create Deal Button - Fixed Bottom Right */}
      {dealData.buyer && dealData.seller && dealData.property && (
        <div className="floating-action" style={{ 
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          zIndex: 999
        }}>
    <button
      onClick={handleSaveDeal}
      disabled={saving}
      style={{
        background: '#00ff88',
        color: '#000000',
        border: 'none',
        padding: '18px 40px',
        fontSize: '15px',
        fontWeight: '700',
        borderRadius: '8px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        boxShadow: '0 4px 20px rgba(0, 255, 136, 0.4)',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 6px 30px rgba(0, 255, 136, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 255, 136, 0.4)';
      }}
    >
      {saving ? 'Creating Deal...' : '✓ Create Deal'}
    </button>
  </div>
)}

      {/* Buyer Selection Modal */}
      {showBuyerModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderColor: '#0088ff', padding: '30px', maxWidth: '600px', width: '90%', maxHeight: '80vh' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#0088ff', margin: 0 }}>Select Buyer</h2>
              <button
                onClick={() => setShowBuyerModal(false)}
                className="icon-button"
              >×</button>
            </div>

            {buyers.length === 0 ? (
              <div style={{ 
                background: '#0f0f0f', 
                border: '1px solid #1a1a1a',
                padding: '30px',
                textAlign: 'center',
                color: '#666666',
                borderRadius: '4px'
              }}>
                No buyers found. Add one in the Contacts page first!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {buyers.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setDealData({...dealData, buyer: contact.id});
                      setShowBuyerModal(false);
                    }}
                    style={{
                      background: dealData.buyer === contact.id ? '#1a1a1a' : '#0f0f0f',
                      border: dealData.buyer === contact.id ? '1px solid #0088ff' : '1px solid #1a1a1a',
                      padding: '15px 20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (dealData.buyer !== contact.id) {
                        e.currentTarget.style.background = '#151515';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (dealData.buyer !== contact.id) {
                        e.currentTarget.style.background = '#0f0f0f';
                      }
                    }}
                  >
                    <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', marginBottom: '4px' }}>
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888888' }}>
                      {contact.email} • {contact.phone}
                    </div>
                    {contact.buyerType && (
                      <div style={{ fontSize: '11px', color: '#0088ff', marginTop: '4px', textTransform: 'capitalize' }}>
                        {contact.buyerType}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seller Selection Modal */}
      {showSellerModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderColor: '#00ff88', padding: '30px', maxWidth: '600px', width: '90%', maxHeight: '80vh' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#00ff88', margin: 0 }}>Select Seller</h2>
              <button
                onClick={() => setShowSellerModal(false)}
                className="icon-button"
              >×</button>
            </div>

            {sellers.length === 0 ? (
              <div style={{ 
                background: '#0f0f0f', 
                border: '1px solid #1a1a1a',
                padding: '30px',
                textAlign: 'center',
                color: '#666666',
                borderRadius: '4px'
              }}>
                No sellers found. Add one in the Contacts page first!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sellers.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setDealData({...dealData, seller: contact.id});
                      setShowSellerModal(false);
                    }}
                    style={{
                      background: dealData.seller === contact.id ? '#1a1a1a' : '#0f0f0f',
                      border: dealData.seller === contact.id ? '1px solid #00ff88' : '1px solid #1a1a1a',
                      padding: '15px 20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (dealData.seller !== contact.id) {
                        e.currentTarget.style.background = '#151515';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (dealData.seller !== contact.id) {
                        e.currentTarget.style.background = '#0f0f0f';
                      }
                    }}
                  >
                    <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', marginBottom: '4px' }}>
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888888' }}>
                      {contact.email} • {contact.phone}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Property Input Modal */}
      {showPropertyModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderColor: '#ffaa00', padding: '30px', maxWidth: '500px', width: '90%' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#ffaa00', margin: 0 }}>Enter Property Address</h2>
              <button
                onClick={() => setShowPropertyModal(false)}
                className="icon-button"
              >×</button>
            </div>

            <div className="form-field" style={{ marginBottom: '20px' }}>
              <label>Property Address *</label>
              <input
                type="text"
                placeholder="e.g., 123 Main Street, Los Angeles, CA 90001"
                value={propertyInput}
                onChange={(e) => setPropertyInput(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0f0f0f',
                  border: '1px solid #1a1a1a',
                  padding: '12px 15px',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  borderRadius: '4px',
                  outline: 'none'
                }}
                autoFocus
              />
            </div>

            <button
              onClick={() => {
                if (propertyInput.trim()) {
                  setDealData({...dealData, property: propertyInput.trim()});
                  setShowPropertyModal(false);
                } else {
                  toast.error('Please enter a property address');
                }
              }}
              className="btn-warning btn-block"
            >
              Save Property
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// LOGIN PAGE
const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLoginSuccess();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithPopup(auth, googleProvider);
      onLoginSuccess();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#000000',
      padding: '20px'
    }}>
      <div style={{
        background: '#0a0a0a',
        border: '2px solid #1a1a1a',
        borderRadius: '8px',
        padding: '40px',
        maxWidth: '450px',
        width: '100%'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: '#00ff88',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            fontSize: '28px',
            fontWeight: '700',
            color: '#000000',
            margin: '0 auto 20px'
          }}>R</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#ffffff',
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p style={{
            fontSize: '13px',
            color: '#666666'
          }}>
            {isSignup ? 'Sign up to get started' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div style={{
            background: '#ff333315',
            border: '1px solid #ff3333',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '12px',
            color: '#ff3333'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth}>
          <div className="form-field" style={{ marginBottom: '15px' }}>
            <label>Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-field" style={{ marginBottom: '20px' }}>
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              marginBottom: '15px'
            }}
          >
            {loading ? 'Loading...' : isSignup ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '20px 0',
          color: '#666666',
          fontSize: '12px'
        }}>
          <div style={{ flex: 1, height: '1px', background: '#1a1a1a' }}></div>
          <span>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#1a1a1a' }}></div>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          style={{
            width: '100%',
            background: '#ffffff',
            color: '#000000',
            border: 'none',
            padding: '12px',
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{
          textAlign: 'center',
          fontSize: '13px',
          color: '#888888'
        }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span
            onClick={() => setIsSignup(!isSignup)}
            style={{
              color: '#00ff88',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {isSignup ? 'Sign In' : 'Sign Up'}
          </span>
        </div>
      </div>
    </div>
  );
};

// COMPANY SETUP PAGE (CURRENTLY DISABLED)
// eslint-disable-next-line no-unused-vars
const CompanySetupPage = ({ user, onComplete }) => {
  const [step, setStep] = useState('check'); // 'check', 'create', 'join'
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [userCompany, setUserCompany] = useState(null);

  // Check if user already has a company
  React.useEffect(() => {
    const checkUserCompany = async () => {
      try {
        const userDoc = await getDocs(
          query(collection(db, 'users'), where('userId', '==', user.uid))
        );
        
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          if (userData.companyId) {
            setUserCompany(userData);
            onComplete(userData.companyId);
            return;
          }
        }
        setStep('create');
      } catch (error) {
        console.error('Error checking user company:', error);
        setStep('create');
      }
    };

    checkUserCompany();
  }, [user, onComplete]);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate a simple 6-digit company code
      const newCompanyCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create company document
      const companyRef = await addDoc(collection(db, 'companies'), {
        name: companyName,
        code: newCompanyCode,
        userIds: [user.uid],
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      });

      // Create/update user document
      await addDoc(collection(db, 'users'), {
        userId: user.uid,
        email: user.email,
        companyId: companyRef.id,
        companyName: companyName,
        role: 'admin',
        joinedAt: new Date().toISOString()
      });

      alert(`Company created! Your company code is: ${newCompanyCode}\nShare this with your team members.`);
      onComplete(companyRef.id);
    } catch (error) {
      console.error('Error creating company:', error);
      setError('Error creating company. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCompany = async (e) => {
    e.preventDefault();
    if (!companyCode.trim()) {
      setError('Please enter a company code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Find company by code
      const companyQuery = await getDocs(
        query(collection(db, 'companies'), where('code', '==', companyCode.toUpperCase()))
      );

      if (companyQuery.empty) {
        setError('Company code not found. Please check and try again.');
        setLoading(false);
        return;
      }

      const companyDoc = companyQuery.docs[0];
      const companyData = companyDoc.data();

      // Add user to company
      await updateDoc(doc(db, 'companies', companyDoc.id), {
        userIds: [...companyData.userIds, user.uid]
      });

      // Create user document
      await addDoc(collection(db, 'users'), {
        userId: user.uid,
        email: user.email,
        companyId: companyDoc.id,
        companyName: companyData.name,
        role: 'agent',
        joinedAt: new Date().toISOString()
      });

      alert(`Successfully joined ${companyData.name}!`);
      onComplete(companyDoc.id);
    } catch (error) {
      console.error('Error joining company:', error);
      setError('Error joining company. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'check') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#000000',
        color: '#00ff88',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#000000',
      padding: '20px'
    }}>
      <div style={{
        background: '#0a0a0a',
        border: '2px solid #1a1a1a',
        borderRadius: '8px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: '#00ff88',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            fontSize: '28px',
            fontWeight: '700',
            color: '#000000',
            margin: '0 auto 20px'
          }}>R</div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', marginBottom: '8px' }}>
            {step === 'create' ? 'Create Your Company' : 'Join a Company'}
          </h1>
          <p style={{ fontSize: '13px', color: '#666666' }}>
            {step === 'create' ? 'Set up your company to start managing deals' : 'Enter your company code to join'}
          </p>
        </div>

        {error && (
          <div style={{
            background: '#ff333315',
            border: '1px solid #ff3333',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '12px',
            color: '#ff3333'
          }}>
            {error}
          </div>
        )}

        {step === 'create' ? (
          <form onSubmit={handleCreateCompany}>
            <div className="form-field" style={{ marginBottom: '20px' }}>
              <label>Company Name *</label>
              <input
                type="text"
                placeholder="e.g., Smith Real Estate"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', marginBottom: '15px' }}
            >
              {loading ? 'Creating...' : 'Create Company'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '13px', color: '#888888' }}>
              Already have a company code?{' '}
              <span
                onClick={() => setStep('join')}
                style={{ color: '#00ff88', cursor: 'pointer', fontWeight: '600' }}
              >
                Join Company
              </span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoinCompany}>
            <div className="form-field" style={{ marginBottom: '20px' }}>
              <label>Company Code *</label>
              <input
                type="text"
                placeholder="e.g., ABC123"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                required
                autoFocus
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', marginBottom: '15px' }}
            >
              {loading ? 'Joining...' : 'Join Company'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '13px', color: '#888888' }}>
              Don't have a code?{' '}
              <span
                onClick={() => setStep('create')}
                style={{ color: '#00ff88', cursor: 'pointer', fontWeight: '600' }}
              >
                Create Company
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// DEALS PAGE with sub-nav
const DealsPage = ({ subTab, setSubTab }) => {
  return (
    <div className="page-with-subnav">
      <div className="subnav">
        <div className="subnav-title">Deals</div>
        <div className="subnav-items">
          {[
            { id: 'new', label: 'New Deal', icon: FilePlus },
            { id: 'dashboard', label: 'Dashboard', icon: BarChart },
            { id: 'active', label: 'Active Deals', icon: List },
            { id: 'closed', label: 'Closed Deals', icon: CheckSquare }
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => setSubTab(item.id)}
              className={`subnav-item ${subTab === item.id ? 'active' : ''}`}
            >
              <item.icon size={16} color={subTab === item.id ? '#00ff88' : '#888888'} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="subnav-content">
        {subTab === 'new' && <NewDealPage />}
        {subTab === 'dashboard' && <DealsDashboard />}
        {subTab === 'active' && <ActiveDealsPage />}
        {subTab === 'closed' && <ClosedDealsPage />}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [buyersSubTab, setBuyersSubTab] = useState('list');
  const [dealsSubTab, setDealsSubTab] = useState('new');
  const [contactType, setContactType] = useState('buyer');
  const [globalSearch, setGlobalSearch] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState(null);

  // Check auth state
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Check if user has a company
        try {
          const userQuery = await getDocs(
            query(collection(db, 'users'), where('userId', '==', currentUser.uid))
          );
          
          if (!userQuery.empty) {
            const userData = userQuery.docs[0].data();
            setCompanyId(userData.companyId);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleNavigateToContacts = (type) => {
    setContactType(type);
    setActiveTab('contacts');
  };

  useEffect(() => {
    setGlobalSearch('');
  }, [activeTab]);

  // eslint-disable-next-line no-unused-vars
  const handleCompanySetup = (newCompanyId) => {
    setCompanyId(newCompanyId);
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#000000',
        color: '#00ff88',
        fontSize: '18px',
        fontFamily: 'IBM Plex Mono, monospace'
      }}>
        Loading...
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginPage onLoginSuccess={() => setUser(auth.currentUser)} />;
  }

  // Show company setup if no company
  // if (!companyId) {
  //   return <CompanySetupPage user={user} onComplete={handleCompanySetup} />;
  // }

  const searchEnabledTabs = ['contacts', 'buyers', 'properties', 'tasks', 'documents'];

  return (
    <ToastProvider>
      <div className="App">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-container">
        <TopBar
          title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          showSearch={searchEnabledTabs.includes(activeTab)}
        />
        {activeTab === 'home' && <HomePage onNavigateToContacts={handleNavigateToContacts} />}
        {activeTab === 'contacts' && <ContactsPage contactType={contactType} companyId={companyId} globalSearch={globalSearch} onSearchChange={setGlobalSearch} />}
        {activeTab === 'buyers' && <BuyersPage subTab={buyersSubTab} setSubTab={setBuyersSubTab} onNavigateToContacts={handleNavigateToContacts} companyId={companyId} globalSearch={globalSearch} onSearchChange={setGlobalSearch} />}
        {activeTab === 'deals' && <DealsPage subTab={dealsSubTab} setSubTab={setDealsSubTab} companyId={companyId} />}
        {activeTab === 'properties' && <PropertiesPage globalSearch={globalSearch} onSearchChange={setGlobalSearch} />}
        {activeTab === 'crm' && <CRMDashboard />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'tasks' && <TasksPage globalSearch={globalSearch} onSearchChange={setGlobalSearch} />}
        {activeTab === 'documents' && <DocumentsPage globalSearch={globalSearch} onSearchChange={setGlobalSearch} />}
        {activeTab === 'websites' && <WebsitesPage />}
        {activeTab === 'settings' && <SettingsPage />}
        {!['home', 'contacts', 'buyers', 'deals', 'properties', 'crm', 'analytics', 'tasks', 'documents', 'websites', 'settings'].includes(activeTab) && (
          <div className="placeholder">
            <div className="placeholder-icon">🚧</div>
            <div>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} page coming soon</div>
          </div>
        )}
        </div>
      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </ToastProvider>
  );
}

export default App;
