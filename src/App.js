import React, { useEffect, useState } from 'react';
import './App.css';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Layout
import { Sidebar, TopBar, BottomNav } from './components/Layout';

// Pages
import HomePage from './components/HomePage';
import ContactsPage from './components/ContactsPage';
import DealsPage from './components/DealsPage';
import PropertiesPage from './components/PropertiesPage';
import CRMPage from './components/CRMPage';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import TasksPage from './components/TasksPage';
import DocumentsPage from './components/DocumentsPage';
import WebsitesPage from './components/WebsitesPage';
import SettingsPage from './components/SettingsPage';
import LoginPage from './components/LoginPage';
import { ToastProvider } from './components/Toast';

pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ''}/pdf.worker.min.mjs`;

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

  if (!user && process.env.REACT_APP_DEV_BYPASS !== 'true') {
    return <LoginPage onLoginSuccess={() => setUser(auth.currentUser)} />;
  }

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
