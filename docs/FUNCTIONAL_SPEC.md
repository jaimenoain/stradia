# **Stradia: Functional Spec**

## **1\. Executive Summary**

Stradia is an enterprise-grade B2B SaaS "State Guardian" platform designed to centralize, enforce, and deploy digital analytics and marketing configurations across distributed global markets. The core product loop empowers Global Admins to author standardized deployment strategies and define strict natural language compliance guardrails. These strategies are distributed to multi-tenant, localized Kanban boards where local teams execute them. For technical implementations, Stradia utilizes a Gemini-powered AI Execution Engine to autonomously generate, validate, and safely deploy JSON payloads directly to external APIs (strictly Google Tag Manager and Google Analytics 4 for V1). By combining centralized template governance with deterministic, AI-driven pre-flight validation and localized credential vaulting, Stradia completely mitigates rogue localized deployments and provides enterprise leaders with a real-time, mathematically accurate global compliance heatmap.

---

## **2\. User Roles & Permissions Matrix**

The system MUST enforce strictly bounded Role-Based Access Control (RBAC) to ensure multi-tenant data isolation and governance compliance.

\+1

### **System Actors**

* **Global Admin:** The absolute tenant authority. They MUST have access\_all\_markets \= true inherently and hold exclusive rights over billing, master strategy creation, and user provisioning. The system MUST prevent the modification or deletion of a Global Admin if they are the only active Global Admin remaining in the tenant.  
* \+3  
* **Supervisor:** A regional or multi-market manager. They MUST be assigned to at least one specific market. They can view board states and the heatmap for their assigned markets, but they strictly CANNOT alter global strategies, governance guardrails, or billing.  
* \+1  
* **Local User:** The execution layer. They MUST be confined strictly to a single assigned market. They CANNOT see the global heatmap. They are solely responsible for executing tasks, altering local Kanban states, creating local tasks, and managing localized Vault credentials.  
* \+4  
* **Read-Only:** An audit or stakeholder role. They MUST be assigned to at least one market. They can view board states for assigned markets but strictly CANNOT execute tasks, modify board columns, or interact with the Vault.  
* \+1

### **Permissions Matrix**

The following matrix defines the explicit Create (C), Read (R), Update (U), and Delete (D) permissions for the core platform domains.

| Feature Domain | Global Admin | Supervisor | Local User | Read-Only |
| :---- | :---- | :---- | :---- | :---- |
| **Tenant Billing & Subscriptions** | CRUD \+1 | \- | \- | \- |
| **User Provisioning & RBAC** | CRUD \+2 | \- | \- | \- |
| **Market Partition Provisioning** | CRUD (Soft Delete) \+1 | \- | \- | \- |
| **Global Strategy Templates** | CRUD \+1 | R (Assigned Markets) | R (Assigned Market) | R (Assigned) |
| **Governance Guardrails** | CRUD | \- | \- | \- |
| **Global Heatmap Matrix** | R (All Markets) | R (Assigned Markets) | \- (Strictly Hidden) | \- |
| **Local Kanban Board Workflow** | R (All Markets) | R (Assigned Markets) | U (Move Cards) | R (Assigned) |
| **Task Execution (AI / API Calls)** | \- | \- | C / U (Execute) \+1 | \- |
| **Custom Local Tasks** | R (All Markets) | R / D (Assigned Markets) | CRUD | R (Assigned) |
| **Vault Credentials** | \- (Strictly Isolated) | C / D (Write-Only) \+1 | C / D (Write-Only) \+1 | \- |

---

## **3\. Data Model (Entity Relationship Rough Draft)**

The core data model MUST enforce strict multi-tenant isolation at the database level. Every query MUST be scoped to the tenant\_id to prevent cross-contamination of enterprise data.

### **1\. Tenant (Organization)**

The root entity representing the enterprise client.

* **Key Attributes:** id (UUID, Primary Key), name (String), stripe\_customer\_id (String), active\_markets\_limit (Integer), user\_seat\_limit (Integer), ai\_token\_quota (Integer), ai\_tokens\_used (Integer), token\_reset\_date (Timestamp), created\_at (Timestamp).  
* **Relationships:** \* *has\_many* Users  
  * *has\_many* Markets  
  * *has\_many* MasterStrategies  
  * *has\_many* GovernancePolicies

### **2\. User**

