import { isAdminUser } from './helpers';

// Role-based permission helpers. userDoc is the Firestore users document
// (from ensureUserExists in firebase.js): { userId, email, role, assignedProperties, ... }

const isAdminDoc = (userDoc) =>
  Boolean(userDoc && (userDoc.role === 'admin' || isAdminUser({ email: userDoc.email })));

/**
 * Can the user see/open this resource at all?
 * Admin sees everything; everyone else only their own userId-scoped records.
 */
export const canUserAccess = (userDoc, resource) => {
  if (!userDoc || !resource) return false;
  if (isAdminDoc(userDoc)) return true;
  return resource.userId === userDoc.userId;
};

/**
 * Can the user manage (edit/delete/upload media for) this property?
 * Admin: always. Owner (listing agent): yes.
 * Otherwise only if the property is in the user's assignedProperties list.
 */
export const canUserManageProperty = (userDoc, property) => {
  if (!userDoc || !property) return false;
  if (isAdminDoc(userDoc)) return true;
  if (property.userId === userDoc.userId) return true;
  const propertyId = property.id || property.propertyId;
  return Array.isArray(userDoc.assignedProperties) &&
    Boolean(propertyId) &&
    userDoc.assignedProperties.includes(propertyId);
};

// Fields each role may edit, per resource type. Admin is handled separately
// (full access). Buyers/sellers are external roles with no edit rights here.
const EDITABLE_FIELDS_BY_ROLE = {
  agent: {
    lead: ['name', 'phone', 'email', 'serviceType', 'source', 'contactMethod', 'notes',
      'street', 'city', 'state', 'zipCode', 'propertyType', 'warmth'],
    property: ['address', 'listPrice', 'beds', 'baths', 'sqft', 'lotSize', 'yearBuilt',
      'propertyType', 'status', 'mlsNumber', 'photos', 'description', 'features',
      'hoa', 'taxes', 'sellerId'],
    contact: ['firstName', 'lastName', 'email', 'phone', 'contactType', 'buyerType',
      'activelyBuying', 'preApprovalAmount', 'propertyAddress', 'notes', 'tags', 'source'],
    deal: ['buyerId', 'buyerName', 'sellerId', 'sellerName', 'propertyId', 'propertyAddress',
      'dealType', 'purchasePrice', 'offerPrice', 'status', 'commission', 'offerDate',
      'contractDate', 'inspectionDate', 'expectedCloseDate', 'actualCloseDate',
      'contingencies', 'notes'],
    settings: ['displayName', 'phone']
  },
  buyer: {},
  seller: {}
};

export const ALL_FIELDS = '*';

/**
 * Returns the fields the user may edit on a resource type
 * ('lead' | 'property' | 'contact' | 'deal' | 'settings').
 * Admin gets ['*'] meaning every field. Unknown roles get nothing.
 */
export const getEditableFields = (userDoc, resourceType) => {
  if (!userDoc || !resourceType) return [];
  if (isAdminDoc(userDoc)) return [ALL_FIELDS];
  const roleFields = EDITABLE_FIELDS_BY_ROLE[userDoc.role] || {};
  return roleFields[resourceType] || [];
};

/** Convenience: can the user edit this specific field on this resource type? */
export const canEditField = (userDoc, resourceType, field) => {
  const fields = getEditableFields(userDoc, resourceType);
  return fields.includes(ALL_FIELDS) || fields.includes(field);
};
