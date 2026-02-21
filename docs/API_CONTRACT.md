# **Stradia: API Contract**

### **1\. API Route Registry**

| Method | Endpoint | Purpose | Linked UI Component |
| :---- | :---- | :---- | :---- |
| POST | /api/public/leads | Capture unauthenticated enterprise demo requests. | LeadCaptureModal.tsx |
| POST | /api/auth/login | Authenticate user and return JWT session. | LoginForm.tsx |
| GET | /api/tenant/heatmap | Fetch the aggregated compliance matrix across all markets. | GlobalHeatmapMatrix.tsx |
| GET | /api/strategies/:id | Fetch a Master Strategy blueprint for the editor. | StrategyBuilder.tsx |
| GET | /api/boards/:marketId | Fetch localized Kanban state and grouped tasks. | LocalKanbanBoard.tsx |
| GET | /api/tasks/:taskId/execution-context | Fetch AI context and validation state for the Execution Panel. | TaskExecutionPanel.tsx |

---

### **2\. TypeScript Definitions (The Shared Types)**

TypeScript

// 1\. Heatmap Matrix (Global Dashboard) \[cite: 789, 790\]  
export interface HeatmapMatrixDTO {  
  global\_compliance\_score: number;  
  active\_markets\_count: number;  
  pending\_executions\_count: number;  
  columns: Array\<{  
    strategy\_id: string;  
    title: string;  
  }\>;  
  rows: Array\<{  
    market\_id: string;  
    market\_name: string;  
    scores: Record\<string, number | null\>; // Keyed by strategy\_id. Null if not deployed.  
  }\>;  
}

// 2\. Local Kanban Board \[cite: 1118, 1119\]  
export interface LocalBoardDTO {  
  local\_board\_id: string;  
  market\_name: string;  
  strategy\_title: string;  
  heatmap\_score: number;  
  columns: {  
    TODO: LocalTaskCardDTO\[\];  
    IN\_PROGRESS: LocalTaskCardDTO\[\];  
    BLOCKED: LocalTaskCardDTO\[\];  
    DONE: LocalTaskCardDTO\[\];  
  };  
}

// 3\. Kanban Card (Flattened for UI) \[cite: 1123, 1143\]  
export interface LocalTaskCardDTO {  
  local\_task\_id: string;  
  task\_type: 'A\_MANUAL' | 'B\_GENERATIVE' | 'C\_EXECUTIVE';  
  title: string;  
  status: 'TODO' | 'IN\_PROGRESS' | 'BLOCKED' | 'DONE';  
  is\_ghost\_card: boolean;  
  is\_custom\_local\_task: boolean;  
  locked\_by\_user\_id: string | null; // Null if unlocked \[cite: 167\]  
  locked\_by\_user\_name: string | null;  
}

// 4\. Task Execution Workbench \[cite: 1222, 1223\]  
export interface TaskExecutionPanelDTO {  
  local\_task\_id: string;  
  title: string;  
  task\_type: 'A\_MANUAL' | 'B\_GENERATIVE' | 'C\_EXECUTIVE';  
  detailed\_instructions: string | null;  
  prompt\_template: string | null;  
  target\_platform: 'GTM' | 'GA4' | 'NONE';  
  pre\_flight\_scan\_status: 'PENDING' | 'PASSED' | 'FAILED';  
  pre\_flight\_log: string | null;  
  execution\_payload\_json: string | null; // Stringified JSON for Monaco Editor \[cite: 1173\]  
}

---

### **3\. JSON Mocks (The Development Data)**

**GET /api/tenant/heatmap**

JSON

{  
  "global\_compliance\_score": 82.5,  
  "active\_markets\_count": 14,  
  "pending\_executions\_count": 45,  
  "columns": \[  
    { "strategy\_id": "strat\_101", "title": "Data Layer 2026" },  
    { "strategy\_id": "strat\_102", "title": "GA4 Migration" }  
  \],  
  "rows": \[  
    {  
      "market\_id": "mkt\_spain",  
      "market\_name": "Spain",  
      "scores": {  
        "strat\_101": 100,  
        "strat\_102": 85  
      }  
    },  
    {  
      "market\_id": "mkt\_france",  
      "market\_name": "France",  
      "scores": {  
        "strat\_101": 40,  
        "strat\_102": null   
      }  
    }  
  \]  
}

**GET /api/boards/mkt\_spain**

JSON