The individual actor interacting with the platform.

* **Key Attributes:** id (UUID), tenant\_id (Foreign Key), email (String, Unique), password\_hash (String), role (Enum: global\_admin, supervisor, local\_user, read\_only), language\_preference (String, Default: en), created\_at (Timestamp).  
* **Relationships:**  
  * *belongs\_to* Tenant  
  * *has\_many* UserMarkets (Join Table for RBAC)

### **3\. Market (Workspace Partition)**

The localized operational environment (e.g., "Spain", "Mexico").

* **Key Attributes:** id (UUID), tenant\_id (Foreign Key), name (String), region\_code (String), is\_active (Boolean), deleted\_at (Timestamp, for soft deletes).  
* **Relationships:**  
  * *belongs\_to* Tenant  
  * *has\_many* LocalBoards  
  * *has\_many* VaultCredentials  
  * *has\_many* Users (via UserMarkets)

### **4\. MasterStrategy (Template)**

The global blueprint defined by the Global Admin.

* **Key Attributes:** id (UUID), tenant\_id (Foreign Key), title (String), description (Text), version (Integer), created\_by (Foreign Key \-\> User).  
* **Relationships:**  
  * *belongs\_to* Tenant  
  * *has\_many* GlobalTasks  
  * *has\_many* LocalBoards (When a strategy is distributed to a market)

### **5\. GlobalTask (Template Definition)**

The individual atomic requirements within a Master Strategy.

* **Key Attributes:** id (UUID), master\_strategy\_id (Foreign Key), task\_type (Enum: A\_manual, B\_generative, C\_executive), title (String), description (Text), order\_index (Integer), target\_platform (Enum: GTM, GA4, none), expected\_payload\_schema (JSONB).  
* **Relationships:**  
  * *belongs\_to* MasterStrategy  
  * *has\_many* LocalTasks

### **6\. GovernancePolicy**

The natural language rules enforced by the AI Pre-Flight Scan.

* **Key Attributes:** id (UUID), tenant\_id (Foreign Key), policy\_text (Text, e.g., "Do not allow tracking of PII"), is\_active (Boolean).  
* **Relationships:**  
  * *belongs\_to* Tenant

### **7\. LocalBoard**

The localized Kanban execution environment generated from a Master Strategy.

* **Key Attributes:** id (UUID), market\_id (Foreign Key), master\_strategy\_id (Foreign Key), heatmap\_score (Float, 0.0 to 100.0), status (Enum: pending, active, completed).  
* **Relationships:**  
  * *belongs\_to* Market  
  * *belongs\_to* MasterStrategy  
  * *has\_many* LocalTasks

### **8\. LocalTask (Execution State)**

The concrete, localized instance of a task on the Kanban board.

* **Key Attributes:** id (UUID), local\_board\_id (Foreign Key), global\_task\_id (Foreign Key, nullable if Custom Task), status (Enum: todo, in\_progress, blocked, done), is\_custom\_local\_task (Boolean), execution\_payload (JSONB), pre\_flight\_scan\_status (Enum: pending, passed, failed), gemini\_token\_cost (Integer), error\_log (Text), last\_executed\_at (Timestamp).  
* **Relationships:**  
  * *belongs\_to* LocalBoard  
  * *belongs\_to* GlobalTask

### **9\. VaultCredential**

The strictly isolated, localized authentication tokens for target platforms.

* **Key Attributes:** id (UUID), market\_id (Foreign Key), platform (Enum: GTM, GA4), encrypted\_oauth\_token (String), updated\_at (Timestamp).  
* **Relationships:**  
  * *belongs\_to* Market

---

## **4\. Core Functional Requirements**

### **Feature 1: Master Strategy Creation & Market Distribution**

**1\. User Story:** As a Global Admin, I can create a Master Strategy containing various task types and distribute it to selected Active Markets so that localized teams receive standardized Kanban execution boards.

**2\. Pre-conditions:** \* User MUST be authenticated and hold the global\_admin role.

* The Tenant MUST have at least one Active Market provisioned.  
  **3\. Functional Logic & Flow:**  
