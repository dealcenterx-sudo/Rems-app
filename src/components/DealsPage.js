import React, { useState } from 'react';
import { FilePlus, BarChart, List, CheckSquare } from './Icons';

const DealsDashboard = React.lazy(() => import('./DealsDashboard'));
const ActiveDealsPage = React.lazy(() => import('./ActiveDealsPage'));
const ClosedDealsPage = React.lazy(() => import('./ClosedDealsPage'));
const NewDealPage = React.lazy(() => import('./NewDealPage'));
const DealPortalPage = React.lazy(() => import('./DealPortalPage'));

const DealsPage = ({ subTab, setSubTab }) => {
  const [portalDealId, setPortalDealId] = useState(null);

  const handleOpenPortal = (dealId) => {
    setPortalDealId(dealId);
    setSubTab('portal');
  };

  const handleBackFromPortal = () => {
    setPortalDealId(null);
    setSubTab('active');
  };

  const navItems = [
    { id: 'new', label: 'New Deal', icon: FilePlus },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart },
    { id: 'active', label: 'Active Deals', icon: List },
    { id: 'closed', label: 'Closed Deals', icon: CheckSquare },
    { id: 'portal', label: 'Deal Portal', icon: CheckSquare }
  ];

  return (
    <div className="page-with-subnav">
      <div className="subnav">
        <div className="subnav-title">Deals</div>
        <div className="subnav-items">
          {navItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSubTab(item.id);
                if (item.id !== 'portal') setPortalDealId(null);
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
        <React.Suspense fallback={<div className="loading-container"><div className="loading-spinner" /></div>}>
          {subTab === 'new' && <NewDealPage />}
          {subTab === 'dashboard' && <DealsDashboard />}
          {subTab === 'active' && <ActiveDealsPage onOpenPortal={handleOpenPortal} />}
          {subTab === 'closed' && <ClosedDealsPage />}
          {subTab === 'portal' && portalDealId && (
            <DealPortalPage dealId={portalDealId} onBack={handleBackFromPortal} />
          )}
        </React.Suspense>
      </div>
    </div>
  );
};

export default DealsPage;
