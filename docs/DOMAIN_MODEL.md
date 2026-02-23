# **Stradia: Domain Model**

I have architected the system using **Shared Schema with Row-Level Security (RLS)** to enforce multi-tenancy, and elected to use **Prisma** and **Zod** for the data contracts. I have also extrapolated dedicated tables for TaskRejection (Descartes Justificados) and LocalTaskNote (Activity Timeline) to ensure a strict, immutable audit trail.

### **1\. Data Contracts (The Schema)**

Code snippet

// schema.prisma

datasource db {  
  provider \= "postgresql"  
  url      \= env("DATABASE\_URL")  
}

generator client {  
  provider \= "prisma-client-js"  
}

/// Core Enums \[cite: 39, 60, 71, 78, 84\]  
enum UserRole {  
  GLOBAL\_ADMIN  
  SUPERVISOR  
  LOCAL\_USER  
  READ\_ONLY  
}

enum TaskType {  
  A\_MANUAL  
  B\_GENERATIVE  
  C\_EXECUTIVE  
}

enum TargetPlatform {  
  GTM  
  GA4  
  NONE  
}

enum BoardStatus {  
  PENDING  
  ACTIVE  
  COMPLETED  
}

enum TaskStatus {  
  TODO  
  IN\_PROGRESS  
  BLOCKED  
  DONE  
}

enum PreFlightStatus {  
  PENDING  
  PASSED  
  FAILED  
}

/// The root entity representing the enterprise client\[cite: 31\].  
model Tenant {  
  id                   String    @id @default(uuid())
  name                 String  
  stripe\_customer\_id   String?  
  active\_markets\_limit Int
  user\_seat\_limit      Int
  ai\_token\_quota       Int
  ai\_tokens\_used       Int
  token\_reset\_date     DateTime?
  is\_active            Boolean
  created\_at           DateTime  @default(now())

  users                User\[\]  
  markets              Market\[\]  
  strategies           MasterStrategy\[\]  
  policies             GovernancePolicy\[\]  
}

/// The individual actor interacting with the platform\[cite: 38\].  
model User {  
  id                  String    @id @default(uuid())
  tenant\_id           String  
  email               String    @unique
  password\_hash       String
  role                UserRole  
  language\_preference String
  last\_login\_at       DateTime?

  tenant              Tenant       @relation(fields: \[tenant\_id\], references: \[id\], onDelete: Cascade)  
  markets             UserMarket\[\]
}

/// The localized operational environment\[cite: 44\].  
model Market {  
  id          String    @id @default(uuid())  
  tenant\_id   String  
  name        String  
  region\_code String
  timezone    String
  is\_active   Boolean
  deleted\_at  DateTime?

  tenant      Tenant    @relation(fields: \[tenant\_id\], references: \[id\], onDelete: Cascade)  
  users       UserMarket\[\]
  boards      LocalBoard\[\]  
  vault       VaultCredential\[\]

  @@unique(\[name, tenant\_id\])
}

/// Join table mapping users to restricted markets\[cite: 42\].  
model UserMarket {  
  user\_id   String  
  market\_id String

  user      User   @relation(fields: \[user\_id\], references: \[id\], onDelete: Cascade)  
  market    Market @relation(fields: \[market\_id\], references: \[id\], onDelete: Cascade)

  @@id(\[user\_id, market\_id\])  
}

/// The global blueprint defined by the Global Admin\[cite: 52\].  
model MasterStrategy {  
  id          String   @id @default(uuid())  
  tenant\_id   String  
  title       String  
  description String?  
  version     Int      @default(1)  
  is\_published Boolean @default(false)  
  created\_by  String

  tenant      Tenant       @relation(fields: \[tenant\_id\], references: \[id\], onDelete: Cascade)  
  tasks       GlobalTask\[\]  
  boards      LocalBoard\[\]

  @@index(\[tenant\_id\])  
}

/// The individual atomic requirements within a Master Strategy\[cite: 59\].  
model GlobalTask {  
  id                      String   @id @default(uuid())  
  master\_strategy\_id      String  
  task\_type               TaskType  
  title                   String  
  description             String?  
  system\_prompt           String?  /// Hidden prompt for AI \[cite: 489\]  
  order\_index             Int  
  weight                  Int      @default(1) /// For heatmap scoring \[cite: 512\]  
  target\_platform         TargetPlatform  
  expected\_payload\_schema Json?  
    
  strategy                MasterStrategy @relation(fields: \[master\_strategy\_id\], references: \[id\], onDelete: Cascade)  
  local\_tasks             LocalTask\[\]

  @@index(\[master\_strategy\_id\])  
}

