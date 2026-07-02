import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, orderBy, getCountFromServer, limit } from 'firebase/firestore';
import { UserPlus, FileText, ShoppingCart, Key } from './Icons';
import { normalizeAddressValue, normalizePropertyTypeBucket, isAdminUser } from '../utils/helpers';
import { isExternalRole } from './Icons';
import useUserDoc from '../utils/useUserDoc';

const HOME_KPI_CACHE_TTL_MS = 30_000;
const HOME_KPI_CACHE_KEY = 'rems-home-dashboard-cache-v1';

const getHomeScope = (isAdmin, uid) => (isAdmin ? 'admin' : uid || 'anonymous');

const readHomeKpiCache = (scope) => {
  try {
    const raw = localStorage.getItem(`${HOME_KPI_CACHE_KEY}:${scope}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed.savedAt > HOME_KPI_CACHE_TTL_MS) return null;
    return parsed.payload;
  } catch {
    return null;
  }
};

const writeHomeKpiCache = (scope, payload) => {
  try {
    localStorage.setItem(
      `${HOME_KPI_CACHE_KEY}:${scope}`,
      JSON.stringify({ savedAt: Date.now(), payload })
    );
  } catch {
    // storage full or unavailable — cache is best-effort
  }
};

const HomePage = ({ onNavigateToContacts, onNavigateToDealsNew, onNavigateToProperties }) => {
  const { userDoc } = useUserDoc();
  const externalUser = isExternalRole(userDoc?.role);
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

  const loadDashboardData = useCallback(async (refreshOnly = false) => {
    try {
      if (!refreshOnly) {
        setLoading(true);
      }

      const isAdmin = isAdminUser();
      const uid = auth.currentUser?.uid;
      const userFilter = isAdmin ? [] : [where('userId', '==', uid)];

      const contactBase = [collection(db, 'contacts'), ...userFilter];
      const dealBase = [collection(db, 'deals'), ...userFilter];
      const propertyBase = [collection(db, 'properties'), ...userFilter];
      const taskBase = [collection(db, 'tasks'), ...userFilter];

      const [
        totalContactsSnap,
        totalBuyersSnap,
        activeBuyersSnap,
        flippersSnap,
        buildersSnap,
        holdersSnap,
        totalSellersSnap,
        inactiveSellersSnap,
        totalDealsSnap,
        closedDealsSnap,
        totalTasksSnap
      ] = await Promise.all([
        getCountFromServer(query(...contactBase)),
        getCountFromServer(query(...contactBase, where('contactType', '==', 'buyer'))),
        getCountFromServer(query(...contactBase, where('contactType', '==', 'buyer'), where('activelyBuying', '==', true))),
        getCountFromServer(query(...contactBase, where('contactType', '==', 'buyer'), where('buyerType', '==', 'flipper'))),
        getCountFromServer(query(...contactBase, where('contactType', '==', 'buyer'), where('buyerType', '==', 'builder'))),
        getCountFromServer(query(...contactBase, where('contactType', '==', 'buyer'), where('buyerType', '==', 'holder'))),
        getCountFromServer(query(...contactBase, where('contactType', '==', 'seller'))),
        getCountFromServer(query(...contactBase, where('contactType', '==', 'seller'), where('activelySelling', '==', false))),
        getCountFromServer(query(...dealBase)),
        getCountFromServer(query(...dealBase, where('status', '==', 'closed'))),
        getCountFromServer(query(...taskBase))
      ]);

      const totalContacts = totalContactsSnap.data().count;
      const totalBuyers = totalBuyersSnap.data().count;
      const activeBuyers = activeBuyersSnap.data().count;
      const flippers = flippersSnap.data().count;
      const builders = buildersSnap.data().count;
      const holders = holdersSnap.data().count;
      const totalSellers = totalSellersSnap.data().count;
      const inactiveSellers = inactiveSellersSnap.data().count;
      const activeSellers = totalSellers - inactiveSellers;
      const totalDeals = totalDealsSnap.data().count;
      const closedDeals = closedDealsSnap.data().count;
      const activeDeals = Math.max(totalDeals - closedDeals, 0);
      const totalTasks = totalTasksSnap.data().count;

      // Load seller records for seller KPI grouping (limited to seller documents)
      const sellersSnapshot = await getDocs(
        query(...contactBase, where('contactType', '==', 'seller'))
      );
      const sellers = [];
      sellersSnapshot.forEach((doc) => {
        sellers.push({ id: doc.id, ...doc.data() });
      });

      // Load properties only with fields needed for seller property-type mapping
      const propertiesSnapshot = await getDocs(
        query(...propertyBase)
      );
      const propertiesData = [];
      propertiesSnapshot.forEach((doc) => {
        propertiesData.push({ id: doc.id, ...doc.data() });
      });

      // Load deals with fields needed for fallback property type matching
      const dealsSnapshot = await getDocs(
        query(...dealBase)
      );
      const dealsData = [];
      dealsSnapshot.forEach((doc) => {
        dealsData.push({ id: doc.id, ...doc.data() });
      });

      // Load tasks preview only (not full list)
      const tasksSnapshot = await getDocs(
        query(...taskBase, orderBy('dueDate', 'asc'), limit(4))
      );
      const tasksData = [];
      tasksSnapshot.forEach((doc) => {
        tasksData.push({ id: doc.id, ...doc.data() });
      });

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

      const nextStats = {
        totalContacts,
        totalSellers,
        activeSellers,
        inactiveSellers,
        singleFamilySellers: singleFamilySellers.length,
        multiFamilySellers: multiFamilySellers.length,
        commercialSellers: commercialSellers.length,
        totalBuyers,
        activeBuyers,
        totalDeals,
        activeDeals,
        closedDeals,
        flippers,
        builders,
        holders,
        totalTasks
      };

      setStats(nextStats);
      setTasks(tasksData);
      writeHomeKpiCache(getHomeScope(isAdmin, uid), {
        stats: nextStats,
        tasks: tasksData
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Buyers/sellers get the welcome view — skip the agent KPI queries entirely.
    if (externalUser) {
      setLoading(false);
      return;
    }

    const cacheScope = getHomeScope(isAdminUser(), auth.currentUser?.uid);
    const cached = readHomeKpiCache(cacheScope);
    if (cached) {
      if (cached.stats) setStats(cached.stats);
      if (Array.isArray(cached.tasks)) setTasks(cached.tasks);
      setLoading(false);
      loadDashboardData(true);
      return;
    }

    loadDashboardData();
  }, [loadDashboardData, externalUser]);

  const isFirstRun = !loading &&
    stats.totalContacts === 0 && stats.totalDeals === 0 && stats.totalTasks === 0;

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

  if (externalUser) {
    const isBuyer = userDoc?.role === 'buyer';
    const assignedCount = Array.isArray(userDoc?.assignedProperties)
      ? userDoc.assignedProperties.length
      : 0;
    const firstName = (userDoc?.displayName || '').split(' ')[0];

    return (
      <div className="page-content">
        <div className="card-surface" style={{ maxWidth: '640px', margin: '40px auto', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>{isBuyer ? '🔑' : '🏡'}</div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', marginBottom: '10px' }}>
            Welcome{firstName ? `, ${firstName}` : ''}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
            {isBuyer
              ? 'Your agent will share properties with you here. When a property is assigned to you, it appears under Properties with full details and photos.'
              : 'Track the properties your agent is handling for you. Listings assigned to you appear under Properties, where you can follow their status.'}
          </p>
          {assignedCount > 0 ? (
            <button className="btn-primary" onClick={onNavigateToProperties}>
              View Your {assignedCount} {assignedCount === 1 ? 'Property' : 'Properties'}
            </button>
          ) : (
            <div className="empty-state-card" style={{ padding: '24px' }}>
              <div className="empty-state-title">No properties shared yet</div>
              <div className="empty-state-subtitle">
                Your agent will assign properties to your account — check back soon.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {isFirstRun && (
        <div className="card-surface" style={{ marginBottom: '24px', padding: '28px', border: '1px solid var(--accent-border)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', margin: '0 0 6px 0' }}>
            Welcome to REMS 👋
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 18px 0', lineHeight: 1.6 }}>
            Your workspace is empty — here's the fastest way to get moving. Each step takes under a minute.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn-primary btn-sm" onClick={() => onNavigateToContacts('seller')}>
              1. Add your first contact
            </button>
            <button className="btn-secondary btn-sm" onClick={onNavigateToProperties}>
              2. Add a property
            </button>
            <button className="btn-secondary btn-sm" onClick={onNavigateToDealsNew}>
              3. Create a deal
            </button>
          </div>
        </div>
      )}

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
          <div className="card-surface" style={{ textAlign: 'center', color: 'var(--text-faint)' }}>
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
