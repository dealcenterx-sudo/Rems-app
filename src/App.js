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
import ConfirmModal from './components/ConfirmModal';
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

const CRMLeadsPage = () => {
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

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    return new Date(dateValue).toLocaleString();
  };

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
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  onDoubleClick={() => setFromDate('')}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', color: '#888888', marginBottom: '4px' }}>To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  onDoubleClick={() => setToDate('')}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff' }}
                />
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
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '180px 220px 150px 230px 180px 220px 130px 80px 100px 120px 140px',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#0a0a0a',
                    marginBottom: '8px',
                    fontSize: '12px',
                    color: '#ffffff'
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

const CRMPage = ({ subTab, setSubTab }) => {
  const crmItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'campaigns', label: 'Campaigns', icon: TrendingUp },
    { id: 'messages', label: 'Messages', icon: FileText },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'reports', label: 'Reports', icon: List },
    { id: 'connector', label: 'Connector', icon: LinkIcon }
  ];

  return (
    <div className="page-with-subnav">
      <div className="subnav">
        <div className="subnav-title">CRM</div>
        <div className="subnav-items">
          {crmItems.map((item) => (
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
        {subTab === 'dashboard' && <CRMDashboard />}
        {subTab === 'leads' && <CRMLeadsPage />}
        {subTab === 'campaigns' && <CRMPlaceholderPage title="Campaigns" description="Build and track outbound campaigns from this view." />}
        {subTab === 'messages' && <CRMPlaceholderPage title="Messages" description="Centralized message inbox and history will appear here." />}
        {subTab === 'email' && <CRMPlaceholderPage title="Email" description="Email templates, sends, and tracking will be managed here." />}
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
        {activeTab === 'crm' && <CRMPage subTab={crmSubTab} setSubTab={setCrmSubTab} />}
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
