# Testing Patterns

**Analysis Date:** 2026-07-06

## Test Framework

**Runner:**
- Jest (via react-scripts 5)
- No explicit jest.config.js; configuration inherited from Create React App
- Run with: `npm run test:ci` (non-interactive, for CI) or `npm test` (watch mode)

**Assertion Library:**
- Built-in Jest matchers: `expect()`, `.toBe()`, `.toEqual()`, `.toContain()`, `.toHaveBeenCalledTimes()`, `.toMatchObject()`
- `@testing-library/jest-dom` for DOM assertions: `.toHaveTextContent()`, `.toHaveValue()`, etc.

**Testing Library Integration:**
- `@testing-library/react` v16.3.1 — render components, query DOM
- `@testing-library/user-event` v13.5.0 — simulate user interactions
- `@testing-library/jest-dom` v6.9.1 — custom matchers
- Configured in `src/setupTests.js`: imports jest-dom matchers

**Run Commands:**
```bash
npm run test:ci                 # Run all tests non-interactive (CI mode)
npm test                        # Run tests in watch mode
npm run build                   # Also runs tests as pre-check
npm run lint                    # ESLint linting (separate from tests)
```

**CI Integration:**
- `.github/workflows/ci.yml` runs lint → test:ci → build on every push to main
- Tests must pass before Vercel deployment

## Test File Organization

**Location:** Co-located with source files

- `src/utils/permissions.test.js` — tests for `src/utils/permissions.js`
- `src/utils/notifications.test.js` — tests for `src/utils/notifications.js`
- `src/components/roleNav.test.js` — tests for `src/components/Icons.js` (navigation logic)

**Naming Convention:** `*.test.js` suffix (not `.spec.js`)

**Directory Structure:**
```
src/
├── utils/
│   ├── permissions.js
│   ├── permissions.test.js
│   ├── notifications.js
│   ├── notifications.test.js
│   └── ...
├── components/
│   ├── Icons.js
│   ├── roleNav.test.js
│   └── ...
└── setupTests.js
```

**Test File Count:** 3 test files with ~37 test blocks total

## Test Structure

**Suite Organization:**
```javascript
import { functionName } from './module';
import { someExport } from '../other/path';

// Mock external dependencies at module level
jest.mock('../firebase', () => ({
  auth: { currentUser: null },
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn()
}));

// Test data fixtures (constants at top)
const admin = { userId: 'admin-1', email: 'dealcenterx@gmail.com', role: 'admin' };
const agent = { userId: 'agent-1', email: 'agent@example.com', role: 'agent' };

// Test suites
describe('functionName', () => {
  it('should behave in case X', () => {
    expect(functionName(...)).toBe(expected);
  });
  
  it('should handle edge case Y', () => {
    // test
  });
});
```

**Patterns:**

1. **Setup Pattern:** Mocks defined at module level; test data constants at top of file
   ```javascript
   jest.mock('../firebase', () => ({
     auth: { currentUser: null },
     db: {}
   }));
   
   const admin = { userId: 'admin-1', role: 'admin' };
   ```

2. **Teardown Pattern:** `beforeEach()` to reset mock implementations between tests
   ```javascript
   beforeEach(() => {
     addDoc.mockImplementation(() => Promise.resolve());
   });
   ```
   - CRA Jest resets mock implementations between tests; `beforeEach` restores them for async mocks

3. **Assertion Pattern:** Simple `.toBe()` for primitives, `.toEqual()` for objects, `.toContain()` for arrays
   ```javascript
   expect(result).toBe(true);
   expect(array).toContain('expected-value');
   expect(object).toEqual({ key: 'value' });
   ```

## Mocking

**Framework:** Jest built-in `jest.mock()`

**Patterns:**

1. **Module-level Firebase mock:**
   ```javascript
   jest.mock('../firebase', () => ({
     auth: { currentUser: null },
     db: {}
   }));
   ```
   - Prevents Firebase SDK initialization in tests
   - Provides stub objects for imports

2. **Function mocks with implementations:**
   ```javascript
   jest.mock('firebase/firestore', () => ({
     addDoc: jest.fn()
   }));
   
   beforeEach(() => {
     addDoc.mockImplementation(() => Promise.resolve());
   });
   ```
   - Mock resolvable promises for async tests
   - Use `.mockClear()` or `.mockReset()` between tests if needed (implicit in CRA)

3. **Mock assertion patterns:**
   ```javascript
   // Check call count
   expect(addDoc).toHaveBeenCalledTimes(1);
   
   // Inspect call arguments
   expect(addDoc.mock.calls[0][1].recipientId).toBe('other-1');
   
   // Check object passed to function
   expect(payload).toMatchObject({
     recipientId: 'a',
     actorId: 'me',
     type: 'deal-message'
   });
   ```

**What to Mock:**
- Firebase services (auth, firestore, storage) — always
- External APIs if called from utility functions
- Time-dependent operations (though not observed in current tests)
- Module side effects (like sessionStorage) — wrapped in try/catch to avoid mocking

**What NOT to Mock:**
- Local utility functions (test the actual implementation)
- Logic functions that don't have external dependencies
- Tested functions should call real implementations of helper functions they depend on

