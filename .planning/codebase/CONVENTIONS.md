# Coding Conventions

**Analysis Date:** 2026-07-06

## Naming Patterns

**Files:**
- **Components:** PascalCase (e.g., `LoginPage.js`, `LoadingSpinner.js`, `CRMLeadDetailPage.js`)
  - Location: `src/components/`
  - Each file exports one or more React components with `export const ComponentName = ...`
- **Utilities:** camelCase (e.g., `permissions.js`, `notifications.js`, `helpers.js`)
  - Location: `src/utils/`
  - Pure functions or side-effect-managed helpers
- **Hooks:** camelCase with `use` prefix (e.g., `useUserDoc.js`, `useDebounce.js`, `useEscapeKey.js`)
  - Location: `src/utils/`
- **Contexts:** PascalCase (e.g., `UserContext.js`)
  - Location: `src/contexts/`
- **Tests:** `*.test.js` suffix (e.g., `permissions.test.js`)
  - Co-located with source files in same directory
- **Config files:** camelCase or lowercase (e.g., `firebase.js`, `cloudinary.js`)

**Functions:**
- Named exports: `export const functionName = ...`
- camelCase for all function names (utility, hooks, handlers)
- Verb-first naming for clear intent:
  - `can*` for permission checks: `canUserAccess()`, `canEditField()`
  - `get*` for data retrieval: `getNavItemsForRole()`, `getEditableFields()`
  - `normalize*` for data transformation: `normalizeAddressValue()`, `normalizeLeadWarmth()`
  - `format*` for display formatting: `formatDocumentJurisdictionLabel()`, `formatPropertyTypeLabel()`
  - `is*` for boolean checks: `isAdminUser()`, `isExternalRole()`
  - Handler functions: `handle*` for event handlers in components

**Variables:**
- camelCase for all local variables and state
- const by default; let only when reassignment is necessary
- Descriptive names over single letters (except loop indices)
- State variables follow `[state, setState]` pattern with React hooks

**Types/Constants:**
- UPPERCASE_WITH_UNDERSCORES for module-level constants
  - Examples: `EDITABLE_FIELDS_BY_ROLE`, `ALL_FIELDS`, `ADMIN_EMAIL`, `SELF_SERVICE_ROLES`
- Used for: config constants, lookup tables, enums, magic strings
- Design tokens (in `src/App.css`): lowercase with hyphens (e.g., `--text-primary`, `--surface-1`, `--accent`)

**CSS Custom Properties (Design Tokens):**
- Location: `src/App.css` in `:root` selector
- Naming: `--category-variant` pattern (e.g., `--text-primary`, `--surface-2`, `--accent-soft`)
- All components use `var(--token-name)` instead of hardcoded hex values

## Code Style

**Formatting:**
- ESLint with `react-app` and `react-app/jest` configs (from Create React App)
- Run with: `npm run lint`
- No explicit Prettier config; relies on ESLint defaults
- Indentation: 2 spaces (enforced by eslint via react-app)
- No semicolon requirement in eslint config; style is inconsistent in codebase (some files omit, some include)
- Max line length: not enforced

**Linting:**
- `npm run lint` runs ESLint over `src/` with `.js` extension
- ESLint extends React App config which includes:
  - React hooks rules (exhaustive deps warnings)
  - Jest assertions
  - Basic ES6+ rules
  - No explicit no-unused-vars override (warnings enabled)

**Component Structure:**
```javascript
import React, { useState, useEffect } from 'react';
import { externalDep } from 'external-lib';
import useUserDoc from '../utils/useUserDoc';
import { helperFunction } from '../utils/helpers';
import './ComponentName.css';  // if styles exist

const ComponentName = ({ prop1, prop2 = defaultValue }) => {
  // State declarations
  const [state, setState] = useState(initialValue);
  
  // Hooks (useEffect, useCallback, etc.)
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // Event handlers and callbacks
  const handleClick = () => { /* ... */ };
  
  // Render
  return (
    <div>Content</div>
  );
};

export default ComponentName;
// or
export const ComponentName = ...;
```

**Inline Styles:**
- Components use inline style objects, not CSS files (though some have `.css` companions)
- Always reference design tokens with `var(--token-name)` for colors, spacing, sizing
- Example:
  ```javascript
  style={{
    fontSize: 'var(--font-base)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-4)',
    borderRadius: 'var(--radius-md)'
  }}
  ```

## Import Organization

**Order:**
1. React and React DOM imports
2. Third-party libraries (firebase, recharts, react-pdf, etc.)
3. Local utilities and hooks (`src/utils/`, `src/contexts/`)
4. Local components (`src/components/`)
5. CSS imports (if present)

**Path Style:**
- Relative paths with `../` or `./` (no path aliases configured)
- Absolute imports from `src/` are not used

**Example:**
```javascript
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import useUserDoc from '../utils/useUserDoc';
import { canUserAccess } from '../utils/permissions';
import ConfirmModal from './ConfirmModal';
import './MyComponent.css';
```

**Barrel Files:**
- Not used; components are imported individually
- Each component is its own entry point

## Error Handling

**Patterns:**
- **async/await with try/catch/finally:**
  ```javascript
  try {
    const result = await someAsyncOperation();
    // handle success
  } catch (error) {
    console.error('User-facing context:', error);
    setError(friendlyErrorMessage(error));
  } finally {
    setLoading(false);
  }
  ```