* The Global Admin defines the MasterStrategy metadata (Title, Description).  
* The Admin builds an array of GlobalTask objects, defining the task type (A: Manual, B: Generative, C: Executive), target platform (e.g., GTM), and JSON payload schemas for Type C tasks.  
* The Admin selects target markets from the Tenant's active Market list.  
* Upon submission, the system initiates a database transaction.  
* The system loops through each selected Market and generates a new LocalBoard.  
* For each LocalBoard, the system strictly clones the GlobalTask array into localized LocalTask records, linking them via foreign\_keys.  
  **4\. Inputs & Validation:**  
* title: String, MUST be \> 3 and \< 100 characters.  
* tasks: Array of Objects, MUST contain at least one task.  
* target\_markets: Array of UUIDs. MUST validate that all UUIDs belong to the current tenant\_id.  
  **5\. Post-conditions:**  
* MasterStrategy, GlobalTask, LocalBoard, and LocalTask records are committed to the database.  
* The Global Heatmap metric for the newly created boards is initialized at 0.0.  
* Real-time WebSocket events MUST fire to notify connected Supervisors/Local Users of the new board.  
  **6\. Edge Cases:**  
* **Concurrent Editing:** If two Global Admins attempt to distribute the same strategy draft simultaneously, the system MUST employ optimistic locking (using a version integer) to reject the second request.  
* **Partial Distribution Failure:** If database insertion fails midway through market cloning, the entire transaction MUST rollback to prevent orphaned boards.

### **Feature 2: AI Pre-Flight Governance Scan**

**1\. User Story:** As the System, I MUST evaluate all Type C (Executive) tasks—both Global and Custom Local—against the Tenant's Natural Language Governance Policies using the Gemini LLM before allowing API execution.

**2\. Pre-conditions:**

* A Local User initiates the "Execute" action on a Type C LocalTask.  
* The Tenant MUST have active GovernancePolicy records.  
* The Tenant MUST have \> 0 AI tokens remaining in their ai\_token\_quota.  
  **3\. Functional Logic & Flow:**  
* System locks the LocalTask state to in\_progress (Pre-Flight Scan phase).  
* System retrieves all active GovernancePolicy strings for the tenant\_id.  
* System constructs a strict system prompt for the Gemini LLM containing: 1\) The Policies, 2\) The target JSON payload from the task, 3\) Instructions to output strictly in JSON format.  
* System dispatches the request to the Gemini API.  
* System parses the LLM response.  
* If passed \== true, the task proceeds to the API Execution phase.  
* If passed \== false, the execution is halted.  
  **4\. Inputs & Validation:**  
* task\_payload: JSONB.  
* policies: Array of Strings.  
* Gemini API constraints: response\_format MUST be strictly set to JSON object: {"passed": boolean, "reason": string}.  
  **5\. Post-conditions:**  
* Deduct calculated token usage from the Tenant's ai\_tokens\_used.  
* Update LocalTask.pre\_flight\_scan\_status to passed or failed.  
* If failed, write the LLM's reason to LocalTask.error\_log and unlock the task.  
  **6\. Edge Cases:**  
* **Token Exhaustion:** If the Tenant lacks sufficient tokens, the system MUST bypass the Gemini call, immediately fail the scan, and prompt the user to contact their Global Admin.  
* **LLM Hallucination/Timeout:** If the Gemini API times out or returns malformed JSON despite strict prompting, the system MUST "fail securely" (default to passed \== false), log a system error, and notify the user to retry.

### **Feature 3: Type C Task Execution & Auto-Rollback**

**1\. User Story:** As a Local User, I can deploy an approved Type C task directly to the external platform (GTM/GA4) so that the configuration is applied without leaving Stradia, with automatic rollback if the deployment fails.

**2\. Pre-conditions:**

* The LocalTask MUST have pre\_flight\_scan\_status \== passed.  
* The localized VaultCredential for the target platform MUST exist and be valid.  
  **3\. Functional Logic & Flow:**  
* System decrypts the target platform's OAuth token from the VaultCredential.  
* System fetches the current state of the target platform (e.g., existing GTM Tag) to store in memory as the rollback\_state.  
* System dispatches the verified JSON payload to the target external API (e.g., Google Tag Manager API).  
* System awaits the HTTP response.  
* **Success Path:** If 2xx response, system marks LocalTask as done.  
* **Failure Path:** If 4xx/5xx response, system MUST automatically fire a secondary API request using the rollback\_state to revert any partial changes, then mark the task as blocked.  
  **4\. Inputs & Validation:**  
