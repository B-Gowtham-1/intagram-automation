## 2025-02-23 - Concurrent File Processing in React

**Learning:** `Promise.all` inherently maintains the order of the input array. There is no need to manually sort the resulting array based on indices if the input promises resolve in the correct sequence of mapping.

**Action:** When substituting sequential loop processing with `Promise.all` mapping over arrays for performance optimizations, directly utilize the returned mapped array, avoiding redundant sorting logic.