# **Stradia Architecture Spec**

## **Phase A: Foundation**

This document serves as the strict technical blueprint for **Stradia**, an enterprise-grade B2B SaaS "State Guardian" platform. The application MUST be built using Next.js 14+ (App Router), TypeScript in strict mode, Tailwind CSS, and Shadcn/UI. State management MUST utilize React Query for server state and Server Actions for mutations.

\+2

### **1\. File System & Naming Convention**

To maintain enterprise scalability and enforce modularity, the project MUST adhere to a strict Feature-Sliced Design inside the Next.js App Router paradigm.

#### **Folder Structure**

Plaintext

src/  
├── app/                      \# Next.js 14 App Router (Pages, Layouts, API Routes)  
│   ├── (auth)/               \# Route group for unauthenticated flows  
│   ├── (dashboard)/          \# Route group for authenticated global/local views  
│   └── api/                  \# Next.js Route Handlers (Webhooks, REST fallbacks)  
├── components/               \# Global & Feature-specific React Components  
│   ├── ui/                   \# Dumb UI components (Shadcn/Radix primitives) \[cite: 727\]  
│   ├── layout/               \# Global layouts (Sidebars, TopNav)  
│   └── features/             \# Domain-specific components (e.g., /features/kanban)  
├── lib/                      \# Framework-agnostic utilities  
│   ├── prisma.ts             \# Prisma ORM instantiation \[cite: 677\]  
│   ├── utils.ts              \# Tailwind merge utilities (cn)  
│   └── validations/          \# Global Zod schemas \[cite: 403, 1713\]  
├── server/                   \# Backend logic executed exclusively on the server  
│   ├── actions/              \# Next.js Server Actions (Mutations)  
│   ├── services/             \# Core business logic (AI Engine, Vault encryption)  
│   └── mappers/              \# DTO Mappers (Entity \-\> Contract)  
├── types/                    \# Shared TypeScript interfaces and DTOs  
└── ws/                       \# WebSocket channel handlers and payload validation \[cite: 380\]

#### **Strict Naming Conventions**

* **Files & Folders:** MUST use kebab-case (e.g., local-board.tsx, task-execution-panel/).  
* **Components:** MUST use PascalCase and match the export name exactly (e.g., export const TaskCard \= ... inside TaskCard.tsx).  
* **Server Actions:** MUST use camelCase and be suffixed with Action (e.g., moveTaskAction.ts).  
* **Colocation Strategy:** Tests (.test.tsx), Storybook stories (.stories.tsx), and component-specific types MUST be colocated in the same folder as the component they test/document.

---

### **2\. Core Types & API Contract (The Blueprint)**

The frontend and backend MUST communicate using strictly defined Data Transfer Objects (DTOs) enforced by TypeScript interfaces and validated at runtime via Zod.

\+1

#### **Shared DTO Definitions**

The following DTOs dictate the shape of the data required by the UI components. Do not pass raw Prisma entities to the client.

* **HeatmapMatrixDTO:** Powers the Global Dashboard matrix.  
* **LocalBoardDTO:** Powers the localized Kanban execution environment.  
* **LocalTaskCardDTO:** Flattened representation of a task card for the Kanban UI.  
* **TaskExecutionPanelDTO:** Context and validation state for the execution workbench.  
* **WebSocket Event DTOs:** Strict payloads for real-time concurrency, including JoinBoardPayloadDTO, TaskLockedBroadcastDTO, TaskUnlockedBroadcastDTO, and TaskMovedBroadcastDTO.  
* \+3

#### **Type Ingestion & Mapping Strategy (The Mapper Pattern)**

To decouple the database schema (Prisma) from the UI layer, the backend MUST utilize a **Mapper Pattern**. Raw database queries MUST NOT leak into the UI components.