* target\_api\_endpoint: URL String.  
* payload: JSON object.  
* oauth\_token: Bearer token String.  
  **5\. Post-conditions:**  
* Target platform is mutated.  
* LocalTask status is updated.  
* System triggers a background job to recalculate the heatmap\_score for the parent LocalBoard.  
  **6\. Edge Cases:**  
* **OAuth Expiration:** If the external API returns a 401 Unauthorized, the system MUST halt, mark the task as blocked, and push a UI notification demanding the Local User re-authenticate the Vault.  
* **Rollback Failure:** If the initial deployment fails AND the rollback API request also fails, the system MUST trigger a critical alert UI banner for the Local User and flag the task state as critical\_desync.

### **Feature 4: Infrastructure as Code (IaC) Export**

**1\. User Story:** As a Global Admin, I can export a Master Strategy as a Terraform (.tf) file so that I can integrate configurations into my enterprise CI/CD pipelines, preventing vendor lock-in.

**2\. Pre-conditions:**

* User MUST have the global\_admin role.  
* The MasterStrategy MUST contain at least one Type C (Executive) task.  
  **3\. Functional Logic & Flow:**  
* Admin clicks "Export as Code" on a Master Strategy.  
* System filters the Strategy, strictly dropping all Type A (Manual) and Type B (Generative) tasks.  
* System iterates through the remaining Type C tasks.  
* System maps the Verified Action JSON schemas to their corresponding Terraform resource blocks (e.g., mapping a GTM JSON schema to a google\_tag\_manager\_tag resource).  
* System sanitizes the output, stripping any local Market IDs or user-specific metadata to ensure a clean global template.  
* System concatenates the blocks into a single string formatted as Terraform syntax.  
* System serves the string as a downloadable .tf text file.  
  **4\. Inputs & Validation:**  
* master\_strategy\_id: UUID.  
  **5\. Post-conditions:**  
* A .tf file is automatically downloaded to the Admin's local machine.  
  **6\. Edge Cases:**  
* **Empty Export:** If the Admin attempts to export a Strategy consisting entirely of Type A and Type B tasks, the system MUST disable the "Export as Code" button in the UI and display a tooltip: *"Export unavailable: This strategy contains no executive (Type C) infrastructure tasks."*

---

## **5\. UI/UX Suggestions (Screen by Screen)**

The user interface MUST support multi-language localization from Day 1 and enforce strict visual hierarchy based on the user's RBAC profile. Global Admins MUST see global aggregates, while Local Users MUST be strictly sandboxed to their assigned market views.

### **1\. Global Admin Dashboard (The "Heatmap" View)**

* **Key Elements:**  
  * Global Navigation: Tenant selector (if applicable in future), Language toggle (Day 1 requirement), User Profile/Settings.  
  * Hero Widget: "Global Compliance Heatmap" (Data visualization showing the aggregate score of all Local Boards out of 100).  
  * Data Table: "Active Markets" list showing Market Name, Region, Supervisor, and individual Market Heatmap Score.  
  * AI Quota Widget: Progress bar displaying ai\_tokens\_used vs ai\_token\_quota for the current billing cycle.  
* **Interactions:**  
  * Clicking a Market row MUST drill down into that specific Market's active Kanban boards (Read-Only view for Admin).  
  * "Provision New Market" CTA (Subject to Stripe billing limits).

### **2\. Master Strategy Builder**

* **Key Elements:**  
  * Header: Strategy Title, Description, and "Distribute to Markets" CTA.  
  * Task Canvas: A vertically sortable list of GlobalTask modules.  
  * Task Configuration Panel:  
    * Task Type selector (Type A: Manual, Type B: Generative, Type C: Executive).  
    * Target Platform dropdown (GTM, GA4, None) \- visible only for Type C.  
    * JSON Payload Editor (Monaco editor or similar for syntax highlighting) \- visible only for Type C.  
  * "Export as Code" (.tf) button in the header menu.  
* **Interactions:**  
  * Drag-and-drop handles on tasks to update order\_index.  
  * Clicking "Distribute" MUST open a multi-select modal to choose target Active Markets.

### **3\. Local Market Kanban Board**

* **Key Elements:**  
  * Header: Market Name, Strategy Title, Local Heatmap Score, Language toggle.  
  * Columns: "To Do", "In Progress", "Blocked", "Done".  
  * Cards: Task Title, Task Type Badge (A, B, C), Assignee Avatar, Status Icon.  
  * "Add Custom Task" button (Allows Local Users to create market-specific tasks).  
