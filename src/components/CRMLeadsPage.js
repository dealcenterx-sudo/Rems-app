import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import LeadDrawer from './LeadDrawer';
import { CalendarIcon } from './Icons';

const CRMLeadsPage = ({ onOpenLead }) => {
  const [drawerLeadId, setDrawerLeadId] = useState(null);
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
                  onClick={() => setDrawerLeadId(lead.id)}
                  onDoubleClick={() => onOpenLead?.(lead.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '180px 220px 150px 230px 180px 220px 130px 80px 100px 120px 140px',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: drawerLeadId === lead.id ? '#00ff8808' : '#0a0a0a',
                    marginBottom: '8px',
                    fontSize: '12px',
                    color: '#ffffff',
                    cursor: 'pointer',
                    border: drawerLeadId === lead.id ? '1px solid #00ff8833' : '1px solid transparent'
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
      {drawerLeadId && (
        <LeadDrawer
          leadId={drawerLeadId}
          onClose={() => setDrawerLeadId(null)}
          onOpenFullDetail={(id) => { onOpenLead?.(id); }}
        />
      )}
    </div>
  );
};

export default CRMLeadsPage;
