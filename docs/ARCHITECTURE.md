# **Stradia Architecture Spec**

## **Phase A: Foundation (Current Implementation)**

This document serves as the strict technical blueprint for **Stradia**, an enterprise-grade B2B SaaS "State Guardian" platform. The application is built using Next.js 15+ (App Router), TypeScript in strict mode, Tailwind CSS, and Shadcn/UI.

### **1. File System & Naming Convention**

To maintain enterprise scalability and enforce modularity, the project adheres to a strict Feature-Sliced Design inside the Next.js App Router paradigm.

#### **Folder Structure (Actual)**

```plaintext
./
├── app/                      # Next.js App Router (Pages, Layouts, API Routes)
│   ├── (auth)/               # Route group for unauthenticated flows
│   ├── (dashboard)/          # Route group for authenticated global/local views
│   ├── (marketing)/          # Route group for public marketing pages
│   ├── layout.tsx            # Root layout with Global Providers
│   └── providers.tsx         # Client-side context providers (Theme, Auth, Query)
├── components/               # Global & Feature-specific React Components
│   ├── ui/                   # Dumb UI components (Shadcn/Radix primitives)
│   └── site-header.tsx       # Global header component
├── lib/                      # Framework-agnostic utilities & State
│   ├── auth/                 # Authentication types, mock provider, and utilities
│   ├── stores/               # Zustand global stores (Session, Sidebar, etc.)
│   ├── api-client.ts         # Unified API client (Mock vs Real toggle)
│   └── utils.ts              # Tailwind merge utilities
├── docs/                     # Project documentation
└── public/                   # Static assets
```

#### **Strict Naming Conventions**

* **Files & Folders:** MUST use kebab-case (e.g., `local-board.tsx`).
* **Components:** MUST use PascalCase and match the export name exactly.
* **Colocation Strategy:** Tests (`.test.tsx`) and component-specific types MUST be colocated.

---

### **2. Current Implementation State (Phase 1)**

The current "Walking Skeleton" implements the core routing topology and a mocked state management system to facilitate rapid UI development before backend integration.

#### **Authentication & State Management**
*   **Provider:** `AuthProvider` (`lib/auth/provider.tsx`) manages the user session via React Context.
*   **Mocking:** `MockSessionProvider` (`lib/auth/mock-session-provider.tsx`) hydrates the store with a dummy `GLOBAL_ADMIN` user when `NEXT_PUBLIC_USE_MOCKS=true`.
*   **Global Store:** `useSessionStore` (`lib/stores/session-store.ts`) uses **Zustand** to expose session state to the UI.
*   **API Client:** `lib/api-client.ts` abstracts network requests, toggling between `fetch` and a mock implementation based on environment variables.

#### **Target Architecture (Planned for Phase B/C)**
*   **Database:** PostgreSQL with Prisma ORM (Not yet implemented).
*   **Server Actions:** Will replace current mock handlers for mutations.
*   **WebSockets:** Will be implemented for real-time board updates.

---

## **Phase B: Route & Component Matrix**

This section defines the component tree and routing boundaries.

### **3. Route & Component Composition Matrix**

All routes use Next.js App Router. Pages are currently implemented as default exports in `page.tsx` files.

#### **Route 1: Public Landing & Lead Capture**
*   **Route:** `/(marketing)`
*   **Page Component:** `app/(marketing)/page.tsx`
*   **Layout:** `app/(marketing)/layout.tsx` (or inherits Root)
*   **Key Sub-Components:** (Planned: `<HeroSection />`, `<LeadCaptureModal />`)

#### **Route 2: Authentication**
*   **Route:** `/(auth)/login`
*   **Page Component:** `app/(auth)/login/page.tsx`
*   **Layout:** `app/(auth)/layout.tsx` (Minimalist centered card layout)
*   **Key Sub-Components:** (Planned: `<LoginForm />`)

#### **Route 3: Global Dashboard / Heatmap (Global Admins)**
*   **Route:** `/(dashboard)/overview`
*   **Page Component:** `app/(dashboard)/overview/page.tsx`
*   **Layout:** `app/(dashboard)/layout.tsx` (Wraps authenticated routes with global Sidebar and UserMenu)
*   **Key Sub-Components:** (Planned: `<StatCards />`, `<GlobalHeatmapMatrix />`)