* **Interactions:**  
  * Dragging a card between columns MUST update the database state and trigger real-time WebSocket updates for concurrent users.  
  * Clicking a card MUST open the Task Execution Modal.

### **4\. Task Execution Modal (Type C Focus)**

* **Key Elements:**  
  * Left Pane: Task Description, Expected Platform (GTM/GA4).  
  * Right Pane (Execution Context):  
    * Pre-Flight Scan Status Banner (Pending, Passed, Failed).  
    * Read-only JSON payload preview.  
    * "Execute on Platform" CTA.  
    * Error Log Terminal (Displays API responses, Rollback statuses, or Gemini rejection reasons).  
* **Interactions:**  
  * If pre\_flight\_scan\_status is not 'passed', the "Execute" CTA MUST be disabled.  
  * Clicking "Execute" MUST show a loading state (spinner) while the system communicates with the external API.

### **5\. Local Vault Management**

* **Key Elements:**  
  * List of supported integration platforms (strictly Google Tag Manager and Google Analytics 4 for V1).  
  * Connection Status indicators (e.g., "Connected", "Expired", "Not Configured").  
  * "Connect / Re-authenticate" OAuth buttons.  
* **Interactions:**  
  * Clicking "Connect" MUST redirect the user to the respective Google OAuth consent screen, strictly requesting the minimal scopes required to execute the Verified Actions.

### **6\. Governance Guardrails (Settings)**

* **Key Elements:**  
  * List of active GovernancePolicy rules (Natural Language strings).  
  * "Add New Policy" input field.  
* **Interactions:**  
  * Inline editing or deletion of policies.  
  * Policies MUST be presented as simple text inputs, reinforcing the AI-driven nature of the pre-flight scan (no complex logic builders required).

---

## **6\. Technical Stack & Integrations**

The engineering team MUST strictly adhere to a scalable, multi-tenant architecture to support real-time state management, secure credential vaulting, and deterministic AI execution.

### **1\. Suggested Technology Stack**

* **Frontend Application:**  
  * **Framework:** Next.js (React) using TypeScript. It MUST support localized internationalization (i18n) from Day 1 to serve the diverse global market partitions.  
  * **State Management:** Zustand or Redux Toolkit. MUST handle optimistic UI updates for Kanban card movements to ensure perceived performance.  
  * **Code Editor:** Monaco Editor (or similar) MUST be embedded for Global Admins and Local Users to read/write JSON payloads for Type C tasks with syntax highlighting and validation.  
* **Backend Application:**  
  * **Framework:** Node.js with NestJS (TypeScript). NestJS is highly recommended to enforce strict module boundaries and enterprise-grade dependency injection.  
  * **Real-time Engine:** Socket.io or raw WebSockets MUST be implemented to broadcast Kanban state changes to all concurrent users viewing a LocalBoard, preventing data desync.  
* **Database & Caching:**  
  * **Primary Database:** PostgreSQL. A relational database is an absolute strict requirement to enforce the complex tenant\_id foreign key relationships, RBAC rules, and transactional rollbacks during Strategy distribution.  
  * **ORM:** Prisma or TypeORM to enforce strict typing between the database schema and the application layer.  
  * **Cache / PubSub:** Redis SHOULD be used to manage WebSocket pub/sub channels and cache active GovernancePolicy strings to reduce database load during high-volume API execution phases.  
* **Infrastructure:**  
  * **Hosting:** Google Cloud Platform (GCP) or AWS. GCP is recommended given the heavy reliance on Google APIs (Gemini, GTM, GA4) for V1.  
  * **Security:** KMS (Key Management Service) MUST be utilized to encrypt/decrypt the VaultCredential OAuth tokens at rest.

### **2\. External API Integrations (V1 Scope)**

The V1 system is strictly bounded to the following third-party integrations:

* **AI Engine (The Pre-Flight Scan):**  
  * **Google Gemini API:** The system MUST integrate with the Gemini API (e.g., gemini-1.5-flash or gemini-1.5-pro). The integration MUST utilize the response\_mime\_type: "application/json" configuration to force deterministic JSON outputs for the governance scan.  
