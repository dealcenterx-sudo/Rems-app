# REMS - Complete Database Schema

## Overview
All-in-one real estate platform supporting Buyers, Sellers, Agents, and Brokers.

---

## COLLECTIONS

### 1. **users** (Authentication & User Profiles)
```javascript
{
  userId: "firebase_auth_uid",
  email: "user@example.com",
  role: "agent" | "admin" | "buyer" | "seller",
  firstName: "John",
  lastName: "Doe",
  phone: "(555) 555-5555",
  companyId: "company_doc_id", // optional
  createdAt: "2026-01-27T12:00:00Z",
  updatedAt: "2026-01-27T12:00:00Z"
}
```

### 2. **contacts** (Buyers, Sellers, Agents, Lenders, etc.)
```javascript
{
  id: "auto_generated",
  userId: "owner_user_id", // agent who owns this contact
  contactType: "buyer" | "seller" | "agent" | "lender" | "investor",
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com",
  phone: "(555) 123-4567",
  
  // Buyer-specific fields
  buyerType: "flipper" | "builder" | "holder", // if contactType === "buyer"
  activelyBuying: true,
  preApprovalAmount: 500000,
  
  // Seller-specific fields
  propertyAddress: "123 Main St", // if contactType === "seller"
  
  // General
  notes: "Met at open house, looking for 3BR",
  tags: ["hot-lead", "first-time-buyer"],
  source: "referral" | "cold-call" | "website" | "open-house",
  createdAt: "2026-01-27T12:00:00Z",
  updatedAt: "2026-01-27T12:00:00Z"
}
```

### 3. **properties** (Property Listings)
```javascript
{
  id: "auto_generated",
  userId: "agent_user_id", // listing agent
  
  // Basic Info
  address: {
    street: "123 Main Street",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90001",
    county: "Los Angeles"
  },
  
  // Property Details
  listPrice: 750000,
  beds: 3,
  baths: 2,
  sqft: 2000,
  lotSize: 5000,
  yearBuilt: 1995,
  propertyType: "single-family" | "condo" | "townhouse" | "multi-family" | "land",
  
  // Status
  status: "active" | "pending" | "sold" | "off-market",
  mlsNumber: "MLS123456",
  
  // Media
  photos: [
    {
      url: "https://storage.url/photo1.jpg",
      order: 0,
      caption: "Front view"
    }
  ],
  
  // Description
  description: "Beautiful 3BR home with modern updates...",
  features: ["pool", "granite-counters", "hardwood-floors"],
  
  // Financials
  hoa: 150, // monthly
  taxes: 8000, // annual
  
  // Relationships
  sellerId: "contact_doc_id", // linked to contacts collection
  
  // Dates
  listedDate: "2026-01-15T12:00:00Z",
  soldDate: null,
  createdAt: "2026-01-27T12:00:00Z",
  updatedAt: "2026-01-27T12:00:00Z"
}
```

### 4. **deals** (Transaction Pipeline)
```javascript
{
  id: "auto_generated",
  userId: "agent_user_id",
  
  // Parties
  buyerId: "contact_doc_id",
  buyerName: "John Buyer",
  sellerId: "contact_doc_id",
  sellerName: "Jane Seller",
  propertyId: "property_doc_id", // optional - can create deal without listing
  propertyAddress: "123 Main Street, LA, CA 90001",
  
  // Deal Details
  dealType: "purchase" | "listing" | "lease" | "wholesale",
  purchasePrice: 750000,
  offerPrice: 735000,
  
  // Pipeline Stage
  status: "lead" | "qualified" | "active-search" | "offer-submitted" | 
          "under-contract" | "pending-inspection" | "pending-financing" | 
          "pending-title" | "clear-to-close" | "closed" | "dead",
  
  // Financials
  commission: {
    percentage: 3.0, // 3%
    amount: 22500,
    split: 50, // % going to this agent
    agentEarnings: 11250
  },
  
  // Dates
  offerDate: "2026-01-20T12:00:00Z",
  contractDate: "2026-01-22T12:00:00Z",
  inspectionDate: "2026-01-25T12:00:00Z",
  expectedCloseDate: "2026-02-22T12:00:00Z",
  actualCloseDate: null,
  
  // Progress Tracking
  contingencies: [
    {
      type: "inspection",
      status: "pending" | "waived" | "completed",
      dueDate: "2026-01-30T12:00:00Z"
    },
    {
      type: "financing",
      status: "pending",
      dueDate: "2026-02-15T12:00:00Z"
    }
  ],
  
  // Activity
  notes: "Buyer loves the property, moving quickly",
  lastActivity: "2026-01-27T12:00:00Z",
  
  createdAt: "2026-01-27T12:00:00Z",
  updatedAt: "2026-01-27T12:00:00Z"
}
```

