import React, { useState } from 'react';
import DealsDashboard from './DealsDashboard';
import ActiveDealsPage from './ActiveDealsPage';
import ClosedDealsPage from './ClosedDealsPage';
import NewDealPage from './NewDealPage';
import DealPortalPage from './DealPortalPage';
import { FilePlus, BarChart, List, CheckSquare } from './Icons';

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
        {subTab === 'new' && <NewDealPage />}
        {subTab === 'dashboard' && <DealsDashboard />}
        {subTab === 'active' && <ActiveDealsPage onOpenPortal={handleOpenPortal} />}
        {subTab === 'closed' && <ClosedDealsPage />}
        {subTab === 'portal' && portalDealId && (
          <DealPortalPage dealId={portalDealId} onBack={handleBackFromPortal} />
        )}
      </div>
    </div>
  );
};

export default DealsPage;
