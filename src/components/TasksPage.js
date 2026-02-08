import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useToast } from './Toast';

// Icons
const PlusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const CheckIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const ClockIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const AlertIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const TASK_TYPES = [
  { value: 'follow-up', label: 'Follow Up' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'paperwork', label: 'Paperwork' },
  { value: 'showing', label: 'Showing' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'other', label: 'Other' }
];

const PRIORITIES = [
  { value: 'high', label: 'High', color: '#ff3333' },
  { value: 'medium', label: 'Medium', color: '#ffaa00' },
  { value: 'low', label: 'Low', color: '#0088ff' }
];

const TaskModal = ({ task, deals, contacts, properties, onClose, onSave }) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'follow-up',
    priority: 'medium',
    dueDate: '',
    dealId: '',
    contactId: '',
    propertyId: '',
    assignedTo: 'me'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      const isContactAssignee = task.assignedToType === 'contact';
      const assignedToValue = isContactAssignee && task.assignedToId
        ? `contact:${task.assignedToId}`
        : 'me';

      setFormData({
        title: task.title || '',
        description: task.description || '',
        type: task.type || 'follow-up',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        dealId: task.dealId || '',
        contactId: task.contactId || '',
        propertyId: task.propertyId || '',
        assignedTo: assignedToValue
      });
    }
  }, [task]);

  const handleSave = async () => {
    if (!formData.title) {
      toast.error('Please enter a task title');
      return;
    }

    setSaving(true);

    try {
      const assignedToId = formData.assignedTo === 'me'
        ? auth.currentUser.uid
        : formData.assignedTo.replace('contact:', '');
      const assignedContact = contacts.find((c) => c.id === assignedToId);
      const assignedToName = formData.assignedTo === 'me'
        ? auth.currentUser?.email || 'Me'
        : assignedContact
          ? `${assignedContact.firstName} ${assignedContact.lastName}`
          : 'Unassigned';
      const assignedToType = formData.assignedTo === 'me' ? 'user' : 'contact';

      const taskData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        status: task?.status || 'pending',
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        dealId: formData.dealId || null,
        contactId: formData.contactId || null,
        propertyId: formData.propertyId || null,
        userId: auth.currentUser.uid,
        assignedTo: assignedToId,
        assignedToId,
        assignedToName,
        assignedToType,
        createdBy: task?.createdBy || auth.currentUser.uid,
        updatedAt: new Date().toISOString()
      };

      if (task) {
        await updateDoc(doc(db, 'tasks', task.id), taskData);
        toast.success('Task updated successfully!');
      } else {
        taskData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'tasks'), taskData);
        toast.success('Task created successfully!');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{
        border: '2px solid #0088ff',
        padding: '30px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh'
      }}>
        <div className="modal-header" style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '20px', color: '#0088ff', margin: 0, fontWeight: '700' }}>
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            color: '#888888',
            cursor: 'pointer',
            padding: '5px'
          }}>
            <XIcon size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="form-field">
            <label>Task Title *</label>
            <input
              type="text"
              placeholder="e.g., Follow up on offer"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="form-field">
            <label>Description</label>
            <textarea
              placeholder="Add details about this task..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              style={{
                width: '100%',
                background: '#0f0f0f',
                border: '1px solid #1a1a1a',
                borderRadius: '4px',
                padding: '12px',
                color: '#e0e0e0',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          <div className="grid-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-field">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                {TASK_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
              >
                {PRIORITIES.map(priority => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label>Assigned To</label>
            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
            >
              <option value="me">Me ({auth.currentUser?.email || 'User'})</option>
              {contacts.map(contact => (
                <option key={contact.id} value={`contact:${contact.id}`}>
                  {contact.firstName} {contact.lastName} ({contact.contactType || 'contact'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Due Date</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
            />
          </div>

          <div className="form-field">
            <label>Link to Deal (optional)</label>
            <select
              value={formData.dealId}
              onChange={(e) => setFormData({...formData, dealId: e.target.value})}
            >
              <option value="">None</option>
              {deals.map(deal => (
                <option key={deal.id} value={deal.id}>
                  {deal.propertyAddress || 'Unknown'} - {deal.buyerName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Link to Contact (optional)</label>
            <select
              value={formData.contactId}
              onChange={(e) => setFormData({...formData, contactId: e.target.value})}
            >
              <option value="">None</option>
              {contacts.map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.firstName} {contact.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Link to Property (optional)</label>
            <select
              value={formData.propertyId}
              onChange={(e) => setFormData({...formData, propertyId: e.target.value})}
            >
              <option value="">None</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.address || 'Unknown'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '10px',
          marginTop: '25px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#1a1a1a',
              color: '#888888',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'inherit'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#0088ff',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '700',
              fontFamily: 'inherit',
              textTransform: 'uppercase',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TasksPage = () => {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';

      const tasksQuery = isAdmin
        ? query(collection(db, 'tasks'), orderBy('dueDate', 'asc'))
        : query(
            collection(db, 'tasks'),
            where('userId', '==', auth.currentUser.uid),
            orderBy('dueDate', 'asc')
          );

      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksData = [];
      tasksSnapshot.forEach((doc) => {
        tasksData.push({ id: doc.id, ...doc.data() });
      });

      const dealsQuery = isAdmin
        ? query(collection(db, 'deals'))
        : query(collection(db, 'deals'), where('userId', '==', auth.currentUser.uid));

      const dealsSnapshot = await getDocs(dealsQuery);
      const dealsData = [];
      dealsSnapshot.forEach((doc) => {
        dealsData.push({ id: doc.id, ...doc.data() });
      });

      const contactsQuery = isAdmin
        ? query(collection(db, 'contacts'))
        : query(collection(db, 'contacts'), where('userId', '==', auth.currentUser.uid));

      const contactsSnapshot = await getDocs(contactsQuery);
      const contactsData = [];
      contactsSnapshot.forEach((doc) => {
        contactsData.push({ id: doc.id, ...doc.data() });
      });

      const propertiesQuery = isAdmin
        ? query(collection(db, 'properties'))
        : query(collection(db, 'properties'), where('userId', '==', auth.currentUser.uid));

      const propertiesSnapshot = await getDocs(propertiesQuery);
      const propertiesData = [];
      propertiesSnapshot.forEach((doc) => {
        propertiesData.push({ id: doc.id, ...doc.data() });
      });

      setTasks(tasksData);
      setDeals(dealsData);
      setContacts(contactsData);
      setProperties(propertiesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await updateDoc(doc(db, 'tasks', task.id), {
        status: newStatus,
        completedDate: newStatus === 'completed' ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
      });
      loadData();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task. Please try again.');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      toast.success('Task deleted successfully!');
      loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task. Please try again.');
    }
  };

  const isOverdue = (task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    return new Date(task.dueDate) < new Date();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 7) return `Due in ${diffDays} days`;
    return date.toLocaleDateString();
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return task.status !== 'completed';
    if (filterStatus === 'completed') return task.status === 'completed';
    if (filterStatus === 'overdue') return isOverdue(task);
    return true;
  }).filter(task => {
    if (filterPriority === 'all') return true;
    return task.priority === filterPriority;
  }).filter(task => {
    if (filterType === 'all') return true;
    return task.type === filterType;
  }).filter(task => {
    if (filterAssignee === 'all') return true;
    if (filterAssignee === 'me') return task.assignedToId === auth.currentUser.uid || task.assignedTo === auth.currentUser.uid;
    return task.assignedToId === filterAssignee || task.assignedTo === filterAssignee;
  }).filter(task => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      task.title?.toLowerCase().includes(search) ||
      task.description?.toLowerCase().includes(search) ||
      task.assignedToName?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status !== 'completed').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => isOverdue(t)).length
  };

  const getDateKey = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const monthStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const monthEnd = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
  const startDay = new Date(monthStart);
  startDay.setDate(monthStart.getDate() - monthStart.getDay());
  const endDay = new Date(monthEnd);
  endDay.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

  const calendarDays = [];
  let day = new Date(startDay);
  while (day <= endDay) {
    calendarDays.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }

  const tasksByDate = filteredTasks.reduce((acc, task) => {
    if (!task.dueDate) return acc;
    const key = getDateKey(task.dueDate);
    acc[key] = acc[key] || [];
    acc[key].push(task);
    return acc;
  }, {});

  const tasksForSelectedDate = selectedDate
    ? (tasksByDate[getDateKey(selectedDate)] || [])
    : [];

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        color: '#666666'
      }}>
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="responsive-header" style={{ marginBottom: '25px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', margin: '0 0 5px 0' }}>
            Tasks
          </h2>
          <p style={{ fontSize: '13px', color: '#666666', margin: 0 }}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="header-actions">
          <div style={{ display: 'flex', gap: '8px' }}>
            {['list', 'calendar'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  background: viewMode === mode ? '#1a1a1a' : '#0a0a0a',
                  color: viewMode === mode ? '#ffffff' : '#888888',
                  border: `1px solid ${viewMode === mode ? '#0088ff' : '#1a1a1a'}`,
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setSelectedTask(null);
              setShowModal(true);
            }}
            style={{
              background: '#0088ff',
              color: '#ffffff',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '700',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textTransform: 'uppercase'
            }}
          >
            <PlusIcon size={16} />
            New Task
          </button>
        </div>
      </div>

      <div className="grid-four" style={{ marginBottom: '20px' }}>
        <div
          onClick={() => setFilterStatus('all')}
          style={{
            background: filterStatus === 'all' ? '#0f0f0f' : '#0a0a0a',
            border: filterStatus === 'all' ? '1px solid #0088ff' : '1px solid #1a1a1a',
            borderRadius: '4px',
            padding: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff' }}>{stats.total}</div>
          <div style={{ fontSize: '11px', color: '#666666' }}>Total Tasks</div>
        </div>

        <div
          onClick={() => setFilterStatus('pending')}
          style={{
            background: filterStatus === 'pending' ? '#0f0f0f' : '#0a0a0a',
            border: filterStatus === 'pending' ? '1px solid #0088ff' : '1px solid #1a1a1a',
            borderRadius: '4px',
            padding: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0088ff' }}>{stats.pending}</div>
          <div style={{ fontSize: '11px', color: '#666666' }}>Pending</div>
        </div>

        <div
          onClick={() => setFilterStatus('overdue')}
          style={{
            background: filterStatus === 'overdue' ? '#0f0f0f' : '#0a0a0a',
            border: filterStatus === 'overdue' ? '1px solid #ff3333' : '1px solid #1a1a1a',
            borderRadius: '4px',
            padding: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#ff3333' }}>{stats.overdue}</div>
          <div style={{ fontSize: '11px', color: '#666666' }}>Overdue</div>
        </div>

        <div
          onClick={() => setFilterStatus('completed')}
          style={{
            background: filterStatus === 'completed' ? '#0f0f0f' : '#0a0a0a',
            border: filterStatus === 'completed' ? '1px solid #00ff88' : '1px solid #1a1a1a',
            borderRadius: '4px',
            padding: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#00ff88' }}>{stats.completed}</div>
          <div style={{ fontSize: '11px', color: '#666666' }}>Completed</div>
        </div>
      </div>

      <div style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <div className="filters-row">
          <input
            type="text"
            placeholder="Search tasks, description, or assignee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: '1 1 240px',
              minWidth: '200px',
              padding: '10px 12px',
              background: '#0f0f0f',
              border: '1px solid #1a1a1a',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '13px'
            }}
          />
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{
              padding: '10px 12px',
              background: '#0f0f0f',
              border: '1px solid #1a1a1a',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '13px'
            }}
          >
            <option value="all">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '10px 12px',
              background: '#0f0f0f',
              border: '1px solid #1a1a1a',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '13px'
            }}
          >
            <option value="all">All Types</option>
            {TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            style={{
              padding: '10px 12px',
              background: '#0f0f0f',
              border: '1px solid #1a1a1a',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '13px'
            }}
          >
            <option value="all">All Assignees</option>
            <option value="me">Me</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '10px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff' }}>
              {calendarDate.toLocaleString('default', { month: 'long' })} {calendarDate.getFullYear()}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                style={{ background: '#1a1a1a', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
              >
                ←
              </button>
              <button
                onClick={() => setCalendarDate(new Date())}
                style={{ background: '#0f0f0f', color: '#ffffff', border: '1px solid #1a1a1a', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Today
              </button>
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                style={{ background: '#1a1a1a', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
              >
                →
              </button>
            </div>
          </div>

          <div className="grid-seven" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayLabel) => (
              <div key={dayLabel} style={{ fontSize: '11px', color: '#666666', textAlign: 'center', padding: '6px 0' }}>
                {dayLabel}
              </div>
            ))}

            {calendarDays.map((date) => {
              const isCurrentMonth = date.getMonth() === calendarDate.getMonth();
              const key = getDateKey(date);
              const dayTasks = tasksByDate[key] || [];
              const isSelected = selectedDate && getDateKey(selectedDate) === key;
              const isToday = getDateKey(new Date()) === key;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedDate(date)}
                  style={{
                    minHeight: '80px',
                    padding: '8px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid #00ff88' : '1px solid #1a1a1a',
                    background: isSelected ? '#00ff8815' : '#0f0f0f',
                    opacity: isCurrentMonth ? 1 : 0.4,
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    color: isToday ? '#00ff88' : '#ffffff',
                    fontWeight: isToday ? '700' : '600'
                  }}>
                    {date.getDate()}
                  </div>
                  {dayTasks.length > 0 && (
                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {dayTasks.slice(0, 3).map((task) => (
                        <div key={task.id} style={{
                          fontSize: '10px',
                          color: '#ffffff',
                          background: '#1a1a1a',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div style={{ fontSize: '10px', color: '#888888' }}>+{dayTasks.length - 3} more</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>
              {selectedDate ? `Tasks for ${selectedDate.toLocaleDateString()}` : 'Select a day to view tasks'}
            </div>
            {selectedDate && tasksForSelectedDate.length === 0 && (
              <div style={{ fontSize: '12px', color: '#666666' }}>No tasks due this day.</div>
            )}
            {selectedDate && tasksForSelectedDate.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tasksForSelectedDate.map((task) => {
                  const priority = PRIORITIES.find(p => p.value === task.priority);
                  return (
                    <div key={task.id} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', padding: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>{task.title}</div>
                      <div style={{ fontSize: '11px', color: '#888888', marginTop: '4px' }}>
                        {task.assignedToName || 'Unassigned'} • {priority?.label || 'Medium'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '40px',
          textAlign: 'center',
          color: '#666666'
        }}>
          {tasks.length === 0 
            ? 'No tasks yet. Create your first task!' 
            : `No ${filterStatus} tasks.`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredTasks.map((task) => {
            const priority = PRIORITIES.find(p => p.value === task.priority);
            const overdue = isOverdue(task);
            
            return (
              <div
                key={task.id}
                style={{
                  background: '#0a0a0a',
                  border: overdue ? '1px solid #ff3333' : '1px solid #1a1a1a',
                  borderRadius: '4px',
                  padding: '15px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#0f0f0f';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#0a0a0a';
                }}
              >
                <button
                  onClick={() => handleToggleComplete(task)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    border: task.status === 'completed' ? 'none' : '2px solid #1a1a1a',
                    background: task.status === 'completed' ? '#00ff88' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  {task.status === 'completed' && <CheckIcon size={16} />}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '5px'
                  }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: task.status === 'completed' ? '#666666' : '#ffffff',
                      margin: 0,
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none'
                    }}>
                      {task.title}
                    </h3>
                    
                    <span style={{
                      fontSize: '10px',
                      color: priority?.color,
                      background: `${priority?.color}15`,
                      padding: '3px 8px',
                      borderRadius: '3px',
                      textTransform: 'uppercase',
                      fontWeight: '700'
                    }}>
                      {priority?.label}
                    </span>

                    {overdue && (
                      <span style={{
                        fontSize: '10px',
                        color: '#ff3333',
                        background: '#ff333315',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <AlertIcon size={12} />
                        Overdue
                      </span>
                    )}
                  </div>

                    {task.description && (
                      <p style={{
                        fontSize: '12px',
                        color: '#888888',
                        margin: '0 0 5px 0'
                      }}>
                        {task.description}
                      </p>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                      fontSize: '11px',
                      color: '#666666'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ClockIcon size={14} />
                        {formatDate(task.dueDate)}
                      </span>
                      {task.dealId && <span>🏠 Linked to deal</span>}
                      {task.type && <span style={{ textTransform: 'capitalize' }}>{task.type}</span>}
                      <span>👤 {task.assignedToName || 'Unassigned'}</span>
                    </div>
                  </div>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setShowModal(true);
                    }}
                    style={{
                      background: '#0088ff',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                      fontFamily: 'inherit'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    style={{
                      background: '#ff3333',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                      fontFamily: 'inherit'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <TaskModal
          task={selectedTask}
          deals={deals}
          contacts={contacts}
          properties={properties}
          onClose={() => {
            setShowModal(false);
            setSelectedTask(null);
          }}
          onSave={loadData}
        />
      )}
    </div>
  );
};

export default TasksPage;