### 5. **tasks** (To-Do Items)
```javascript
{
  id: "auto_generated",
  userId: "agent_user_id",
  
  // Task Details
  title: "Schedule home inspection",
  description: "Contact inspector and coordinate with buyer",
  type: "follow-up" | "inspection" | "paperwork" | "showing" | "deadline" | "other",
  priority: "high" | "medium" | "low",
  
  // Status
  status: "pending" | "in-progress" | "completed" | "cancelled",
  
  // Relationships
  dealId: "deal_doc_id", // optional
  contactId: "contact_doc_id", // optional
  propertyId: "property_doc_id", // optional
  
  // Dates
  dueDate: "2026-01-30T12:00:00Z",
  completedDate: null,
  
  // Assignment
  assignedTo: "user_id",
  createdBy: "user_id",
  
  createdAt: "2026-01-27T12:00:00Z",
  updatedAt: "2026-01-27T12:00:00Z"
}
```

### 6. **offers** (Offer Management)
```javascript
{
  id: "auto_generated",
  
  // Relationships
  propertyId: "property_doc_id",
  buyerId: "contact_doc_id",
  dealId: "deal_doc_id", // created when offer accepted
  
  // Offer Details
  offerAmount: 735000,
  earnestMoney: 10000,
  downPayment: 147000, // 20%
  financingType: "conventional" | "fha" | "va" | "cash",
  
  // Terms
  contingencies: ["inspection", "financing", "appraisal"],
  inspectionPeriod: 10, // days
  financingPeriod: 21, // days
  closingDate: "2026-02-22T12:00:00Z",
  
  // Status
  status: "pending" | "accepted" | "rejected" | "countered" | "expired",
  
  // Counter Offers
  counterOffers: [
    {
      amount: 740000,
      terms: "Seller pays $2k closing costs",
      date: "2026-01-21T12:00:00Z"
    }
  ],
  
  // Documents
  documentUrl: "https://storage.url/offer.pdf",
  
  createdAt: "2026-01-27T12:00:00Z",
  updatedAt: "2026-01-27T12:00:00Z"
}
```

### 7. **showings** (Property Showings)
```javascript
{
  id: "auto_generated",
  
  // Relationships
  propertyId: "property_doc_id",
  buyerId: "contact_doc_id",
  agentId: "user_id",
  
  // Showing Details
  scheduledDate: "2026-01-28T14:00:00Z",
  duration: 30, // minutes
  status: "scheduled" | "completed" | "cancelled" | "no-show",
  
  // Feedback
  buyerInterest: "high" | "medium" | "low",
  feedback: "Loved the kitchen, concerned about backyard size",
  willMakeOffer: true,
  
  createdAt: "2026-01-27T12:00:00Z",
  updatedAt: "2026-01-27T12:00:00Z"
}
```

### 8. **documents** (File Management)
```javascript
{
  id: "auto_generated",
  userId: "uploader_user_id",
  
  // Document Info
  name: "Purchase Agreement.pdf",
  type: "contract" | "inspection" | "disclosure" | "title" | "financial" | "other",
  url: "https://storage.url/document.pdf",
  size: 245000, // bytes
  
  // Relationships
  dealId: "deal_doc_id", // optional
  propertyId: "property_doc_id", // optional
  contactId: "contact_doc_id", // optional
  
  // Metadata
  tags: ["signed", "final"],
  description: "Fully executed purchase agreement",
  
  createdAt: "2026-01-27T12:00:00Z",
  updatedAt: "2026-01-27T12:00:00Z"
}
```

### 9. **companies** (Optional - Multi-user Organizations)
```javascript
{
  id: "auto_generated",
  name: "Smith Real Estate Group",
  code: "ABC123", // join code
  
  // Company Details
  address: "456 Business Blvd",
  phone: "(555) 999-8888",
  email: "info@smithrealestate.com",
  
  // Users
  userIds: ["user1_id", "user2_id"],
  ownerId: "owner_user_id",
  
  createdAt: "2026-01-27T12:00:00Z",
  updatedAt: "2026-01-27T12:00:00Z"
}
```

### 10. **activity_log** (Audit Trail)
```javascript
{
  id: "auto_generated",
  userId: "actor_user_id",
  
  // Activity
  action: "created" | "updated" | "deleted" | "status_changed",
  entity: "deal" | "contact" | "property" | "task",
  entityId: "related_doc_id",
  
  // Changes
  changes: {
    field: "status",
    oldValue: "pending-inspection",
    newValue: "pending-financing"
  },
  
  // Context
  description: "Deal moved to pending financing",
  
  createdAt: "2026-01-27T12:00:00Z"
}
```

---

## INDEXES TO CREATE IN FIREBASE

```javascript
// contacts
userId, createdAt (desc)
userId, contactType, createdAt (desc)

// properties
userId, status, createdAt (desc)
status, listPrice (asc/desc)

// deals
userId, status, createdAt (desc)
userId, expectedCloseDate (asc)
status, expectedCloseDate (asc)

// tasks
userId, status, dueDate (asc)
assignedTo, status, dueDate (asc)
dealId, status

// offers
propertyId, status, createdAt (desc)
buyerId, status, createdAt (desc)
```

---

## SECURITY RULES

```javascript
// Users can only read/write their own data
// Admin can read all data (dealcenterx@gmail.com)
// Company members can see each other's data (if companyId matches)
```

---

## NEXT STEPS

1. Create Firebase indexes
2. Update existing deals to include new fields
3. Build Properties management
4. Build Tasks system
5. Build Offers workflow
6. Build Showings scheduler
7. Build Documents upload
8. Build Activity logging
