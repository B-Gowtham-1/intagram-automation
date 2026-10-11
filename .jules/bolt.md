## 2024-05-24 - Unnecessary re-renders on Keystrokes
**Learning:** Tying fast-updating local state (like text input) to heavy adjacent components via a common parent causes unnecessary full-tree re-renders, impacting input responsiveness.
**Action:** Use React.memo() on heavy components and useCallback() on their handlers to prevent re-renders when orthogonal parent state (like text inputs) changes.
