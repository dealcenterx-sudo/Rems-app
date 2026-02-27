import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import ConfirmModal from './components/ConfirmModal';
import { collection, addDoc, getDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
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

const Mail = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2"/>
    <path d="m3 7 9 6 9-6"/>
  </svg>
);

const LinkIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L10 5"/>
    <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L14 19"/>
  </svg>
);

const CalendarIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
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

const normalizeAddressValue = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizePropertyTypeBucket = (propertyType = '') => {
  const type = propertyType.toLowerCase().replace(/\s+/g, '-');
  if (type === 'single-family') return 'single-family';
  if (type === 'multi-family' || type === 'multifamily') return 'multi-family';
  if (type === 'commercial') return 'commercial';
  return null;
};

// HOME PAGE - WITH LIVE FIREBASE DATA
const HomePage = ({ onNavigateToContacts, onNavigateToDealsNew, onNavigateToProperties }) => {
  const [stats, setStats] = useState({
    totalContacts: 0,
    totalSellers: 0,
    activeSellers: 0,
    inactiveSellers: 0,
    singleFamilySellers: 0,
    multiFamilySellers: 0,
    commercialSellers: 0,
    totalBuyers: 0,
    activeBuyers: 0,
    totalDeals: 0,
    activeDeals: 0,
    closedDeals: 0,
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

        // Load properties
        const propertiesQuery = isAdmin
          ? query(collection(db, 'properties'))
          : query(collection(db, 'properties'), where('userId', '==', auth.currentUser.uid));

        const propertiesSnapshot = await getDocs(propertiesQuery);
        const propertiesData = [];
        propertiesSnapshot.forEach((doc) => {
          propertiesData.push({ id: doc.id, ...doc.data() });
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
        const closedDeals = dealsData.filter(d => d.status === 'closed');
        const activeSellers = sellers.filter(s => s.activelySelling !== false);
        const inactiveSellers = sellers.filter(s => s.activelySelling === false);

        const addressToProperty = new Map();
        propertiesData.forEach((property) => {
          const fullAddress = `${property.address || ''}, ${property.city || ''}, ${property.state || ''} ${property.zipCode || ''}`;
          const normalizedFullAddress = normalizeAddressValue(fullAddress);
          const normalizedStreetAddress = normalizeAddressValue(property.address || '');

          if (normalizedFullAddress && !addressToProperty.has(normalizedFullAddress)) {
            addressToProperty.set(normalizedFullAddress, property);
          }
          if (normalizedStreetAddress && !addressToProperty.has(normalizedStreetAddress)) {
            addressToProperty.set(normalizedStreetAddress, property);
          }
        });

        const sellerTypeBuckets = new Map();
        const addSellerBucket = (sellerId, propertyType) => {
          const bucket = normalizePropertyTypeBucket(propertyType);
          if (!sellerId || !bucket) return;
          const current = sellerTypeBuckets.get(sellerId) || new Set();
          current.add(bucket);
          sellerTypeBuckets.set(sellerId, current);
        };

        propertiesData.forEach((property) => {
          addSellerBucket(property.sellerId, property.propertyType);
        });

        dealsData.forEach((deal) => {
          const normalizedDealAddress = normalizeAddressValue(deal.propertyAddress || '');
          const matchedProperty = addressToProperty.get(normalizedDealAddress);
          addSellerBucket(deal.sellerId, matchedProperty?.propertyType || deal.propertyType);
        });

        const singleFamilySellers = sellers.filter((seller) => sellerTypeBuckets.get(seller.id)?.has('single-family'));
        const multiFamilySellers = sellers.filter((seller) => sellerTypeBuckets.get(seller.id)?.has('multi-family'));
        const commercialSellers = sellers.filter((seller) => sellerTypeBuckets.get(seller.id)?.has('commercial'));

        setStats({
          totalContacts: contactsData.length,
          totalSellers: sellers.length,
          activeSellers: activeSellers.length,
          inactiveSellers: inactiveSellers.length,
          singleFamilySellers: singleFamilySellers.length,
          multiFamilySellers: multiFamilySellers.length,
          commercialSellers: commercialSellers.length,
          totalBuyers: buyers.length,
          activeBuyers: activeBuyers.length,
          totalDeals: dealsData.length,
          activeDeals: activeDeals.length,
          closedDeals: closedDeals.length,
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
    { label: 'New Deal', icon: FileText, color: '#ffaa00', action: onNavigateToDealsNew },
    { label: 'Inventory Retail', icon: ShoppingCart, color: '#ff6600', action: onNavigateToProperties },
    { label: 'Properties Owned', icon: Key, color: '#aa00ff', action: onNavigateToProperties }
  ];

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-container">
          <div className="loading-spinner" />
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
                <link.icon size={20} color={link.color} />
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
                <span className="kpi-label">Active Sellers</span>
                <span className="kpi-value">{stats.activeSellers}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Inactive Sellers</span>
                <span className="kpi-value">{stats.inactiveSellers}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Single Family Sellers</span>
                <span className="kpi-value">{stats.singleFamilySellers}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Multifamily Sellers</span>
                <span className="kpi-value">{stats.multiFamilySellers}</span>
              </div>
              <div className="kpi-item">
                <span className="kpi-label">Commercial Sellers</span>
                <span className="kpi-value">{stats.commercialSellers}</span>
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
              <div className="kpi-item">
                <span className="kpi-label">Closed Deals</span>
                <span className="kpi-value">{stats.closedDeals}</span>
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
          <div className="card-surface" style={{ textAlign: 'center', color: '#666666' }}>
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
                  <span className="badge" style={{ color: task.completed ? '#00ff88' : '#ffaa00', background: task.completed ? '#00ff8815' : '#ffaa0015' }}>
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
const CONTACT_FORM_TYPES = ['buyer', 'seller', 'agent', 'lender', 'investor'];
const CONTACT_LIST_TABS = ['all', 'buyer', 'seller', 'agent', 'lender', 'investor'];

const resolveContactsInitialState = (initialTab = 'all') => {
  if (CONTACT_FORM_TYPES.includes(initialTab)) {
    return { tab: 'add', contactType: initialTab };
  }
  if (CONTACT_LIST_TABS.includes(initialTab)) {
    return { tab: initialTab, contactType: initialTab === 'all' ? 'buyer' : initialTab };
  }
  return { tab: 'all', contactType: 'buyer' };
};

const ContactsPage = ({ initialTab = 'all', editContactId = null, globalSearch = '', onSearchChange }) => {
  const initialState = resolveContactsInitialState(initialTab);
  const [selectedViewTab, setSelectedViewTab] = useState(initialState.tab);
  const [selectedContactType, setSelectedContactType] = useState(initialState.contactType);
  const [formData, setFormData] = useState({ 
    firstName: '', 
    lastName: '', 
    phone: '', 
    email: '', 
    buyerType: '', 
    activelyBuying: false,
    activelySelling: true
  });
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(editContactId);
  const [searchTerm, setSearchTerm] = useState(globalSearch);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, contact: null });
  const toast = useToast();
  // Load contacts from Firebase
  React.useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    setSearchTerm(globalSearch || '');
  }, [globalSearch]);

  useEffect(() => {
    const nextState = resolveContactsInitialState(initialTab);
    setSelectedViewTab(nextState.tab);
    setSelectedContactType(nextState.contactType);
  }, [initialTab]);

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
          activelyBuying: contactToEdit.activelyBuying || false,
          activelySelling: contactToEdit.activelySelling !== false
        });
        setSelectedContactType(contactToEdit.contactType);
        setSelectedViewTab('add');
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
      activelyBuying: false,
      activelySelling: true
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
    try {
      await deleteDoc(doc(db, 'contacts', contactId));
      toast.success('Contact deleted successfully!');
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Error deleting contact. Check console.');
    }
  };

  const requestDeleteContact = (contact) => {
    setConfirmDelete({ open: true, contact });
  };

  const confirmDeleteContact = async () => {
    if (!confirmDelete.contact?.id) return;
    await handleDeleteContact(confirmDelete.contact.id);
    setConfirmDelete({ open: false, contact: null });
  };

  const handleEditContact = (contact) => {
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      email: contact.email,
      buyerType: contact.buyerType || '',
      activelyBuying: contact.activelyBuying || false,
      activelySelling: contact.activelySelling !== false
    });
    setSelectedContactType(contact.contactType);
    setSelectedViewTab('add');
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
      activelyBuying: false,
      activelySelling: true
    });
  };

  const openAddContactForTab = (tabId) => {
    setEditingId(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      buyerType: '',
      activelyBuying: false,
      activelySelling: true
    });
    if (tabId !== 'all' && tabId !== 'add') {
      setSelectedContactType(tabId);
    }
    setSelectedViewTab('add');
  };

  const contactTypes = [
    { id: 'buyer', label: 'Buyer' },
    { id: 'seller', label: 'Seller' },
    { id: 'agent', label: 'Agent' },
    { id: 'lender', label: 'Lender' },
    { id: 'investor', label: 'Investor' }
  ];

  const contactViewTabs = [
    { id: 'add', label: 'Add Contact' },
    { id: 'all', label: 'All Contacts' },
    { id: 'buyer', label: 'Buyers' },
    { id: 'seller', label: 'Sellers' },
    { id: 'agent', label: 'Agents' },
    { id: 'lender', label: 'Lenders' },
    { id: 'investor', label: 'Investors' }
  ];

  const filteredContacts = contacts.filter((contact) => {
    if (selectedViewTab !== 'all' && contact.contactType !== selectedViewTab) return false;
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.phone?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="page-with-subnav">
      <div className="subnav">
        <div className="subnav-title">Contacts</div>
        <div className="subnav-items">
          {contactViewTabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => {
                setSelectedViewTab(tab.id);
                if (tab.id !== 'all' && tab.id !== 'add') {
                  setSelectedContactType(tab.id);
                }
              }}
              className={`subnav-item ${selectedViewTab === tab.id ? 'active' : ''}`}
            >
              <Users size={18} color={selectedViewTab === tab.id ? '#00ff88' : '#888888'} />
              <span>{tab.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="subnav-content">
        <div className="page-content">
          {selectedViewTab === 'add' && (
            <div className="contact-form">
              <div className="section-title">{editingId ? 'Edit Contact' : 'Add New Contact'}</div>
              <div className="form-grid">
                <div className="form-field">
                  <label>First Name *</label>
                  <input type="text" placeholder="Enter first name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>Last Name *</label>
                  <input type="text" placeholder="Enter last name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>Phone Number *</label>
                  <input type="tel" placeholder="(555) 555-5555" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>Email *</label>
                  <input type="email" placeholder="email@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>Contact Type</label>
                  <select value={selectedContactType} onChange={(e) => setSelectedContactType(e.target.value)}>
                    {contactTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>
                {selectedContactType === 'buyer' && (
                  <>
                    <div className="form-field">
                      <label>Buyer Type</label>
                      <select value={formData.buyerType} onChange={(e) => setFormData({...formData, buyerType: e.target.value})}>
                        <option value="">Select type</option>
                        <option value="flipper">Flipper</option>
                        <option value="builder">Builder</option>
                        <option value="holder">Holder</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Actively Buying</label>
                      <div onClick={() => setFormData({...formData, activelyBuying: !formData.activelyBuying})} className="checkbox-field">
                        <div className={`checkbox ${formData.activelyBuying ? 'checked' : ''}`}>
                          {formData.activelyBuying && <Check size={14} color="#000000" />}
                        </div>
                        <span>Yes, actively buying</span>
                      </div>
                    </div>
                  </>
                )}
                {selectedContactType === 'seller' && (
                  <div className="form-field">
                    <label>Actively Selling</label>
                    <div onClick={() => setFormData({...formData, activelySelling: !formData.activelySelling})} className="checkbox-field">
                      <div className={`checkbox ${formData.activelySelling ? 'checked' : ''}`}>
                        {formData.activelySelling && <Check size={14} color="#000000" />}
                      </div>
                      <span>{formData.activelySelling ? 'Yes, actively selling' : 'Inactive seller'}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="header-actions">
                <button className="btn-primary" onClick={handleSaveContact} disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Contact' : 'Save Contact'}
                </button>
                {editingId && (
                  <button className="btn-secondary" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedViewTab !== 'add' && (
            <div className="section">
              <div className="section-title">
                {selectedViewTab === 'all' ? 'All Contacts' : `${selectedViewTab.charAt(0).toUpperCase() + selectedViewTab.slice(1)} Contacts`}
              </div>
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => openAddContactForTab(selectedViewTab)}
                  className="btn-primary"
                >
                  + Add Contact
                </button>
              </div>
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
                <div className="empty-state-card">
                  <div className="empty-state-icon">👥</div>
                  <div className="empty-state-title">No contacts yet</div>
                  <div className="empty-state-subtitle">Use Add Contact to create your first record.</div>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="empty-state-card">
                  <div className="empty-state-icon">🔍</div>
                  <div className="empty-state-title">No contacts in this subtab</div>
                  <div className="empty-state-subtitle">Try another subtab or adjust your search.</div>
                </div>
              ) : (
                <div className="tasks-table">
                  <div className="table-header" style={{ gridTemplateColumns: '200px 120px 150px 180px 120px 150px' }}>
                    <div>Name</div>
                    <div>Type</div>
                    <div>Phone</div>
                    <div>Email</div>
                    <div>Date Added</div>
                    <div>Actions</div>
                  </div>
                  {filteredContacts.map((contact) => (
                    <div key={contact.id} className="table-row" style={{ gridTemplateColumns: '200px 120px 150px 180px 120px 150px' }}>
                      <div data-label="Name" style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div data-label="Type" style={{ fontSize: '12px', color: '#00ff88', textTransform: 'capitalize' }}>
                        {contact.contactType}
                        {contact.contactType === 'seller' && (
                          <span style={{ marginLeft: '6px', color: contact.activelySelling === false ? '#ff6600' : '#00ff88' }}>
                            ({contact.activelySelling === false ? 'Inactive' : 'Active'})
                          </span>
                        )}
                      </div>
                      <div data-label="Phone" style={{ fontSize: '12px', color: '#888888' }}>{contact.phone}</div>
                      <div data-label="Email" style={{ fontSize: '12px', color: '#888888' }}>{contact.email}</div>
                      <div data-label="Date Added" style={{ fontSize: '12px', color: '#888888' }}>
                        {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                      <div data-label="Actions" style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEditContact(contact)} className="btn-secondary btn-sm">Edit</button>
                        <button onClick={() => requestDeleteContact(contact)} className="btn-danger btn-sm">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <ConfirmModal
            open={confirmDelete.open}
            title="Delete contact?"
            message={confirmDelete.contact ? `Delete "${confirmDelete.contact.firstName} ${confirmDelete.contact.lastName}"? This action can't be undone.` : "This action can't be undone."}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            danger
            onConfirm={confirmDeleteContact}
            onCancel={() => setConfirmDelete({ open: false, contact: null })}
          />
        </div>
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
  const [properties, setProperties] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [propertyInput, setPropertyInput] = useState('');
  const toast = useToast();
  // Load contacts and properties from Firebase
  React.useEffect(() => {
    const loadData = async () => {
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

        const propertiesQuery = isAdmin
          ? query(collection(db, 'properties'))
          : query(collection(db, 'properties'), where('userId', '==', auth.currentUser.uid));

        const propertiesSnapshot = await getDocs(propertiesQuery);
        const propertiesData = [];
        propertiesSnapshot.forEach((propertyDoc) => {
          propertiesData.push({
            id: propertyDoc.id,
            ...propertyDoc.data()
          });
        });
        setProperties(propertiesData);
      } catch (error) {
        console.error('Error loading contacts/properties:', error);
      }
    };
    loadData();
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
      const sellerName = `${seller.firstName} ${seller.lastName}`;
      const normalizedPropertyInput = normalizeAddressValue(dealData.property);
      const matchedProperty = properties.find((property) => {
        const fullAddress = `${property.address || ''}, ${property.city || ''}, ${property.state || ''} ${property.zipCode || ''}`;
        return (
          normalizeAddressValue(fullAddress) === normalizedPropertyInput ||
          normalizeAddressValue(property.address || '') === normalizedPropertyInput
        );
      });
      
      await addDoc(collection(db, 'deals'), {
  buyerId: dealData.buyer,
  buyerName: `${buyer.firstName} ${buyer.lastName}`,
  sellerId: dealData.seller,
  sellerName,
  propertyId: matchedProperty?.id || null,
  propertyType: matchedProperty?.propertyType || null,
  propertyAddress: dealData.property,
  status: 'new',
  userId: auth.currentUser.uid,
  createdAt: new Date().toISOString()
});

      if (matchedProperty?.id) {
        await updateDoc(doc(db, 'properties', matchedProperty.id), {
          sellerId: dealData.seller,
          sellerName,
          updatedAt: new Date().toISOString()
        });
      }
      
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
  const toast = useToast();
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

      toast.success(`Company created! Code: ${newCompanyCode}`);
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

      toast.success(`Successfully joined ${companyData.name}!`);
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
              <item.icon size={18} color={subTab === item.id ? '#00ff88' : '#888888'} />
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

const CRMPlaceholderPage = ({ title, description }) => (
  <div className="page-content">
    <div className="empty-state-card">
      <div className="empty-state-icon">⚙️</div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-subtitle">{description}</div>
    </div>
  </div>
);

const CRMLeadsPage = ({ onOpenLead }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  const [zipFilter, setZipFilter] = useState('');
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const [showFromMonthYearPicker, setShowFromMonthYearPicker] = useState(false);
  const [showToMonthYearPicker, setShowToMonthYearPicker] = useState(false);
  const [tempFromDate, setTempFromDate] = useState('');
  const [tempToDate, setTempToDate] = useState('');
  const [fromCalendarMonth, setFromCalendarMonth] = useState(new Date());
  const [toCalendarMonth, setToCalendarMonth] = useState(new Date());
  const [fromDateInput, setFromDateInput] = useState('');
  const [toDateInput, setToDateInput] = useState('');

  useEffect(() => {
    const loadLeads = async () => {
      try {
        const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';
        const leadsQuery = isAdmin
          ? query(collection(db, 'leads'), orderBy('submittedAt', 'desc'))
          : query(
              collection(db, 'leads'),
              where('userId', '==', auth.currentUser.uid),
              orderBy('submittedAt', 'desc')
            );

        const leadsSnapshot = await getDocs(leadsQuery);
        const leadsData = [];
        leadsSnapshot.forEach((leadDoc) => {
          leadsData.push({ id: leadDoc.id, ...leadDoc.data() });
        });
        setLeads(leadsData);
      } catch (error) {
        console.error('Error loading leads:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLeads();
  }, []);

  const sampleLead = {
    id: 'sample-lead-1',
    submittedAt: '2026-02-20T14:30:00.000Z',
    name: 'Sunrise Property Group LLC',
    phone: '(305) 555-0189',
    email: 'acquisitions@sunrisepg.com',
    serviceType: 'Buying a property',
    street: '1280 Biscayne Blvd',
    city: 'Miami',
    state: 'FL',
    zipCode: '33132',
    warmth: 'Closed',
    source: 'Zillow',
    isSample: true
  };

  const displayLeads = leads.length > 0 ? leads : [sampleLead];
  const serviceOptions = Array.from(
    new Set(
      displayLeads
        .map((lead) => lead.serviceType || lead.service || lead.serviceRequested)
        .filter(Boolean)
    )
  );
  const monthOptions = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 31 }, (_, idx) => currentYear - 15 + idx);

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    return new Date(dateValue).toLocaleString();
  };

  const formatFilterDate = (dateValue) => {
    if (!dateValue) return '';
    const [year, month, day] = dateValue.split('-');
    if (!year || !month || !day) return '';
    return `${month}/${day}/${year}`;
  };

  const parseDateInputToISO = (inputValue) => {
    const value = (inputValue || '').trim();
    if (!value) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parsed = new Date(`${value}T00:00:00`);
      if (!Number.isNaN(parsed.getTime()) && toDateInputString(parsed) === value) return value;
      return null;
    }

    const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const month = Number(slashMatch[1]);
      const day = Number(slashMatch[2]);
      const year = Number(slashMatch[3]);
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      const candidate = new Date(year, month - 1, day);
      if (
        candidate.getFullYear() !== year ||
        candidate.getMonth() !== month - 1 ||
        candidate.getDate() !== day
      ) {
        return null;
      }
      return toDateInputString(candidate);
    }

    return null;
  };

  const toDateInputString = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const buildCalendarGrid = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDayIndex; i += 1) cells.push(null);
    for (let day = 1; day <= totalDays; day += 1) cells.push(new Date(year, month, day));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  useEffect(() => {
    setFromDateInput(formatFilterDate(fromDate));
  }, [fromDate]);

  useEffect(() => {
    setToDateInput(formatFilterDate(toDate));
  }, [toDate]);

  const filteredLeads = displayLeads.filter((lead) => {
    const submittedAtValue = lead.submittedAt || lead.createdAt;
    const submittedDate = submittedAtValue ? new Date(submittedAtValue) : null;
    const serviceType = lead.serviceType || lead.service || lead.serviceRequested || '';
    const displayName = lead.name || lead.fullName || lead.entityName || '';
    const email = lead.email || '';
    const phone = lead.phone || '';
    const city = lead.city || lead.address?.city || '';
    const zipCode = lead.zipCode || lead.zip || lead.address?.zipCode || '';

    const matchesSearch = !searchTerm || [displayName, email, phone].some((field) =>
      String(field).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesFromDate = !fromDate || (submittedDate && submittedDate >= new Date(`${fromDate}T00:00:00`));
    const matchesToDate = !toDate || (submittedDate && submittedDate <= new Date(`${toDate}T23:59:59`));
    const matchesMonth = !monthFilter || (submittedDate && submittedDate.getMonth() + 1 === Number(monthFilter));
    const matchesYear = !yearFilter || (submittedDate && submittedDate.getFullYear().toString() === yearFilter);
    const matchesService = serviceFilter === 'all' || serviceType === serviceFilter;
    const matchesCity = !cityFilter || city.toLowerCase().includes(cityFilter.toLowerCase());
    const matchesZip = !zipFilter || String(zipCode).toLowerCase().includes(zipFilter.toLowerCase());

    return (
      matchesSearch &&
      matchesFromDate &&
      matchesToDate &&
      matchesMonth &&
      matchesYear &&
      matchesService &&
      matchesCity &&
      matchesZip
    );
  });

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="section">
        <div className="section-title">Leads</div>
        <div style={{ fontSize: '12px', color: '#888888', marginBottom: '14px' }}>
          Ordered by lead submission date (newest first)
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#888888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Search Lead
          </label>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
          />
        </div>

        <div className="grid-three" style={{ marginBottom: '16px' }}>
          <div className="card-surface">
            <div style={{ fontSize: '11px', color: '#00ff88', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Date Filtering
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#888888', marginBottom: '4px' }}>From Date</label>
                <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 42px', gap: '8px' }}>
                  <input
                    type="text"
                    value={fromDateInput}
                    placeholder="MM/DD/YYYY"
                    onChange={(e) => setFromDateInput(e.target.value)}
                    onBlur={() => {
                      const parsed = parseDateInputToISO(fromDateInput);
                      if (parsed === null) {
                        setFromDateInput(formatFilterDate(fromDate));
                        return;
                      }
                      setFromDate(parsed);
                      setTempFromDate(parsed);
                      if (parsed) {
                        setFromCalendarMonth(new Date(`${parsed}T00:00:00`));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    onDoubleClick={(e) => e.target.select?.()}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setTempFromDate(fromDate);
                      setFromCalendarMonth(fromDate ? new Date(`${fromDate}T00:00:00`) : new Date());
                      setShowFromMonthYearPicker(false);
                      setShowFromCalendar((prev) => !prev);
                      setShowToCalendar(false);
                      setShowToMonthYearPicker(false);
                    }}
                    title="Open calendar"
                    style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <CalendarIcon size={16} color="#ffffff" />
                  </button>
                  {showFromCalendar && (
                    <div className="card-surface" style={{ position: 'absolute', top: '46px', right: 0, zIndex: 30, width: '260px' }}>
                      <label style={{ display: 'block', fontSize: '10px', color: '#888888', marginBottom: '6px' }}>Choose From Date</label>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setFromCalendarMonth(new Date(fromCalendarMonth.getFullYear(), fromCalendarMonth.getMonth() - 1, 1))}>{'<'}</button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => setShowFromMonthYearPicker((prev) => !prev)}
                          style={{ fontSize: '12px', color: '#ffffff', fontWeight: '600' }}
                        >
                          {fromCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setFromCalendarMonth(new Date(fromCalendarMonth.getFullYear(), fromCalendarMonth.getMonth() + 1, 1))}>{'>'}</button>
                      </div>
                      {showFromMonthYearPicker && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          <select
                            value={fromCalendarMonth.getMonth()}
                            onChange={(e) => setFromCalendarMonth(new Date(fromCalendarMonth.getFullYear(), Number(e.target.value), 1))}
                            style={{ width: '100%', padding: '8px 10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
                          >
                            {monthOptions.map((monthOption) => (
                              <option key={`from-${monthOption.value}`} value={Number(monthOption.value) - 1}>
                                {monthOption.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={fromCalendarMonth.getFullYear()}
                            onChange={(e) => setFromCalendarMonth(new Date(Number(e.target.value), fromCalendarMonth.getMonth(), 1))}
                            style={{ width: '100%', padding: '8px 10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
                          >
                            {yearOptions.map((yearOption) => (
                              <option key={`from-year-${yearOption}`} value={yearOption}>
                                {yearOption}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                          <div key={day} style={{ fontSize: '10px', color: '#888888', textAlign: 'center' }}>{day}</div>
                        ))}
                        {buildCalendarGrid(fromCalendarMonth).map((dateCell, idx) => {
                          if (!dateCell) return <div key={`from-empty-${idx}`} />;
                          const value = toDateInputString(dateCell);
                          const selected = tempFromDate === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setTempFromDate(value)}
                              style={{
                                border: '1px solid',
                                borderColor: selected ? '#00ff88' : '#1a1a1a',
                                background: selected ? '#00ff8815' : '#0f0f0f',
                                color: '#ffffff',
                                borderRadius: '6px',
                                padding: '6px 0',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              {dateCell.getDate()}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setShowFromCalendar(false)}>Cancel</button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => { setFromDate(''); setTempFromDate(''); setShowFromCalendar(false); }}>Clear</button>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => {
                            setFromDate(tempFromDate);
                            setFromDateInput(formatFilterDate(tempFromDate));
                            setShowFromCalendar(false);
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#888888', marginBottom: '4px' }}>To Date</label>
                <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 42px', gap: '8px' }}>
                  <input
                    type="text"
                    value={toDateInput}
                    placeholder="MM/DD/YYYY"
                    onChange={(e) => setToDateInput(e.target.value)}
                    onBlur={() => {
                      const parsed = parseDateInputToISO(toDateInput);
                      if (parsed === null) {
                        setToDateInput(formatFilterDate(toDate));
                        return;
                      }
                      setToDate(parsed);
                      setTempToDate(parsed);
                      if (parsed) {
                        setToCalendarMonth(new Date(`${parsed}T00:00:00`));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    onDoubleClick={(e) => e.target.select?.()}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setTempToDate(toDate);
                      setToCalendarMonth(toDate ? new Date(`${toDate}T00:00:00`) : new Date());
                      setShowToMonthYearPicker(false);
                      setShowToCalendar((prev) => !prev);
                      setShowFromCalendar(false);
                      setShowFromMonthYearPicker(false);
                    }}
                    title="Open calendar"
                    style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <CalendarIcon size={16} color="#ffffff" />
                  </button>
                  {showToCalendar && (
                    <div className="card-surface" style={{ position: 'absolute', top: '46px', right: 0, zIndex: 30, width: '260px' }}>
                      <label style={{ display: 'block', fontSize: '10px', color: '#888888', marginBottom: '6px' }}>Choose To Date</label>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setToCalendarMonth(new Date(toCalendarMonth.getFullYear(), toCalendarMonth.getMonth() - 1, 1))}>{'<'}</button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => setShowToMonthYearPicker((prev) => !prev)}
                          style={{ fontSize: '12px', color: '#ffffff', fontWeight: '600' }}
                        >
                          {toCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setToCalendarMonth(new Date(toCalendarMonth.getFullYear(), toCalendarMonth.getMonth() + 1, 1))}>{'>'}</button>
                      </div>
                      {showToMonthYearPicker && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          <select
                            value={toCalendarMonth.getMonth()}
                            onChange={(e) => setToCalendarMonth(new Date(toCalendarMonth.getFullYear(), Number(e.target.value), 1))}
                            style={{ width: '100%', padding: '8px 10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
                          >
                            {monthOptions.map((monthOption) => (
                              <option key={`to-${monthOption.value}`} value={Number(monthOption.value) - 1}>
                                {monthOption.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={toCalendarMonth.getFullYear()}
                            onChange={(e) => setToCalendarMonth(new Date(Number(e.target.value), toCalendarMonth.getMonth(), 1))}
                            style={{ width: '100%', padding: '8px 10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
                          >
                            {yearOptions.map((yearOption) => (
                              <option key={`to-year-${yearOption}`} value={yearOption}>
                                {yearOption}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                          <div key={day} style={{ fontSize: '10px', color: '#888888', textAlign: 'center' }}>{day}</div>
                        ))}
                        {buildCalendarGrid(toCalendarMonth).map((dateCell, idx) => {
                          if (!dateCell) return <div key={`to-empty-${idx}`} />;
                          const value = toDateInputString(dateCell);
                          const selected = tempToDate === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setTempToDate(value)}
                              style={{
                                border: '1px solid',
                                borderColor: selected ? '#00ff88' : '#1a1a1a',
                                background: selected ? '#00ff8815' : '#0f0f0f',
                                color: '#ffffff',
                                borderRadius: '6px',
                                padding: '6px 0',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              {dateCell.getDate()}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setShowToCalendar(false)}>Cancel</button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => { setToDate(''); setTempToDate(''); setShowToCalendar(false); }}>Clear</button>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => {
                            setToDate(tempToDate);
                            setToDateInput(formatFilterDate(tempToDate));
                            setShowToCalendar(false);
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#888888', marginBottom: '4px' }}>Month</label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
                >
                  <option value="">All Months</option>
                  {monthOptions.map((monthOption) => (
                    <option key={monthOption.value} value={monthOption.value}>
                      {monthOption.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#888888', marginBottom: '4px' }}>Year</label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  placeholder="Year"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
                />
              </div>
            </div>
          </div>

          <div className="card-surface">
            <div style={{ fontSize: '11px', color: '#00ff88', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Service Filtering
            </div>
            <label style={{ display: 'block', fontSize: '10px', color: '#888888', marginBottom: '4px' }}>Service Type</label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
            >
              <option value="all">All Services</option>
              {serviceOptions.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>

          <div className="card-surface">
            <div style={{ fontSize: '11px', color: '#00ff88', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Location Filtering
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#888888', marginBottom: '4px' }}>City</label>
                <input
                  type="text"
                  placeholder="City"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#888888', marginBottom: '4px' }}>Zipcode</label>
                <input
                  type="text"
                  placeholder="Zipcode"
                  value={zipFilter}
                  onChange={(e) => setZipFilter(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
                />
              </div>
            </div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '1550px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '180px 220px 150px 230px 180px 220px 130px 80px 100px 120px 140px',
                gap: '10px',
                padding: '10px 12px',
                fontSize: '11px',
                color: '#888888',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              <div>Date In</div>
              <div>Name / Entity</div>
              <div>Phone</div>
              <div>Email</div>
              <div>Service</div>
              <div>Street</div>
              <div>City</div>
              <div>State</div>
              <div>Zip</div>
              <div>Warmth</div>
              <div>Source</div>
            </div>

            {filteredLeads.map((lead) => {
              const serviceType = lead.serviceType || lead.service || lead.serviceRequested || 'N/A';
              const leadWarmth = lead.warmth || lead.classification || 'Cold';
              const leadSource = lead.source || lead.leadSource || 'N/A';
              const street = lead.street || lead.address?.street || lead.address || 'N/A';
              const city = lead.city || lead.address?.city || 'N/A';
              const state = lead.state || lead.address?.state || 'N/A';
              const zipCode = lead.zipCode || lead.zip || lead.address?.zipCode || 'N/A';
              const displayName = lead.name || lead.fullName || lead.entityName || 'N/A';

              return (
                <div
                  key={lead.id}
                  onDoubleClick={() => onOpenLead?.(lead.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '180px 220px 150px 230px 180px 220px 130px 80px 100px 120px 140px',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#0a0a0a',
                    marginBottom: '8px',
                    fontSize: '12px',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <div>{formatDate(lead.submittedAt || lead.createdAt)}</div>
                  <div style={{ fontWeight: '600' }}>
                    {displayName}
                    {lead.isSample && (
                      <span style={{ marginLeft: '8px', fontSize: '10px', color: '#00ff88' }}>
                        Sample
                      </span>
                    )}
                  </div>
                  <div>{lead.phone || 'N/A'}</div>
                  <div>{lead.email || 'N/A'}</div>
                  <div>{serviceType}</div>
                  <div>{street}</div>
                  <div>{city}</div>
                  <div>{state}</div>
                  <div>{zipCode}</div>
                  <div style={{ color: '#00ff88' }}>{leadWarmth}</div>
                  <div>{leadSource}</div>
                </div>
              );
            })}
            {filteredLeads.length === 0 && (
              <div className="empty-state-card">
                <div className="empty-state-title">No leads match these filters</div>
                <div className="empty-state-subtitle">Adjust filters to see results.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CRMEmailInboxPage = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState([]);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [composeData, setComposeData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    signatureKey: 'default',
    signatureText: ''
  });

  const getDefaultSignature = () => {
    const senderName = auth.currentUser?.displayName || auth.currentUser?.email || 'DealCenter Team';
    return `${senderName}\nDealCenter CRM`;
  };

  const signatureTemplates = [
    { key: 'default', label: 'Default Signature', value: getDefaultSignature() },
    { key: 'acquisitions', label: 'Acquisitions Team', value: 'Acquisitions Team\nDealCenter CRM' },
    { key: 'dispositions', label: 'Dispositions Team', value: 'Dispositions Team\nDealCenter CRM' },
    { key: 'none', label: 'No Signature', value: '' },
    { key: 'custom', label: 'Custom Signature', value: composeData.signatureText || '' }
  ];

  const folderItems = [
    { id: 'inbox', label: 'Inbox' },
    { id: 'sent', label: 'Sent' },
    { id: 'drafts', label: 'Drafts' },
    { id: 'all', label: 'All Mail' }
  ];

  const getSampleEmails = useCallback(() => ([
    {
      id: 'sample-inbox-1',
      folder: 'inbox',
      from: 'Portfolio Inquiry',
      to: auth.currentUser?.email || '',
      subject: 'Request for property acquisition support',
      snippet: 'We are evaluating two assets this week and would like your process details.',
      body: 'We are evaluating two assets this week and would like your process details.',
      sentAt: '2026-02-26T15:40:00.000Z',
      unread: true
    },
    {
      id: 'sample-inbox-2',
      folder: 'inbox',
      from: 'Seller Lead',
      to: auth.currentUser?.email || '',
      subject: 'Follow-up on valuation timeline',
      snippet: 'Can you share expected next steps after initial review?',
      body: 'Can you share expected next steps after initial review?',
      sentAt: '2026-02-25T18:12:00.000Z',
      unread: false
    },
    {
      id: 'sample-sent-1',
      folder: 'sent',
      from: auth.currentUser?.email || 'dealcenterx@gmail.com',
      to: 'buyer@example.com',
      subject: 'Introductory investment overview',
      snippet: 'Thanks for connecting. Sharing a summary of available opportunities.',
      body: 'Thanks for connecting. Sharing a summary of available opportunities.',
      sentAt: '2026-02-24T13:05:00.000Z',
      unread: false
    }
  ]), []);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    try {
      const isAdmin = auth.currentUser?.email === 'dealcenterx@gmail.com';
      const leadsQuery = isAdmin
        ? query(collection(db, 'leads'))
        : query(collection(db, 'leads'), where('userId', '==', auth.currentUser.uid));
      const leadsSnapshot = await getDocs(leadsQuery);
      const loadedEmails = [];

      leadsSnapshot.forEach((leadDoc) => {
        const leadData = leadDoc.data();
        const history = Array.isArray(leadData.emailHistory) ? leadData.emailHistory : [];
        history.forEach((entry, index) => {
          loadedEmails.push({
            id: `${leadDoc.id}-mail-${index}-${entry.sentAt || index}`,
            folder: entry.direction === 'inbound' ? 'inbox' : 'sent',
            from: entry.sentBy || leadData.email || 'CRM',
            to: entry.to || leadData.email || '',
            subject: entry.subject || 'No subject',
            snippet: String(entry.body || '').replace(/\s+/g, ' ').trim().slice(0, 160),
            body: entry.body || '',
            sentAt: entry.sentAt || entry.createdAt || leadData.updatedAt || leadData.createdAt || new Date().toISOString(),
            unread: Boolean(entry.unread)
          });
        });
      });

      const sortedEmails = (loadedEmails.length > 0 ? loadedEmails : getSampleEmails())
        .sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime());
      setEmails(sortedEmails);
      setSelectedEmailId(sortedEmails[0]?.id || null);
    } catch (error) {
      console.error('Error loading CRM emails:', error);
      const fallback = getSampleEmails();
      setEmails(fallback);
      setSelectedEmailId(fallback[0]?.id || null);
    } finally {
      setLoading(false);
    }
  }, [getSampleEmails]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const folderCounts = folderItems.reduce((acc, folder) => {
    if (folder.id === 'all') {
      acc[folder.id] = emails.length;
    } else {
      acc[folder.id] = emails.filter((email) => email.folder === folder.id).length;
    }
    return acc;
  }, {});

  const visibleEmails = emails
    .filter((email) => (activeFolder === 'all' ? true : email.folder === activeFolder))
    .filter((email) => {
      const haystack = `${email.from} ${email.to} ${email.subject} ${email.snippet}`.toLowerCase();
      return !searchTerm || haystack.includes(searchTerm.toLowerCase());
    });

  const selectedEmail = visibleEmails.find((email) => email.id === selectedEmailId) || visibleEmails[0] || null;

  const formatInboxDate = (value) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const openCompose = () => {
    setComposeData({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: '',
      signatureKey: 'default',
      signatureText: getDefaultSignature()
    });
    setShowCompose(true);
  };

  const updateComposeField = (field, value) => {
    setComposeData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignatureChange = (nextKey) => {
    if (nextKey === 'custom') {
      setComposeData((prev) => ({ ...prev, signatureKey: nextKey }));
      return;
    }
    const selected = signatureTemplates.find((signature) => signature.key === nextKey);
    setComposeData((prev) => ({
      ...prev,
      signatureKey: nextKey,
      signatureText: selected?.value ?? ''
    }));
  };

  const handleSendCompose = async () => {
    const toValue = composeData.to.trim();
    const subjectValue = composeData.subject.trim();
    const bodyValue = composeData.body.trim();

    if (!toValue) {
      toast.error('Send To email is required');
      return;
    }
    if (!subjectValue) {
      toast.error('Subject is required');
      return;
    }
    if (!bodyValue) {
      toast.error('Email contents are required');
      return;
    }

    const finalBody = `${bodyValue}${composeData.signatureText ? `\n\n${composeData.signatureText}` : ''}`;
    const messagePayload = {
      to: toValue,
      cc: composeData.cc.trim(),
      bcc: composeData.bcc.trim(),
      subject: subjectValue,
      body: finalBody,
      sentBy: auth.currentUser?.email || 'unknown',
      sentAt: new Date().toISOString(),
      direction: 'outbound'
    };

    setSending(true);
    try {
      const webhookUrl = process.env.REACT_APP_CRM_EMAIL_WEBHOOK_URL;
      if (webhookUrl) {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messagePayload)
        });
        if (!response.ok) {
          throw new Error('Webhook email send failed');
        }
      } else {
        const mailtoParams = new URLSearchParams();
        if (messagePayload.cc) mailtoParams.set('cc', messagePayload.cc);
        if (messagePayload.bcc) mailtoParams.set('bcc', messagePayload.bcc);
        mailtoParams.set('subject', messagePayload.subject);
        mailtoParams.set('body', messagePayload.body);
        window.open(`mailto:${encodeURIComponent(messagePayload.to)}?${mailtoParams.toString()}`, '_blank', 'noopener');
      }

      const sentEntry = {
        id: `sent-${Date.now()}`,
        folder: 'sent',
        from: messagePayload.sentBy,
        to: messagePayload.to,
        subject: messagePayload.subject,
        snippet: messagePayload.body.slice(0, 160),
        body: messagePayload.body,
        sentAt: messagePayload.sentAt,
        unread: false
      };

      setEmails((prev) => [sentEntry, ...prev]);
      setActiveFolder('sent');
      setSelectedEmailId(sentEntry.id);
      setShowCompose(false);
      toast.success(webhookUrl ? 'Email sent from CRM' : 'Email composer opened');
    } catch (error) {
      console.error('Error sending CRM inbox email:', error);
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="crm-email-view">
      <div className="crm-email-shell">
        <aside className="crm-email-sidebar">
          <button type="button" className="crm-email-compose-btn" onClick={openCompose}>
            <Plus size={16} />
            Compose
          </button>
          <div className="crm-email-folder-list">
            {folderItems.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className={`crm-email-folder-btn ${activeFolder === folder.id ? 'active' : ''}`}
                onClick={() => setActiveFolder(folder.id)}
              >
                <span>{folder.label}</span>
                <span>{folderCounts[folder.id] || 0}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="crm-email-main">
          <div className="crm-email-main-toolbar">
            <div className="crm-email-search">
              <Search size={16} color="#8a8a8a" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search mail"
              />
            </div>
            <button type="button" className="lead-action-btn" onClick={loadEmails}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner" />
            </div>
          ) : (
            <div className="crm-email-list-surface">
              <div className="crm-email-list-head">
                <div>Sender</div>
                <div>Subject</div>
                <div>Date</div>
              </div>
              <div className="crm-email-list-body">
                {visibleEmails.length === 0 && (
                  <div className="lead-empty-inline">No emails match this filter.</div>
                )}
                {visibleEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`crm-email-row ${selectedEmail?.id === email.id ? 'active' : ''} ${email.unread ? 'unread' : ''}`}
                    onClick={() => setSelectedEmailId(email.id)}
                  >
                    <div className="crm-email-row-from">{email.from || 'Unknown Sender'}</div>
                    <div className="crm-email-row-subject">
                      <span>{email.subject}</span>
                      <small>{email.snippet}</small>
                    </div>
                    <div className="crm-email-row-date">{formatInboxDate(email.sentAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {showCompose && (
        <div className="modal-overlay" onClick={() => !sending && setShowCompose(false)}>
          <div className="modal-content crm-email-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header crm-email-modal-header">
              <h2 style={{ margin: 0, fontSize: '20px', color: '#ffffff', fontWeight: '700' }}>Compose Email</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowCompose(false)}
                disabled={sending}
              >
                ×
              </button>
            </div>
            <div className="crm-email-modal-grid">
              <div className="lead-field">
                <label>Send To</label>
                <input
                  type="email"
                  value={composeData.to}
                  onChange={(event) => updateComposeField('to', event.target.value)}
                  placeholder="recipient@email.com"
                />
              </div>
              <div className="lead-field">
                <label>CC</label>
                <input
                  type="text"
                  value={composeData.cc}
                  onChange={(event) => updateComposeField('cc', event.target.value)}
                  placeholder="cc@email.com"
                />
              </div>
              <div className="lead-field">
                <label>BCC</label>
                <input
                  type="text"
                  value={composeData.bcc}
                  onChange={(event) => updateComposeField('bcc', event.target.value)}
                  placeholder="bcc@email.com"
                />
              </div>
              <div className="lead-field">
                <label>Subject</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(event) => updateComposeField('subject', event.target.value)}
                  placeholder="Email subject"
                />
              </div>
              <div className="lead-field crm-email-modal-body-field">
                <label>Email Contents</label>
                <textarea
                  rows={8}
                  value={composeData.body}
                  onChange={(event) => updateComposeField('body', event.target.value)}
                  placeholder="Write your email..."
                />
              </div>
              <div className="lead-field">
                <label>Signatures</label>
                <select
                  value={composeData.signatureKey}
                  onChange={(event) => handleSignatureChange(event.target.value)}
                >
                  {signatureTemplates.map((signature) => (
                    <option key={signature.key} value={signature.key}>
                      {signature.label}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={4}
                  value={composeData.signatureText}
                  onChange={(event) => updateComposeField('signatureText', event.target.value)}
                  placeholder="Signature text"
                />
              </div>
            </div>
            <div className="crm-email-modal-actions">
              <button type="button" className="lead-action-btn" onClick={() => setShowCompose(false)} disabled={sending}>
                Cancel
              </button>
              <button type="button" className="lead-action-btn lead-action-btn-primary" onClick={handleSendCompose} disabled={sending}>
                {sending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LEAD_PIPELINE_STAGES = [
  { value: 'cold', label: 'Cold' },
  { value: 'worked', label: 'Worked' },
  { value: 'active-deal', label: 'Active Deal' },
  { value: 'closed', label: 'Closed' },
  { value: 'lost', label: 'Lost' }
];

const SAMPLE_CRM_LEAD = {
  id: 'sample-lead-1',
  submittedAt: '2026-02-20T14:30:00.000Z',
  name: 'Sunrise Property Group LLC',
  phone: '(305) 555-0189',
  email: 'acquisitions@sunrisepg.com',
  serviceType: 'Buying a property',
  street: '1280 Biscayne Blvd',
  city: 'Miami',
  state: 'FL',
  zipCode: '33132',
  propertyType: 'commercial',
  warmth: 'closed',
  source: 'Zillow',
  attachments: []
};

const normalizeLeadWarmth = (value) => {
  const normalized = (value || '').toLowerCase().replace(/\s+/g, '-');
  if (normalized === 'active' || normalized === 'active-deals') return 'active-deal';
  return LEAD_PIPELINE_STAGES.some((stage) => stage.value === normalized) ? normalized : 'cold';
};

const getLeadWarmthLabel = (value) => {
  const normalized = normalizeLeadWarmth(value);
  return LEAD_PIPELINE_STAGES.find((stage) => stage.value === normalized)?.label || 'Cold';
};

const formatPropertyTypeLabel = (value) => {
  if (!value) return 'N/A';
  const normalized = value.toString().trim().toLowerCase();
  if (['sfr', 'single-family', 'single family'].includes(normalized)) return 'SFR';
  if (['multi-family', 'multifamily', 'multi family'].includes(normalized)) return 'Multifamily';
  if (normalized === 'commercial') return 'Commercial';
  return normalized
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatTimestamp = (value) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString();
};

const createLeadFormState = (leadData = {}) => ({
  name: leadData.name || leadData.fullName || leadData.entityName || '',
  phone: leadData.phone || '',
  email: leadData.email || '',
  serviceType: leadData.serviceType || leadData.service || leadData.serviceRequested || '',
  source: leadData.source || leadData.leadSource || '',
  contactMethod: leadData.contactMethod || '',
  notes: leadData.notes || '',
  street: leadData.street || leadData.address?.street || (typeof leadData.address === 'string' ? leadData.address : '') || '',
  city: leadData.city || leadData.address?.city || '',
  state: leadData.state || leadData.address?.state || '',
  zipCode: leadData.zipCode || leadData.zip || leadData.address?.zipCode || '',
  propertyType: leadData.propertyType || ''
});

const CRMLeadDetailPage = ({ leadId, onStartDeal, onBackToLeads }) => {
  const toast = useToast();
  const workspaceTabsWrapRef = useRef(null);
  const leadFileInputRef = useRef(null);
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [warmth, setWarmth] = useState('cold');
  const [linkedDealCount, setLinkedDealCount] = useState(0);
  const [workspaceTab, setWorkspaceTab] = useState('lead');
  const [activityTab, setActivityTab] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [leadForm, setLeadForm] = useState(createLeadFormState());
  const [formDirty, setFormDirty] = useState(false);
  const [customActivities, setCustomActivities] = useState([]);
  const [activityOverrides, setActivityOverrides] = useState({});
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [editingActivityDraft, setEditingActivityDraft] = useState({ title: '', summary: '', detail: '' });
  const [floatingTabId, setFloatingTabId] = useState(null);
  const [floatingTabLeft, setFloatingTabLeft] = useState(12);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [leadDetailViewTab, setLeadDetailViewTab] = useState('workspace');
  const [documentsViewTab, setDocumentsViewTab] = useState('library');
  const [documentsSearch, setDocumentsSearch] = useState('');
  const [documentsStateFilter, setDocumentsStateFilter] = useState('all');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [focusedDocumentId, setFocusedDocumentId] = useState(null);
  const [generatedLeadDocuments, setGeneratedLeadDocuments] = useState([]);
  const [pdfPreviewDocument, setPdfPreviewDocument] = useState(null);
  const [emailComposer, setEmailComposer] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    signatureKey: 'default',
    signatureText: ''
  });

  const CLOUDINARY_UPLOAD_PRESET = 'rems_unsigned';
  const CLOUDINARY_CLOUD_NAME = 'djaq0av66';
  const hasLinkedDeal = linkedDealCount > 0;

  const fetchLinkedDealCount = useCallback(async (targetLeadId) => {
    if (!targetLeadId) return 0;
    const dealsSnapshot = await getDocs(query(collection(db, 'deals'), where('leadId', '==', targetLeadId)));
    return dealsSnapshot.size;
  }, []);

  useEffect(() => {
    const loadLead = async () => {
      setLoading(true);
      if (!leadId) {
        setLead(null);
        setLinkedDealCount(0);
        setGeneratedLeadDocuments([]);
        setSelectedDocumentIds([]);
        setFocusedDocumentId(null);
        setDocumentsSearch('');
        setDocumentsStateFilter('all');
        setLoading(false);
        return;
      }

      if (leadId === 'sample-lead-1') {
        setLead(SAMPLE_CRM_LEAD);
        setAttachments(SAMPLE_CRM_LEAD.attachments || []);
        setWarmth(normalizeLeadWarmth(SAMPLE_CRM_LEAD.warmth));
        setLeadForm(createLeadFormState(SAMPLE_CRM_LEAD));
        setCustomActivities(Array.isArray(SAMPLE_CRM_LEAD.activityLog) ? SAMPLE_CRM_LEAD.activityLog : []);
        setActivityOverrides(SAMPLE_CRM_LEAD.activityOverrides || {});
        setGeneratedLeadDocuments(Array.isArray(SAMPLE_CRM_LEAD.generatedDocuments) ? SAMPLE_CRM_LEAD.generatedDocuments : []);
        setSelectedDocumentIds([]);
        setFocusedDocumentId(null);
        setDocumentsSearch('');
        setDocumentsStateFilter('all');
        setEditingActivityId(null);
        setFormDirty(false);
        setLinkedDealCount(0);
        setLoading(false);
        return;
      }

      try {
        const leadRef = doc(db, 'leads', leadId);
        const leadSnapshot = await getDoc(leadRef);

        if (!leadSnapshot.exists()) {
          setLead(null);
          setLinkedDealCount(0);
          setGeneratedLeadDocuments([]);
          setSelectedDocumentIds([]);
          setFocusedDocumentId(null);
          return;
        }

        const leadData = { id: leadSnapshot.id, ...leadSnapshot.data() };
        let existingLinkedDeals = 0;
        try {
          existingLinkedDeals = await fetchLinkedDealCount(leadData.id);
        } catch (dealsError) {
          console.error('Error loading linked deals for lead:', dealsError);
        }

        const normalizedWarmth = normalizeLeadWarmth(leadData.warmth || leadData.classification);
        const correctedWarmth = normalizedWarmth === 'active-deal' && existingLinkedDeals === 0
          ? 'worked'
          : normalizedWarmth;

        if (normalizedWarmth === 'active-deal' && correctedWarmth !== normalizedWarmth) {
          try {
            await updateDoc(doc(db, 'leads', leadData.id), {
              warmth: correctedWarmth,
              updatedAt: new Date().toISOString()
            });
          } catch (syncError) {
            console.error('Error syncing lead stage with linked deals:', syncError);
          }
        }

        leadData.warmth = correctedWarmth;
        setLead(leadData);
        setAttachments(leadData.attachments || []);
        setWarmth(correctedWarmth);
        setLeadForm(createLeadFormState(leadData));
        setCustomActivities(Array.isArray(leadData.activityLog) ? leadData.activityLog : []);
        setActivityOverrides(leadData.activityOverrides || {});
        setGeneratedLeadDocuments(Array.isArray(leadData.generatedDocuments) ? leadData.generatedDocuments : []);
        setSelectedDocumentIds([]);
        setFocusedDocumentId(null);
        setDocumentsSearch('');
        setDocumentsStateFilter('all');
        setEditingActivityId(null);
        setFormDirty(false);
        setLinkedDealCount(existingLinkedDeals);
      } catch (error) {
        console.error('Error loading lead detail:', error);
        setLinkedDealCount(0);
        setGeneratedLeadDocuments([]);
        setSelectedDocumentIds([]);
        setFocusedDocumentId(null);
      } finally {
        setLoading(false);
      }
    };

    loadLead();
  }, [fetchLinkedDealCount, leadId]);

  useEffect(() => {
    setPdfPreviewDocument(null);
  }, [leadId]);

  useEffect(() => {
    if (!floatingTabId) return undefined;

    const handleOutsideClick = (event) => {
      if (!workspaceTabsWrapRef.current?.contains(event.target)) {
        setFloatingTabId(null);
      }
    };

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setFloatingTabId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [floatingTabId]);

  const isSampleLead = lead?.id === 'sample-lead-1';

  const uploadFileToCloudinary = async (file, customFileName) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();

    return {
      fileName: customFileName || file.name,
      fileType: file.type || data.format || 'unknown',
      fileSize: file.size || data.bytes || 0,
      fileUrl: data.secure_url,
      publicId: data.public_id,
      uploadedAt: new Date().toISOString()
    };
  };

  const enqueuePendingFiles = (files) => {
    const normalized = Array.from(files || [])
      .filter((file) => file && file.name)
      .map((file, idx) => ({
        id: `pending-${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 7)}`,
        file,
        fileName: file.name,
        fileType: file.type || 'unknown',
        fileSize: file.size || 0
      }));

    if (normalized.length === 0) return;
    setPendingFiles((prev) => [...prev, ...normalized]);
  };

  const handlePendingFileNameChange = (pendingId, nextName) => {
    setPendingFiles((prev) =>
      prev.map((item) => (item.id === pendingId ? { ...item, fileName: nextName } : item))
    );
  };

  const removePendingFile = (pendingId) => {
    setPendingFiles((prev) => prev.filter((item) => item.id !== pendingId));
  };

  const persistLeadUpdate = async (updates) => {
    if (!lead?.id || isSampleLead) return;
    await updateDoc(doc(db, 'leads', lead.id), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  };

  const handleWarmthChange = async (nextWarmth, { bypassDealGuard = false } = {}) => {
    if (!lead) return;
    const previousWarmth = warmth;

    if (nextWarmth === 'active-deal' && !bypassDealGuard) {
      let nextLinkedDealCount = linkedDealCount;
      if (nextLinkedDealCount === 0) {
        try {
          nextLinkedDealCount = await fetchLinkedDealCount(lead.id);
          setLinkedDealCount(nextLinkedDealCount);
        } catch (error) {
          console.error('Error validating linked deal before stage change:', error);
        }
      }

      if (nextLinkedDealCount === 0) {
        toast.info('Active Deal requires a linked deal. Creating one now.');
        await handleStartDeal({ initiatedFromStageChange: true, navigateToDeals: false });
        return;
      }
    }

    setWarmth(nextWarmth);

    try {
      await persistLeadUpdate({ warmth: nextWarmth });
      setLead({ ...lead, warmth: nextWarmth });
      await appendActivityEntry({
        type: 'status',
        title: 'Pipeline stage changed',
        summary: `Lead moved to ${getLeadWarmthLabel(nextWarmth)}.`,
        detail: 'Stage updated from lead detail workspace.',
        isPermanent: true,
        source: 'workflow'
      });
    } catch (error) {
      console.error('Error updating lead warmth:', error);
      setWarmth(previousWarmth);
      setLead({ ...lead, warmth: previousWarmth });
    }
  };

  const handleLeadFormChange = (field, value) => {
    setLeadForm((prev) => ({ ...prev, [field]: value }));
    setFormDirty(true);
  };

  const buildLeadUpdatesFromForm = () => {
    const normalizedState = (leadForm.state || '').toUpperCase();
    const normalizedPropertyType = (leadForm.propertyType || '').trim().toLowerCase().replace(/\s+/g, '-');
    return {
      name: leadForm.name || '',
      phone: leadForm.phone || '',
      email: leadForm.email || '',
      serviceType: leadForm.serviceType || '',
      source: leadForm.source || '',
      contactMethod: leadForm.contactMethod || '',
      notes: leadForm.notes || '',
      street: leadForm.street || '',
      city: leadForm.city || '',
      state: normalizedState,
      zipCode: leadForm.zipCode || '',
      propertyType: normalizedPropertyType || null,
      address: {
        street: leadForm.street || '',
        city: leadForm.city || '',
        state: normalizedState,
        zipCode: leadForm.zipCode || ''
      }
    };
  };

  const appendActivityEntry = async (entry) => {
    const nextEntry = {
      id: `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      isPermanent: false,
      source: 'user',
      ...entry
    };
    const nextActivities = [nextEntry, ...customActivities];
    setCustomActivities(nextActivities);
    if (!isSampleLead) {
      await persistLeadUpdate({ activityLog: nextActivities });
    }
  };

  const beginActivityEdit = (entry) => {
    setEditingActivityId(entry.id);
    setEditingActivityDraft({
      title: entry.title || '',
      summary: entry.summary || '',
      detail: entry.detail || ''
    });
  };

  const cancelActivityEdit = () => {
    setEditingActivityId(null);
    setEditingActivityDraft({ title: '', summary: '', detail: '' });
  };

  const saveActivityEdit = async () => {
    if (!editingActivityId) return;
    const nextOverrides = {
      ...activityOverrides,
      [editingActivityId]: {
        title: editingActivityDraft.title || '',
        summary: editingActivityDraft.summary || '',
        detail: editingActivityDraft.detail || ''
      }
    };

    setSaving(true);
    try {
      setActivityOverrides(nextOverrides);
      if (!isSampleLead) {
        await persistLeadUpdate({ activityOverrides: nextOverrides });
      }
      toast.success('Activity entry updated');
      cancelActivityEdit();
    } catch (error) {
      console.error('Error updating activity entry:', error);
      toast.error('Failed to update activity entry');
    } finally {
      setSaving(false);
    }
  };

  const isPermanentActivityEntry = (entry) => {
    const combinedText = `${entry?.title || ''} ${entry?.summary || ''} ${entry?.detail || ''}`.toLowerCase();
    return Boolean(entry?.isPermanent) || combinedText.includes('email') || combinedText.includes('workflow');
  };

  const canDeleteActivityEntry = (entry) => Boolean(entry?.isCustom) && !isPermanentActivityEntry(entry);

  const handleDeleteActivityEntry = async (entry) => {
    if (!entry?.id || !entry?.isCustom) return;
    if (isPermanentActivityEntry(entry)) {
      toast.info('Email and workflow activity entries are permanent');
      return;
    }

    const confirmed = window.confirm('Delete this activity entry?');
    if (!confirmed) return;

    const nextActivities = customActivities.filter((activity) => activity.id !== entry.id);
    const nextOverrides = { ...activityOverrides };
    delete nextOverrides[entry.id];

    setSaving(true);
    try {
      if (!isSampleLead) {
        await persistLeadUpdate({
          activityLog: nextActivities,
          activityOverrides: nextOverrides
        });
      }
      setCustomActivities(nextActivities);
      setActivityOverrides(nextOverrides);
      if (editingActivityId === entry.id) {
        cancelActivityEdit();
      }
      toast.success('Activity deleted');
    } catch (error) {
      console.error('Error deleting activity entry:', error);
      toast.error('Failed to delete activity');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLeadDetails = async ({ showToast = true, closeAfterSave = false } = {}) => {
    if (!lead) return false;

    setSaving(true);
    try {
      const updates = buildLeadUpdatesFromForm();
      if (!isSampleLead) {
        await persistLeadUpdate(updates);
      }
      setLead((prev) => ({ ...prev, ...updates }));
      setLeadForm(createLeadFormState({ ...lead, ...updates }));
      setFormDirty(false);

      if (showToast) {
        toast.success('Lead details saved');
      }

      if (closeAfterSave) {
        onBackToLeads?.();
      }
      return true;
    } catch (error) {
      console.error('Error saving lead details:', error);
      toast.error('Failed to save lead details');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCheckIn = async () => {
    if (formDirty) {
      const saved = await handleSaveLeadDetails({ showToast: false });
      if (!saved) return;
    }
    try {
      setSaving(true);
      await appendActivityEntry({
        type: 'contact',
        title: 'Lead checked in',
        summary: 'Quick check-in action was completed.',
        detail: `Handled by ${auth.currentUser?.email || 'current user'}.`
      });
      toast.success('Check-In recorded');
    } catch (error) {
      console.error('Error recording check-in:', error);
      toast.error('Failed to record check-in');
    } finally {
      setSaving(false);
    }
  };

  const handleStartDesk = async () => {
    if (formDirty) {
      const saved = await handleSaveLeadDetails({ showToast: false });
      if (!saved) return;
    }
    try {
      setSaving(true);
      await appendActivityEntry({
        type: 'deal',
        title: 'Desk flow started',
        summary: 'Lead moved into desk prep workflow.',
        detail: 'Desk stage opened from lead detail page.',
        isPermanent: true,
        source: 'workflow'
      });
      if (warmth === 'cold') {
        await handleWarmthChange('worked');
      }
      toast.success('Desk workflow started');
    } catch (error) {
      console.error('Error starting desk workflow:', error);
      toast.error('Failed to start desk workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    await handleSaveLeadDetails({ showToast: true, closeAfterSave: true });
  };

  const getDefaultSignature = () => {
    const senderName = auth.currentUser?.displayName || auth.currentUser?.email || 'DealCenter Team';
    return `${senderName}\nDealCenter CRM`;
  };

  const emailSignatureTemplates = [
    { key: 'default', label: 'Default Signature', value: getDefaultSignature() },
    { key: 'acquisitions', label: 'Acquisitions Team', value: 'Acquisitions Team\nDealCenter CRM' },
    { key: 'dispositions', label: 'Dispositions Team', value: 'Dispositions Team\nDealCenter CRM' },
    { key: 'none', label: 'No Signature', value: '' },
    { key: 'custom', label: 'Custom Signature', value: emailComposer.signatureText || '' }
  ];

  const openEmailComposer = () => {
    const leadName = leadForm.name || lead?.name || 'there';
    const serviceLabel = leadForm.serviceType || 'real estate request';
    setEmailComposer({
      to: leadForm.email || '',
      cc: '',
      bcc: '',
      subject: `Regarding your ${serviceLabel}`,
      body: `Hi ${leadName},\n\n`,
      signatureKey: 'default',
      signatureText: getDefaultSignature()
    });
    setShowEmailComposer(true);
  };

  const handleEmailComposerChange = (field, value) => {
    setEmailComposer((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignatureTemplateChange = (nextKey) => {
    if (nextKey === 'custom') {
      setEmailComposer((prev) => ({ ...prev, signatureKey: nextKey }));
      return;
    }
    const selected = emailSignatureTemplates.find((template) => template.key === nextKey);
    setEmailComposer((prev) => ({
      ...prev,
      signatureKey: nextKey,
      signatureText: selected?.value ?? ''
    }));
  };

  const handleSendEmail = async () => {
    const toValue = (emailComposer.to || '').trim();
    const subjectValue = (emailComposer.subject || '').trim();
    const bodyValue = (emailComposer.body || '').trim();

    if (!toValue) {
      toast.error('Send To email is required');
      return;
    }
    if (!subjectValue) {
      toast.error('Subject is required');
      return;
    }
    if (!bodyValue) {
      toast.error('Email contents are required');
      return;
    }

    const finalBody = `${bodyValue}${emailComposer.signatureText ? `\n\n${emailComposer.signatureText}` : ''}`;
    const messagePayload = {
      to: toValue,
      cc: (emailComposer.cc || '').trim(),
      bcc: (emailComposer.bcc || '').trim(),
      subject: subjectValue,
      body: finalBody,
      leadId: lead?.id || null,
      sentBy: auth.currentUser?.email || 'unknown',
      sentAt: new Date().toISOString()
    };

    setSendingEmail(true);
    try {
      const webhookUrl = process.env.REACT_APP_CRM_EMAIL_WEBHOOK_URL;
      if (webhookUrl) {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messagePayload)
        });
        if (!response.ok) {
          throw new Error('Webhook email send failed');
        }
      } else {
        const mailtoParams = new URLSearchParams();
        if (messagePayload.cc) mailtoParams.set('cc', messagePayload.cc);
        if (messagePayload.bcc) mailtoParams.set('bcc', messagePayload.bcc);
        mailtoParams.set('subject', messagePayload.subject);
        mailtoParams.set('body', messagePayload.body);
        window.open(`mailto:${encodeURIComponent(messagePayload.to)}?${mailtoParams.toString()}`, '_blank', 'noopener');
      }

      const existingHistory = Array.isArray(lead?.emailHistory) ? lead.emailHistory : [];
      const nextEmailHistory = [messagePayload, ...existingHistory].slice(0, 100);
      if (!isSampleLead) {
        await persistLeadUpdate({ emailHistory: nextEmailHistory });
      }
      setLead((prev) => ({ ...prev, emailHistory: nextEmailHistory }));

      await appendActivityEntry({
        type: 'contact',
        title: 'Email sent',
        summary: subjectValue,
        detail: `To: ${messagePayload.to}${messagePayload.cc ? ` • CC: ${messagePayload.cc}` : ''}${messagePayload.bcc ? ' • BCC added' : ''}`,
        isPermanent: true,
        source: 'email'
      });

      toast.success(webhookUrl ? 'Email sent from CRM' : 'Email composer opened');
      setShowEmailComposer(false);
    } catch (error) {
      console.error('Error sending CRM email:', error);
      toast.error('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleEngagementAction = async (label) => {
    if (label === 'Send Email') {
      openEmailComposer();
      return;
    }

    if (formDirty) {
      const saved = await handleSaveLeadDetails({ showToast: false });
      if (!saved) return;
    }
    try {
      setSaving(true);
      await appendActivityEntry({
        type: 'contact',
        title: label,
        summary: `${label} action created from workspace toolbar.`,
        detail: 'Wire this action to downstream automations if needed.',
        isPermanent: label.toLowerCase().includes('workflow'),
        source: label.toLowerCase().includes('workflow') ? 'workflow' : 'user'
      });
      toast.success(`${label} added to activity`);
    } catch (error) {
      console.error(`Error handling ${label}:`, error);
      toast.error(`Failed to run ${label}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFiles = async () => {
    if (pendingFiles.length === 0) return;

    setSaving(true);
    try {
      const uploadedFiles = [];
      for (const pendingItem of pendingFiles) {
        const uploaded = await uploadFileToCloudinary(pendingItem.file, pendingItem.fileName);
        uploadedFiles.push(uploaded);
      }

      const updatedAttachments = [...attachments, ...uploadedFiles];
      setAttachments(updatedAttachments);
      setPendingFiles([]);
      await persistLeadUpdate({ attachments: updatedAttachments });
      await appendActivityEntry({
        type: 'files',
        title: 'Files uploaded',
        summary: `${uploadedFiles.length} file(s) uploaded.`,
        detail: 'Files were added from the lead detail workspace.'
      });
      toast.success('Files uploaded');
    } catch (error) {
      console.error('Error uploading lead files:', error);
      toast.error('Failed to upload files');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAttachmentNames = async () => {
    setSaving(true);
    try {
      await persistLeadUpdate({ attachments });
      await appendActivityEntry({
        type: 'files',
        title: 'File names updated',
        summary: `${attachments.length} file name(s) saved.`,
        detail: 'File metadata was updated for this lead.'
      });
      toast.success('File names updated');
    } catch (error) {
      console.error('Error saving attachment names:', error);
      toast.error('Failed to save file names');
    } finally {
      setSaving(false);
    }
  };

  const handleStartDeal = async ({ initiatedFromStageChange = false, navigateToDeals = true } = {}) => {
    if (!lead) return;

    if (formDirty) {
      const saved = await handleSaveLeadDetails({ showToast: false });
      if (!saved) return;
    }

    setSaving(true);
    try {
      const existingDeals = await getDocs(query(collection(db, 'deals'), where('leadId', '==', lead.id)));
      if (!existingDeals.empty) {
        setLinkedDealCount(existingDeals.size);
        if (warmth !== 'active-deal') {
          await handleWarmthChange('active-deal', { bypassDealGuard: true });
        }
        if (initiatedFromStageChange) {
          toast.success('Linked deal found. Lead moved to Active Deal.');
        } else {
          toast.info('Deal already exists for this lead');
        }
        if (navigateToDeals) {
          onStartDeal?.('active');
        }
        return;
      }

      const serviceText = (leadForm.serviceType || '').toLowerCase();
      const leadName = leadForm.name || lead.name || lead.fullName || lead.entityName || 'Lead';
      const address = [leadForm.street, `${leadForm.city || ''}, ${leadForm.state || ''} ${leadForm.zipCode || ''}`]
        .filter(Boolean)
        .join(', ');

      const dealPayload = {
        leadId: lead.id,
        buyerName: serviceText.includes('buy') ? leadName : '',
        sellerName: serviceText.includes('sell') ? leadName : '',
        propertyAddress: address || 'No property address provided',
        propertyType: leadForm.propertyType || null,
        status: 'new',
        source: leadForm.source || lead.source || lead.leadSource || 'CRM Lead',
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      };

      if (!dealPayload.buyerName && !dealPayload.sellerName) {
        dealPayload.buyerName = leadName;
      }

      await addDoc(collection(db, 'deals'), dealPayload);
      setLinkedDealCount(existingDeals.size + 1);
      await handleWarmthChange('active-deal', { bypassDealGuard: true });
      await appendActivityEntry({
        type: 'deal',
        title: 'Deal started',
        summary: 'Lead was converted to a deal.',
        detail: 'A new record was created in Deals with a leadId reference.',
        isPermanent: true,
        source: 'workflow'
      });
      toast.success(initiatedFromStageChange ? 'Deal created and lead moved to Active Deal' : 'Lead converted to deal');
      if (navigateToDeals) {
        onStartDeal?.('new');
      }
    } catch (error) {
      console.error('Error creating deal from lead:', error);
      toast.error('Failed to start deal');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="page-content">
        <div className="empty-state-card">
          <div className="empty-state-title">Lead not found</div>
          <div className="empty-state-subtitle">This lead may have been removed or is unavailable.</div>
        </div>
      </div>
    );
  }

  const leadName = leadForm.name || lead.name || lead.fullName || lead.entityName || 'N/A';
  const serviceType = leadForm.serviceType || lead.serviceType || lead.service || lead.serviceRequested || 'N/A';
  const source = leadForm.source || lead.source || lead.leadSource || 'N/A';
  const propertyType = formatPropertyTypeLabel(leadForm.propertyType || lead.propertyType);
  const submittedAt = lead.submittedAt || lead.createdAt;
  const submittedLabel = formatTimestamp(submittedAt);
  const lastUpdatedLabel = formatTimestamp(lead.updatedAt || submittedAt);
  const pipelineStageIndex = Math.max(0, LEAD_PIPELINE_STAGES.findIndex((stage) => stage.value === warmth));
  const pipelineProgressPct = LEAD_PIPELINE_STAGES.length > 1
    ? (pipelineStageIndex / (LEAD_PIPELINE_STAGES.length - 1)) * 100
    : 0;

  const workspaceTabs = [
    { id: 'lead', label: 'Lead' },
    { id: 'credit', label: 'Credit' },
    { id: 'prequal', label: 'Pre-Qual' },
    { id: 'property', label: 'Property' },
    { id: 'deals', label: 'Deals' },
    { id: 'files', label: 'Files' },
    { id: 'activity', label: 'Activity' }
  ];

  const activityTabs = [
    { id: 'all', label: 'All' },
    { id: 'status', label: 'Status' },
    { id: 'contact', label: 'Contact' },
    { id: 'deal', label: 'Deal' },
    { id: 'files', label: 'Files' }
  ];

  const baseActivityEntries = [
    {
      id: 'lead-submitted',
      type: 'status',
      title: 'Lead submitted',
      summary: `${leadName} entered the CRM pipeline.`,
      detail: `Source: ${source} • Service: ${serviceType}`,
      createdAt: submittedAt
    },
    {
      id: 'lead-stage',
      type: 'status',
      title: 'Pipeline stage updated',
      summary: `Lead is currently in "${getLeadWarmthLabel(warmth)}".`,
      detail: 'Use the stage tracker above to move the lead through the workflow.',
      createdAt: lead.updatedAt || submittedAt
    },
    {
      id: 'lead-contact',
      type: 'contact',
      title: 'Contact profile captured',
      summary: `${leadForm.phone || lead.phone || 'No phone on file'} • ${leadForm.email || lead.email || 'No email on file'}`,
      detail: 'Keep contact details complete for assignment and outreach automation.',
      createdAt: submittedAt
    },
    {
      id: 'lead-deal',
      type: 'deal',
      title: 'Deal conversion available',
      summary: 'Start Deal creates a linked record in the Deals page.',
      detail: 'Converted deals remain connected to this lead by leadId.',
      createdAt: lead.updatedAt || submittedAt
    },
    {
      id: 'lead-files',
      type: 'files',
      title: attachments.length > 0 ? 'Files attached' : 'No files attached yet',
      summary: attachments.length > 0 ? `${attachments.length} file(s) currently linked.` : 'Upload files from the right panel.',
      detail: 'Rename files after upload for cleaner organization.',
      createdAt: lead.updatedAt || submittedAt
    }
  ];

  const customActivityEntries = customActivities.map((entry) => ({ ...entry, isCustom: true }));
  const baseSystemActivityEntries = baseActivityEntries.map((entry) => ({
    ...entry,
    isCustom: false,
    isPermanent: true,
    source: 'system'
  }));

  const activityEntries = [...customActivityEntries, ...baseSystemActivityEntries]
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .map((entry) => ({
      ...entry,
      ...(activityOverrides[entry.id] || {})
    }));

  const filteredActivityEntries = activityEntries.filter((entry) => {
    const matchesTab = activityTab === 'all' || entry.type === activityTab;
    const queryText = `${entry.title} ${entry.summary} ${entry.detail}`.toLowerCase();
    const matchesSearch = !activitySearch || queryText.includes(activitySearch.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const primaryActions = [
    { id: 'save', label: 'Save' }
  ];

  const engagementActions = [
    'Phone Call',
    'Send SMS',
    'Send Email',
    'Schedule Appt',
    'Add Task',
    'Add Note',
    'Disposition'
  ];
  const serviceRequestedOptions = [
    'Buying a property',
    'Selling a property',
    'Lending',
    'Investing',
    'Other'
  ];
  const selectedServiceValue = leadForm.serviceType || '';
  const serviceOptions = serviceRequestedOptions.includes(selectedServiceValue) || !selectedServiceValue
    ? serviceRequestedOptions
    : [selectedServiceValue, ...serviceRequestedOptions];

  const handleWorkspaceTabClick = (tabId, event) => {
    setWorkspaceTab(tabId);

    if (floatingTabId === tabId) {
      setFloatingTabId(null);
      return;
    }

    const wrapEl = workspaceTabsWrapRef.current;
    if (!wrapEl) {
      setFloatingTabLeft(12);
      setFloatingTabId(tabId);
      return;
    }

    const wrapRect = wrapEl.getBoundingClientRect();
    const btnRect = event.currentTarget.getBoundingClientRect();
    const estimatedPopupWidth = Math.min(420, Math.max(280, wrapRect.width - 24));
    let nextLeft = btnRect.left - wrapRect.left;
    const maxLeft = Math.max(12, wrapRect.width - estimatedPopupWidth - 12);
    nextLeft = Math.max(12, Math.min(nextLeft, maxLeft));

    setFloatingTabLeft(nextLeft);
    setFloatingTabId(tabId);
  };

  const handleFileInputChange = (event) => {
    enqueuePendingFiles(event.target.files);
    event.target.value = '';
  };

  const handleFileDragOver = (event) => {
    event.preventDefault();
    if (!isFileDragOver) setIsFileDragOver(true);
  };

  const handleFileDragLeave = (event) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsFileDragOver(false);
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    setIsFileDragOver(false);
    enqueuePendingFiles(event.dataTransfer?.files);
  };

  const handlePrimaryAction = (actionId) => {
    if (actionId === 'checkin') {
      handleCheckIn();
      return;
    }
    if (actionId === 'desk') {
      handleStartDesk();
      return;
    }
    if (actionId === 'save') {
      handleSaveLeadDetails();
    }
  };

  const floatingTabLabel = workspaceTabs.find((tab) => tab.id === floatingTabId)?.label || 'Section';
  const formatFileSize = (bytes) => {
    const size = Number(bytes || 0);
    if (!size) return '—';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };
  const documentRows = [
    ...pendingFiles.map((pendingItem) => ({
      id: pendingItem.id,
      source: 'pending',
      fileName: pendingItem.fileName,
      fileType: pendingItem.fileType || 'unknown',
      fileSize: pendingItem.fileSize || 0,
      fileUrl: null
    })),
    ...attachments.map((attachment, idx) => ({
      id: attachment.publicId || attachment.fileUrl || `uploaded-${idx}`,
      source: 'uploaded',
      index: idx,
      fileName: attachment.fileName || '',
      fileType: attachment.fileType || 'unknown',
      fileSize: attachment.fileSize || 0,
      fileUrl: attachment.fileUrl || null
    }))
  ];

  const leadDetailTabs = [
    { id: 'workspace', label: 'Lead Workspace' },
    { id: 'documents', label: 'Documents Page' },
    { id: 'files', label: 'Files Hub' }
  ];

  const leadDocumentStateOptions = [
    { value: 'all', label: 'All States' },
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'Under Review' },
    { value: 'ready', label: 'Ready to Sign' },
    { value: 'signed', label: 'Signed' }
  ];

  const leadDocumentsTabs = [
    { id: 'library', label: 'Forms Library' },
    { id: 'sign-bundles', label: 'Sign Bundles' },
    { id: 'print-bundles', label: 'Print Bundles' }
  ];

  const getDocumentStateLabel = (value) => (
    leadDocumentStateOptions.find((option) => option.value === value)?.label || 'Draft'
  );

  const sampleLibraryDocuments = [
    {
      id: 'sample-purchase-agreement',
      docType: 'Purchase Agreement',
      title: 'Sample Real Estate Purchase Agreement',
      state: 'ready',
      category: 'Contract',
      format: 'PDF',
      version: 'v1.0',
      language: 'English',
      esign: 'Yes',
      createdAt: '2026-02-24T15:20:00.000Z',
      updatedAt: '2026-02-26T09:35:00.000Z',
      content: [
        'Real Estate Purchase Agreement (Sample)',
        '',
        `Buyer: ${leadName}`,
        `Property: ${leadForm.street || 'N/A'}, ${leadForm.city || 'N/A'}, ${leadForm.state || 'N/A'} ${leadForm.zipCode || ''}`,
        'Purchase Price: $250,000',
        'Deposit: $5,000',
        'Closing Date: March 15, 2026',
        '',
        'This sample is for UI demonstration only and is not a legal document.'
      ].join('\n')
    },
    {
      id: 'sample-inspection-addendum',
      docType: 'Inspection Addendum',
      title: 'Sample Inspection Review Addendum',
      state: 'draft',
      category: 'Addendum',
      format: 'PDF',
      version: 'v0.8',
      language: 'English',
      esign: 'No',
      createdAt: '2026-02-23T11:00:00.000Z',
      updatedAt: '2026-02-25T08:15:00.000Z',
      content: [
        'Inspection Review Addendum (Sample)',
        '',
        `Property: ${leadForm.street || 'N/A'}, ${leadForm.city || 'N/A'}, ${leadForm.state || 'N/A'} ${leadForm.zipCode || ''}`,
        'Requested Repair Credit: $3,500',
        'Inspection Response Deadline: March 3, 2026',
        '',
        'This sample is for UI demonstration only and is not a legal document.'
      ].join('\n')
    },
    {
      id: 'sample-disclosure-sheet',
      docType: 'Seller Disclosure',
      title: 'Sample Seller Disclosure Summary',
      state: 'review',
      category: 'Disclosure',
      format: 'PDF',
      version: 'v1.2',
      language: 'English',
      esign: 'Yes',
      createdAt: '2026-02-22T09:10:00.000Z',
      updatedAt: '2026-02-24T12:05:00.000Z',
      content: [
        'Seller Disclosure Summary (Sample)',
        '',
        `Property Type: ${propertyType}`,
        'Occupancy Status: Vacant',
        'Material Defects Reported: None listed',
        '',
        'This sample is for UI demonstration only and is not a legal document.'
      ].join('\n')
    }
  ];

  const normalizedGeneratedDocuments = generatedLeadDocuments.map((docItem, index) => ({
    ...docItem,
    id: docItem.id || `admin-doc-${index}`,
    title: docItem.title || `Admin Form ${index + 1}`,
    state: docItem.state || 'draft',
    docType: docItem.docType || 'Admin Form',
    category: docItem.category || 'Library',
    format: docItem.format || 'PDF',
    version: docItem.version || 'v1.0',
    language: docItem.language || 'English',
    esign: docItem.esign || 'No',
    content: docItem.content || 'No preview content available yet.',
    createdAt: docItem.createdAt || new Date().toISOString(),
    updatedAt: docItem.updatedAt || docItem.createdAt || new Date().toISOString()
  }));

  const libraryDocuments = [...sampleLibraryDocuments, ...normalizedGeneratedDocuments];

  const filteredLibraryDocuments = libraryDocuments.filter((docItem) => {
    const matchesSearch = !documentsSearch
      || `${docItem.title} ${docItem.docType} ${docItem.category} ${docItem.id}`.toLowerCase().includes(documentsSearch.toLowerCase());
    const matchesState = documentsStateFilter === 'all' || docItem.state === documentsStateFilter;
    return matchesSearch && matchesState;
  });

  const activeFocusedDocumentId = filteredLibraryDocuments.some((docItem) => docItem.id === focusedDocumentId)
    ? focusedDocumentId
    : filteredLibraryDocuments[0]?.id || null;

  const focusedLibraryDocument = filteredLibraryDocuments.find((docItem) => docItem.id === activeFocusedDocumentId)
    || null;

  const selectedLibraryDocuments = libraryDocuments.filter((docItem) => selectedDocumentIds.includes(docItem.id));

  const toggleLibraryDocumentSelection = (documentId) => {
    setSelectedDocumentIds((prev) => (
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId]
    ));
  };

  const clearSelectedLibraryDocuments = () => {
    setSelectedDocumentIds([]);
  };

  const isPdfDocumentRow = (row) => {
    const normalizedType = (row?.fileType || '').toLowerCase();
    const normalizedName = (row?.fileName || '').toLowerCase();
    return normalizedType.includes('pdf') || normalizedName.endsWith('.pdf');
  };

  const openPdfPreview = (row) => {
    if (!row?.fileUrl || !isPdfDocumentRow(row)) return;
    setPdfPreviewDocument({
      id: row.id,
      fileName: row.fileName || 'Document.pdf',
      fileUrl: row.fileUrl
    });
  };

  const handleDocumentRowDoubleClick = (event, row) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, button, a, select, textarea')) {
      return;
    }

    openPdfPreview(row);
  };

  const handleDownloadDocument = async (row) => {
    if (!row?.fileUrl) return;

    try {
      const response = await fetch(row.fileUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = row.fileName || 'document';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Error downloading file:', error);
      window.open(row.fileUrl, '_blank', 'noopener,noreferrer');
      toast.info('Opened file in a new tab because download was unavailable.');
    }
  };

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const openSelectedDocumentsInPdfView = () => {
    if (selectedLibraryDocuments.length === 0) {
      toast.error('Select at least one document first');
      return;
    }

    const viewerWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!viewerWindow) {
      toast.error('Allow pop-ups to open the document viewer');
      return;
    }

    const sidebarItems = selectedLibraryDocuments.map((docItem, index) => `
      <a class="pdf-viewer-nav-item" href="#doc-page-${index + 1}">
        <div class="pdf-viewer-thumb">
          <div class="pdf-viewer-thumb-page">${index + 1}</div>
        </div>
        <div class="pdf-viewer-nav-text">${escapeHtml(docItem.title)}</div>
      </a>
    `).join('');

    const documentPages = selectedLibraryDocuments.map((docItem, index) => `
      <section class="pdf-viewer-page-wrap" id="doc-page-${index + 1}">
        <div class="pdf-viewer-page-title">${escapeHtml(docItem.title)}</div>
        <div class="pdf-viewer-page-meta">
          <span>${escapeHtml(docItem.docType)}</span>
          <span>${escapeHtml(getDocumentStateLabel(docItem.state))}</span>
          <span>${escapeHtml(docItem.version)}</span>
        </div>
        <article class="pdf-viewer-page">
          <pre>${escapeHtml(docItem.content)}</pre>
        </article>
      </section>
    `).join('');

    viewerWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Lead Documents Viewer</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background: #1f1f1f;
              color: #ffffff;
            }
            .pdf-viewer-shell {
              display: grid;
              grid-template-columns: 300px minmax(0, 1fr);
              min-height: 100vh;
            }
            .pdf-viewer-sidebar {
              background: #e9edf5;
              color: #101010;
              padding: 20px 18px;
              border-right: 1px solid #cfd7e3;
            }
            .pdf-viewer-help {
              color: #2570d4;
              font-size: 14px;
              font-weight: 700;
              margin-bottom: 20px;
            }
            .pdf-viewer-pack {
              background: #c8dcff;
              border-radius: 10px;
              padding: 12px 14px;
              font-size: 18px;
              font-weight: 700;
              margin-bottom: 20px;
            }
            .pdf-viewer-nav {
              display: flex;
              flex-direction: column;
              gap: 14px;
            }
            .pdf-viewer-nav-item {
              display: flex;
              align-items: center;
              gap: 12px;
              text-decoration: none;
              color: #101010;
            }
            .pdf-viewer-thumb {
              width: 76px;
              height: 98px;
              border: 1px solid #8aa8d8;
              background: linear-gradient(180deg, #ffffff 0%, #f2f5fa 100%);
              display: flex;
              align-items: flex-end;
              justify-content: center;
              padding-bottom: 8px;
              border-radius: 6px;
            }
            .pdf-viewer-thumb-page {
              font-size: 22px;
              font-weight: 700;
              color: #486ea4;
            }
            .pdf-viewer-nav-text {
              font-size: 15px;
              font-weight: 600;
              line-height: 1.35;
            }
            .pdf-viewer-main {
              background: #2d2d2d;
              display: flex;
              flex-direction: column;
              min-width: 0;
            }
            .pdf-viewer-toolbar {
              height: 72px;
              padding: 0 22px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 20px;
              background: #2a2a2a;
              border-bottom: 1px solid #3a3a3a;
              position: sticky;
              top: 0;
              z-index: 10;
            }
            .pdf-viewer-toolbar-title {
              font-size: 22px;
              font-weight: 700;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .pdf-viewer-toolbar-stats {
              display: flex;
              align-items: center;
              gap: 16px;
              color: #cfcfcf;
              font-size: 16px;
            }
            .pdf-viewer-toolbar-chip {
              border: 1px solid #4d4d4d;
              border-radius: 8px;
              padding: 8px 12px;
              background: #1f1f1f;
            }
            .pdf-viewer-pages {
              padding: 26px;
              display: flex;
              flex-direction: column;
              gap: 28px;
              overflow-y: auto;
            }
            .pdf-viewer-page-wrap {
              display: flex;
              flex-direction: column;
              gap: 12px;
              align-items: center;
            }
            .pdf-viewer-page-title {
              font-size: 18px;
              font-weight: 700;
            }
            .pdf-viewer-page-meta {
              display: flex;
              gap: 10px;
              flex-wrap: wrap;
              color: #b7b7b7;
              font-size: 13px;
            }
            .pdf-viewer-page {
              width: min(100%, 880px);
              min-height: 1120px;
              background: #ffffff;
              color: #111111;
              box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
              border-radius: 2px;
              padding: 64px 72px;
            }
            .pdf-viewer-page pre {
              margin: 0;
              white-space: pre-wrap;
              word-break: break-word;
              font-family: "Times New Roman", Georgia, serif;
              font-size: 18px;
              line-height: 1.7;
            }
            @media (max-width: 980px) {
              .pdf-viewer-shell {
                grid-template-columns: 1fr;
              }
              .pdf-viewer-sidebar {
                border-right: none;
                border-bottom: 1px solid #cfd7e3;
              }
              .pdf-viewer-page {
                padding: 32px 24px;
                min-height: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="pdf-viewer-shell">
            <aside class="pdf-viewer-sidebar">
              <div class="pdf-viewer-help">Lead document packet</div>
              <div class="pdf-viewer-pack">Merged Forms (${selectedLibraryDocuments.length})</div>
              <nav class="pdf-viewer-nav">${sidebarItems}</nav>
            </aside>
            <main class="pdf-viewer-main">
              <div class="pdf-viewer-toolbar">
                <div class="pdf-viewer-toolbar-title">${escapeHtml(selectedLibraryDocuments[0]?.title || 'Lead Documents')}</div>
                <div class="pdf-viewer-toolbar-stats">
                  <div class="pdf-viewer-toolbar-chip">${selectedLibraryDocuments.length} docs</div>
                  <div class="pdf-viewer-toolbar-chip">PDF View</div>
                </div>
              </div>
              <div class="pdf-viewer-pages">${documentPages}</div>
            </main>
          </div>
        </body>
      </html>
    `);
    viewerWindow.document.close();
  };

  const renderFilesPanel = () => (
    <div className="lead-panel-card">
      <div className="lead-panel-title">Files</div>
      <div className="lead-files-toolbar">
        <button type="button" className="lead-action-btn" onClick={() => leadFileInputRef.current?.click()} disabled={saving}>
          Choose Files
        </button>
        <button className="lead-action-btn" onClick={handleUploadFiles} disabled={saving || pendingFiles.length === 0}>
          Upload
        </button>
        <button className="lead-action-btn" onClick={handleSaveAttachmentNames} disabled={saving || attachments.length === 0}>
          Save Names
        </button>
      </div>
      <input
        ref={leadFileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      <div
        className={`lead-file-dropzone ${isFileDragOver ? 'drag-over' : ''}`}
        onDragOver={handleFileDragOver}
        onDragEnter={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
      >
        <div className="lead-file-dropzone-title">Drag and drop files here</div>
        <div className="lead-file-dropzone-subtitle">or click “Choose Files” above</div>
      </div>

      {documentRows.length === 0 ? (
        <div className="lead-empty-inline">No files uploaded yet.</div>
      ) : (
        <div className="lead-doc-list">
          <div className="lead-doc-list-head">
            <div>Document Name</div>
            <div>Type</div>
            <div>Size</div>
            <div>Status</div>
            <div>Action</div>
          </div>
          <div className="lead-doc-list-body">
            {documentRows.map((row) => (
              <div
                key={row.id}
                className={`lead-doc-row ${row.source === 'uploaded' && isPdfDocumentRow(row) && row.fileUrl ? 'previewable' : ''}`}
                onDoubleClick={(event) => handleDocumentRowDoubleClick(event, row)}
                title={row.source === 'uploaded' && isPdfDocumentRow(row) && row.fileUrl ? 'Double-click to preview PDF' : undefined}
              >
                <div className="lead-doc-name-cell">
                  <input
                    type="text"
                    value={row.fileName}
                    onChange={(e) => {
                      if (row.source === 'pending') {
                        handlePendingFileNameChange(row.id, e.target.value);
                      } else {
                        const next = [...attachments];
                        next[row.index] = { ...next[row.index], fileName: e.target.value };
                        setAttachments(next);
                      }
                    }}
                  />
                </div>
                <div className="lead-doc-meta-cell">{(row.fileType || 'unknown').toString().toUpperCase()}</div>
                <div className="lead-doc-meta-cell">
                  <div className="lead-doc-size-actions">
                    <span>{formatFileSize(row.fileSize)}</span>
                    {row.source === 'uploaded' && row.fileUrl && (
                      <button
                        type="button"
                        className="lead-doc-download-btn"
                        onClick={() => handleDownloadDocument(row)}
                      >
                        Download
                      </button>
                    )}
                  </div>
                </div>
                <div className={`lead-doc-status ${row.source === 'pending' ? 'pending' : 'uploaded'}`}>
                  {row.source === 'pending' ? 'Pending Upload' : 'Uploaded'}
                </div>
                <div className="lead-doc-action-cell">
                  {row.source === 'pending' ? (
                    <button type="button" className="lead-file-link" onClick={() => removePendingFile(row.id)}>
                      Remove
                    </button>
                  ) : row.fileUrl ? (
                    isPdfDocumentRow(row) ? (
                      <button type="button" className="lead-file-link" onClick={() => openPdfPreview(row)}>
                        Preview
                      </button>
                    ) : (
                      <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="lead-file-link">
                        Open
                      </a>
                    )
                  ) : (
                    <div className="lead-file-link muted">Pending</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="lead-workspace">
      <div className="lead-workspace-topbar">
        <div className="lead-top-meta">
          <div className="lead-top-pills">
            <span className="lead-pill lead-pill-primary">{leadName}</span>
            <span className="lead-pill">{serviceType}</span>
            <span className="lead-pill lead-pill-status">{getLeadWarmthLabel(warmth)}</span>
          </div>
          <div className="lead-workspace-top-tabs">
            {leadDetailTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`lead-workspace-top-tab ${leadDetailViewTab === tab.id ? 'active' : ''}`}
                onClick={() => setLeadDetailViewTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lead-top-actions">
          {primaryActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="lead-action-btn"
              onClick={() => handlePrimaryAction(action.id)}
              disabled={saving}
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            className="lead-action-btn lead-action-btn-primary"
            onClick={handleStartDeal}
            disabled={saving}
          >
            Start Deal
          </button>
          <button
            type="button"
            className="lead-action-btn"
            onClick={handleSaveAndClose}
            disabled={saving}
          >
            Save & Close
          </button>
        </div>
      </div>

      <div className="lead-stage-card">
        <div className="lead-stage-track">
          {LEAD_PIPELINE_STAGES.map((stage, index) => {
            const isActive = warmth === stage.value;
            const isComplete = index <= pipelineStageIndex;
            const isLockedActiveStage = stage.value === 'active-deal' && !hasLinkedDeal;
            return (
              <button
                key={stage.value}
                type="button"
                onClick={() => handleWarmthChange(stage.value)}
                className={`lead-stage-step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''} ${isLockedActiveStage ? 'locked' : ''}`}
                title={isLockedActiveStage ? 'Create a deal to unlock Active Deal stage' : stage.label}
              >
                {stage.label}
              </button>
            );
          })}
        </div>
        {!hasLinkedDeal && (
          <div className="lead-stage-guard-note">
            Active Deal is locked until a deal is created for this lead.
          </div>
        )}

        <div className="lead-stage-progress">
          <div className="lead-stage-progress-fill" style={{ width: `${pipelineProgressPct}%` }} />
        </div>

        <div className="lead-metrics-grid">
          <div className="lead-metric">
            <span className="lead-metric-label">Date In</span>
            <span className="lead-metric-value">{submittedLabel}</span>
          </div>
          <div className="lead-metric">
            <span className="lead-metric-label">Last Updated</span>
            <span className="lead-metric-value">{lastUpdatedLabel}</span>
          </div>
          <div className="lead-metric">
            <span className="lead-metric-label">Lead Source</span>
            <span className="lead-metric-value">{source}</span>
          </div>
          <div className="lead-metric">
            <span className="lead-metric-label">Files</span>
            <span className="lead-metric-value">{attachments.length}</span>
          </div>
        </div>
      </div>

      {leadDetailViewTab === 'workspace' && (
      <div className="lead-workspace-body">
        <aside className="lead-left-panel">
          <div className="lead-panel-card">
            <div className="lead-panel-title">Contact Information</div>
            <div className="lead-field-stack">
              <div className="lead-field">
                <label>Name / Entity</label>
                <input
                  type="text"
                  value={leadForm.name}
                  onChange={(e) => handleLeadFormChange('name', e.target.value)}
                />
              </div>
              <div className="lead-field">
                <label>Cell Phone</label>
                <input
                  type="text"
                  value={leadForm.phone}
                  onChange={(e) => handleLeadFormChange('phone', e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div className="lead-field">
                <label>Email</label>
                <input
                  type="text"
                  value={leadForm.email}
                  onChange={(e) => handleLeadFormChange('email', e.target.value)}
                  placeholder="Email address"
                />
              </div>
              <div className="lead-field">
                <label>Lead Source</label>
                <input
                  type="text"
                  value={leadForm.source}
                  onChange={(e) => handleLeadFormChange('source', e.target.value)}
                  placeholder="Lead source"
                />
              </div>
            </div>
          </div>

          <div className="lead-panel-card">
            <div className="lead-panel-title">Lead Details</div>
            <div className="lead-field-stack">
              <div className="lead-field">
                <label>Service Requested</label>
                <select
                  value={selectedServiceValue}
                  onChange={(e) => handleLeadFormChange('serviceType', e.target.value)}
                >
                  <option value="">Select service</option>
                  {serviceOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="lead-field">
                <label>Pipeline Stage</label>
                <select
                  value={warmth}
                  onChange={(e) => handleWarmthChange(e.target.value)}
                  disabled={saving}
                >
                  {LEAD_PIPELINE_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.value === 'active-deal' && !hasLinkedDeal
                        ? `${stage.label} (create deal first)`
                        : stage.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lead-field">
                <label>Preferred Contact</label>
                <input
                  type="text"
                  value={leadForm.contactMethod}
                  onChange={(e) => handleLeadFormChange('contactMethod', e.target.value)}
                  placeholder="Phone / Email / SMS"
                />
              </div>
              <div className="lead-field">
                <label>Notes</label>
                <textarea
                  value={leadForm.notes}
                  onChange={(e) => handleLeadFormChange('notes', e.target.value)}
                  rows={4}
                  placeholder="Lead notes"
                />
              </div>
              <button
                type="button"
                className="lead-action-btn lead-action-btn-primary"
                onClick={() => handleSaveLeadDetails()}
                disabled={saving}
                style={{ width: '100%', marginTop: '4px' }}
              >
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </aside>

        <section className="lead-center-panel">
          <div className="lead-panel-card">
            <div className="lead-inline-tabs-wrap" ref={workspaceTabsWrapRef}>
              <div className="lead-inline-tabs">
                {workspaceTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`lead-inline-tab ${workspaceTab === tab.id ? 'active' : ''}`}
                    onClick={(event) => handleWorkspaceTabClick(tab.id, event)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {floatingTabId && (
                <div className="lead-tab-popup" style={{ left: `${floatingTabLeft}px` }}>
                  <div className="lead-tab-popup-header">
                    <div className="lead-tab-popup-title">{floatingTabLabel}</div>
                    <button type="button" className="lead-tab-popup-close" onClick={() => setFloatingTabId(null)}>×</button>
                  </div>
                  <div className="lead-tab-popup-body">
                    <div className="lead-tab-popup-copy">
                      Floating popup is active for <strong>{floatingTabLabel}</strong>.
                    </div>
                    <div className="lead-tab-popup-copy">
                      We will wire the full content panel next.
                    </div>
                    <div className="lead-tab-popup-placeholder-grid">
                      <div className="lead-tab-popup-placeholder-item">Panel Header</div>
                      <div className="lead-tab-popup-placeholder-item">Primary Block</div>
                      <div className="lead-tab-popup-placeholder-item">Secondary Block</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lead-engagement-actions">
              {engagementActions.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={`lead-engagement-btn ${label === 'Add Note' ? 'primary' : ''}`}
                  onClick={() => handleEngagementAction(label)}
                  disabled={saving}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="lead-workflow-row">
              <span>Workflow</span>
              <strong>Not Assigned</strong>
              <button type="button" className="lead-plus-btn" onClick={() => handleEngagementAction('Assign Workflow')} disabled={saving}>+</button>
            </div>
          </div>

          <div className="lead-panel-card lead-activity-panel">
            <div className="lead-activity-header">
              <div className="lead-panel-title" style={{ marginBottom: 0 }}>Activity ({filteredActivityEntries.length})</div>
              <input
                type="text"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="lead-activity-search"
                placeholder="Search activity..."
              />
            </div>

            <div className="lead-activity-tabs">
              {activityTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`lead-activity-tab ${activityTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActivityTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="lead-activity-list">
              {filteredActivityEntries.length === 0 && (
                <div className="lead-empty-inline">No activity entries match your filter.</div>
              )}

              {filteredActivityEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`lead-activity-entry ${editingActivityId === entry.id ? 'editing' : ''}`}
                  onDoubleClick={() => {
                    if (!saving) {
                      beginActivityEdit(entry);
                    }
                  }}
                >
                  <div className="lead-activity-entry-top">
                    <span className={`lead-activity-badge ${entry.type}`}>{entry.type}</span>
                    <div className="lead-activity-entry-meta">
                      <span className="lead-activity-time">{formatTimestamp(entry.createdAt)}</span>
                      {canDeleteActivityEntry(entry) && editingActivityId !== entry.id && (
                        <button
                          type="button"
                          className="lead-activity-delete-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteActivityEntry(entry);
                          }}
                          disabled={saving}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {editingActivityId === entry.id ? (
                    <div className="lead-activity-edit-fields">
                      <div className="lead-field">
                        <label>Title</label>
                        <input
                          type="text"
                          value={editingActivityDraft.title}
                          onChange={(e) => setEditingActivityDraft((prev) => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div className="lead-field">
                        <label>Summary</label>
                        <textarea
                          rows={2}
                          value={editingActivityDraft.summary}
                          onChange={(e) => setEditingActivityDraft((prev) => ({ ...prev, summary: e.target.value }))}
                        />
                      </div>
                      <div className="lead-field">
                        <label>Detail</label>
                        <textarea
                          rows={3}
                          value={editingActivityDraft.detail}
                          onChange={(e) => setEditingActivityDraft((prev) => ({ ...prev, detail: e.target.value }))}
                        />
                      </div>
                      <div className="lead-activity-edit-actions">
                        <button type="button" className="lead-action-btn" onClick={cancelActivityEdit} disabled={saving}>
                          Cancel
                        </button>
                        <button type="button" className="lead-action-btn lead-action-btn-primary" onClick={saveActivityEdit} disabled={saving}>
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="lead-activity-entry-title">{entry.title}</div>
                      <div className="lead-activity-entry-summary">{entry.summary}</div>
                      <div className="lead-activity-entry-detail">{entry.detail}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {renderFilesPanel()}
        </section>

        <aside className="lead-right-panel">
          <div className="lead-panel-card">
            <div className="lead-panel-title">Property Information</div>
            <div className="lead-field-stack">
              <div className="lead-field">
                <label>Street</label>
                <input
                  type="text"
                  value={leadForm.street}
                  onChange={(e) => handleLeadFormChange('street', e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div className="lead-field">
                <label>City</label>
                <input
                  type="text"
                  value={leadForm.city}
                  onChange={(e) => handleLeadFormChange('city', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="lead-field">
                <label>State</label>
                <input
                  type="text"
                  maxLength={2}
                  value={leadForm.state}
                  onChange={(e) => handleLeadFormChange('state', e.target.value.toUpperCase())}
                  placeholder="ST"
                />
              </div>
              <div className="lead-field">
                <label>Zip Code</label>
                <input
                  type="text"
                  value={leadForm.zipCode}
                  onChange={(e) => handleLeadFormChange('zipCode', e.target.value)}
                  placeholder="Zip"
                />
              </div>
              <div className="lead-field">
                <label>Property Type</label>
                <select
                  value={leadForm.propertyType || ''}
                  onChange={(e) => handleLeadFormChange('propertyType', e.target.value)}
                >
                  <option value="">Select type</option>
                  <option value="sfr">SFR</option>
                  <option value="multi-family">Multifamily</option>
                  <option value="commercial">Commercial</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="land">Land</option>
                </select>
              </div>
            </div>
            <div className="lead-property-meta">
              <span className="lead-property-chip">{propertyType}</span>
              <span className="lead-property-chip">{serviceType}</span>
            </div>
          </div>
        </aside>
      </div>
      )}

      {leadDetailViewTab === 'documents' && (
        <div className="lead-documents-page">
          <div className="lead-panel-card lead-doc-library-shell">
            <div className="lead-doc-library-tabs">
              {leadDocumentsTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`lead-doc-library-tab ${documentsViewTab === tab.id ? 'active' : ''}`}
                  onClick={() => setDocumentsViewTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {documentsViewTab === 'library' && (
              <>
                <div className="lead-doc-library-filters">
                  <div className="lead-doc-library-search">
                    <Search size={16} color="#8a8a8a" />
                    <input
                      type="text"
                      value={documentsSearch}
                      onChange={(event) => setDocumentsSearch(event.target.value)}
                      placeholder="Search documents by name, type, or id..."
                    />
                  </div>
                  <select
                    value={documentsStateFilter}
                    onChange={(event) => setDocumentsStateFilter(event.target.value)}
                    className="lead-doc-library-state"
                  >
                    {leadDocumentStateOptions.map((stateOption) => (
                      <option key={stateOption.value} value={stateOption.value}>
                        {stateOption.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="lead-action-btn"
                    onClick={() => toast.info('Document library refreshed')}
                  >
                    Refresh Library
                  </button>
                  <button
                    type="button"
                    className="lead-action-btn"
                    onClick={() => {
                      setDocumentsSearch('');
                      setDocumentsStateFilter('all');
                    }}
                  >
                    Clear Filters
                  </button>
                </div>

                <div className="lead-doc-library-table">
                  <div className="lead-doc-library-head">
                    <div>Document</div>
                    <div>Doc ID</div>
                    <div>Language</div>
                    <div>eSign</div>
                    <div>Category</div>
                    <div>State</div>
                    <div>Type</div>
                    <div>Version</div>
                  </div>
                  <div className="lead-doc-library-body">
                    {filteredLibraryDocuments.length === 0 ? (
                      <div className="lead-empty-inline">No documents match the current filter.</div>
                    ) : (
                      filteredLibraryDocuments.map((documentItem) => (
                        <div
                          key={documentItem.id}
                          className={`lead-doc-library-row ${activeFocusedDocumentId === documentItem.id ? 'active' : ''}`}
                          onClick={() => setFocusedDocumentId(documentItem.id)}
                        >
                          <div className="lead-doc-library-title-cell">
                            <label className="lead-doc-library-select">
                              <input
                                type="checkbox"
                                checked={selectedDocumentIds.includes(documentItem.id)}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  toggleLibraryDocumentSelection(documentItem.id);
                                }}
                              />
                              <span className="lead-doc-library-title">{documentItem.title}</span>
                            </label>
                            <div className="lead-doc-library-subtitle">{documentItem.id}</div>
                          </div>
                          <div className="lead-doc-library-meta">{documentItem.id}</div>
                          <div className="lead-doc-library-meta">{documentItem.language}</div>
                          <div className="lead-doc-library-meta">{documentItem.esign}</div>
                          <div className="lead-doc-library-meta">{documentItem.category}</div>
                          <div className={`lead-doc-library-state-pill state-${documentItem.state || 'draft'}`}>
                            {getDocumentStateLabel(documentItem.state)}
                          </div>
                          <div className="lead-doc-library-meta">{documentItem.docType}</div>
                          <div className="lead-doc-library-meta">{documentItem.version}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="lead-doc-library-footer">
                  <div className="lead-doc-library-summary">
                    <div className="lead-doc-library-summary-title">
                      {focusedLibraryDocument ? focusedLibraryDocument.title : 'No document selected'}
                    </div>
                    <div className="lead-doc-library-summary-meta">
                      {focusedLibraryDocument ? (
                        <>
                          <span>{focusedLibraryDocument.docType}</span>
                          <span>{getDocumentStateLabel(focusedLibraryDocument.state)}</span>
                          <span>{formatTimestamp(focusedLibraryDocument.updatedAt || focusedLibraryDocument.createdAt)}</span>
                        </>
                      ) : (
                        <span>Select a document row to inspect its details.</span>
                      )}
                    </div>
                  </div>
                  <div className="lead-doc-library-footer-actions">
                    <button
                      type="button"
                      className="lead-action-btn"
                      onClick={clearSelectedLibraryDocuments}
                      disabled={selectedDocumentIds.length === 0}
                    >
                      Clear Selected
                    </button>
                    <button
                      type="button"
                      className="lead-action-btn lead-action-btn-primary"
                      onClick={openSelectedDocumentsInPdfView}
                      disabled={selectedDocumentIds.length === 0}
                    >
                      Open PDF View
                    </button>
                  </div>
                </div>
              </>
            )}

            {documentsViewTab === 'sign-bundles' && (
              <div className="lead-empty-inline">
                Sign bundles will be assigned from admin-controlled compliant forms.
              </div>
            )}

            {documentsViewTab === 'print-bundles' && (
              <div className="lead-empty-inline">
                Print bundles will be assembled from the selected library documents.
              </div>
            )}
          </div>
        </div>
      )}

      {leadDetailViewTab === 'files' && (
        <div className="lead-files-page">
          {renderFilesPanel()}
        </div>
      )}

      {showEmailComposer && (
        <div className="modal-overlay" onClick={() => !sendingEmail && setShowEmailComposer(false)}>
          <div className="modal-content crm-email-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header crm-email-modal-header">
              <h2 style={{ margin: 0, fontSize: '20px', color: '#ffffff', fontWeight: '700' }}>Send Email</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowEmailComposer(false)}
                disabled={sendingEmail}
              >
                ×
              </button>
            </div>
            <div className="crm-email-modal-grid">
              <div className="lead-field">
                <label>Send To</label>
                <input
                  type="email"
                  value={emailComposer.to}
                  onChange={(event) => handleEmailComposerChange('to', event.target.value)}
                  placeholder="recipient@email.com"
                />
              </div>
              <div className="lead-field">
                <label>CC</label>
                <input
                  type="text"
                  value={emailComposer.cc}
                  onChange={(event) => handleEmailComposerChange('cc', event.target.value)}
                  placeholder="cc1@email.com, cc2@email.com"
                />
              </div>
              <div className="lead-field">
                <label>BCC</label>
                <input
                  type="text"
                  value={emailComposer.bcc}
                  onChange={(event) => handleEmailComposerChange('bcc', event.target.value)}
                  placeholder="bcc1@email.com, bcc2@email.com"
                />
              </div>
              <div className="lead-field">
                <label>Subject</label>
                <input
                  type="text"
                  value={emailComposer.subject}
                  onChange={(event) => handleEmailComposerChange('subject', event.target.value)}
                  placeholder="Email subject"
                />
              </div>
              <div className="lead-field crm-email-modal-body-field">
                <label>Email Contents</label>
                <textarea
                  rows={8}
                  value={emailComposer.body}
                  onChange={(event) => handleEmailComposerChange('body', event.target.value)}
                  placeholder="Write your email..."
                />
              </div>
              <div className="lead-field">
                <label>Signatures</label>
                <select
                  value={emailComposer.signatureKey}
                  onChange={(event) => handleSignatureTemplateChange(event.target.value)}
                >
                  {emailSignatureTemplates.map((signature) => (
                    <option key={signature.key} value={signature.key}>
                      {signature.label}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={4}
                  value={emailComposer.signatureText}
                  onChange={(event) => handleEmailComposerChange('signatureText', event.target.value)}
                  placeholder="Signature text"
                />
              </div>
            </div>
            <div className="crm-email-modal-actions">
              <button type="button" className="lead-action-btn" onClick={() => setShowEmailComposer(false)} disabled={sendingEmail}>
                Cancel
              </button>
              <button type="button" className="lead-action-btn lead-action-btn-primary" onClick={handleSendEmail} disabled={sendingEmail}>
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pdfPreviewDocument && (
        <div className="modal-overlay" onClick={() => setPdfPreviewDocument(null)}>
          <div className="modal-content lead-pdf-preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header lead-pdf-preview-header">
              <div className="lead-pdf-preview-heading">
                <h2>{pdfPreviewDocument.fileName}</h2>
                <div>Double-clicking uploaded PDFs opens them here for reading.</div>
              </div>
              <div className="lead-pdf-preview-actions">
                <button
                  type="button"
                  className="lead-action-btn"
                  onClick={() => handleDownloadDocument(pdfPreviewDocument)}
                >
                  Download
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setPdfPreviewDocument(null)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="lead-pdf-preview-frame-shell">
              <iframe
                title={pdfPreviewDocument.fileName}
                src={`${pdfPreviewDocument.fileUrl}#toolbar=1&navpanes=0`}
                className="lead-pdf-preview-frame"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CRMPage = ({ subTab, setSubTab, leadId, setLeadId, onOpenLead, onStartDeal }) => {
  const crmItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'campaigns', label: 'Campaigns', icon: TrendingUp },
    { id: 'messages', label: 'Messages', icon: FileText },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'reports', label: 'Reports', icon: List },
    { id: 'connector', label: 'Connector', icon: LinkIcon }
  ];

  const renderedItems = subTab === 'lead-detail'
    ? [...crmItems, { id: 'lead-detail', label: 'Lead Detail', icon: FileText }]
    : crmItems;

  return (
    <div className="page-with-subnav">
      <div className="subnav">
        <div className="subnav-title">CRM</div>
        <div className="subnav-items">
          {renderedItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSubTab(item.id);
                if (item.id !== 'lead-detail') {
                  setLeadId?.(null);
                }
              }}
              className={`subnav-item ${subTab === item.id ? 'active' : ''}`}
            >
              <item.icon size={18} color={subTab === item.id ? '#00ff88' : '#888888'} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="subnav-content">
        {subTab === 'dashboard' && <CRMDashboard />}
        {subTab === 'leads' && <CRMLeadsPage onOpenLead={onOpenLead} />}
        {subTab === 'lead-detail' && (
          <CRMLeadDetailPage
            leadId={leadId}
            onStartDeal={onStartDeal}
            onBackToLeads={() => {
              setLeadId?.(null);
              setSubTab('leads');
            }}
          />
        )}
        {subTab === 'campaigns' && <CRMPlaceholderPage title="Campaigns" description="Build and track outbound campaigns from this view." />}
        {subTab === 'messages' && <CRMPlaceholderPage title="Messages" description="Centralized message inbox and history will appear here." />}
        {subTab === 'email' && <CRMEmailInboxPage />}
        {subTab === 'reports' && <CRMPlaceholderPage title="Reports" description="CRM-specific reports and performance summaries will appear here." />}
        {subTab === 'connector' && <CRMPlaceholderPage title="Connector" description="XML push and API lead communication settings will be configured here." />}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [crmSubTab, setCrmSubTab] = useState('dashboard');
  const [crmLeadId, setCrmLeadId] = useState(null);
  const [dealsSubTab, setDealsSubTab] = useState('new');
  const [contactsViewTab, setContactsViewTab] = useState('all');
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const crmSubTabParam = params.get('crmSubTab');
    const dealsSubTabParam = params.get('dealsSubTab');
    const contactsTabParam = params.get('contactsViewTab');
    const leadIdParam = params.get('leadId');

    if (tabParam) setActiveTab(tabParam);
    if (crmSubTabParam) setCrmSubTab(crmSubTabParam);
    if (dealsSubTabParam) setDealsSubTab(dealsSubTabParam);
    if (contactsTabParam) setContactsViewTab(contactsTabParam);
    if (leadIdParam) {
      setCrmLeadId(leadIdParam);
      setActiveTab('crm');
      setCrmSubTab('lead-detail');
    }
  }, []);

  const handleNavigateToContacts = (type) => {
    setContactsViewTab(type || 'all');
    setActiveTab('contacts');
  };

  const handleNavigateToDealsNew = () => {
    setDealsSubTab('new');
    setActiveTab('deals');
  };

  const handleNavigateToProperties = () => {
    setActiveTab('properties');
  };

  const handleOpenLeadInNewTab = (leadId) => {
    const nextUrl = new URL(window.location.origin + window.location.pathname);
    nextUrl.searchParams.set('tab', 'crm');
    nextUrl.searchParams.set('crmSubTab', 'lead-detail');
    nextUrl.searchParams.set('leadId', leadId);
    window.open(nextUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleStartDealFromLead = (dealsTab = 'new') => {
    setDealsSubTab(dealsTab);
    setActiveTab('deals');
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

  const searchEnabledTabs = ['contacts', 'properties', 'tasks', 'documents'];

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
        {activeTab === 'home' && (
          <HomePage
            onNavigateToContacts={handleNavigateToContacts}
            onNavigateToDealsNew={handleNavigateToDealsNew}
            onNavigateToProperties={handleNavigateToProperties}
          />
        )}
        {activeTab === 'contacts' && <ContactsPage initialTab={contactsViewTab} companyId={companyId} globalSearch={globalSearch} onSearchChange={setGlobalSearch} />}
        {activeTab === 'deals' && <DealsPage subTab={dealsSubTab} setSubTab={setDealsSubTab} companyId={companyId} />}
        {activeTab === 'properties' && <PropertiesPage globalSearch={globalSearch} onSearchChange={setGlobalSearch} />}
        {activeTab === 'crm' && (
          <CRMPage
            subTab={crmSubTab}
            setSubTab={setCrmSubTab}
            leadId={crmLeadId}
            setLeadId={setCrmLeadId}
            onOpenLead={handleOpenLeadInNewTab}
            onStartDeal={handleStartDealFromLead}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'tasks' && <TasksPage globalSearch={globalSearch} onSearchChange={setGlobalSearch} />}
        {activeTab === 'documents' && <DocumentsPage globalSearch={globalSearch} onSearchChange={setGlobalSearch} />}
        {activeTab === 'websites' && <WebsitesPage />}
        {activeTab === 'settings' && <SettingsPage />}
        {!['home', 'contacts', 'deals', 'properties', 'crm', 'analytics', 'tasks', 'documents', 'websites', 'settings'].includes(activeTab) && (
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
