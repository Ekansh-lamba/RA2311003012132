# Notification System Design

## Stage 1 — API Design

### REST Endpoints

#### POST /notifications

**Request body:**
```json
{
  "userId": "string",
  "type": "placement | result | event",
  "message": "string",
  "metadata": {}
}
```

**Response — 201 Created:**
```json
{
  "id": "uuid",
  "userId": "string",
  "type": "placement",
  "message": "string",
  "metadata": {},
  "isRead": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### GET /notifications/:userId

**Response — 200 OK:**
```json
[
  {
    "id": "uuid",
    "userId": "string",
    "type": "result",
    "message": "string",
    "isRead": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

Supports optional query param `?isRead=false` to filter unread notifications only. The filter is applied server-side before returning results.

#### PATCH /notifications/:id/read

**Response — 200 OK:**
```json
{
  "id": "uuid",
  "isRead": true,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

Returns 404 if the notification does not exist.

### Real-Time: SSE Endpoint

#### GET /notifications/stream/:userId

The server upgrades the HTTP connection to a persistent SSE stream. On connection, the server registers the userId against the open response object in an in-memory map. When a new notification is written for that userId, the write path fans out to all active SSE connections for that user and pushes the event using the SSE wire format:

```
data: {"id":"uuid","type":"placement","message":"You have a new offer"}

```

A heartbeat comment is sent every 30 seconds to prevent proxy and load balancer idle-connection timeouts:

```
: heartbeat

```

The client handles reconnection automatically via the `EventSource` API. When the connection drops, the browser retries with exponential backoff. The server can send a `retry:` field to hint at the reconnect interval in milliseconds.

**Why SSE over WebSockets for read-heavy notification feeds:**

Notification feeds are asymmetric — the server pushes data and the client only reads. WebSockets provide full-duplex communication, which adds handshake complexity, a custom framing protocol, and stateful connection management for a use case that never sends data upstream. SSE runs over plain HTTP/1.1, works through existing proxies and CDNs without configuration changes, supports automatic client reconnection natively in the browser, and is trivially load-balanced because each request is a standard HTTP connection. The only scenario where WebSockets are necessary is when the client also needs to push data at high frequency — not the case here.

---

## Stage 2 — Database Design

### Table: notifications

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| userId | UUID | NOT NULL, FK → users.id |
| type | ENUM('placement','result','event') | NOT NULL |
| message | TEXT | NOT NULL |
| isRead | BOOLEAN | NOT NULL DEFAULT false |
| createdAt | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| metadata | JSONB | DEFAULT '{}' |

### Table: users

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| name | TEXT | NOT NULL |
| email | TEXT | NOT NULL UNIQUE |
| createdAt | TIMESTAMPTZ | NOT NULL DEFAULT now() |

### Indexes

```sql
CREATE INDEX idx_notifications_user_read_time
  ON notifications (userId, isRead, createdAt DESC);

CREATE INDEX idx_notifications_type_time
  ON notifications (type, createdAt DESC);
```

**Why these two and not more:**

The dominant query pattern is fetching all unread notifications for a user, ordered by recency. The composite index `(userId, isRead, createdAt DESC)` satisfies this with a single index scan — the planner uses the equality predicates on `userId` and `isRead` to narrow the scan, then reads rows in the pre-sorted `createdAt` order without a filesort. Column order matters: placing the equality columns first eliminates most rows before the range/sort column is evaluated.

The second index `(type, createdAt DESC)` covers type-filtered queries such as fetching all placement notifications in the last 7 days. Without it, every such query would perform a sequential scan across the entire table.

Additional indexes beyond these two are not justified. Each index is a separate B-tree structure that must be updated on every `INSERT`, `UPDATE`, and `DELETE`. The write amplification grows linearly with the number of indexes, increasing lock contention under write load. The query planner can also make poor choices when many indexes exist — it may choose a suboptimal index or perform unnecessary index merges. Index selection should be driven by observed slow queries, not speculation.

### Scaling

**Read replicas:** Route all `SELECT` queries to one or more read replicas. The primary handles only writes. This scales read throughput horizontally without sharding the dataset.

**Partitioning by userId range:** Partition the `notifications` table by userId hash range. Each partition holds a predictable subset of users. Queries that include `userId` in the `WHERE` clause are routed to a single partition, eliminating cross-partition scans as the dataset grows.

**Archiving old rows:** Rows older than a defined retention window (e.g., 90 days) are moved to a cold-storage archive table or exported to object storage and deleted from the hot table. This keeps the active table small, index sizes bounded, and vacuum operations fast.

---

## Stage 3 — Query Optimization

### Slow Query

```sql
SELECT id, userId, message, createdAt
FROM notifications
WHERE userId = $1
AND isRead = false
ORDER BY createdAt DESC;
```

**Why it is slow without an index:** PostgreSQL performs a sequential scan — it reads every row in the table and evaluates the `WHERE` predicates row by row. With millions of rows, this means reading and discarding the vast majority of the dataset for each request. After filtering, the result set must be sorted because there is no pre-ordered structure covering `createdAt`.

**The composite index that fixes it:**

```sql
CREATE INDEX idx_notifications_user_read_time
  ON notifications (userId, isRead, createdAt DESC);
```

**Why column order matters:** An index is a sorted B-tree. The leftmost columns act as the primary sort key. Placing `userId` first means all rows for a given user are co-located in the index — the planner can jump directly to that userId's section. `isRead` is next because it is an equality filter — it further narrows the matching rows within the userId range. `createdAt DESC` is last because it is a range/sort column — once the equality columns have narrowed the scan, the remaining rows are already in the correct sort order, eliminating the filesort entirely.

Reversing this order (e.g., `createdAt, isRead, userId`) would make the index useless for this query — the planner cannot efficiently seek to a specific userId when rows are sorted by time first.

### Placement Notifications Last 7 Days

```sql
SELECT id, userId, message, createdAt
FROM notifications
WHERE type = 'placement'
AND createdAt >= NOW() - INTERVAL '7 days'
ORDER BY createdAt DESC;
```

This query is covered by the second index:

```sql
CREATE INDEX idx_notifications_type_time
  ON notifications (type, createdAt DESC);
```

The planner seeks to `type = 'placement'` in the index, then scans forward only through the rows where `createdAt >= NOW() - INTERVAL '7 days'`. Rows are already in descending time order, so no filesort is needed.

**Why adding indexes on every column is harmful:** Every index is an independent B-tree that must be updated on every write. Inserting one row into `notifications` requires updating every index that includes any of that row's columns. This is write amplification — one logical write becomes multiple physical writes. Storage cost grows proportionally. During autovacuum, more index pages must be scanned and cleaned. The query planner's cost estimator can also be confused by many indexes, selecting suboptimal plans or performing index-merge operations that are slower than a single well-chosen index scan. Index creation should always be justified by a concrete, measured slow query.

---

## Stage 4 — Performance Improvements

### Redis Cache

Cache the per-user notification list in Redis with a TTL of 60 seconds. On any write (`POST /notifications` or `PATCH /notifications/:id/read`), invalidate that user's cache key immediately. On read, serve from cache if the key exists; fall through to the database on a miss.

**Trade-off:** Clients may see stale data for up to 60 seconds if a notification arrives between a cache population and its expiry. Acceptable for non-critical reads; not acceptable if real-time accuracy is required.

### Cursor-Based Pagination

Replace offset-based pagination with a cursor derived from `createdAt` and `id`. The client receives a `nextCursor` in each response and passes it as a query param on the next request. The server translates the cursor into a `WHERE createdAt < $cursor OR (createdAt = $cursor AND id < $id)` predicate.

**Trade-off:** The client must track and pass the cursor. Random-access page jumping is not possible. Consistent ordering is required — rows must not be reordered between pages.

### Lazy Loading

Load notifications only when the user opens the notification panel or scrolls to load more. The initial page load fetches nothing; the first request is deferred until the user requests it.

**Trade-off:** There is a visible latency between the user action and the data appearing. This is acceptable when balanced with a skeleton loading state.

### SSE Push

When a notification is written, push the delta directly to all active SSE connections for that userId instead of waiting for the client to poll. The client's notification count updates in real time without any periodic requests.

**Trade-off:** Each active user maintains a persistent HTTP connection. At scale (millions of concurrent users), this creates significant connection overhead and requires a connection registry (e.g., Redis pub/sub) to fan out events across multiple server instances.

### Batching Reads

Queue individual notification read requests and flush the batch to the database every 100 milliseconds. This reduces the number of database round-trips when many users are reading simultaneously.

**Trade-off:** Every read has an added latency of up to 100 milliseconds. This is imperceptible to humans but may affect systems that chain notification reads to subsequent dependent operations.

---

## Stage 5 — Notify All Redesign

### Current Broken Pseudocode

```
function notifyAll(users):
  for each user in users:
    send_email(user)
    save_to_db(user)
    push_notification(user)
```

**Why this fails:**

Sending email, writing to the database, and pushing notifications are chained synchronously inside a loop. One email delivery failure blocks all subsequent users from being processed. There is no retry mechanism — a transient SMTP failure permanently skips that user. Sequential iteration means the time to complete is O(n) with each user waiting for the previous one's full round-trip to finish. Database writes and email sends block each other — a slow SMTP server stalls the database connection. This function cannot be scaled horizontally because it holds all state in memory on one process.

### Redesigned Architecture

```
1. POST /notify-all received by API server
2. API writes a single job event to Kafka topic: notify-all
   Event payload: { jobId, userIds: [...], templateId, timestamp }
3. API returns 202 Accepted immediately

Workers consume the notify-all topic independently:

Email Worker:
  - Consumes event
  - Checks idempotency table: has jobId + userId already been processed?
  - If not: sends email via SMTP/SES
  - On success: marks processed, acks message
  - On failure: does not ack, Kafka retries with exponential backoff (max 5 attempts)

DB Worker:
  - Consumes same event independently
  - Checks idempotency table for jobId + userId
  - If not: writes notification row to database
  - Acks on success, retries on failure

Push Worker:
  - Consumes same event independently
  - Looks up active SSE connections for each userId
  - Pushes notification delta to connected clients
  - Acks on success
```

**Why this is correct:**

Each worker is independent — a failed email delivery does not block the database write or push. Workers scale horizontally by adding consumer instances to the Kafka consumer group. Kafka retains unacknowledged messages and redelivers them, so transient failures are automatically retried. Idempotency keys (`jobId + userId`) ensure that a retried message does not create duplicate notifications or send duplicate emails. The API returns immediately and is never blocked by downstream worker latency.

---

## Stage 6 — Priority Inbox

### Priority Scoring

Each notification type is assigned a fixed integer score: `placement = 3`, `result = 2`, `event = 1`, all other types `= 0`. When two notifications have the same score, the more recent one (higher `createdAt` timestamp) is considered higher priority.

### Why Min-Heap of Size N

**Sorting all notifications:** O(n log n) — requires the full dataset to be in memory and sorted before any result can be returned.

**Min-heap of size N:** O(n log k) where k = N. The heap maintains exactly the top-N candidates seen so far. For each of the n notifications, one heap operation costs O(log k). Since k is fixed (typically small, e.g., 10), log k is effectively a constant. This approach is strictly better than full sorting when n >> k, and it works correctly on streaming data.

### How the Heap Works for Streaming Data

The min-heap stores the N highest-priority notifications seen so far, with the lowest-priority item at the root. For each new notification:

1. If the heap has fewer than N items, push unconditionally — O(log k).
2. If the heap is full, compare the new notification's priority against the root (the current minimum among the top-N).
3. If the new notification beats the root, pop the root and push the new notification — O(log k).
4. Otherwise, discard the new notification — O(1).

This means new notifications from a live stream can be inserted in O(log k) time without reprocessing previously seen items. The final result is obtained by reading the heap and sorting the k items — O(k log k), which is negligible.

The min-heap approach is optimal for: returning top-N from a dataset too large to sort, building leaderboards, and processing real-time event streams where you want to maintain a sliding window of the highest-value items.