{  
  "local\_board\_id": "board\_spain\_dl2026",  
  "market\_name": "Spain",  
  "strategy\_title": "Data Layer 2026",  
  "heatmap\_score": 85,  
  "columns": {  
    "TODO": \[  
      {  
        "local\_task\_id": "task\_1",  
        "task\_type": "A\_MANUAL",  
        "title": "Review Privacy Law",  
        "status": "TODO",  
        "is\_ghost\_card": false,  
        "is\_custom\_local\_task": false,  
        "locked\_by\_user\_id": null,  
        "locked\_by\_user\_name": null  
      },  
      {  
        "local\_task\_id": "task\_2",  
        "task\_type": "C\_EXECUTIVE",  
        "title": "Implement CMP Wrapper",  
        "status": "TODO",  
        "is\_ghost\_card": true,  
        "is\_custom\_local\_task": false,  
        "locked\_by\_user\_id": null,  
        "locked\_by\_user\_name": null  
      }  
    \],  
    "IN\_PROGRESS": \[  
      {  
        "local\_task\_id": "task\_3",  
        "task\_type": "C\_EXECUTIVE",  
        "title": "Deploy Consent Mode",  
        "status": "IN\_PROGRESS",  
        "is\_ghost\_card": false,  
        "is\_custom\_local\_task": false,  
        "locked\_by\_user\_id": "usr\_999",  
        "locked\_by\_user\_name": "John Doe"  
      }  
    \],  
    "BLOCKED": \[\],  
    "DONE": \[\]  
  }  
}

**GET /api/tasks/task\_3/execution-context**

JSON

{  
  "local\_task\_id": "task\_3",  
  "title": "Deploy Consent Mode",  
  "task\_type": "C\_EXECUTIVE",  
  "detailed\_instructions": "Ensure local market properties are correctly linked to the container.",  
  "prompt\_template": "Generate a GA4 config tag. Ensure the measurement ID is dynamic.",  
  "target\_platform": "GTM",  
  "pre\_flight\_scan\_status": "PASSED",  
  "pre\_flight\_log": "Matches compliance policy. No PII detected.",  
  "execution\_payload\_json": "{\\n  \\"name\\": \\"GA4 Configuration \- Base\\",\\n  \\"type\\": \\"ga4\_setup\\",\\n  \\"parameter\\": \[\\n    { \\"type\\": \\"template\\", \\"key\\": \\"measurementId\\", \\"value\\": \\"G-ABC123XYZ0\\" }\\n  \]\\n}"  
}

---

### **4\. Zod Validation Schemas (The Guardrails)**

These strictly enforce the business invariants defined in the Functional Spec and PRD prior to database insertion.

TypeScript

import { z } from 'zod';

// 1\. Lead Capture Form (Reject free emails) \[cite: 574, 575\]  
export const CreateLeadSchema \= z.object({  
  first\_name: z.string().min(2),  
  last\_name: z.string().min(2),  
  work\_email: z.string()  
    .email("Invalid email format.")  
    .refine(  
      (email) \=\> \!/@(gmail|yahoo|hotmail|outlook)\\.com$/i.test(email),   
      { message: "Please provide a valid corporate email address (free providers are not accepted)." }  
    ),  
  company\_name: z.string().min(2),  
  message: z.string().optional(),  
});

// 2\. Auth Login \[cite: 692\]  
export const LoginSchema \= z.object({  
  email: z.string().email(),  
  password: z.string().min(8)  
});

// 3\. Update Kanban Task Status (WebSocket / REST Payload) \[cite: 413, 417\]  
export const MoveTaskSchema \= z.object({  
  local\_board\_id: z.string().uuid(),  
  local\_task\_id: z.string().uuid(),  
  new\_status: z.enum(\['TODO', 'IN\_PROGRESS', 'BLOCKED', 'DONE'\]),  
  expected\_previous\_status: z.enum(\['TODO', 'IN\_PROGRESS', 'BLOCKED', 'DONE'\]), // Optimistic concurrency check  
  blocked\_justification: z.string().optional() // Required if new\_status is BLOCKED \[cite: 1867\]  
}).refine(  
  (data) \=\> data.new\_status \!== 'BLOCKED' || (data.new\_status \=== 'BLOCKED' && data.blocked\_justification),  
  { message: "Justification is required when moving a task to Blocked.", path: \["blocked\_justification"\] }  
);

---

Real-time collaboration introduces the risk of race conditions—specifically, two local users attempting to execute or modify the same compliance task simultaneously.

To prevent this, the Functional Spec and Domain Model define a **Concurrent Mutex Locking System** with a 15-minute abandonment rule, operating over WebSockets.

Here is the strict API Contract for the WebSocket communication layer.

---

### **1\. WebSocket Event Registry (The Channels)**

We will use a standard Pub/Sub model. The Frontend emits client:\* events, and the Backend broadcasts server:\* events to authorized rooms.

