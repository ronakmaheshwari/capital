````markdown
# Architecture Design

The architecture uses UNLOGGED Tables and PGMQ for queues with Postgres. As Prisma doesn’t provide support to create UNLOGGED Tables, we need to set up those tables manually.  

First, write the schema in Prisma and then run:

```bash
npx prisma migrate dev --name "Schema Init"
````

This generates a SQL file with all the tables. Then, we need to decide which tables need to be cached. Based on my schema, I will create tables for events and slots with the names `event_cache` and `event_slot_cache` in Postgres.

---

## Step 1: Create UNLOGGED Tables

```sql
CREATE UNLOGGED TABLE event_cache (
    id UUID PRIMARY KEY,
    organiser_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    banner_url TEXT,
    hero_image_url TEXT,
    status TEXT NOT NULL,
    category TEXT NOT NULL,
    genre TEXT,
    language TEXT,
    is_online BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP
);

CREATE UNLOGGED TABLE event_slot_cache (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    event_date TIMESTAMP NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    location_name TEXT NOT NULL,
    location_url TEXT,
    capacity INT NOT NULL,
    price NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_event_cache_category ON event_cache(category);
CREATE INDEX idx_event_cache_status ON event_cache(status);
CREATE INDEX idx_event_slot_cache_event_id ON event_slot_cache(event_id);
```

Once the above SQL commands are executed, we need to verify whether the UNLOGGED Tables were created or not.

---

## Step 2: Verify UNLOGGED Tables

```sql
SELECT relname, relpersistence
FROM pg_class
WHERE relname LIKE '%cache%';
```

Example output:

```text
            relname            | relpersistence 
-------------------------------+----------------
 event_cache                   | u
 event_cache_pkey              | u
 event_slot_cache              | u
 event_slot_cache_pkey         | u
 idx_event_cache_category      | u
 idx_event_cache_status        | u
 idx_event_slot_cache_event_id | u
(7 rows)
```

This query is used to identify tables, indexes, or materialized views that have the word "cache" in their name. Here:

* `relname` refers to the name of the relation (table, index, view, etc.). For us, it’s `"cache"`.
* `relpersistence` defines the persistence level of the object:

  * `p (Permanent)`: Standard table, logged, survives crashes.
  * `u (Unlogged)`: Not logged, faster, truncated on crash/restart.
  * `t (Temporary)`: Session-specific, dropped at the end of the session.

---

## Step 3: Activate PGMQ Extension and Create Queues

```sql
CREATE EXTENSION pgmq;

SELECT pgmq.create('otp_queue');
SELECT pgmq.create('transaction_queue');
SELECT pgmq.create('otp_dlq');
SELECT pgmq.create('transaction_dlq');
```

These commands create queues with the names `"otp_queue"`, `"transaction_queue"`, `"otp_dlq"`, and `"transaction_dlq"`.

To verify whether the queues were created, execute:

```sql
SELECT * FROM pgmq.list_queues();
```

---

## OTP Flow for Users

### Signups

```
User signup
    ↓
Insert OTP row
    ↓
Enqueue message to otp_queue
    ↓
Worker sends email/SMS async
```

### Forget Password

```
User hits forget password
    ↓
Insert OTP row
    ↓
Enqueue message to otp_queue
    ↓
Worker sends email/SMS async
```

---

## Transaction Flow for Users

```
Withdraw/Deposit (DB transaction commit)
    ↓
Enqueue transaction event
    ↓
Worker:
    - Update analytics
    - Trigger payout logic
```

---

## Using Prisma to Enqueue Messages (Example for OTP)

```ts
await db.$queryRaw`
SELECT * FROM pgmq.send(
    'otp_queue',
    ${JSON.stringify({
        userId,
        otpId,
        purpose: "signup"
    })}::jsonb
);`;
```

This sends a JSON payload to the `otp_queue` asynchronously using Prisma's `$queryRaw` method.

API (Monolith)
   ↓
Postgres
   ├── Logged Tables (source)
   ├── UNLOGGED cache
   └── PGMQ
         ├── otp_queue
         └── transaction_queue