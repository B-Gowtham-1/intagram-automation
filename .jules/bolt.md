## 2024-05-18 - [React Anti-Pattern: Side Effects in SetState]
**Learning:** Putting side effects (like `URL.revokeObjectURL()`) inside a `setState` updater function (e.g., `setImages(prev => ...)`) is a React anti-pattern because the updater must be pure. Even deferring it with `setTimeout` violates the rule and might run twice in Strict Mode.
**Action:** When side effects are needed alongside state updates, execute them outside the updater function, even if it requires storing data temporarily in a ref or adding the data to the effect dependency array.