| Event Direction | Event Name | Purpose | Linked UI Behavior |
| :---- | :---- | :---- | :---- |
| Client \-\> Server | client:join\_board | Authenticates and subscribes to a specific Market's Kanban room. | Initializes socket on LocalKanbanBoard.tsx mount. |
| Client \-\> Server | client:lock\_task | Requests an exclusive lock on a specific task before opening the Execution Panel. | Disables task card for others; opens drawer for requester. |
| Server \-\> Client | server:task\_locked | Broadcasts the lock state to all other users in the room. | Shows "Locked by User X" avatar on the Kanban card. |
| Client \-\> Server | client:unlock\_task | Explicitly releases the lock when the user closes the panel. | Removes the lock avatar from the card. |
| Client \-\> Server | client:move\_task | Optimistic request to drag-and-drop a card to a new column. | Updates local UI optimistically. |
| Server \-\> Client | server:task\_moved | Confirms the move and updates all connected clients. | Syncs the column state across all browsers. |
| Server \-\> Client | server:error | Dispatched if a business invariant fails (e.g., moving a Type C task to DONE without a passed pre-flight scan). | Triggers a destructive toast and reverts optimistic UI updates. |

---

### **2\. TypeScript Definitions (The Shared Event Payloads)**

TypeScript

// 1\. Handshake & Room Join  
export interface JoinBoardPayloadDTO {  
  local\_board\_id: string;  
  // Note: JWT is passed in the connection headers (wss://.../?token=...), not the payload.  
}

// 2\. Task Lock Broadcast (Mutex)  
export interface TaskLockedBroadcastDTO {  
  local\_board\_id: string;  
  local\_task\_id: string;  
  locked\_by\_user\_id: string;  
  locked\_by\_user\_name: string; // Hydrated by backend to save a frontend lookup  
  locked\_at: string; // ISO-8601  
  expires\_at: string; // Enforces the 15-minute absolute abandonment rule  
}

// 3\. Task Unlock Broadcast  
export interface TaskUnlockedBroadcastDTO {  
  local\_board\_id: string;  
  local\_task\_id: string;  
  unlocked\_by\_user\_id: string; // The user who released it (or 'SYSTEM' if expired)  
}

// 4\. Task Movement Sync  
export interface TaskMovedBroadcastDTO {  
  local\_board\_id: string;  
  local\_task\_id: string;  
  new\_status: 'TODO' | 'IN\_PROGRESS' | 'BLOCKED' | 'DONE';  
  moved\_by\_user\_id: string;  
  moved\_by\_user\_name: string;  
  timestamp: string;  
}

// 5\. Server Error / Reversion  
export interface ServerErrorBroadcastDTO {  
  code: 'UNAUTHORIZED' | 'PRE\_FLIGHT\_FAILED' | 'LOCK\_CONFLICT' | 'RATE\_LIMITED';  
  message: string;  
  revert\_action?: {  
    local\_task\_id: string;  
    revert\_to\_status: 'TODO' | 'IN\_PROGRESS' | 'BLOCKED' | 'DONE';  
  };  
}

---

### **3\. JSON Mocks (The Network Traffic)**

**Server \-\> Client (server:task\_locked)**

JSON

{  
  "local\_board\_id": "board\_spain\_dl2026",  
  "local\_task\_id": "task\_3",  
  "locked\_by\_user\_id": "usr\_999",  
  "locked\_by\_user\_name": "Jules Verner",  
  "locked\_at": "2026-02-22T10:15:00.000Z",  
  "expires\_at": "2026-02-22T10:30:00.000Z"   
}

*Frontend Action:* The UI immediately maps this ID, finds the corresponding card in the LocalKanbanBoard, and overlays Jules's avatar, disabling the onClick handler for everyone else.

**Server \-\> Client (server:error)**

JSON

{  
  "code": "PRE\_FLIGHT\_FAILED",  
  "message": "Cannot move Type C Executive task to DONE. Pre-flight scan has not PASSED.",  
  "revert\_action": {  
    "local\_task\_id": "task\_4",  
    "revert\_to\_status": "IN\_PROGRESS"  
  }  
}

*Frontend Action:* The UI catches this error, fires a red Toast notification with the message, and physically snaps the Kanban card (task\_4) back to the IN\_PROGRESS column.

---

### **4\. Zod Validation Schemas (The Socket Guardrails)**

WebSocket messages bypass standard HTTP middleware, so we must strictly validate incoming socket payloads before processing them or broadcasting them to other tenants.

TypeScript

import { z } from 'zod';

// Validate incoming lock requests  
export const ClientLockTaskSchema \= z.object({  
  local\_board\_id: z.string().uuid(),  
  local\_task\_id: z.string().uuid()  
});

// Validate incoming move requests (with the Execution Verification Gate)  
export const ClientMoveTaskSchema \= z.object({  
  local\_board\_id: z.string().uuid(),  
  local\_task\_id: z.string().uuid(),  
  new\_status: z.enum(\['TODO', 'IN\_PROGRESS', 'BLOCKED', 'DONE'\]),  
  blocked\_justification: z.string().optional()  
}).refine(  
  (data) \=\> data.new\_status \!== 'BLOCKED' || (data.new\_status \=== 'BLOCKED' && data.blocked\_justification \!== undefined && data.blocked\_justification.trim().length \> 0),  
  { message: "A justification note is strictly required when blocking a task." }  
);