/// Natural language rules enforced by the AI Pre-Flight Scan\[cite: 65\].  
model GovernancePolicy {  
  id          String  @id @default(uuid())  
  tenant\_id   String  
  policy\_text String  @db.VarChar(300) /// Max 300 chars \[cite: 435\]  
  platform    TargetPlatform @default(NONE)  
  is\_active   Boolean @default(true)

  tenant      Tenant  @relation(fields: \[tenant\_id\], references: \[id\], onDelete: Cascade)

  @@index(\[tenant\_id\])  
}

/// The localized Kanban execution environment\[cite: 70\].  
model LocalBoard {  
  id                 String   @id @default(uuid())  
  market\_id          String  
  master\_strategy\_id String  
  heatmap\_score      Float    @default(0.0)  
  status             BoardStatus @default(PENDING)

  market             Market         @relation(fields: \[market\_id\], references: \[id\], onDelete: Cascade)  
  strategy           MasterStrategy @relation(fields: \[master\_strategy\_id\], references: \[id\])  
  tasks              LocalTask\[\]

  @@index(\[market\_id\])  
}

/// The concrete, localized instance of a task on the Kanban board\[cite: 77\].  
model LocalTask {  
  id                     String   @id @default(uuid())  
  local\_board\_id         String  
  global\_task\_id         String?  /// Null if custom local task \[cite: 78\]  
  status                 TaskStatus @default(TODO)  
  is\_custom\_local\_task   Boolean  @default(false)  
  is\_ghost\_card          Boolean  @default(false) /// Optional update flag \[cite: 545\]  
  execution\_payload      Json?  
  pre\_flight\_scan\_status PreFlightStatus @default(PENDING)  
  gemini\_token\_cost      Int      @default(0)  
  error\_log              String?  
    
  /// Concurrency & Checkpoints  
  locked\_by              String?  /// Mutex lock user ID \[cite: 778\]  
  locked\_at              DateTime?  
  checkpoint\_state       Json?    /// Paused auth state \[cite: 847\]  
  checkpoint\_expires\_at  DateTime?

  last\_executed\_at       DateTime?

  board                  LocalBoard  @relation(fields: \[local\_board\_id\], references: \[id\], onDelete: Cascade)  
  global\_task            GlobalTask? @relation(fields: \[global\_task\_id\], references: \[id\])  
  notes                  LocalTaskNote\[\]  
  rejections             TaskRejection\[\]

  @@index(\[local\_board\_id\])  
}

/// Immutable audit trail of operational chatter and collision backups.  
model LocalTaskNote {  
  id            String   @id @default(uuid())  
  local\_task\_id String  
  user\_id       String  
  content       String  
  created\_at    DateTime @default(now())

  task          LocalTask @relation(fields: \[local\_task\_id\], references: \[id\], onDelete: Cascade)

  @@index(\[local\_task\_id\])  
}

/// Audit log for rejected Optional Updates (Ghost Cards).  
model TaskRejection {  
  id            String   @id @default(uuid())  
  local\_task\_id String  
  user\_id       String  
  justification String  
  rejected\_at   DateTime @default(now())

  task          LocalTask @relation(fields: \[local\_task\_id\], references: \[id\], onDelete: Cascade)

  @@index(\[local\_task\_id\])  
}

/// The strictly isolated authentication tokens\[cite: 83\].  
model VaultCredential {  
  id                    String   @id @default(uuid())  
  market\_id             String  
  platform              TargetPlatform  
  encrypted\_oauth\_token String  
  refresh\_token         String?  
  is\_revoked            Boolean  @default(false) /// Hard revocation flag \[cite: 831\]  
  updated\_at            DateTime @updatedAt

  market                Market   @relation(fields: \[market\_id\], references: \[id\], onDelete: Cascade)

  @@unique(\[market\_id, platform\]) /// One credential per platform per market  
}

---

### **2\. Runtime Validation (The Guardrails)**

TypeScript

import { z } from 'zod';

