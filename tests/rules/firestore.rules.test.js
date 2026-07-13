import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let testEnv;

const projectId = 'rems-rules-test';

const authedDb = (uid, claims = {}) =>
  testEnv.authenticatedContext(uid, claims).firestore();

const seed = async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'users/admin-uid'), {
      userId: 'admin-uid',
      email: 'admin@example.com',
      role: 'admin',
      assignedProperties: [],
      assignedDeals: []
    });
    await setDoc(doc(db, 'users/agent-a'), {
      userId: 'agent-a',
      email: 'agent@example.com',
      role: 'agent',
      assignedProperties: ['prop-assigned'],
      assignedDeals: ['deal-assigned']
    });
    await setDoc(doc(db, 'users/other-user'), {
      userId: 'other-user',
      email: 'other@example.com',
      role: 'agent',
      assignedProperties: [],
      assignedDeals: []
    });
    await setDoc(doc(db, 'users/admin-email-agent'), {
      userId: 'admin-email-agent',
      email: 'dealcenterx@gmail.com',
      role: 'agent',
      assignedProperties: [],
      assignedDeals: []
    });

    await setDoc(doc(db, 'contacts/contact-owned'), {
      userId: 'agent-a',
      firstName: 'Owned'
    });
    await setDoc(doc(db, 'contacts/contact-other'), {
      userId: 'other-user',
      firstName: 'Other'
    });

    await setDoc(doc(db, 'properties/prop-owned'), {
      userId: 'agent-a',
      status: 'active'
    });
    await setDoc(doc(db, 'properties/prop-assigned'), {
      userId: 'other-user',
      status: 'active'
    });

    await setDoc(doc(db, 'deals/deal-owned'), {
      userId: 'agent-a',
      status: 'active'
    });
    await setDoc(doc(db, 'deals/deal-assigned'), {
      userId: 'other-user',
      status: 'active'
    });
    await setDoc(doc(db, 'deals/deal-other'), {
      userId: 'other-user',
      status: 'active'
    });

    await setDoc(doc(db, 'deal-messages/message-assigned'), {
      dealId: 'deal-assigned',
      body: 'Existing message'
    });
    await setDoc(doc(db, 'deal-parties/party-assigned'), {
      dealId: 'deal-assigned',
      role: 'buyer'
    });
    await setDoc(doc(db, 'deal-channels/channel-assigned'), {
      dealId: 'deal-assigned',
      name: 'General'
    });
    await setDoc(doc(db, 'deal-documents/document-assigned'), {
      dealId: 'deal-assigned',
      name: 'Contract.pdf'
    });
    await setDoc(doc(db, 'deal-progress/progress-assigned'), {
      dealId: 'deal-assigned',
      stage: 'offer'
    });
    await setDoc(doc(db, 'deal-lender-pushes/lender-push-assigned'), {
      dealId: 'deal-assigned',
      status: 'sent'
    });

    await setDoc(doc(db, 'activity_log/log-1'), {
      userId: 'agent-a',
      action: 'created'
    });
  });
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync('firestore.rules', 'utf8')
    }
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seed();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('userId-scoped business collections', () => {
  it('allows owners to read and create their own contacts but denies other users records', async () => {
    const db = authedDb('agent-a', { email: 'agent@example.com' });

    await assertSucceeds(getDoc(doc(db, 'contacts/contact-owned')));
    await assertFails(getDoc(doc(db, 'contacts/contact-other')));
    await assertSucceeds(setDoc(doc(db, 'contacts/contact-new'), {
      userId: 'agent-a',
      firstName: 'New'
    }));
    await assertFails(setDoc(doc(db, 'contacts/contact-forged'), {
      userId: 'other-user',
      firstName: 'Forged'
    }));
  });

  it('allows admin role documents to read and delete any scoped record', async () => {
    const db = authedDb('admin-uid', { email: 'admin@example.com' });

    await assertSucceeds(getDoc(doc(db, 'contacts/contact-other')));
    await assertSucceeds(deleteDoc(doc(db, 'contacts/contact-other')));
  });

  it('does not grant admin access from the admin email without an admin role document', async () => {
    const db = authedDb('admin-email-agent', { email: 'dealcenterx@gmail.com' });

    await assertFails(getDoc(doc(db, 'contacts/contact-other')));
    await assertFails(deleteDoc(doc(db, 'contacts/contact-other')));
  });
});

describe('users self-service rules', () => {
  it('prevents self-registration with an admin role but allows a non-admin role', async () => {
    const adminDb = authedDb('self-new', { email: 'self-new@example.com' });
    const agentDb = authedDb('self-new2', { email: 'self-new2@example.com' });

    await assertFails(setDoc(doc(adminDb, 'users/self-new'), {
      userId: 'self-new',
      email: 'self-new@example.com',
      role: 'admin',
      assignedProperties: [],
      assignedDeals: []
    }));
    await assertSucceeds(setDoc(doc(agentDb, 'users/self-new2'), {
      userId: 'self-new2',
      email: 'self-new2@example.com',
      role: 'agent',
      assignedProperties: [],
      assignedDeals: []
    }));
  });

  it('prevents a user from escalating their own role or reassigning themselves', async () => {
    const db = authedDb('agent-a', { email: 'agent@example.com' });

    await assertFails(updateDoc(doc(db, 'users/agent-a'), { role: 'admin' }));
    await assertFails(updateDoc(doc(db, 'users/agent-a'), {
      assignedProperties: ['prop-x']
    }));
    await assertFails(updateDoc(doc(db, 'users/agent-a'), {
      assignedDeals: ['deal-x']
    }));
  });

  it('allows a benign self-update and lets admins change role/assignments', async () => {
    const selfDb = authedDb('agent-a', { email: 'agent@example.com' });
    const adminDb = authedDb('admin-uid', { email: 'admin@example.com' });

    await assertSucceeds(updateDoc(doc(selfDb, 'users/agent-a'), {
      email: 'agent-new@example.com'
    }));
    await assertSucceeds(updateDoc(doc(adminDb, 'users/agent-a'), {
      role: 'buyer',
      assignedProperties: ['prop-assigned', 'prop-2']
    }));
  });
});

