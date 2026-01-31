# Proposal: fix-trpc-subscription-crash

## Problem

The event detail page (`/events/[id]`) crashes at runtime because it calls `trpc.event.onStatusChange.useSubscription()` (line 30), but the tRPC client only configures `httpBatchLink` — which does not support subscriptions. This makes every event detail page inaccessible, blocking event management workflows and E2E tests that navigate to event details.

Additionally, `task.ts:801` defines a `task.onUpdate` subscription procedure (also a placeholder), which could trigger the same crash if a client component ever calls it.

## Root Cause

- **Client**: `providers.tsx` creates a tRPC client with only `httpBatchLink`
- **Server**: `event.ts:381` and `task.ts:801` define `.subscription()` procedures using `observable()`
- **Runtime**: `useSubscription` on an `httpBatchLink`-only client throws — the link does not know how to handle subscription operations
- The server-side subscription procedures are placeholders — they never emit events (empty `setInterval` callbacks)

## Approach: Remove subscriptions, replace with polling

Since the subscription infrastructure is purely placeholder (no Redis Pub/Sub, no PostgreSQL LISTEN/NOTIFY, no SSE transport), the simplest and most correct fix is:

1. **Remove** the `useSubscription` call from the event detail page
2. **Replace** with `refetchInterval` on the existing `useQuery` — delivers the same "near-real-time" behavior SC-004 targets (2-second visibility)
3. **Remove** the placeholder subscription procedures from `event.ts` and `task.ts` — dead code that can only cause crashes
4. **Update** the monorepo-configuration spec to reflect that real-time updates use polling until subscription infrastructure is built

### Why not add SSE transport?

Adding `httpSubscriptionLink` + `splitLink` to the tRPC client is the correct long-term approach, but it requires:
- A working server-side event source (Redis Pub/Sub, PostgreSQL LISTEN/NOTIFY, or similar)
- SSE endpoint configuration in Next.js
- Error handling for connection drops, reconnection, etc.

The current subscription procedures are empty placeholders. Adding transport for non-functional subscriptions adds complexity with zero benefit. Polling achieves SC-004's 2-second target and can be swapped for SSE later without changing the UI.

## Scope

| Action | File | Change |
|--------|------|--------|
| Remove `useSubscription` call | `apps/web/src/app/(dashboard)/events/[id]/page.tsx` | Remove lines 28-38, add `refetchInterval: 5000` to `useQuery` |
| Remove `onStatusChange` subscription | `apps/web/src/server/routers/event.ts` | Remove lines 380-396, remove `observable` import |
| Remove `onUpdate` subscription | `apps/web/src/server/routers/task.ts` | Remove lines 801-816, remove `observable` import |
| Update spec requirement | `openspec/specs/monorepo-configuration/spec.md` | Modify subscription compatibility requirement |

## Expected Outcome

- Event detail page loads without crashing
- Event data refreshes every 5 seconds via polling (configurable)
- No dead subscription code in the codebase
- E2E tests that navigate to `/events/[id]` can be unskipped
- Clean `pnpm type-check` pass