// Validation for creating a new Governance Guardrail  
export const CreateGovernancePolicySchema \= z.object({  
  policy\_text: z.string()  
    .min(10, "Rule is too short.")  
    .max(300, "Rule exceeds 300 character limit.") // \[cite: 435\]  
    .regex(/^\[a-zA-Z0-9\\s.,\!?'-\]+$/, "Invalid characters in policy."),  
  platform: z.enum(\["GTM", "GA4", "NONE"\]),  
});

// Validation for the execution payload parameters (Verified Actions) \[cite: 679\]  
export const ExecuteTypeCTaskSchema \= z.object({  
  measurement\_id: z.string().regex(/^G-\[A-Z0-9\]{10}$/, "Must be a valid GA4 Measurement ID.").optional(),  
  container\_id: z.string().regex(/^GTM-\[A-Z0-9\]+$/, "Must be a valid GTM Container ID.").optional(),  
  trigger\_type: z.enum(\["All Pages", "CustomEvent"\]).optional()  
});

// Validation for Market Creation  
export const CreateMarketSchema \= z.object({  
  name: z.string().min(2).max(50),  
  timezone: z.string().refine((tz) \=\> Intl.supportedValuesOf('timeZone').includes(tz), {  
    message: "Invalid IANA timezone." // \[cite: 370\]  
  }),  
});

---

### **3\. Domain Relationships (The Map)**

Code snippet

erDiagram  
    TENANT ||--o{ USER : "has many"  
    TENANT ||--o{ MARKET : "has many"  
    TENANT ||--o{ MASTER\_STRATEGY : "owns"  
    TENANT ||--o{ GOVERNANCE\_POLICY : "enforces"  
      
    USER ||--o{ USER\_MARKET : "assigned to"  
    MARKET ||--o{ USER\_MARKET : "includes"  
      
    MARKET ||--o{ LOCAL\_BOARD : "hosts"  
    MARKET ||--o| VAULT\_CREDENTIAL : "secures"  
      
    MASTER\_STRATEGY ||--o{ GLOBAL\_TASK : "contains"  
    MASTER\_STRATEGY ||--o{ LOCAL\_BOARD : "templates"  
      
    LOCAL\_BOARD ||--o{ LOCAL\_TASK : "tracks"  
    GLOBAL\_TASK ||--o{ LOCAL\_TASK : "defines"  
      
    LOCAL\_TASK ||--o{ LOCAL\_TASK\_NOTE : "logs"  
    LOCAL\_TASK ||--o| TASK\_REJECTION : "records"

---

### **4\. Security & Access Policies (The Firewall)**

To enforce the multi-tenant architecture natively in the database, Stradia must utilize PostgreSQL Row-Level Security (RLS).

SQL

\-- Enable RLS on core tables  
ALTER TABLE "Market" ENABLE ROW LEVEL SECURITY;  
ALTER TABLE "LocalBoard" ENABLE ROW LEVEL SECURITY;  
ALTER TABLE "VaultCredential" ENABLE ROW LEVEL SECURITY;

\-- 1\. Tenant Data Isolation Policy \[cite: 29\]  
\-- Ensures users can only query records belonging to their authenticated Tenant.  
CREATE POLICY tenant\_isolation\_policy ON "Market"  
    AS RESTRICTIVE  
    FOR ALL  
    USING (tenant\_id \= current\_setting('app.current\_tenant')::uuid);

\-- 2\. Local User Strict Sandbox \[cite: 18\]  
\-- Ensures Local Users only see data for their explicitly assigned Market IDs.  
CREATE POLICY local\_user\_market\_access ON "LocalBoard"  
    FOR SELECT  
    USING (  
        EXISTS (  
            SELECT 1 FROM "UserMarket" um   
            WHERE um.market\_id \= "LocalBoard".market\_id   
            AND um.user\_id \= auth.uid()  
        )  
        OR   
        (SELECT role FROM "User" WHERE id \= auth.uid()) \= 'GLOBAL\_ADMIN' \-- Global Admin override \[cite: 12\]  
    );

\-- 3\. Vault Write-Only/Execution-Only Restriction \[cite: 808\]  
\-- No user can read the encrypted tokens directly; only the backend service role can SELECT for execution.  
CREATE POLICY vault\_write\_only\_policy ON "VaultCredential"  
    FOR INSERT   
    WITH CHECK (  
        EXISTS (  
            SELECT 1 FROM "UserMarket" WHERE market\_id \= "VaultCredential".market\_id AND user\_id \= auth.uid()  
        )  
    );

---

### **5\. Business Invariants (The "Rules of Physics")**

* **The "Last Admin" Rule:** The system strictly prevents the modification or deletion of a Global Admin if they are the only Active Global Admin remaining in the tenant.  
* **Active Markets Limit:** If an organization has reached its active\_markets\_limit, the system must disable the creation of new markets until Stripe billing is updated.  
* **The 5% Overdraft Logic:** AI task executions will be permitted if the total tokens consumed do not exceed the monthly\_token\_quota by more than a strict 5% buffer. Exceeding 105% results in a hard lock.  
* \+1  
* **Execution Prerequisite:** A Local User is strictly prohibited from dragging a "Type C" task into the "Done" column unless the AI Execution Engine has returned a 200 OK success status.  
* **Absolute Abandonment Timeout:** If a user establishes a Mutex Lock on a task and goes inactive, the system enforces a strict 15-minute timeout, automatically dropping the lock from the database.

---

### **6\. The "Golden Record" (Mock Data)**

A fully populated LocalTask state demonstrating an active Mutex lock, an executed payload, and localized timeline notes.

JSON

{  
  "id": "lt-778899-abcd-1234",  
  "local\_board\_id": "lb-112233-spain-001",  
  "global\_task\_id": "gt-555-deploy-ga4",  
  "status": "IN\_PROGRESS",  
  "is\_custom\_local\_task": false,  
  "is\_ghost\_card": false,  
  "pre\_flight\_scan\_status": "PASSED",  
  "gemini\_token\_cost": 450,  
  "locked\_by": "usr-999-john-doe",  
  "locked\_at": "2026-02-22T10:15:00Z",  
  "checkpoint\_state": null,  
  "execution\_payload": {  
    "action": "CREATE\_TAG",  
    "platform": "GTM",  
    "schema": {  
      "name": "GA4 Configuration \- Base",  
      "type": "ga4\_setup",  
      "parameter": \[  
        { "type": "template", "key": "measurementId", "value": "G-ABC123XYZ0" }  
      \]  
    }  
  },  
  "notes": \[  
    {  
      "id": "note-1",  
      "user\_id": "usr-999-john-doe",  
      "content": "Client provided the production Measurement ID over Slack.",  
      "created\_at": "2026-02-22T09:00:00Z"  
    },  
    {  
      "id": "note-2",  
      "user\_id": "system",  
      "content": "\[SYSTEM AUTO-SAVE: Version Collision Detected at 2026-02-22T10:10:00Z\] { \\"draft\_id\\": \\"G-XYZ987\\" }",  
      "created\_at": "2026-02-22T10:10:00Z"  
    }  
  \]  
}

---

### **7\. The Seeding Specification (The Playground)**

To properly robust-test Stradia locally, the seed script must generate multi-tenant boundaries and edge cases, rather than simple isolated records.

TypeScript

// seed.ts  
import { PrismaClient, UserRole, TaskType, TargetPlatform, BoardStatus } from '@prisma/client';

const prisma \= new PrismaClient();

async function main() {  
  // 1\. Create Tenant at 99% AI Quota Capacity to test 5% Overdraft logic  
  const tenant \= await prisma.tenant.create({  
    data: {  
      name: "Acme Corp Global",  
      active\_markets\_limit: 5,  
      monthly\_token\_quota: 100000,  
      ai\_tokens\_used: 99500, // Edge case: Right on the threshold  
      token\_reset\_date: new Date(new Date().setMonth(new Date().getMonth() \+ 1)),  
    }  
  });

  // 2\. Create Global Admin and Local User  
  const admin \= await prisma.user.create({ data: { tenant\_id: tenant.id, email: "admin@acme.com", role: UserRole.GLOBAL\_ADMIN }});  
  const localUser \= await prisma.user.create({ data: { tenant\_id: tenant.id, email: "spain@acme.com", role: UserRole.LOCAL\_USER }});

  // 3\. Create Market and assign Local User  
  const market \= await prisma.market.create({ data: { tenant\_id: tenant.id, name: "Spain \- Retail", timezone: "Europe/Madrid" }});  
  await prisma.userMarket.create({ data: { user\_id: localUser.id, market\_id: market.id }});

  // 4\. Create a Master Strategy with dependencies  
  const strategy \= await prisma.masterStrategy.create({  
    data: {  
      tenant\_id: tenant.id,  
      title: "Data Layer Baseline 2026",  
      created\_by: admin.id,  
      tasks: {  
        create: \[  
          { task\_type: TaskType.A\_MANUAL, title: "Review Privacy Law", order\_index: 0, target\_platform: TargetPlatform.NONE },  
          { task\_type: TaskType.C\_EXECUTIVE, title: "Deploy Consent Mode", order\_index: 1, target\_platform: TargetPlatform.GTM, weight: 5 }  
        \]  
      }  
    }  
  });

  // 5\. Clone to Local Board (Simulating a Sync Deployment)  
  const board \= await prisma.localBoard.create({  
    data: { market\_id: market.id, master\_strategy\_id: strategy.id, status: BoardStatus.ACTIVE }  
  });

  console.log("✅ Seed complete: Built Tenant, Users, Markets, and relational Strategic Tasks.");  
}

main().catch(console.error).finally(() \=\> prisma.$disconnect());

---

Since Stradia involves collaborative localized environments with concurrency controls (Mutex Locks), the WebSocket layer must be just as strictly typed and secure as the database.

### **1\. WebSocket Event Enums (The Dictionary)**

We must define exact event names to prevent silent failures caused by typos between the client and server.

TypeScript

// ws-events.ts

export enum ClientToServerEvent {  
  JOIN\_BOARD \= "client:join\_board",  
  LEAVE\_BOARD \= "client:leave\_board",  
  REQUEST\_TASK\_LOCK \= "client:request\_task\_lock",  
  RELEASE\_TASK\_LOCK \= "client:release\_task\_lock",  
  MOVE\_TASK \= "client:move\_task",  
}

export enum ServerToClientEvent {  
  ERROR \= "server:error",  
  BOARD\_STATE\_SYNC \= "server:board\_state\_sync", // Full refresh  
  TASK\_LOCKED \= "server:task\_locked", // Broadcast to others that a task is busy  
  TASK\_UNLOCKED \= "server:task\_unlocked",  
  TASK\_MOVED \= "server:task\_moved",  
  NOTE\_ADDED \= "server:note\_added",  
  EXECUTION\_COMPLETED \= "server:execution\_completed", // Triggered after AI webhook returns  
}

### **2\. Payload Schemas (The WS Guardrails)**

Just like REST API endpoints, every incoming and outgoing WebSocket message must be validated at runtime. We will use Zod for this.

TypeScript

import { z } from 'zod';  
import { TaskStatus } from '@prisma/client'; // Re-using Prisma Enums

// \---------------------------------------------------------  
// Client \-\> Server Payloads  
// \---------------------------------------------------------

export const JoinBoardPayloadSchema \= z.object({  
  local\_board\_id: z.string().uuid(),  
});

export const MoveTaskPayloadSchema \= z.object({  
  local\_board\_id: z.string().uuid(),  
  local\_task\_id: z.string().uuid(),  
  new\_status: z.nativeEnum(TaskStatus),  
  expected\_previous\_status: z.nativeEnum(TaskStatus), // Optimistic concurrency check  
});

// \---------------------------------------------------------  
// Server \-\> Client Payloads (Broadcasts)  
// \---------------------------------------------------------

export const TaskMovedBroadcastSchema \= z.object({  
  local\_board\_id: z.string().uuid(),  
  local\_task\_id: z.string().uuid(),  
  new\_status: z.nativeEnum(TaskStatus),  
  moved\_by\_user\_id: z.string().uuid(),  
  timestamp: z.string().datetime(),  
});

export const TaskLockedBroadcastSchema \= z.object({  
  local\_board\_id: z.string().uuid(),  
  local\_task\_id: z.string().uuid(),  
  locked\_by\_user\_id: z.string().uuid(),  
  locked\_at: z.string().datetime(),  
  expires\_at: z.string().datetime(), // Enforces the 15-minute absolute abandonment rule  
});

### **3\. Connection & Channel Security (The Airgap)**

Database Row-Level Security (RLS) does not automatically protect WebSocket pub/sub channels (like Redis PubSub or Socket.io rooms). We must explicitly enforce the architectural constraints at the connection and subscription levels.

**Business Invariants for Real-Time:**

1. **Handshake Authentication:** The WebSocket connection must be established by passing the JWT token (or session cookie) in the initial connection headers. If verification fails, the socket drops immediately.  
2. **Room Authorization (The Sandbox):** When a client emits client:join\_board, the server MUST query the database to verify that the user\_id has access to the market\_id associated with that local\_board\_id.  
3. **Execution Verification Gate:** If a client emits client:move\_task attempting to transition a Type C (Executive) task to DONE, the WebSocket server must intercept this, query the database, and verify pre\_flight\_scan\_status \=== 'PASSED' and that a successful external API execution log exists. If not, it emits a server:error and forces the client to revert the card visually.

---