* **Implementation Rule:** For every DTO, create a corresponding mapper function in src/server/mappers/.  
* *Example Mapper Signature:* \`\`\`typescript  
  // src/server/mappers/boardMapper.ts  
  export class BoardMapper {  
  static toLocalBoardDTO(  
  boardEntity: Prisma.LocalBoardGetPayload\<...\>,  
  tasks: Prisma.LocalTaskGetPayload\<...\>\[\]  
  ): LocalBoardDTO {  
  // Implementation logic resolving relations, formatting statuses,  
  // and mapping to exactly match LocalBoardDTO.  
  }  
  }  
* **Zod Runtime Guardrails:** Action payloads MUST be validated using the defined Zod schemas before hitting the database, such as CreateLeadSchema, LoginSchema, and MoveTaskSchema. WebSocket payloads MUST similarly be validated using ClientLockTaskSchema and ClientMoveTaskSchema to ensure execution verification gates are enforced.  
* \+4

---

## **Phase B: Route & Component Matrix and Interaction & Mutation Schema**

This section translates the User Experience (UX) and Domain requirements into a strict, tree-like Next.js component hierarchy and maps out the exact data mutations required to power the interactions safely.

### **3\. Route & Component Composition Matrix (Part 1\)**

The following defines the component tree, data loaders, and boundaries for the first 4 major application routes. React Server Components (RSCs) MUST be used for all Page and Layout components. use client directives MUST be pushed down to the lowest possible leaf nodes (e.g., Forms, Interactive Kanban Boards).

#### **Route 1: Public Landing & Lead Capture**

* **Route:** / (or external marketing domain routed through App Router)  
* **Page Component:** LandingPage.tsx  
* **Layout:** MarketingLayout.tsx (Wraps marketing routes with public TopNav and Footer)  
* **Key Sub-Components:**  
  * \<HeroSection /\>  
  * \<ValueProposition /\>  
  * \<LeadCaptureModal /\> (Client Component \- Island of interactivity)  
* **Data Requirements:**  
  * *Loader:* None (Static page).  
  * *Contract:* None.  
  * *Suspense Boundary:* None required.

#### **Route 2: Authentication**

* **Route:** /login  
* **Page Component:** LoginPage.tsx  
* **Layout:** AuthLayout.tsx (Minimalist centered card layout)  
* **Key Sub-Components:**  
  * \<LoginForm /\> (Client Component)  
* **Data Requirements:**  
  * *Loader:* None.  
  * *Contract:* None.  
  * *Suspense Boundary:* None required.

#### **Route 3: Global Dashboard / Heatmap (Global Admins)**

* **Route:** /(dashboard)/overview  
* **Page Component:** GlobalDashboardPage.tsx  
* **Layout:** DashboardLayout.tsx (Wraps authenticated routes with global Sidebar and UserMenu)  
* **Key Sub-Components:**  
  * \<StatCards /\>  
  * \<GlobalHeatmapMatrix /\> (Client Component wrapper for TanStack Table / grid)  
  * \<HeatmapCell /\>  
* **Data Requirements:**  
  * *Loader:* getHeatmapMatrix() (Server-side fetch)  
  * *Contract:* HeatmapMatrixDTO  
  * *Suspense Boundary:* \<SkeletonHeatmap /\> (Renders a grayed-out matrix while data fetches).

#### **Route 4: Local Kanban Board (Local Users & Supervisors)**

* **Route:** /(dashboard)/markets/\[marketId\]/board  
* **Page Component:** LocalBoardPage.tsx  
* **Layout:** DashboardLayout.tsx  
* **Key Sub-Components:**  
  * \<BoardHeader /\> (Displays market\_name and active users via presence)  
  * \<LocalKanbanBoard /\> (Client Component \- strictly handles drag-and-drop context)  
  * \<BoardColumn /\>  
  * \<TaskCard /\> (Organism \- displays LocalTaskCardDTO data)  
* **Data Requirements:**  
  * *Loader:* getLocalBoard(marketId)  
  * *Contract:* LocalBoardDTO  
  * *Suspense Boundary:* \<SkeletonBoard /\> (Renders 4 empty columns with subtle pulsing headers).

---

### **4\. Interaction & Mutation Schema (Part 1\)**

Every user interaction that mutates data MUST map to a strictly typed Server Action or WebSocket Event, validated by a Zod Schema. Implicit state updates are strictly forbidden.

#### **Interaction 1: Submit Enterprise Lead**

* **UI Component:** \<LeadCaptureModal /\>  
* **Trigger:** onSubmit  
* **Server Action:** captureLeadAction(payload)  
* **Zod Input Schema:** CreateLeadSchema (Must enforce rejection of free email providers).  
* **Optimistic UI Strategy:** Button transitions to disabled \+ "Submitting...". On success, transition modal to an inline "Thank You" state without unmounting. On error (e.g., rate limit 429), display inline destructive text.

#### **Interaction 2: User Login**

* **UI Component:** \<LoginForm /\>  
* **Trigger:** onSubmit  
* **Server Action:** loginUserAction(payload)  
* **Zod Input Schema:** LoginSchema  
* **Optimistic UI Strategy:** Button shows loading spinner. On success, router.push('/overview'). On failure, standard red inline validation error.

#### **Interaction 3: Kanban Drag & Drop (Move Task)**

* **UI Component:** \<TaskCard /\>  
* **Trigger:** onDragEnd  
* **Server Action / WS Event:** Emits client:move\_task over WebSocket channel. (Fallback Server Action: moveTaskAction(payload) if WS drops).  
* **Zod Input Schema:** ClientMoveTaskSchema (Requires local\_task\_id, new\_status, and optionally blocked\_justification).  
* **Optimistic UI Strategy (CRITICAL):** \* Use useOptimistic to instantly snap the card into the new column.  
  * **Execution Verification Gate:** If the user moves a Type C (Executive) task to DONE, and the server rejects it because the AI Pre-Flight scan is not PASSED, the server emits a server:error with a revert\_action.  
  * The UI MUST catch this error, fire a destructive toast ("Policy Violation: Cannot complete task without passing AI scan"), and physically snap the card back to its previous status column.

#### **Interaction 4: Task Lock (Concurrency Control)**

* **UI Component:** \<TaskCard /\>  
* **Trigger:** onClick (User opens task for editing)  
* **Server Action / WS Event:** Emits client:lock\_task  
* **Zod Input Schema:** ClientLockTaskSchema  
* **Optimistic UI Strategy:** Instantly open the \<TaskExecutionPanel /\> for the current user. Other clients receiving the broadcast MUST immediately render an overlay on the specific \<TaskCard /\> showing the active user's avatar and setting pointer-events-none to prevent dual-editing.

---

## **Phase C: Logic & Security**

This final phase dictates the strict rules for state management, reusable UI primitives, platform security, and the testing architecture required to safely implement the Stradia application.

### **5\. Global Store vs. Server State Strategy**

To prevent state desynchronization and implicit bug vectors, Stradia strictly separates Server State (remote data) from Client State (ephemeral UI data).

#### **5.1 Server State (React Query)**

Domain data MUST NOT be stored in global client stores (like Zustand or Redux). All server data MUST be managed by React Query using strict, deterministic query keys:

* \['heatmap', tenantId\] \- Invalidation triggers on websocket deployment success.  
* \['board', marketId\] \- Real-time updates handled via WebSocket; query acts as initial seed and fallback cache.  
* \['strategy', strategyId\] \- Cached for the strategy builder.  
* \['task', taskId, 'execution-context'\] \- Fetches AI prompt context and JSON payloads.

#### **5.2 Global Client State (Zustand/Context)**

Context and Zustand MUST only be used for app-wide, non-domain UI state. Storing tasks, users, or metrics here is **strictly forbidden**.

* useSidebarStore: Manages { isOpen: boolean, isPinned: boolean }.  
* useThemeStore: Manages { theme: 'light' | 'dark' | 'system' }.

#### **5.3 Complex Local State (Behavioral Requirements)**

The most critical interaction in Stradia is the **AI Task Execution Panel**. This UI requires a strict State Machine pattern to prevent race conditions (e.g., users editing a payload while the AI is verifying it).

The \<TaskExecutionPanel /\> MUST implement the following state transitions:

* **State: IDLE**  
  * *UI:* "Generate Payload" button active. Editor is unlocked.  
* **State: GENERATING**  
  * *UI:* Editor locked (readOnly=true). Button shows "Querying Gemini AI...".  
* **State: GENERATED\_UNVERIFIED**  
  * *UI:* AI Payload populates. Editor unlocks. "Run Pre-Flight Scan" button active. "Deploy" button is **strictly disabled**.  
  * *Trigger:* If user manually types in the editor, state forces back to GENERATED\_UNVERIFIED (if it was passed).  
* **State: SCANNING**  
  * *UI:* Editor locked. Alert box shows spinner.  
* **State: SCAN\_FAILED**  
  * *UI:* Destructive Alert shows AI reasoning. Editor unlocks for manual correction. "Deploy" remains disabled.  
* **State: SCAN\_PASSED**  
  * *UI:* Success Alert. Editor locked. "Deploy" button unlocks and pulses.  
* **State: DEPLOYING**  
  * *UI:* All inputs locked. Loader active. Transitions to Kanban DONE on success, or reverts to SCAN\_PASSED on network error.

---

### **6\. Reusable UI Library (The "Dumb" Components)**

Based on the UX Spec and "Lego Brick" methodology, the following highly reusable Radix/Shadcn molecules MUST be implemented in src/components/ui/ before building feature screens.

* **\<StatusBadge variant="..." /\>:** \* Must accept variants: pending | active | completed (for Boards) and todo | in\_progress | blocked | done (for Tasks).  
  * Must map to specific Tailwind color tokens (e.g., bg-slate-100 text-slate-700 for TODO, bg-green-100 text-green-800 for DONE).  
* **\<HeatmapDataTable /\>:** \* A generic wrapper around TanStack Table.  
  * Must accept dynamic columns (Strategies) and dynamic rows (Markets).  
  * Must support client-side sorting by compliance score.  
* **\<SplitCodeEditor /\>:** \* Must utilize Shadcn's \<ResizablePanel\> primitives.  
  * Must accept a readOnly boolean prop to lock inputs during AI generation/scanning phases.  
* **\<ExecutionAlert /\>:**  
  * Semantic feedback banner accepting pending | success | destructive props to render the Pre-Flight scan results.

---

### **7\. Security & Middleware**

Stradia handles enterprise external API credentials and infrastructure blueprints. Security MUST be enforced at the Edge, the Database, and the Socket layer.

#### **7.1 Authentication & Edge Routing**

* **JWT Session:** Handled via standard NextAuth or equivalent secure HttpOnly cookie mechanisms.  
* **Next.js Middleware (src/middleware.ts):** \* MUST intercept all requests to /(dashboard)/\*.  
  * If no valid session exists, redirect to /login.  
  * If a user with UserRole.LOCAL\_USER attempts to access /(dashboard)/admin/\*, they MUST be redirected to their specific market dashboard or a 403 Forbidden page.

#### **7.2 Authorization & Row-Level Security (RLS)**

The database (Prisma \+ Postgres) MUST implement multi-tenancy rules at the query layer.

* **Tenant Isolation:** Every query MUST enforce tenant\_id \=== current\_user.tenant\_id.  
* **Market Access:** Supervisors and Local Users MUST ONLY be able to fetch LocalBoard and LocalTask records where their user\_id is mapped to the market\_id.

#### **7.3 WebSocket Airgap (The Sandbox)**

* **Handshake Auth:** The initial WS connection MUST verify the JWT token.  
* **Room Auth:** When a client emits client:join\_board, the server MUST query the DB to verify the user has authorization for that specific market\_id before subscribing them to the Redis PubSub channel.

---

### **8\. Testing & Validation Strategy**

Implementation MUST follow a strict Test-Driven Development (TDD) protocol. The following boundaries are mandatory.

#### **8.1 Tooling Stack**

* **Unit / Integration:** Vitest (Fast, ESM-native execution).  
* **Component / UI:** React Testing Library (RTL).  
* **End-to-End (E2E):** Playwright (For critical user journeys).

#### **8.2 Test Taxonomy & Boundaries**

1. **Server Actions (Integration Tests):** \* MUST NOT use real database instances. MUST use a mocked Prisma client via vitest-mock-extended.  
   * *What to test:* Payload validation (Zod success/failure), correct mapper invocation, and expected HTTP/Error responses.  
2. **Domain Logic & AI (Unit Tests):**  
   * The GeminiService and ExternalAPI services MUST be completely stubbed out during CI. We strictly test that Stradia formulates the correct prompt string, not the LLM's response.  
3. **UI Molecules (Interaction Tests):**  
   * *What to test:* The \<TaskExecutionPanel /\> state machine. Using RTL, simulate clicking "Run Pre-Flight Scan", mock the Promise resolution, and assert that the "Deploy" button is unlocked only when SCAN\_PASSED is returned.  
4. **E2E Critical Paths:**  
   * Login \-\> Dashboard Load \-\> Navigate to Kanban \-\> Drag and Drop a Task.

#### **8.3 Mocking & Fixture Strategy**

* All test fixtures (e.g., mock users, mock JSON payloads) MUST reside in src/\_\_fixtures\_\_/.  
* External services (Stripe, Gemini, Google Analytics API) MUST be bypassed using mock handlers (e.g., MSW \- Mock Service Worker) for all frontend network requests.

---

