import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { UserPlus, FileText, ShoppingCart, Key } from './Icons';
import { normalizeAddressValue, normalizePropertyTypeBucket } from '../utils/helpers';

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

export default HomePage;
