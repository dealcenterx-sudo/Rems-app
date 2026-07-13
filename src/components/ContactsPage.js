import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  where,
  startAfter,
  limit
} from 'firebase/firestore';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';
import { Search, Users, Check, AlertCircle } from './Icons';
import PageState from './PageState';
import { SkeletonTableRow } from './Skeleton';
import useDelayedFlag from '../utils/useDelayedFlag';
import { mapError } from '../utils/errorMessages';
import { isAdminUser } from '../utils/helpers';
import { logActivity } from '../utils/auditLog';
import useDebounce from '../utils/useDebounce';

// CONTACTS PAGE - WITH EDIT/DELETE
const CONTACT_FORM_TYPES = ['buyer', 'seller', 'agent', 'lender', 'investor'];
const CONTACT_LIST_TABS = ['all', 'buyer', 'seller', 'agent', 'lender', 'investor'];
const CONTACTS_PAGE_SIZE = 50;

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
  const [loadError, setLoadError] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState([null]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [editingId, setEditingId] = useState(editContactId);
  const [searchInput, setSearchInput] = useState(globalSearch);
  const searchTerm = useDebounce(searchInput, 250);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, contact: null });
  const toast = useToast();
  const pageCursorsRef = useRef(pageCursors);

  useEffect(() => {
    pageCursorsRef.current = pageCursors;
  }, [pageCursors]);
  const loadContacts = useCallback(async (targetPage = 0, forceReset = false) => {
    const sanitizedPage = Math.max(0, Number(targetPage) || 0);
    try {
      const isAdmin = isAdminUser();
      setLoading(true);
      setLoadError(null);

      const baseConstraints = [collection(db, 'contacts')];

      if (!isAdmin) {
        baseConstraints.push(where('userId', '==', auth.currentUser.uid));
      }

      if (selectedViewTab !== 'all' && selectedViewTab !== 'add') {
        baseConstraints.push(where('contactType', '==', selectedViewTab));
      }

      baseConstraints.push(orderBy('createdAt', 'desc'), limit(CONTACTS_PAGE_SIZE + 1));

      const cursor = forceReset ? null : pageCursorsRef.current[sanitizedPage];
      if (cursor) {
        baseConstraints.push(startAfter(cursor));
      }

      const querySnapshot = await getDocs(query(...baseConstraints));

      const contactsData = [];
      const fetchedContacts = querySnapshot.docs.slice(0, CONTACTS_PAGE_SIZE);
      const nextCursor = querySnapshot.docs.length > CONTACTS_PAGE_SIZE ? querySnapshot.docs[CONTACTS_PAGE_SIZE - 1] : null;
      fetchedContacts.forEach((doc) => {
        contactsData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setHasNextPage(Boolean(nextCursor));
      setPageCursors((prev) => {
        const next = [...prev];
        next[sanitizedPage + 1] = nextCursor;
        if (next.length > sanitizedPage + 2) {
          next.splice(sanitizedPage + 2);
        }
        return next;
      });
      if (forceReset) {
        setPageIndex(0);
      } else {
        setPageIndex(sanitizedPage);
      }
      setContacts(contactsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setLoadError(mapError(error));
      setLoading(false);
    }
  }, [selectedViewTab]);

  useEffect(() => {
    setSearchInput(globalSearch || '');
  }, [globalSearch]);

  useEffect(() => {
    const nextState = resolveContactsInitialState(initialTab);
    setSelectedViewTab(nextState.tab);
    setSelectedContactType(nextState.contactType);
  }, [initialTab]);

  useEffect(() => {
    setPageIndex(0);
    setPageCursors([null]);
    loadContacts(0, true);
  }, [loadContacts, selectedViewTab]);

  // Load contact for editing if editContactId is provided
  useEffect(() => {
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
    loadContacts(0, true);
  } catch (error) {
    console.error('Error saving contact:', error);
    toast.error('Error saving contact. Check console.');
  } finally {
    setSaving(false);
  }
};

  const handleDeleteContact = async (contactId) => {
    try {
      const target = contacts.find((c) => c.id === contactId);
      await deleteDoc(doc(db, 'contacts', contactId));
      toast.success('Contact deleted successfully!');
      logActivity('deleted', 'contact', contactId,
        `Contact "${[target?.firstName, target?.lastName].filter(Boolean).join(' ') || contactId}" deleted`);
      loadContacts(0, true);
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

  const handleNextPage = () => {
    if (!hasNextPage) return;
    loadContacts(pageIndex + 1);
  };

  const handlePrevPage = () => {
    if (pageIndex === 0) return;
    loadContacts(pageIndex - 1);
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

  // Memoised — only recomputes when contacts list, tab, or debounced search changes
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      if (selectedViewTab !== 'all' && contact.contactType !== selectedViewTab) return false;
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(search) ||
        contact.email?.toLowerCase().includes(search) ||
        contact.phone?.toLowerCase().includes(search)
      );
    });
  }, [contacts, selectedViewTab, searchTerm]);

  const showContactsSkeleton = useDelayedFlag(loading, 400);

  return (
    <div className="page-with-subnav">
      <div className="subnav">
        <div className="subnav-title">Contacts</div>
        <div className="subnav-items">
          {contactViewTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedViewTab(tab.id);
                if (tab.id !== 'all' && tab.id !== 'add') {
                  setSelectedContactType(tab.id);
                }
              }}
              className={`subnav-item ${selectedViewTab === tab.id ? 'active' : ''}`}
              aria-current={selectedViewTab === tab.id ? 'page' : undefined}
            >
              <Users size={18} color={selectedViewTab === tab.id ? '#00ff88' : '#888888'} />
              <span>{tab.label}</span>
            </button>
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
                  <label htmlFor="contact-firstName">First Name *</label>
                  <input id="contact-firstName" type="text" placeholder="Enter first name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="form-field">
                  <label htmlFor="contact-lastName">Last Name *</label>
                  <input id="contact-lastName" type="text" placeholder="Enter last name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <div className="form-field">
                  <label htmlFor="contact-phone">Phone Number *</label>
                  <input id="contact-phone" type="tel" placeholder="(555) 555-5555" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="form-field">
                  <label htmlFor="contact-email">Email *</label>
                  <input id="contact-email" type="email" placeholder="email@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="form-field">
                  <label htmlFor="contact-type">Contact Type</label>
                  <select id="contact-type" value={selectedContactType} onChange={(e) => setSelectedContactType(e.target.value)}>
                    {contactTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>
                {selectedContactType === 'buyer' && (
                  <>
                    <div className="form-field">
                      <label htmlFor="contact-buyerType">Buyer Type</label>
                      <select id="contact-buyerType" value={formData.buyerType} onChange={(e) => setFormData({...formData, buyerType: e.target.value})}>
                        <option value="">Select type</option>
                        <option value="flipper">Flipper</option>
                        <option value="builder">Builder</option>
                        <option value="holder">Holder</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label htmlFor="contact-activelyBuying">Actively Buying</label>
                      <div
                        id="contact-activelyBuying"
                        onClick={() => setFormData({...formData, activelyBuying: !formData.activelyBuying})}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setFormData({...formData, activelyBuying: !formData.activelyBuying});
                          }
                        }}
                        role="checkbox"
                        aria-checked={formData.activelyBuying}
                        tabIndex={0}
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
                {selectedContactType === 'seller' && (
                  <div className="form-field">
                    <label htmlFor="contact-activelySelling">Actively Selling</label>
                    <div
                      id="contact-activelySelling"
                      onClick={() => setFormData({...formData, activelySelling: !formData.activelySelling})}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setFormData({...formData, activelySelling: !formData.activelySelling});
                        }
                      }}
                      role="checkbox"
                      aria-checked={formData.activelySelling}
                      tabIndex={0}
                      className="checkbox-field"
                    >
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
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (onSearchChange) onSearchChange(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--skeleton-highlight)',
                    borderRadius: '8px',
                    color: 'var(--white)',
                    fontSize: '14px'
                  }}
                />
              </div>

              {loading ? (
                // Delay-then-show (D-09, 400ms): sub-threshold loads render nothing
                // then swap straight to the table; only slow loads show the skeleton (D-10).
                showContactsSkeleton ? (
                  <div className="tasks-table" aria-hidden="true">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <SkeletonTableRow
                        key={i}
                        columns={6}
                        style={{ padding: '0 var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}
                      />
                    ))}
                  </div>
                ) : null
              ) : loadError ? (
                <PageState
                  tone="error"
                  icon={AlertCircle}
                  eyebrow="Contacts"
                  title="Couldn't load contacts"
                  message={`${loadError.message} ${loadError.recovery}`}
                  actions={(
                    <button onClick={() => loadContacts(0, true)} className="btn-primary">
                      Try again
                    </button>
                  )}
                />
              ) : contacts.length === 0 ? (
                <PageState
                  icon={Users}
                  eyebrow="Contacts"
                  title="No contacts yet"
                  message="Add your first buyer, seller, agent, lender, or investor record."
                  actions={(
                    <button onClick={() => openAddContactForTab(selectedViewTab)} className="btn-primary">
                      Add contact
                    </button>
                  )}
                />
              ) : filteredContacts.length === 0 ? (
                <PageState
                  icon={Search}
                  eyebrow="Contacts"
                  title="No matches"
                  message="No contacts match the current filters."
                  actions={(
                    <button
                      onClick={() => {
                        setSearchInput('');
                        if (onSearchChange) onSearchChange('');
                        setSelectedViewTab('all');
                      }}
                      className="btn-secondary"
                    >
                      Clear filters
                    </button>
                  )}
                />
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
                      <div data-label="Name" style={{ fontSize: '13px', color: 'var(--white)', fontWeight: '600' }}>
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div data-label="Type" style={{ fontSize: '12px', color: 'var(--accent)', textTransform: 'capitalize' }}>
                        {contact.contactType}
                        {contact.contactType === 'seller' && (
                          <span style={{ marginLeft: '6px', color: contact.activelySelling === false ? '#ff6600' : 'var(--accent)' }}>
                            ({contact.activelySelling === false ? 'Inactive' : 'Active'})
                          </span>
                        )}
                      </div>
                      <div data-label="Phone" style={{ fontSize: '12px', color: 'var(--text-muted-2)' }}>{contact.phone}</div>
                      <div data-label="Email" style={{ fontSize: '12px', color: 'var(--text-muted-2)' }}>{contact.email}</div>
                      <div data-label="Date Added" style={{ fontSize: '12px', color: 'var(--text-muted-2)' }}>
                        {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                      <div data-label="Actions" style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEditContact(contact)} className="btn-secondary btn-sm">Edit</button>
                        <button onClick={() => requestDeleteContact(contact)} className="btn-danger-quiet btn-sm">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {filteredContacts.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted-2)' }}>
                    Showing {filteredContacts.length} contacts
                    {hasNextPage ? ' (more available)' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handlePrevPage}
                      disabled={pageIndex === 0}
                      className="btn-secondary btn-sm"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={!hasNextPage}
                      className="btn-primary btn-sm"
                    >
                      Next →
                    </button>
                  </div>
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

export default ContactsPage;
