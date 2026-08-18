---
name: handle-cross-cutting-changes
description: Trace and preserve the ownership spine of changes spanning multiple applications, runtime boundaries, persistence stores, generated contracts, authorization layers, or client/server state. Use when one behavior must change coherently across two or more of those boundaries.
---

# Handle Cross-Cutting Changes

A cross-cutting concern needs one ownership spine: authority flows outward to consumers without duplicating policy or durable state.

## Workflow

1. **Trace the spine.** Before editing, identify the entrypoint, authoritative policy and state, persistence, transport contract, and final consumer. Apply narrower repository and framework skills at their boundaries. Complete this step when every affected boundary and generated artifact is named.

2. **Assign one owner.** Name the single source of truth for every changed fact and policy. Let other layers carry identifiers, capabilities, or derived views. Complete this step when no two layers can independently contradict each other.

3. **Change from authority outward.** Update the model or use-case first, then adapters, transport, generated contracts, client cache, and UI. Keep boundary code focused on validation and translation. Remove superseded paths instead of maintaining parallel flows. Complete this step when the entire path uses the new contract and searches find no obsolete ownership.

4. **Verify the seams.** Test authority and failure behavior at each changed boundary, then exercise one end-to-end path. Regenerate contracts and run checks for every affected application. Complete this step when both valid and invalid flows prove the same ownership rules.

5. **Audit the shape.** State the source of truth for every changed concern and account for persistence, authorization, retries, errors, and asynchronous client state. Finish only when no duplicated authority, compatibility shim, or unexplained cross-layer dependency remains.

Do not create a shared module merely because several applications participate. Share stable contracts or focused capabilities; keep orchestration with the layer that owns the use-case.