**Mock Organization:**
- Mocks declared at top of file, immediately after imports
- Used across all tests in that file
- Implementation overrides set in `beforeEach()` for reusable setup

## Fixtures and Factories

**Test Data:**
- Simple object literals at top of file, not factory functions
- Example from `src/utils/permissions.test.js`:
  ```javascript
  const admin = { userId: 'admin-1', email: 'dealcenterx@gmail.com', role: 'admin', assignedProperties: [] };
  const agent = { userId: 'agent-1', email: 'agent@example.com', role: 'agent', assignedProperties: ['prop-9'] };
  const buyer = { userId: 'buyer-1', email: 'buyer@example.com', role: 'buyer', assignedProperties: ['prop-9'] };
  ```

**Location:** In the test file itself, at the top after imports/mocks

**Pattern:** Constants shared across multiple test suites in the same file

**No dedicated fixtures directory** — all test data is inline

## Coverage

**Requirements:** No explicit coverage targets enforced

**Approach:** Test only utility functions and permission logic; components are not tested

**Current Coverage:**
- `src/utils/permissions.js` — fully tested (4 test suites: canUserAccess, canUserManageProperty, getEditableFields, canEditField)
- `src/utils/notifications.js` — fully tested (2 test suites: dealRecipients, notifyUsers)
- `src/components/Icons.js` — partially tested (navigation logic: 2 test suites: isExternalRole, getNavItemsForRole)

**Gaps:**
- No component render tests (React Testing Library not used for DOM testing)
- No integration tests across modules
- No end-to-end tests (Puppeteer in devDependencies but not configured/used)
- Pages and complex components not tested
- Firebase-dependent features tested via mocks only

## Test Types

**Unit Tests:**
- Scope: Pure functions with clear input/output
- Approach: Pass test data, assert return value
- Examples:
  - `canUserAccess(userDoc, resource)` — permission checks
  - `normalizeLeadWarmth(value)` — string transformations
  - `dealRecipients(deal)` — array generation from object
- No component DOM testing

**Integration Tests:**
- Not present in codebase
- Would test Firestore queries + permission logic together
- Would test multi-function workflows (e.g., creating a user → loading their permissions)

**E2E Tests:**
- Not configured
- Puppeteer available in devDependencies but no test suite
- Could test login flow → navigation → data display in real browser

## Common Patterns

**Async Testing:**
- Async functions tested by directly calling them in test
- Mock implementations return resolved promises
- Example:
  ```javascript
  it('notifyUsers calls addDoc correctly', async () => {
    notifyUsers(['a'], { type: 't', title: 'x' });
    expect(addDoc).toHaveBeenCalledTimes(1);
  });
  ```
  - No explicit `await` in test; function completes synchronously due to mock
  - If testing actual async behavior, would need `await` or `.resolves` matcher

**Error Testing:**
- Not explicitly tested in current suites
- Edge cases tested via null/undefined inputs:
  ```javascript
  it('denies on missing user or resource', () => {
    expect(canUserAccess(null, { userId: 'agent-1' })).toBe(false);
    expect(canUserAccess(agent, null)).toBe(false);
  });
  ```

**Data Structure Testing:**
- Array and object tests use `.toContain()`, `.toEqual()`, `.toMatchObject()`
- Example:
  ```javascript
  it('includes the owner and all participants', () => {
    const deal = { userId: 'agent-1', participantIds: ['buyer-1', 'seller-1'] };
    expect(dealRecipients(deal)).toEqual(['agent-1', 'buyer-1', 'seller-1']);
  });
  ```

**Permission Testing Pattern:**
- Role-based: test admin, agent, buyer roles separately
- Ownership: test owner vs non-owner scenarios
- Assignment: test assigned vs unassigned resources
- Example from `src/utils/permissions.test.js`:
  ```javascript
  describe('canUserManageProperty', () => {
    it('admin manages any property', () => { /* ... */ });
    it('listing owner manages their property', () => { /* ... */ });
    it('assigned user manages an assigned property', () => { /* ... */ });
    it('unassigned non-owner is denied', () => { /* ... */ });
  });
  ```

**Deduplication Testing:**
- Verifies Set logic and filter behavior
- Example:
  ```javascript
  it('dedupes recipients and skips falsy ids', () => {
    notifyUsers(['a', 'a', null, undefined, 'b'], { type: 't', title: 'x' });
    const recipients = addDoc.mock.calls.map((call) => call[1].recipientId);
    expect(recipients.sort()).toEqual(['a', 'b']);
  });
  ```

## Best Practices Observed

1. **Descriptive test names:** Tests are self-documenting sentences
   - ✓ "admin can access any resource"
   - ✓ "handles missing assignedProperties gracefully"
   - ✗ "test1" or "should work"

2. **One assertion per test (mostly):** Each test verifies one behavior
   - Exception: Permission tests combine multiple assertions for the same scenario

3. **Clear test data:** Fixtures are named by role/type, not generic (admin, agent, buyer)

4. **No test interdependencies:** Each test is isolated; order doesn't matter

5. **Mock at module level:** Prevents test leakage and keeps setup clean

---

*Testing analysis: 2026-07-06*