describe('assignment-based access', () => {
  it('allows assigned users to read and update assigned properties without deleting them', async () => {
    const db = authedDb('agent-a', { email: 'agent@example.com' });

    await assertSucceeds(getDoc(doc(db, 'properties/prop-assigned')));
    await assertSucceeds(updateDoc(doc(db, 'properties/prop-assigned'), {
      status: 'pending',
      userId: 'other-user'
    }));
    await assertFails(deleteDoc(doc(db, 'properties/prop-assigned')));
  });

  it('allows assigned deal reads and deal-portal access but keeps assigned users read-only on deals', async () => {
    const db = authedDb('agent-a', { email: 'agent@example.com' });

    await assertSucceeds(getDoc(doc(db, 'deals/deal-assigned')));
    await assertFails(updateDoc(doc(db, 'deals/deal-assigned'), {
      status: 'closed',
      userId: 'other-user'
    }));
    await assertSucceeds(getDoc(doc(db, 'deal-messages/message-assigned')));
    await assertSucceeds(addDoc(collection(db, 'deal-messages'), {
      dealId: 'deal-assigned',
      body: 'Portal message'
    }));
    await assertFails(addDoc(collection(db, 'deal-messages'), {
      dealId: 'deal-other',
      body: 'No access'
    }));
  });
});

describe('deal-portal collections', () => {
  const writeOpenCollections = [
    { name: 'deal-parties', docId: 'party-assigned' },
    { name: 'deal-channels', docId: 'channel-assigned' },
    { name: 'deal-documents', docId: 'document-assigned' },
    { name: 'deal-progress', docId: 'progress-assigned' }
  ];

  writeOpenCollections.forEach(({ name, docId }) => {
    it(`grants ${name} read/create/update/delete via canAccessDeal for assigned users`, async () => {
      const db = authedDb('agent-a', { email: 'agent@example.com' });

      await assertSucceeds(getDoc(doc(db, `${name}/${docId}`)));
      await assertSucceeds(addDoc(collection(db, name), {
        dealId: 'deal-assigned',
        note: 'assigned'
      }));
      await assertFails(addDoc(collection(db, name), {
        dealId: 'deal-other',
        note: 'no access'
      }));
      await assertSucceeds(updateDoc(doc(db, `${name}/${docId}`), {
        note: 'updated'
      }));
      await assertSucceeds(deleteDoc(doc(db, `${name}/${docId}`)));
    });
  });

  it('restricts deal-lender-pushes update/delete to admin while allowing assigned read/create', async () => {
    const agentDb = authedDb('agent-a', { email: 'agent@example.com' });
    const adminDb = authedDb('admin-uid', { email: 'admin@example.com' });

    await assertSucceeds(getDoc(doc(agentDb, 'deal-lender-pushes/lender-push-assigned')));
    await assertSucceeds(addDoc(collection(agentDb, 'deal-lender-pushes'), {
      dealId: 'deal-assigned',
      status: 'sent'
    }));
    await assertFails(addDoc(collection(agentDb, 'deal-lender-pushes'), {
      dealId: 'deal-other',
      status: 'sent'
    }));
    await assertFails(updateDoc(doc(agentDb, 'deal-lender-pushes/lender-push-assigned'), {
      status: 'acknowledged'
    }));
    await assertFails(deleteDoc(doc(agentDb, 'deal-lender-pushes/lender-push-assigned')));
    await assertSucceeds(updateDoc(doc(adminDb, 'deal-lender-pushes/lender-push-assigned'), {
      status: 'acknowledged'
    }));
  });
});

describe('activity_log append-only behavior', () => {
  it('allows users to append their own activity and denies forged entries', async () => {
    const db = authedDb('agent-a', { email: 'agent@example.com' });

    await assertSucceeds(addDoc(collection(db, 'activity_log'), {
      userId: 'agent-a',
      action: 'updated'
    }));
    await assertFails(addDoc(collection(db, 'activity_log'), {
      userId: 'other-user',
      action: 'forged'
    }));
  });

  it('allows admin reads; append-only is NOT enforced against admin today (catch-all override — SEC-04)', async () => {
    const adminDb = authedDb('admin-uid', { email: 'admin@example.com' });
    const agentDb = authedDb('agent-a', { email: 'agent@example.com' });

    await assertSucceeds(getDoc(doc(adminDb, 'activity_log/log-1')));
    await assertFails(getDoc(doc(agentDb, 'activity_log/log-1')));
    // CHARACTERIZATION OF CURRENT BEHAVIOR (Phase 2): the `match /{document=**}`
    // admin-override (firestore.rules ~L207-209, `allow read, write: if isAdmin()`)
    // is OR'd with the activity_log rule's `allow update, delete: if false`, so the
    // override wins and an admin CAN edit/delete audit entries. The documented
    // append-only guarantee (CLAUDE.md) does NOT hold against the admin account.
    // Known HIGH audit-integrity gap — Phase 6 / SEC-04 must scope the catch-all (or
    // add an explicit activity_log deny) and flip these two back to assertFails.
    await assertSucceeds(updateDoc(doc(adminDb, 'activity_log/log-1'), {
      action: 'edited'
    }));
    await assertSucceeds(deleteDoc(doc(adminDb, 'activity_log/log-1')));
  });
});