#### **Route 4: Local Kanban Board (Local Users & Supervisors)**
*   **Route:** `/(dashboard)/markets/[marketId]/board`
*   **Page Component:** `app/(dashboard)/markets/[marketId]/board/page.tsx`
*   **Layout:** `app/(dashboard)/layout.tsx`
*   **Key Sub-Components:** (Planned: `<BoardHeader />`, `<LocalKanbanBoard />`)

---

### **4. Interaction & Mutation Schema (Target)**

*Note: The following schema defines the target behavior for Phase B. Currently, mutations are mocked via `lib/api-client.ts`.*

Every user interaction that mutates data MUST map to a strictly typed Server Action or WebSocket Event, validated by a Zod Schema. Implicit state updates are strictly forbidden.

#### **Interaction 1: Submit Enterprise Lead**
*   **UI Component:** `<LeadCaptureModal />`
*   **Trigger:** `onSubmit`
*   **Server Action:** `captureLeadAction(payload)`
*   **Zod Input Schema:** `CreateLeadSchema`

#### **Interaction 2: User Login**
*   **UI Component:** `<LoginForm />`
*   **Trigger:** `onSubmit`
*   **Server Action:** `loginUserAction(payload)`
*   **Zod Input Schema:** `LoginSchema`

#### **Interaction 3: Kanban Drag & Drop (Move Task)**
*   **UI Component:** `<TaskCard />`
*   **Trigger:** `onDragEnd`
*   **Server Action / WS Event:** `client:move_task`
*   **Zod Input Schema:** `ClientMoveTaskSchema`

#### **Interaction 4: Task Lock (Concurrency Control)**
*   **UI Component:** `<TaskCard />`
*   **Trigger:** `onClick`
*   **Server Action / WS Event:** `client:lock_task`
*   **Zod Input Schema:** `ClientLockTaskSchema`

---

## **Phase C: Logic & Security (Target)**

This final phase dictates the strict rules for state management, reusable UI primitives, platform security, and the testing architecture.

### **5. Global Store vs. Server State Strategy**

To prevent state desynchronization and implicit bug vectors, Stradia strictly separates Server State (remote data) from Client State (ephemeral UI data).

#### **5.1 Server State (React Query)**
*   **Status:** Partially implemented (Mock Query Client).
*   **Target:** Domain data MUST NOT be stored in global client stores. All server data MUST be managed by React Query.

#### **5.2 Global Client State (Zustand/Context)**
*   **Status:** Implemented (`useSessionStore`).
*   **Target:** Context and Zustand MUST only be used for app-wide, non-domain UI state (e.g., sidebar, theme).

#### **5.3 Complex Local State (Behavioral Requirements)**
*   **Status:** Planned.
*   **Target:** The `<TaskExecutionPanel />` MUST implement a strict State Machine pattern (IDLE, GENERATING, SCANNING, etc.).

---

### **6. Reusable UI Library**
*   **Status:** `components/ui` contains Shadcn primitives.
*   **Target:** Implement `<StatusBadge />`, `<HeatmapDataTable />`, `<SplitCodeEditor />`, `<ExecutionAlert />`.

---

### **7. Security & Middleware**
*   **Status:** Mock Auth implemented.
*   **Target:**
    *   **JWT Session:** NextAuth / HttpOnly cookies.
    *   **Middleware:** Intercept requests to `/(dashboard)/*`.
    *   **RLS:** Database-level tenant isolation.
    *   **WebSocket:** Handshake auth and room authorization.

---

### **8. Testing & Validation Strategy**

Implementation MUST follow a strict Test-Driven Development (TDD) protocol.

#### **8.1 Tooling Stack**
*   **Unit / Integration:** Vitest
*   **Component / UI:** React Testing Library (RTL)
*   **End-to-End (E2E):** Playwright

#### **8.2 Test Taxonomy & Boundaries**
1.  **Server Actions (Integration Tests):** Mocked Prisma client.
2.  **Domain Logic & AI (Unit Tests):** Stubbed external services.
3.  **UI Molecules (Interaction Tests):** State machine validation.
4.  **E2E Critical Paths:** Login -> Dashboard -> Kanban.

#### **8.3 Mocking & Fixture Strategy**
*   All test fixtures MUST reside in `__fixtures__/` (or colocated).
*   External services MUST be bypassed using mock handlers.