- **Firebase error translation:** Helper functions map Firebase error codes to user-friendly messages
  - Example: `friendlyAuthError()` in `src/components/LoginPage.js`
  - Translates `auth/invalid-credential` → `"Incorrect email or password. Please try again."`

- **Fire-and-forget for non-blocking operations:**
  - Notifications, audit logging, and other side effects use `.catch()` to avoid breaking main actions
  - Example from `src/utils/notifications.js`:
    ```javascript
    addDoc(collection(db, 'notifications'), {...}).catch((error) => {
      console.error('Failed to send notification:', error);
    });
    ```

- **Graceful degradation:**
  - sessionStorage access wrapped in try/catch (may be unavailable in strict modes)
  - Null checks on Firestore document access before dereferencing
  - Optional chaining (`?.`) used liberally for nested object access

- **No error boundary pattern observed** in utility functions; `src/components/ErrorBoundary.js` exists but not extensively documented in codebase

## Logging

**Framework:** console methods only

**Patterns:**
- `console.error()` for failures that interrupt user workflows
  - Example: `console.error('Error loading user document:', error);`
  - Used in: auth state changes, Firestore queries, async operations
- `console.log()` not observed in production code (may be present in dead code)
- No structured logging or log levels above console

**When to log:**
- Errors during auth state changes
- Failed Firestore writes (audit log, notifications)
- Failed fetch operations
- User-action side effects that fail silently (like notifications)

## Comments

**When to Comment:**
- JSDoc for exported public functions (especially in utils/)
- Inline comments explaining non-obvious logic or workarounds
- Comments for Firebase security rule implications
- Comments for performance-sensitive operations (lazy loading, deduplication)
- Do NOT comment obvious code (e.g., `const x = 5; // set x to 5`)

**JSDoc/TSDoc:**
- Used for exported utility functions, not component props
- Format: `/** ... */` over functions
- Include parameter types, return type, and usage example when helpful
- Example from `src/utils/permissions.js`:
  ```javascript
  /**
   * Can the user see/open this resource at all?
   * Admin sees everything; everyone else only their own userId-scoped records.
   */
  export const canUserAccess = (userDoc, resource) => { /* ... */ };
  ```

- Component prop documentation: Not using PropTypes or TypeScript; props documented inline in JSDoc of component function if complex
- Example from `src/utils/notifications.js`:
  ```javascript
  /**
   * Send an in-app notification to each recipient UID. Fire-and-forget —
   * notifying must never block or break the action that triggered it.
   * The sender is skipped automatically.
   *
   * notifyUsers([uid1, uid2], { type: 'deal-message', title: 'New message', body: '...', dealId })
   */
  ```

## Function Design

**Size:** 
- Utility functions range from 1-3 lines (simple checks) to 15-20 lines (complex transforms)
- No explicit max length enforced
- Preference for small, composable functions over monolithic ones
- Complex components split into sub-components or helpers

**Parameters:**
- Named parameters (destructuring) preferred over positional for 2+ params
- Default values in destructuring: `{ size = 40, color = '#0088ff' } = {}`
- Optional parameters use default values, not conditionals
- No rest parameters pattern observed

**Return Values:**
- Early returns for guard clauses:
  ```javascript
  export const canUserAccess = (userDoc, resource) => {
    if (!userDoc || !resource) return false;
    if (isAdminDoc(userDoc)) return true;
    return resource.userId === userDoc.userId;
  };
  ```
- Implicit returns in arrow functions when body is single expression
- Boolean helpers return early for falsy conditions

**Arrow Functions vs Regular Functions:**
- Arrow functions preferred for: utility functions, event handlers, callbacks, component exports
- Regular `function` keyword not used in modern code
- Exception: None observed; arrow functions consistently used

## Module Design

**Exports:**
- Named exports (`export const`) preferred for utilities
  - Allows tree-shaking and explicit imports
  - Example: `export const canUserAccess = (...) => ...`
- Default exports used for:
  - Page components (e.g., `export default LoginPage`)
  - Context (e.g., `export default UserContext`)
  - Custom hooks (e.g., `export default useUserDoc`)
- Mix of default and named exports in same file is common

**Barrel Files:**
- Not used in this codebase
- Each module directly exported; no `index.js` re-exports in `components/` or `utils/`

**Module Dependencies:**
- Firebase services (`db`, `auth`, `storage`) imported from `src/firebase.js`
- Centralized initialization and re-export
- Components import auth state via `useUser()` context, not directly from firebase
- Firestore queries written directly in components or utility functions

## State Management

**Pattern:** Local React state + Firebase as source of truth

- Components use `useState()` for transient UI state (form inputs, UI toggles)
- Firestore collections are read/written directly via `firebase/firestore` SDK
- `UserContext` manages signed-in user state and user document (from Firestore)
- No Redux, Zustand, or other state library
- URL state synchronization in `src/App.js` to restore page navigation across refreshes

## Data Flow

**Unidirectional:**
1. Component renders with local state
2. User interaction triggers handler
3. Handler updates local state or Firestore
4. Firestore listener updates component state (if applicable)
5. Re-render

**Firestore reads:**
- One-off reads: `getDoc()` in event handlers or useEffect
- Real-time listeners: Not observed in main codebase; snapshot-based reads are used
- Queries: Direct use of `query()`, `where()`, `orderBy()`, `limit()` in components

**Async patterns:**
- Async handlers with try/catch
- useEffect cleanup functions for unsubscribes
- `finally` block to reset loading state

---

*Convention analysis: 2026-07-06*
