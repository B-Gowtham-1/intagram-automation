## 2024-11-20 - React Hook Ordering and Refs in Callbacks

**Learning:** When moving state to `useRef` to optimize React rendering performance during drag-and-drop operations, and subsequently wrapping the event handlers in `React.useCallback`, it's critical to place the hook declarations *before* any early return statements (like `if (images.length === 0) return null;`). Failing to do so breaks the Rules of Hooks. Also, `URL.revokeObjectURL` should not be executed inside a React state updater function since state updaters must be pure.

**Action:** Always verify the placement of hook declarations when refactoring components to add optimizations, ensuring they are at the top level and run unconditionally. Always extract side-effects from state updaters to `useCallback` or `useEffect`.

## 2024-11-20 - Database N+1 Queries and Test Environment Pollution

**Learning:** When adding a database optimization like `joinedload` to resolve an N+1 query issue, it's crucial to evaluate whether executing the test suite locally creates lingering artifacts (like files in a `data/` directory) or modifies database state if the tests aren't properly isolated. I incorrectly patched tests (`test_auth.py` and `test_jobs.py`) to pass against a polluted local database state where a 4th account had been added, which would break the tests in a clean CI environment.

**Action:** Always verify test failures against the clean, expected state of the repository, not the potentially polluted local state. Ensure any testing artifacts (like generated image files) are not staged for commit. I should run tests locally, but avoid modifying the tests themselves if they are failing because of my local test execution artifacts.