* **Target Execution Platforms (Verified Actions):**  
  * **Google Tag Manager (GTM) API:** MUST be integrated to support reading current workspace states (for rollback) and deploying tag/trigger/variable JSON payloads.  
  * **Google Analytics 4 (GA4) Admin API:** MUST be integrated for creating/updating properties, data streams, and custom dimensions.  
  * **Google OAuth 2.0:** MUST be used to authenticate Local Users and generate the Bearer tokens stored in the Stradia Vault. Scopes MUST be strictly limited to the minimum required for GTM and GA4 administration.  
* **Billing & Provisioning:**  
  * **Stripe API:** MUST be integrated via Webhooks to manage Tenant subscriptions. The system MUST query Stripe (or sync via webhooks to the database) to validate the active\_markets\_limit and user\_seat\_limit before allowing a Global Admin to provision new resources.  
* **Identity & Authentication:**  
  * **Auth0 (or similar provider like AWS Cognito):** SHOULD be used to manage secure user authentication, password resets, and session management, passing a standardized JWT to the Stradia backend.

---

## **7\. Open Technical Decisions**

Before engineering begins, the technical leadership team MUST resolve the following architectural decisions to ensure system resiliency, security, and scalability.

### **1\. Database Multi-Tenancy Architecture (RLS vs. Schema-per-Tenant)**

While PostgreSQL is the mandated primary database, the team MUST decide exactly how to enforce multi-tenant isolation at the database level.

* **Option A: Shared Schema with Row-Level Security (RLS).** Using PostgreSQL's native RLS policies, every query automatically filters by tenant\_id using a session variable (e.g., SET LOCAL app.current\_tenant). This provides defense-in-depth and operational simplicity but requires strict handling of connection pooling (like PgBouncer) to ensure context doesn't leak between pooled connections.  
* **Option B: Schema-per-Tenant.** Each tenant gets a dedicated PostgreSQL schema. This provides absolute isolation and easier per-tenant backups but significantly increases the complexity of database migrations and infrastructure management as the enterprise customer base grows.

### **2\. State Management for Real-Time Kanban Sync**

The Local Board requires real-time UI updates when concurrent Local Users drag-and-drop tasks or when the system updates a task's pre\_flight\_scan\_status.

* **Decision:** How will the WebSocket pub/sub infrastructure be managed?  
* **Options:** Utilizing a dedicated Redis Pub/Sub instance to broadcast state changes across multiple Node.js/NestJS backend instances, or relying on a managed service like Pusher/Socket.io's adapter. The team MUST also decide if optimistic UI updates on the frontend are sufficient, or if the UI should strictly wait for the database transaction acknowledgment before visually moving the card.

### **3\. API Rate Limiting & Rollback Resiliency**

During Feature 3 (Type C Task Execution), if an API deployment fails, the system automatically fires a rollback request. However, target APIs (GTM/GA4) have strict rate limits.

* **Decision:** How does the system handle a scenario where the rollback request itself is rejected due to a 429 Too Many Requests response?  
* **Options:** The team MUST decide whether to implement a synchronous retry mechanism with exponential backoff and randomized jitter, or to offload failed rollbacks into a highly durable Dead-Letter Queue (DLQ) (e.g., using RabbitMQ or AWS SQS) for asynchronous reprocessing.

### **4\. Vault Credential Key Rotation & KMS Strategy**

The Vault stores highly sensitive OAuth Bearer tokens for external APIs. While at-rest encryption via a Key Management Service (KMS) is mandated, the exact lifecycle of these encryption keys remains open.

* **Decision:** What is the frequency and mechanism for envelope encryption key rotation?  
* **Options:** The team MUST decide if they will use AWS KMS / Google Cloud KMS automatic yearly rotation, or implement a custom cryptographic shredding protocol for when a Market is explicitly deleted by a Global Admin.

### **5\. Gemini Prompt Versioning & Auditability**

The Natural Language Governance Policies are evaluated by the Gemini LLM. However, prompt engineering will evolve, and underlying LLM models may receive updates, potentially changing how a policy is interpreted over time.

* **Decision:** How do we guarantee deterministic audits if a task passed the scan a month ago, but would fail it today?  
* **Options:** The database schema MAY need to be expanded to save the exact system prompt version, the LLM model version (e.g., gemini-1.5-pro-001), and the temperature setting used at the exact moment of execution within the LocalTask.execution\_payload metadata.

