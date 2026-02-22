# **Stradia: Product Requirements Document**

## **Module 1.0 Unauthenticated & Authentication Module**

### **\[SECTION 1.1\] Public Landing Page & Lead Capture**

**1\. Context & Purpose**

The unauthenticated public-facing entry point for Stradia. Its purpose is to communicate the core value proposition (State Guardian, B2B SaaS) and capture enterprise leads, as self-serve organization creation is disabled for V1 to ensure high-touch enterprise onboarding.

**2\. Detailed System Behavior (The "Happy Path")**

1. User navigates to www.stradia.io (or the designated production domain).  
2. The system serves the static marketing homepage.  
3. User clicks the "Request Demo" or "Get Started" Call-to-Action (CTA).  
4. A modal appears containing a Lead Capture Form requiring: First Name, Last Name, Work Email, Company Name, and an optional "Message" text area.  
5. User submits the form.  
6. The system validates the input, saves the lead to the internal database (and/or sends a webhook to the internal CRM), and displays a "Thank You" success state within the modal.  
7. An automated email is sent to Stradia's internal sales team with the lead details.

**3\. Business Logic & Constraints (The Rules)**

* **Work Email Validation:** The system must reject free email providers (e.g., @gmail.com, @yahoo.com) using a standard exclusion list.  
* **Rate Limiting:** The lead capture endpoint must be rate-limited by IP address (maximum 5 submissions per hour) to prevent spam.  
* **Routing:** The "Login" button in the global navigation must strictly redirect to the app.stradia.io/login route.

**4\. Edge Cases & Error Handling**

* **CRM/Webhook Failure:** If the external CRM integration or internal database save fails, the system must securely log the payload in a dead-letter queue and still display the "Thank You" success message to the user so the UX is not interrupted.  
* **Validation Error:** If the user inputs a free email address, the form input border turns red and displays inline text: "Please use a valid company email address."

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Unauthenticated prospective enterprise buyers.  
* **Value:** Generates top-of-funnel pipeline for the sales team.  
* **Out of Scope:** V1 will not allow users to create an organization and bypass the sales team directly from the public site.

---

### **\[SECTION 1.2\] OAuth 2.0 Authentication Flow**

**1\. Context & Purpose**

The sole gateway for authenticated users to access the Stradia platform, utilizing OAuth 2.0 (Google and Meta) to ensure enterprise-grade security without the overhead of custom password management.

**2\. Detailed System Behavior (The "Happy Path")**

1. User navigates to app.stradia.io/login.  
2. The system displays a minimal login screen with two buttons: "Continue with Google" and "Continue with Meta".  
3. User clicks "Continue with Google".  
4. The system redirects the user to the Google OAuth consent screen.  
5. User selects their corporate Google account and authorizes Stradia.  
6. Google redirects back to the Stradia /auth/callback endpoint with an authorization code.  
7. Stradia exchanges the code for user profile data (Email, Name, Avatar).  
8. The system checks the database to confirm the email is tied to an active Stradia provisioned account.  
9. Upon match, the system generates a secure JSON Web Token (JWT), sets an HttpOnly cookie, and redirects the user to the Global Dashboard (or Local Board, depending on their Role-Based Access Control).

**3\. Business Logic & Constraints (The Rules)**

* **Strict Whitelist:** Users *cannot* sign up via OAuth. If an uninvited user attempts to log in via Google/Meta, the system must reject the login.  
* **Data Sync:** On every successful login, the system must update the user's "Last Login" timestamp and sync their Avatar URL if it has changed on the provider's side.  
* **Token Standard:** The system issues a JWT with a strict 24-hour expiration for security.

**4\. Edge Cases & Error Handling**

* **Uninvited Email Attempt:** If the OAuth provider returns an email that does not exist in Stradia's database, the user is redirected back to the login page with a toast notification: "Access denied. Your email has not been provisioned. Please contact your Global Admin."  
* **Provider Outage:** If Google or Meta APIs are unresponsive, the login screen displays a banner: "Authentication services are currently experiencing delays. Please try again in a few minutes."  
* **Revoked Access:** If a user revokes Stradia's OAuth access via their Google account settings, their next login attempt will force them through the consent screen again.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** All provisioned users (Global Admins, Supervisors, Local Users).  
* **Value:** Reduces friction to enter the app and offloads security/password management to trusted tech giants.  
* **Out of Scope:** Email/Password (credentials) login, SAML SSO (Okta/Azure AD) are excluded for V1.

---

### **\[SECTION 1.3\] Session Management & User Provisioning**

**1\. Context & Purpose**

The core engine for inviting users to the platform, assigning their security roles, and managing their active platform sessions.

**2\. Detailed System Behavior (The "Happy Path")**

1. A Global Admin logs into Stradia and navigates to "Settings \> User Management".  
2. Admin clicks "Invite User".  
3. A modal opens. Admin inputs the invitee's Email Address and selects a Role from a dropdown (Global Admin, Supervisor, Local User, Read-Only).  
4. If "Local User" or "Supervisor" is selected, a secondary dropdown appears requiring the Admin to assign the user to a specific Market(s) (e.g., "Spain", "Mexico").  
5. Admin clicks "Send Invite".  
6. The system creates a "Pending" user record in the database.  
7. The system triggers an HTML email via SendGrid to the invitee, containing a secure "Accept Invitation" link.  
8. Invitee clicks the link, lands on the Stradia login page, completes the OAuth flow (Section 1.2), and their status changes to "Active".

**3\. Business Logic & Constraints (The Rules)**

* **Role-Based Access Control (RBAC) Strict Boundaries:**  
  * *Global Admin:* Full tenant access, billing, and global strategy creation.  
  * *Supervisor:* Can view multiple assigned markets, cannot alter global strategy or billing.  
  * *Local User:* Confined strictly to their assigned single market. Cannot see the global heatmap.  
  * *Read-Only:* Can view assigned markets but cannot execute tasks or modify board states.  
* **Invite Expiry:** Invitation links expire 7 days after generation.  
* **Inactivity Timeout:** A user's active session will automatically terminate (forcing a logout) after 60 minutes of zero mouse/keyboard activity.

**4\. Edge Cases & Error Handling**

* **Expired Invite:** If a user clicks an invite link after 7 days, they are routed to an error page stating "Invitation Expired" and must request a new one from their Global Admin.  
* **JWT Expiration During Active Use:** If the 24-hour JWT expires while the user is mid-action (e.g., typing a comment), the API will return a 401 Unauthorized. The frontend must intercept this 401, save the user's current local state to browser localStorage to prevent data loss, and redirect to the login screen.  
* **Deleting a User:** If a Global Admin deletes a user, their active session (JWT) is immediately blacklisted, and their next API call will force a logout. Their historical data (completed tasks) remains but is attributed to "\[Deleted User\]".

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Global Admins (for provisioning) and all users (for session rules).  
* **Value:** Ensures strict data isolation between markets and enforces organizational hierarchy.  
* **Out of Scope:** Bulk CSV user imports and user self-serve market switching.

---

## **Module 2.0 Global Administration & Governance (Tenant Level)**

### **\[SECTION 2.1\] Market & Local Instance Provisioning Setup**

**1\. Context & Purpose**

The engine for creating and partitioning the isolated workspaces (Markets/Instances) where local teams will execute their assigned strategies. This represents the core axis of Stradia's multi-tenant architecture.

**2\. Detailed System Behavior (The "Happy Path")**

1. A Global Admin navigates to Settings \> Markets.  
2. The system displays a data table of all currently active markets (Columns: Market Name, Assigned Users, Active Strategies, Status).  
3. Admin clicks the "Add New Market" button.  
4. A modal appears requiring: "Market Name" (e.g., "Spain \- e-Commerce") and "Timezone" (dropdown for standard IANA timezones).  
5. Admin clicks "Create Market".  
6. The system provisions a new, empty logical partition in the database.  
7. The system automatically creates a "Vault" partition for this market (to store localized credentials later).  
8. The UI updates to show the new market in the data table, and it becomes immediately available in the user provisioning dropdowns (Section 1.3).

**3\. Business Logic & Constraints (The Rules)**

* **Uniqueness:** Market Names must be strictly unique within the organization. The system will throw a validation error if a duplicate name is attempted.  
* **Billing Hook:** Creating a market directly increments the organization's "Active Market" count. If the organization is on a strictly capped tier (e.g., max 5 markets) and attempts to add a 6th, the "Create Market" button must be disabled, displaying a tooltip linking to the Billing module.  
* **Deletion Protocol (Soft Delete):** If an Admin attempts to delete a market, they must manually type the exact market name into a red confirmation modal. The deletion is a "Soft Delete" in the database (flagged as is\_deleted \= true) to preserve historical audit logs, but the market becomes instantly invisible in the UI and frees up a billing slot.

**4\. Edge Cases & Error Handling**

* **In-Flight Executions during Deletion:** If a market is deleted while a local user within that market is actively executing a task, the local user's next API request will return a 403 Forbidden, and they will be routed to a "Market No Longer Exists" fallback page.  
* **Timezone Changes:** If an Admin changes a market's timezone after creation, all *future* due dates and timestamps will localize to the new timezone, but historical timestamps (e.g., "Task completed at X") remain stored and displayed in UTC to prevent temporal data corruption.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Global Admins.  
* **Value:** Allows the enterprise to scale Stradia across their global footprint systematically.  
* **Out of Scope:** Cloning an existing market's local state to a new market. New markets start completely blank until a Strategy is pushed to them.

---

### **\[SECTION 2.2\] Global User Management & RBAC Matrix**

**1\. Context & Purpose**

The centralized directory for managing the lifecycle, role assignments, and market access levels of all provisioned users within the tenant.

**2\. Detailed System Behavior (The "Happy Path")**

1. Global Admin navigates to Settings \> User Directory.  
2. The system loads a paginated data table (25 users per page) displaying: Name, Email, Role, Assigned Markets (displayed as chips/tags), Last Active Date, and an "Actions" meatball menu (...).  
3. Admin clicks "Edit" on a specific Local User.  
4. A slide-out drawer opens showing the user's details.  
5. The Admin changes the role dropdown from "Local User" to "Supervisor" and uses a multi-select dropdown to add "France" and "Germany" to their assigned markets.  
6. Admin clicks "Save Changes".  
7. The system updates the RBAC (Role-Based Access Control) mapping table in the database.  
8. The updated user's permissions are instantly modified. Upon their next page refresh, their navigation sidebar updates to show the newly assigned markets.

**3\. Business Logic & Constraints (The Rules)**

* **Role Hierarchies & Market Constraints:**  
  * *Global Admin:* Cannot be restricted to specific markets. They inherently have access\_all\_markets \= true.  
  * *Supervisor / Read-Only / Local User:* MUST have at least one market assigned. The system will block saving a user in these roles if the assigned market array is empty.  
* **The "Last Admin" Rule:** The system strictly prevents the modification or deletion of a Global Admin if they are the *only* Active Global Admin remaining in the tenant.

**4\. Edge Cases & Error Handling**

* **Removing a User's Active Market:** If an Admin removes "Spain" from a Local User who is currently logged in and viewing the "Spain" Strategy Board, the user's UI will force-redirect them to their next available market. If they have no markets left, they are redirected to a "No Markets Assigned" dead-end page.  
* **Simultaneous Edits:** If two Global Admins attempt to edit the same user simultaneously, the system uses "last write wins" logic based on the timestamp of the Save request.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Global Admins.  
* **Value:** Centralized security and compliance control.  
* **Out of Scope:** Custom role creation (e.g., building a role with granular CRUD toggles). V1 strictly uses the 4 hardcoded roles.

---

### **\[SECTION 2.3\] Governance Guardrails Builder (Natural Language Rule Input)**

**1\. Context & Purpose**

The interface where Global Admins define the strict compliance constraints that the Stradia AI engine must obey during the Pre-Flight Policy Scan (Type C tasks) to ensure local executors do not deploy rogue or non-compliant configurations to external platforms.

**2\. Detailed System Behavior (The "Happy Path")**

1. Global Admin navigates to Governance \> Guardrails.  
2. The system displays a list of active rules (e.g., "Rule \#1: Active").  
3. Admin clicks "Create New Guardrail".  
4. A card appears with a plain text area labeled: "Define your compliance rule in plain English."  
5. Admin types: *"Never allow any tags to fire on URLs containing '/checkout' or '/payment'."*  
6. Admin selects the Target Platform from a dropdown: "Google Tag Manager".  
7. Admin clicks "Save Guardrail".  
8. The system assigns a unique ID to the rule, stores it in the tenant's Governance Array, and marks it "Active".  
9. From this point forward, anytime a user attempts to execute a GTM task using Stradia AI, this text string is automatically injected into the AI's validation system prompt for the Pre-Flight Scan.

**3\. Business Logic & Constraints (The Rules)**

* **Max Rules Limit:** To prevent exceeding AI token limits during execution prompts, a tenant is strictly limited to a maximum of 25 Active Guardrails across all platforms.  
* **Platform Scoping:** Rules must be scoped to a specific target platform (e.g., GTM, GA4) or marked "Global" (applies to all Type C executions).  
* **Toggle State:** Rules can be toggled Active/Inactive without deleting them.

**4\. Edge Cases & Error Handling**

* **Character Limits:** The plain text input is strictly limited to 300 characters to force concise, explicit instructions. Exceeding this disables the Save button.  
* **Ambiguous Rules:** If an Admin writes a highly contradictory rule (e.g., "Always fire on checkout" AND "Never fire on checkout" in separate rules), Stradia V1 will not proactively detect the logical conflict during creation. The AI during the Pre-Flight Scan will evaluate it based on standard LLM conflict resolution, which may result in blocked tasks. (A tooltip must warn Admins: "Ensure your rules do not logically contradict each other").

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Global Admins.  
* **Value:** Transforms static policy documents into active, automated deployment firewalls.  
* **Out of Scope:** V1 does not support Regex or JSON Schema validation input from the Admin; it relies entirely on Natural Language evaluation by the AI.

---

### **\[SECTION 2.4\] The Heatmap Visualization & Market Integrity Dashboard**

**1\. Context & Purpose**

The primary command center for Global Admins and Supervisors. It provides a real-time, matrix-style visual representation of strategic progress and digital maturity across all markets globally.

**2\. Detailed System Behavior (The "Happy Path")**

1. User navigates to Global Dashboard.  
2. The system queries the completion state of all tasks across all markets.  
3. The system renders the "Heatmap Matrix".  
   * **Rows (Y-Axis):** Represent the Active Markets (e.g., Spain, Mexico, UK).  
   * **Columns (X-Axis):** Represent the Deployed Strategies (e.g., "Data Layer 2026", "GA4 Migration").  
4. At each intersection (cell), the system displays a Percentage Score (e.g., 85%).  
5. The cell is color-coded based on the score:  
   * 0% \- 33%: Red  
   * 34% \- 66%: Yellow  
   * 67% \- 99%: Light Green  
   * 100%: Solid Green  
6. The Admin clicks the "85%" cell for "Spain \- Data Layer 2026".  
7. A slide-out panel opens from the right, displaying the exact breakdown of that cell: Total Tasks (e.g., 20), Completed Tasks (17), Pending Tasks (3), and a list of the specific pending task names.

**3\. Business Logic & Constraints (The Rules)**

* **The Scoring Formula:** The percentage is calculated mathematically using the variable weights defined in the Strategy Editor.  
  * $Score \= \\frac{\\text{Sum of Weights of Completed Tasks}}{\\text{Sum of Weights of All Mandatory Tasks in the Strategy}} \\times 100$  
  * Note: If tasks have the default weight of 1, it functions as a simple percentage of completed vs. total tasks.  
* **Exclusion of Local Tasks:** Tasks created locally by the market (Section 4.3) are strictly excluded from this calculation. Only Global Mandatory Tasks and accepted Global Optional Tasks count toward the denominator.  
* **Real-Time Sync:** As soon as a local user moves a global task to "Done" on their local Kanban board, the Heatmap must instantly update its score upon the next page refresh or via web-socket (if implemented).

**4\. Edge Cases & Error Handling**

* **Empty Intersections:** If a Strategy has been created but not deployed to a specific market (e.g., Spain doesn't have the GA4 Migration strategy yet), that cell displays a gray dash ("-") and is unclickable.  
* **Denominator Zero (New Strategy):** If a Global Admin pushes an empty Strategy (0 tasks) to a market, the UI handles the potential division by zero error by displaying "0% (Empty)".  
* **Ghost Card Influx:** If a Global Admin pushes an Optional Update (Ghost Card) to a market, the denominator does *not* increase until the local user explicitly "Accepts" the card onto their board.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Global Admins & Supervisors.  
* **Value:** Instant, global visibility into strategic compliance, replacing manual Excel trackers.  
* **Out of Scope:** Exporting the Heatmap as a PDF/CSV is out of scope for V1 (deferred to Section 7.3 or future).

---

## **Module 3.0 The Strategy Marketplace & Editor (Template Engine)**

### **\[SECTION 3.1\] Strategy Creation & Task Definition (Types A, B, and C)**

**1\. Context & Purpose**

The authoring environment where Global Admins design reusable, standardized playbooks (Strategies) comprised of specific, executable tasks. This is the master blueprint that dictates exactly what local markets must implement.

**2\. Detailed System Behavior (The "Happy Path")**

1. Global Admin navigates to Strategy Marketplace \> My Strategies.  
2. Admin clicks "Create New Strategy".  
3. The system prompts for a Strategy Name (e.g., "Data Layer 2026 Core"), Description, and Category tags.  
4. The system opens the "Strategy Editor" (a vertical timeline/list builder UI).  
5. Admin clicks "Add Task" and is forced to select one of three strictly defined Task Types:  
   * **Type A (Manual):** Admin inputs a Title, Description, and an optional Markdown-formatted "How-to Guide".  
   * **Type B (Generative \- AI Assisted):** Admin inputs Title/Description, and additionally configures a hidden "System Prompt" (e.g., "Generate a JavaScript array for eCommerce tracking...").  
   * **Type C (Executive \- AI \+ API):** Admin inputs Title/Description, configures the "System Prompt", and strictly selects the Target Integration Platform from a dropdown (e.g., "Google Tag Manager").  
6. Admin clicks "Save Draft". The system validates that all mandatory fields for the selected task types are filled and saves the JSON payload to the database with status: draft.

**3\. Business Logic & Constraints (The Rules)**

* **Immutability of Types:** Once a task is saved, its Type (A, B, or C) cannot be changed. The Admin must delete it and create a new task.  
* **Type C Platform Restriction:** A Type C task MUST be bound to a supported integration platform. If the tenant has no Active Vault credentials for that platform (handled in Module 6.0), the Editor displays a warning badge but allows saving the draft.  
* **Draft vs. Published:** A Strategy remains in "Draft" state (invisible to local markets) until explicitly "Published".

**4\. Edge Cases & Error Handling**

* **Corrupt Prompts:** If an Admin includes unsupported variables in the Type B/C System Prompt (e.g., {{unsupported\_macro}}), the system's "Save Draft" validation scan throws an inline error: "Invalid dynamic variable used in prompt. Please use the Variable Picker."  
* **Session Timeout during Editing:** If the Admin's session expires or the browser crashes, the Editor utilizes browser localStorage to save the state every 30 seconds. Upon returning, a modal asks: "Restore unsaved Strategy changes?"

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Global Admins.  
* **Value:** Transforms disparate spreadsheets into structured, machine-readable digital playbooks.  
* **Out of Scope:** Branching logic (e.g., "If Task 1 is X, skip Task 2") is excluded from V1. All tasks in a Strategy are strictly linear.

---

### **\[SECTION 3.2\] Variable Task Weighting & Scoring Dependencies**

**1\. Context & Purpose**

The mathematical rule engine that allows Global Admins to prioritize certain tasks over others, directly impacting the Global Heatmap's compliance score.

**2\. Detailed System Behavior (The "Happy Path")**

1. While in the Strategy Editor, the Admin views the list of created tasks.  
2. Next to each task, there is a numeric input field labeled "Weight (Points)", defaulting to 1.  
3. Admin clicks the input for "Configure GA4 Property" (a high-priority task) and changes the weight to 5.  
4. The Admin clicks the "Dependencies" icon on Task 3\.  
5. A modal appears: "Task 3 cannot be started until..."  
6. Admin selects "Task 1" and "Task 2" from a multi-select dropdown.  
7. The system draws a visual link (or lock icon) indicating the dependency.  
8. Admin saves the Strategy. The total "Max Score" of the strategy is calculated as the sum of all task weights (e.g., 1 \+ 1 \+ 5 \= 7 Total Points) and displayed at the top of the Editor.

**3\. Business Logic & Constraints (The Rules)**

* **Weighting Limits:** Task weight must be an integer greater than or equal to 1. Maximum weight per task is 99. A weight of 0 is strictly forbidden to prevent division-by-zero errors in the heatmap formula.  
* **Dependency Validation (Acyclic Graph Check):** The system must prevent circular dependencies. If Admin sets Task 2 dependent on Task 1, the system hides Task 2 from Task 1's dependency dropdown. If an API bypass is attempted to create a loop, the backend rejects the payload with a 400 Bad Request.  
* **Cross-Strategy Dependencies:** Dependencies can ONLY be mapped between tasks within the *same* Strategy.

**4\. Edge Cases & Error Handling**

* **Deleting a Parent Dependency:** If the Admin deletes Task 1, the system automatically removes the dependency requirement from Task 3, resetting Task 3's dependency array to empty, and displays a toast notification: "Dependency removed due to task deletion."  
* **Post-Deployment Weight Changes:** If an Admin changes a task's weight *after* the strategy has been deployed to markets, the system immediately triggers a background recalculation job for all markets holding that strategy, updating the Heatmap scores retroactively based on the new denominator.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Global Admins.  
* **Value:** Ensures that critical governance tasks heavily impact the compliance score, preventing local markets from "gaming" the heatmap by only doing easy tasks.  
* **Out of Scope:** Fractional weighting (e.g., 1.5) and negative weighting (penalties) are excluded.

---

### **\[SECTION 3.3\] Strategy Deployment & Sync Engine**

**1\. Context & Purpose**

The distribution mechanism that pushes published Strategies to local markets, handling version control, forced compliance (Critical Updates), and optional recommendations (Ghost Cards).

**2\. Detailed System Behavior (The "Happy Path")**

1. Admin clicks "Deploy Strategy" from the Editor.  
2. A deployment modal appears with a checklist of all active markets (e.g., Spain, France, Mexico).  
3. Admin selects "Spain" and "France" and clicks "Confirm Push".  
4. The system clones the Master Strategy tasks and inserts them into the specific local databases for Spain and France, placing them in the "To Do" column of their respective Kanban boards.  
5. **Scenario B (The Update):** A month later, the Admin edits the Master Strategy, adding a new task: "Implement Consent Mode v2".  
6. Admin clicks "Push Update". The system prompts: "Is this update Optional or Critical?"  
7. Admin selects **Critical Update**.  
8. The system pushes the task directly into the "To Do" column of Spain and France, immediately recalculating their Heatmap denominator (lowering their score until completed).

**3\. Business Logic & Constraints (The Rules)**

* **The "Ghost Card" (Optional Update) Logic:** If the Admin selects "Optional Update", the task is pushed to the local boards as a translucent "Ghost Card".  
  * The Heatmap denominator does *not* increase.  
  * The local user must explicitly click "Accept" (which solidifies the task and updates the denominator) or "Reject" (which prompts for a mandatory text justification and removes the card).  
* **The "Critical Update" Override:** If a Critical Update modifies an *existing* task that a local user previously rejected (as a Ghost Card), the system resurrects the task, strips the rejection status, places it back in "To Do", and recalculates the score.  
* **Deployment Locking:** While a push is actively processing across the tenant database, the Master Strategy is locked (Read-Only) to prevent mid-deployment mutations.

**4\. Edge Cases & Error Handling**

* **Version Collision (The Active User Conflict):** *Crucial Rule.* If a Global Admin pushes a Critical Update to "Task X" while a Local User in Spain is actively typing inside "Task X" or the AI is currently executing it:  
  1. The sync engine detects the Mutex Lock (Section 5.6) on the local task.  
  2. The system prevents the local user from marking the old version as "Done".  
  3. The system fires a UI alert to the local user: *"Organizational Update Detected. Your current progress has been saved as a Draft."*  
  4. The system migrates the local user's inputs to a generic "Local Notes" text field attached to the task, unlocks the resource, and overwrites the core task parameters with the new Global version.  
* **Partial Deployment Failure:** If the sync succeeds for Spain but fails for France due to a database timeout, the system flags the Master Strategy UI with a "Partial Sync Error" badge, showing a "Retry Sync for France" button.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Global Admins (Initiators) and Local Users (Receivers).  
* **Value:** The core engine that makes Stradia a "State Guardian" rather than a static template library. Ensures global governance is strictly enforced locally.  
* **Out of Scope:** Automated scheduled deployments (e.g., "Deploy on Friday at 5 PM"). All pushes are immediate manual triggers.

---

## **Module 4.0 The Local Execution Workspace (Kanban Module)**

### **\[SECTION 4.1\] Multi-Tenant Board State Management (To Do, Pending, Blocked, Done)**

**1\. Context & Purpose**

The strictly isolated, market-specific execution interface where Local Users interact with the Strategies pushed by the Global Admin. It is a visual Kanban board representing the real-time operational state of a single market.

**2\. Detailed System Behavior (The "Happy Path")**

1. A Local User logs in and is routed to their assigned market's active board (e.g., "Spain \- Data Layer 2026").  
2. The system renders the Kanban view with four strictly hardcoded columns: **To Do**, **Pending**, **Blocked**, and **Done**.  
3. Global tasks pushed by the Admin appear as cards in the "To Do" column.  
4. The user clicks and holds a card (e.g., "Type A: Update Privacy Policy text"), dragging it to the "Pending" (In Progress) column.  
5. The system updates the task's status in the market's specific database partition.  
6. Once the user finishes the physical work, they drag the card to "Done".  
7. The system captures the completion timestamp, attributes it to the logged-in User ID, and immediately triggers an asynchronous recalculation of the Global Heatmap score for that market.

**3\. Business Logic & Constraints (The Rules)**

* **Hardcoded Workflow:** Local markets cannot create, rename, or delete columns. The workflow is globally standardized to ensure consistent telemetry.  
* **Type C Completion Gate:** A Local User is strictly prohibited from dragging a "Type C (Executive)" task into the "Done" column *unless* the internal AI Execution Engine (Module 5.0) has returned a 200 OK success status from the external API payload. If they attempt to drag it manually, the UI snaps the card back to "Pending" and displays a toast error: "Execution required. Type C tasks must be successfully run via Stradia AI before completion."  
* **Blocked State Requirement:** If a user moves a task to "Blocked", a modal forces them to input a mandatory text reason (e.g., "Waiting on client IT team for permissions"). The card displays a red warning icon until moved out of this column.

**4\. Edge Cases & Error Handling**

* **Dependency Locking:** If "Task 2" is dependent on "Task 1" (defined in Section 3.2), the Task 2 card is grayed out and visually locked in the "To Do" column. If the user attempts to drag it, it snaps back with an inline tooltip: "Locked: Task 1 must be moved to Done first."  
* **Simultaneous Local Users:** If two users assigned to the "Spain" market are viewing the board and User A moves a card, WebSockets (or aggressive 5-second polling) updates User B's UI instantly to prevent duplicate effort or drag-and-drop state collisions.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Local Users and Supervisors.  
* **Value:** Transforms the high-level Global Strategy into actionable, trackable daily work for the local teams.  
* **Out of Scope:** Custom workflow columns, sub-tasks within tasks, and cross-market task dragging.

---

### **\[SECTION 4.2\] Ghost Card Resolution Flow (Acceptance vs. Justified Rejection)**

**1\. Context & Purpose**

The compliance mechanism for handling "Optional Updates" pushed by the Global Admin. It empowers local teams to accept new recommendations or document explicitly *why* a recommendation is not viable for their specific market.

**2\. Detailed System Behavior (The "Happy Path")**

1. Global Admin pushes an "Optional Update" task.  
2. The Local User opens their board and sees a new card in the "To Do" column. The card has a dashed border, 50% opacity, and a "Ghost" badge.  
3. The user clicks the Ghost Card. A specialized modal opens, disabling standard drag-and-drop, and presenting two primary buttons: "Accept Update" and "Reject Update".  
4. The user clicks "Reject Update".  
5. The UI dynamically reveals a required "Justification" text area.  
6. The user inputs: "Incompatible with local Spanish data privacy laws regarding this specific cookie."  
7. The user clicks "Confirm Rejection".  
8. The system permanently deletes the card from the active Kanban board and logs the text payload into the market's "Descartes Justificados" (Justified Rejections) data table.  
9. The Heatmap denominator remains unchanged.

**3\. Business Logic & Constraints (The Rules)**

* **Acceptance State:** If the user clicks "Accept Update", the card instantly loses its ghost styling, becomes a standard task in the "To Do" column, and the Global Heatmap denominator for this market increases by the task's designated weight.  
* **Visibility of Rejections:** Supervisors and Global Admins have a dedicated view in the UI to audit all "Justified Rejections" per market to ensure local teams aren't simply rejecting work out of laziness.

**4\. Edge Cases & Error Handling**

* **The Resurrection (Critical Override):** As established in Phase 1, if a Global Admin later edits the Master version of that rejected task and pushes it as a "Critical Update", the system forcefully bypasses the local rejection. The system injects a fresh, solid card into the "To Do" column and attaches a UI banner to it: "Critical Global Override. Previous rejection invalidated."  
* **Accidental Rejection:** Once a Ghost Card is rejected, a Local User cannot manually undo it. They must request the Global Admin to re-push the card to their specific market.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Local Users.  
* **Value:** Provides flexibility for localized nuances (legal, technical) while maintaining a strict audit trail of *why* a market diverged from the global recommendation.  
* **Out of Scope:** Local Users modifying the core parameters of the Ghost Card before accepting it. It is strictly accept as-is or reject.

---

### **\[SECTION 4.3\] Custom Local Task Creation**

**1\. Context & Purpose**

Allows local execution teams to use Stradia as their daily operational tool by adding their own market-specific tasks that are not mandated by the Global Strategy, without skewing the global compliance metrics.

**2\. Detailed System Behavior (The "Happy Path")**

1. Local User clicks the "+ Add Local Task" button located at the top of their specific market board.  
2. A slide-out panel opens. The user inputs a Title, Description, and selects the Task Type (A, B, or C).  
3. If Type C is selected, they configure the AI prompt and target platform (identical to the Global Editor flow in Section 3.1).  
4. User clicks "Create Task".  
5. The system injects the task into the "To Do" column. The card features a distinct blue color band and a "Local Origin" badge to visually separate it from Global mandates.

**3\. Business Logic & Constraints (The Rules)**

* **Strict Score Exclusion:** Under no mathematical circumstances does a Local Task affect the Global Heatmap. Its weight is effectively 0 in the global context, regardless of what the local user inputs.  
* **Tenant Quota Consumption:** *Crucial Financial Rule.* If a Local User creates a Type B or Type C local task, the AI tokens consumed during execution *do* draw from the organization's centralized billing quota (managed in Module 7.0).  
* **Visibility Isolation:** Global tasks flow down; local tasks never flow up. A custom task created in the "Spain" market cannot be seen by the "France" market or cloned to the Master Strategy library.

**4\. Edge Cases & Error Handling**

* **Global Naming Collision:** If a user names a local task identically to a global task (e.g., "Setup GA4"), the system allows it but appends a specific ID hash to the backend record. The visual "Local Origin" badge prevents UI confusion.  
* **Supervisor Deletion:** A Supervisor can delete a Local Task from a market board, but they cannot delete a Global Task.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Local Users.  
* **Value:** Prevents users from managing global work in Stradia and local work in a separate Jira board, creating a single pane of glass for all data operations.  
* **Out of Scope:** Promoting a heavily utilized Local Task into a Global Strategy Template (this requires manual recreation by a Global Admin in V1).

---

### **\[SECTION 4.4\] Local Observations & Note Preservation Logic**

**1\. Context & Purpose**

The localized data wrapper attached to every task. It serves as a scratchpad for local executors and acts as the automated "safe haven" for user data when a Global Critical Update forcefully overwrites a task currently in progress.

**2\. Detailed System Behavior (The "Happy Path")**

1. User clicks on any task card (Global or Local) to open the task details modal.  
2. User navigates to the "Observations & Notes" tab.  
3. User types operational notes (e.g., "Client confirmed the GTM container ID is GTM-XXXXXX") into a rich text editor.  
4. User clicks "Save Note".  
5. The system appends the note to an activity timeline beneath the editor, displaying the User's Name, Timestamp, and the text payload.

**3\. Business Logic & Constraints (The Rules)**

* **Data Scoping:** Notes are bound purely to the Market\_ID \+ Task\_ID junction table. They do not alter the Master Strategy payload.  
* **Immutability of Activity Log:** Once a note is saved to the timeline, it cannot be edited or deleted by the Local User, creating an immutable audit trail of operational chatter.

**4\. Edge Cases & Error Handling**

* **The "Update Collision" Auto-Migration:** As defined in Phase 1, if a Local User is actively editing a task payload (e.g., tweaking a JSON script in a Type B task) and the Global Admin pushes a Critical Update to that exact task:  
  1. The system detects the version collision.  
  2. The system forcefully aborts the user's active edit state.  
  3. The system captures the entirety of the user's unsaved draft text/code.  
  4. The system automatically creates a new entry in the "Observations & Notes" timeline formatted as:  
     \[SYSTEM AUTO-SAVE: Version Collision Detected at {Timestamp}\]  
     {User's Draft Payload}  
  5. The core task instructions are overwritten with the new Global payload, but the user loses zero work.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Local Users.  
* **Value:** Protects against data loss during aggressive top-down governance updates and provides a localized context log for complex integrations.  
* **Out of Scope:** @mentioning other users within notes to trigger notifications.

---

## **Module 5.0 Stradia AI & Execution Engine**

### **\[SECTION 5.1\] The Verified Action Library (Pre-tested JSON schemas and parameter UI)**

**1\. Context & Purpose**

The structured input interface that bridges the gap between the Local User and the AI. Instead of giving users an open-ended chat box that could lead to hallucinated API payloads, Stradia forces the user to input specific variables into a strict, pre-defined form UI, which the AI then uses to populate its verified execution schemas.

**2\. Detailed System Behavior (The "Happy Path")**

1. Local User clicks "Execute" on a Type C task (e.g., "Deploy GA4 Base Tag").  
2. The system queries the Verified Action Library database for this specific task template.  
3. A modal opens displaying a structured form UI based on the required parameters for that action (e.g., Measurement ID \[Text Input\], Trigger Type \[Dropdown: All Pages, Custom\]).  
4. The user fills in the required parameters: G-12345678 and All Pages.  
5. The user clicks "Generate Payload".  
6. The system maps these inputs directly into the hidden System Prompt and passes it to the underlying LLM to construct the exact JSON payload required by the target API.

**3\. Business Logic & Constraints (The Rules)**

* **Input Validation:** Every field in the Verified Action UI must have strict frontend and backend validation (e.g., Measurement ID must match the Regex pattern ^G-\[A-Z0-9\]{10}$).  
* **Schema Strictness:** The AI is strictly instructed via system prompts to *only* output the requested JSON schema and strictly use the user-provided parameters. No additional conversational text is allowed in the output.

**4\. Edge Cases & Error Handling**

* **Invalid AI Output:** If the AI hallucinates and returns a payload that does not match the strict JSON schema required by the external API, the system automatically intercepts it before the user sees it, triggers an internal background retry (up to 2 times), and if it still fails, displays: "AI Generation Error: The system could not generate a valid configuration. Please verify your inputs and try again."

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Local Users.  
* **Value:** Drastically reduces error rates and AI hallucinations by constraining user inputs to tightly controlled, pre-tested boundaries.  
* **Out of Scope:** Allowing Local Users to write raw, open-ended prompts to the AI for Type C executions.

---

### **\[SECTION 5.2\] Type B (Generative) Chat Workflow & In-Browser Code Editor Review**

**1\. Context & Purpose**

The assisted workflow for tasks that require complex code generation (e.g., writing a custom JavaScript Data Layer push) but must be manually implemented by the user outside of Stradia.

**2\. Detailed System Behavior (The "Happy Path")**

1. Local User opens a Type B task (e.g., "Generate eCommerce Data Layer").  
2. The UI displays the task instructions and an "Open AI Assistant" button.  
3. User clicks the button. A split-screen UI opens: Chat interface on the left, an in-browser Code Editor (Monaco/VS Code-lite) on the right.  
4. The AI automatically generates the initial code snippet based on the Global Admin's hidden prompt and populates the Code Editor.  
5. The user reviews the code. If they need adjustments, they type into the chat: "Change the currency variable from USD to EUR."  
6. The AI acknowledges, regenerates the code, and updates the Code Editor.  
7. Once satisfied, the user clicks the "Copy Code" button, manually pastes it into their external CMS (e.g., Shopify), and clicks "Mark as Done" in Stradia.

**3\. Business Logic & Constraints (The Rules)**

* **Read-Only Code Block:** The in-browser Code Editor is read-only by default. The user must instruct the AI via chat to make changes, ensuring a complete audit trail of how the final code was generated.  
* **Context Window Limit:** The chat history for a specific Type B task is limited to the last 20 interactions to manage token costs.

**4\. Edge Cases & Error Handling**

* **Token Exhaustion:** If the user sends a message and the tenant's AI quota is completely depleted, the system blocks the request and displays a persistent banner: "AI Generation Paused: Your organization has exceeded its monthly AI token quota. Please contact your Global Admin."

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Local Users (typically technical analysts).  
* **Value:** Accelerates complex, bespoke technical tasks while keeping a record of the generated assets.  
* **Out of Scope:** Stradia automatically injecting this raw code into the client's website via script tags. Type B is strictly generative and requires manual human placement.

---

### **\[SECTION 5.3\] Type C (Executive) Pre-Flight Policy Scan & Validation Dry Run**

**1\. Context & Purpose**

The most critical security chokepoint in the platform. Before Stradia fires an API request to modify a client's live environment (e.g., Google Tag Manager), it must evaluate the generated payload against the Global Admin's natural language Guardrails (Section 2.3).

**2\. Detailed System Behavior (The "Happy Path")**

1. Following the Verified Action input (Section 5.1), the AI generates the JSON payload.  
2. **Step 1: The Pre-Flight Policy Scan.** The system sends the generated JSON payload *and* the active tenant Guardrails to the AI for a deterministic compliance check.  
3. The AI evaluates the payload and returns {"status": "pass"}.  
4. **Step 2: The Validation Dry Run.** Stradia sends a "Dry Run" (if supported by the target API) or a non-mutating validation request to the target platform (e.g., GTM API) to ensure the payload is syntactically correct.  
5. The target API returns a 200 OK validation response.  
6. The UI updates from "Validating..." to a green "Ready to Deploy" state, presenting a final "Execute" button to the Local User.

**3\. Business Logic & Constraints (The Rules)**

* **Strict Blocking:** If the Pre-Flight Scan determines the payload violates a Guardrail (e.g., Guardrail: "No tags on /checkout", Payload Trigger: url contains /checkout), the execution is instantly hard-blocked. The "Execute" button is disabled, and the UI displays the exact Guardrail that was violated.  
* **Logging:** Every Pre-Flight Scan, whether it passes or fails, is logged in the market's database with the payload hash and the evaluation result for compliance auditing.

**4\. Edge Cases & Error Handling**

* **Ambiguous Scan Results:** If the LLM returns an ambiguous or malformed evaluation (neither explicitly "pass" nor "fail"), the system must default to a "fail-secure" state, block the execution, and prompt the user: "Security Validation Error. The system could not conclusively verify compliance. Please try regenerating the payload."

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Local Users (Execution) & Global Admins (Peace of mind).  
* **Value:** The "State Guardian" feature. Prevents rogue deployments and ensures global policies are mathematically enforced at the local level.  
* **Out of Scope:** Bypassing a failed Pre-Flight Scan. If the AI flags a violation, the Local User cannot override it; they must alter their inputs to comply.

---

### **\[SECTION 5.4\] API Fault Tolerance (3x Retry limit with Exponential Backoff)**

**1\. Context & Purpose**

The network resilience mechanism. When Stradia pushes a Type C task to an external platform, it must handle network instability and rate limits gracefully without failing the user's task prematurely.

**2\. Detailed System Behavior (The "Happy Path")**

1. User clicks "Execute" on a validated Type C task.  
2. Stradia fires the API POST request to Google Tag Manager.  
3. The GTM API responds with a 429 Too Many Requests or 503 Service Unavailable.  
4. The system catches the error, prevents the UI from showing a failure state, and initiates Retry 1 after 2 seconds.  
5. If Retry 1 fails, it initiates Retry 2 after 4 seconds (Exponential Backoff).  
6. If Retry 2 fails, it initiates Retry 3 after 8 seconds.  
7. On Retry 3, the GTM API responds with a 200 OK.  
8. The system marks the task as successful, and the UI updates to "Deployment Successful".

**3\. Business Logic & Constraints (The Rules)**

* **Retry Limit:** Strictly capped at 3 automatic retries.  
* **Eligible Status Codes:** The system will ONLY retry on 429, 500, 502, 503, and 504 errors. It will NEVER retry on a 400 Bad Request, 401 Unauthorized, or 403 Forbidden, as these are deterministic errors that will not resolve with time.

**4\. Edge Cases & Error Handling**

* **Total Failure:** If Retry 3 fails, the system finally bubbles the error up to the UI, updates the task state to "Failed", and displays the exact API error code and message to the user.  
* **Manual Retry:** After a total failure, the Local User can manually click "Retry Execution", which restarts the entire flow (including the Pre-Flight Scan).

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** System Infrastructure (Transparent to the end-user).  
* **Value:** Ensures stable deployments in enterprise environments where API rate limiting is common.

---

### **\[SECTION 5.5\] Atomic Task Rollback & Automated Snapshot Recovery**

**1\. Context & Purpose**

The "Undo" safety net for Type C executions. If a multi-step API deployment fails halfway through, Stradia must revert the external platform to its original state to prevent corrupted or partial configurations.

**2\. Detailed System Behavior (The "Happy Path")**

1. User executes a complex Type C task (e.g., "Create 3 GTM variables and 1 Tag").  
2. Before sending the first payload, Stradia queries the external API and saves a JSON snapshot of the current workspace state (The "Pre-Execution Snapshot").  
3. Stradia successfully creates Variable 1 and Variable 2\.  
4. While attempting to create Variable 3, the external API returns a fatal 400 Bad Request (e.g., naming conflict).  
5. The execution is halted.  
6. The system automatically triggers the "Rollback Protocol", issuing API DELETE commands for Variable 1 and Variable 2 based on the initial snapshot.  
7. The external platform is restored to its exact pre-execution state.  
8. The UI notifies the user: "Execution Failed at Step 3\. Changes have been automatically rolled back."

**3\. Business Logic & Constraints (The Rules)**

* **Atomicity:** Executions are treated as atomic transactions. It is an "all or nothing" deployment.  
* **Snapshot Lifespan:** Snapshots are held in short-term memory (Redis or temporary DB tables) strictly for the duration of the execution attempt and are purged upon task success or successful rollback.

**4\. Edge Cases & Error Handling**

* **Rollback Failure:** If the Rollback Protocol itself encounters a fatal API error (e.g., the target API goes down completely mid-rollback), the system flags the task as "CRITICAL: Partial State" and immediately notifies the Local User and the Global Admin that manual intervention in the external platform is required.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Local Users.  
* **Value:** Enterprise-grade deployment safety. Prevents broken analytics setups caused by partial deployments.

---

### **\[SECTION 5.6\] Mutex Lock & Concurrency Management**

**1\. Context & Purpose**

The mechanism to prevent race conditions and "orphan locks" when multiple processes (or users) interact with the same task simultaneously.

**2\. Detailed System Behavior (The "Happy Path")**

1. User A clicks on "Task 1" to edit its parameters.  
2. The system immediately applies a "Mutex Lock" to Task 1 in the database, setting locked\_by: User\_A and marking a timestamp.  
3. User B views the board and sees a padlock icon on Task 1\. If they click it, it opens in "Read-Only" mode.  
4. User A clicks "Execute". The system hands the lock over to the internal AI Execution Engine.  
5. Execution completes successfully. The system removes the lock. User B can now interact with the task.

**3\. Business Logic & Constraints (The Rules)**

* **Absolute Timeout (User Abandonment):** If User A opens a task, applies a lock, but then closes their laptop or loses connection, the system enforces a strict **15-minute Absolute Timeout**. After 15 minutes of inactivity, the database automatically drops the lock, freeing the resource.  
* **AI Hard-Timeout:** To prevent the AI from causing an orphan lock during a hung API request, no AI execution process may exceed a **10-minute Hard-Timeout**. If the AI process hits 10:00, the system forcefully aborts the thread, marks the task as "Failed", and releases the lock safely before the 15-minute absolute threshold is reached.

**4\. Edge Cases & Error Handling**

* **Lock Collision during Sync:** As detailed in Section 3.3, if a Global Critical Update arrives while a local Mutex Lock is active, the Sync Engine respects the lock momentarily, gracefully forces the local UI to save a draft (Section 4.4), releases the lock, and then applies the Global update.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** System Infrastructure.  
* **Value:** Prevents database corruption and ensures users are never permanently blocked by abandoned browser sessions.

---

## **Module 6.0 The Vault (Credential Management)**

### **\[SECTION 6.1\] Market-Level Credential Ingestion (Write-Only Strict Storage)**

**1\. Context & Purpose**

The secure, market-isolated repository where local teams authorize Stradia to interact with their external platforms (e.g., Google Analytics 4, Google Tag Manager). It is the necessary bridge that allows Type C (Executive) tasks to function.

**2\. Detailed System Behavior (The "Happy Path")**

1. A Local User or Supervisor navigates to their specific market (e.g., "Spain") and clicks the Vault tab in the secondary navigation.  
2. The system displays a grid of supported "Integration Cards" (e.g., Google Tag Manager, Shopify, Meta Ads).  
3. The user clicks "Connect" on the Google Tag Manager card.  
4. A modal appears presenting two authorization methods (depending on platform support): "OAuth 2.0" or "Manual API Key".  
5. The user selects "OAuth 2.0" and clicks "Authorize via Google".  
6. The user is routed through the standard Google consent screen, granting Stradia the necessary scopes.  
7. Upon successful redirect, Stradia’s backend encrypts the Access Token and Refresh Token (using AES-256) and stores it strictly within the "Spain" market's database partition.  
8. The UI updates the GTM card to display a green "Connected" badge, showing the connected email address (e.g., analytics@spain-client.com), but strictly hides the actual token.

**3\. Business Logic & Constraints (The Rules)**

* **Strict Market Isolation:** Credentials uploaded to the "Spain" market cannot be accessed, queried, or utilized by the "France" market or the Global Admin's master tenant level.  
* **Write-Only Interface:** Once an API key or Token is saved, it can *never* be viewed in plain text again by any user through the UI. The only action available on a connected card is "Revoke/Delete".  
* **Prerequisite for Execution:** If a market does not have an active, connected token for a specific platform, all Type C tasks targeting that platform are visually locked on the Kanban board.

**4\. Edge Cases & Error Handling**

* **Invalid Manual Key Entry:** If a user inputs a manual API Key, the system instantly fires a lightweight validation GET request (e.g., fetching account lists). If it returns a 401 Unauthorized, the Vault rejects the input, does not save the key, and displays: "Invalid API Key. Connection failed."  
* **Scope Rejection:** If a user completes the OAuth flow but manually unchecks necessary permissions (e.g., read-only instead of read/write), the callback handler detects the missing scopes, discards the token, and displays a fatal error modal requiring the user to try again.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Local Users and Supervisors.  
* **Value:** Ensures enterprise security compliance by eliminating shared passwords and hardcoded tokens in scripts.  
* **Out of Scope:** Global credential sharing (e.g., one master API key used across all markets) is strictly forbidden in V1 to maintain rigid tenant security boundaries.

---

### **\[SECTION 6.2\] Token Expiry & Revocation Handling**

**1\. Context & Purpose**

The automated monitoring system that reacts when external credentials expire, are revoked by the client, or require a refresh, ensuring the AI execution engine doesn't blindly fail.

**2\. Detailed System Behavior (The "Happy Path")**

1. The Stradia backend attempts to execute a Type C task using a stored OAuth Access Token.  
2. The external platform (e.g., Google) responds with a 401 Unauthorized (Token Expired).  
3. The Stradia backend intercepts this 401, retrieves the associated Refresh Token from the Vault, and silently requests a new Access Token from Google in the background.  
4. Google returns the new Access Token.  
5. Stradia updates the encrypted Vault record, overwriting the old token.  
6. The execution engine resumes the original Type C task seamlessly without user intervention.

**3\. Business Logic & Constraints (The Rules)**

* **Hard Revocation State:** If the external platform returns a 400 Invalid Grant (meaning the client went into their Google settings and manually revoked Stradia's access) or if a manual API key is deleted externally, the refresh flow fails.  
* **UI Lockdown:** Upon a Hard Revocation, the system instantly flags the integration as "Disconnected" in the database. All pending Type C tasks for that platform in that market are instantly transitioned to the "Blocked" column (Section 4.1).

**4\. Edge Cases & Error Handling**

* **Notification Routing:** When a Hard Revocation occurs, the system triggers an urgent in-app notification strictly to the users assigned to that specific market: "Action Required: Google Tag Manager connection has been revoked. Please reconnect in the Vault."  
* **Race Conditions on Refresh:** If multiple Type C tasks are executed simultaneously and hit a 401 at the exact same millisecond, the system must utilize a Mutex Lock on the Refresh Token flow to ensure only *one* process requests the new token, while the others wait and utilize the new token once updated.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** System Infrastructure.  
* **Value:** Drastically reduces user friction by handling routine token lifecycles invisibly, only alerting users when manual re-authentication is strictly necessary.  
* **Out of Scope:** Automated email alerts to external clients asking them to re-authenticate (all alerts are kept in-app for provisioned users).

---

### **\[SECTION 6.3\] Checkpoint & Pause State Resumption**

**1\. Context & Purpose**

The recovery mechanism for complex, multi-step executions that are interrupted mid-flight by a Hard Revocation (or catastrophic external API outage) where an atomic rollback (Section 5.5) is not possible or desired.

**2\. Detailed System Behavior (The "Happy Path")**

1. User is executing a 5-step Type C task. Steps 1 and 2 succeed.  
2. At Step 3, the external API returns a fatal 403 Forbidden (Client revoked permissions exactly at that moment).  
3. The AI Execution Engine halts. Because the failure was auth-related, it skips the Rollback Protocol and initiates the "Checkpoint Protocol".  
4. The system serializes the exact state of the execution (Completed: \[Step 1, Step 2\], Pending: \[Step 3, 4, 5\], User Inputs, Generated Payloads) and saves it to the database as a "Paused Execution State".  
5. The UI updates the task card to a distinct orange "Paused (Auth Required)" state.  
6. The user navigates to the Vault, clicks "Reconnect", and provides fresh credentials.  
7. The user returns to the Kanban board and clicks "Resume" on the paused task.  
8. The system deserializes the Checkpoint, authenticates with the new token, and executes strictly from Step 3, successfully completing the task.

**3\. Business Logic & Constraints (The Rules)**

* **State Immutability:** While a task is in a "Paused" state, the user *cannot* edit the underlying task inputs or regenerate the payload. They can only "Resume" or explicitly "Abort & Rollback".  
* **Checkpoint Expiry:** To prevent database bloat and stale API payloads, a Checkpoint State automatically expires after 72 hours. If not resumed by then, the system forces an "Abort", moving the card back to "To Do".

**4\. Edge Cases & Error Handling**

* **Environment Drift During Pause:** If the client manually altered Step 1 directly in Google Tag Manager during the 24 hours the task was paused in Stradia, the resumption from Step 3 might fail due to missing dependencies. If Resume fails, the system immediately reverts to a total task failure, prompting the user to restart from Step 1\.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Local Users.  
* **Value:** Saves AI token costs and user frustration by preventing the need to restart massive, complex generative deployments from scratch due to a simple auth timeout.  
* **Out of Scope:** Checkpointing cross-market tasks. Checkpoints are strictly bound to the local execution instance.

---

## **Module 7.0 Billing, Quota & Export Engine**

### **\[SECTION 7.1\] Stripe Self-Serve Subscriptions (Active Market SaaS Fee)**

**1\. Context & Purpose**

The financial engine of Stradia. It manages the automated, self-serve billing lifecycle based on the core value metric: the number of provisioned "Active Markets" within a tenant.

**2\. Detailed System Behavior (The "Happy Path")**

1. Global Admin navigates to Settings \> Billing.  
2. The UI displays the Current Plan, Total Active Markets (e.g., "4/5 Markets Used"), and the Next Billing Date.  
3. Admin clicks "Manage Subscription".  
4. The system securely redirects the Admin to the Stripe Customer Portal (via a Stripe Checkout Session ID).  
5. Inside Stripe, the Admin increases their license count from 5 to 10 markets and confirms the prorated payment.  
6. Stripe fires a customer.subscription.updated webhook back to Stradia's backend.  
7. Stradia validates the webhook signature, updates the max\_markets integer in the tenant's database record from 5 to 10, and logs the transaction.  
8. The Admin returns to Stradia. The "Add New Market" button (Section 2.1) is instantly unlocked for the next 5 provisions.

**3\. Business Logic & Constraints (The Rules)**

* **Downgrade Enforcement:** If an Admin attempts to reduce their license count in Stripe (e.g., from 10 down to 5), but they currently have 8 Active Markets in Stradia, the Stripe Portal must be configured to block the downgrade. The Admin must return to Stradia and manually "Soft Delete" (Section 2.1) 3 markets *before* the system allows the billing downgrade.  
* **Webhook Dependency:** Billing state is strictly driven by Stripe webhooks. The Stradia database is a downstream consumer of Stripe's truth.

**4\. Edge Cases & Error Handling**

* **Payment Failure (Dunning Cycle):** If a monthly invoice fails to process (e.g., expired credit card), Stripe fires an invoice.payment\_failed webhook. Stradia triggers a 7-day "Grace Period", displaying a persistent red banner to all Global Admins.  
* **Hard Lockout:** If the invoice is unpaid after 7 days, Stradia automatically toggles the tenant's is\_active flag to false. All user sessions are immediately terminated, API access is revoked, and logging in routes strictly to a "Payment Required" gate. Data is preserved, but access is blocked.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Global Admins.  
* **Value:** Low-touch revenue scaling for Stradia, allowing clients to expand globally without bottlenecking through manual sales emails.  
* **Out of Scope:** V1 does not support custom enterprise invoicing, wire transfers, or split billing across different corporate entities within one tenant.

---

### **\[SECTION 7.2\] AI Token Quota Tracking & "Overdraft" Grace Period Logic**

**1\. Context & Purpose**

The usage-based cost control mechanism for the Stradia AI engine. It tracks the exact number of LLM tokens consumed by Type B (Generative) and Type C (Executive) tasks to prevent runaway API costs for the platform.

**2\. Detailed System Behavior (The "Happy Path")**

1. Local User executes a Type C task.  
2. The AI generates the JSON payload.  
3. The underlying LLM provider (e.g., OpenAI/Gemini) returns the API response, which includes the prompt\_tokens and completion\_tokens metadata.  
4. Stradia's backend sums these two integers and synchronously deducts the total from the tenant's monthly\_token\_quota integer field in the database.  
5. In Settings \> Billing, a visual progress bar updates in real-time (e.g., "350,000 / 500,000 Tokens Used").  
6. On the first day of the new billing cycle, the monthly\_token\_quota resets to its maximum baseline.

**3\. Business Logic & Constraints (The Rules)**

* **The Quota Pool:** Tokens are pooled at the Tenant (Organization) level, not the Market level. A heavy-usage market (e.g., USA) draws from the same pool as a low-usage market (e.g., Peru).  
* **The 5% Overdraft Rule:** To prevent an infuriating UX where an AI task aborts at 99.9% completion, the system allows a strict 5% "Overdraft" allowance.  
  * *Example:* If the quota is 500k, and a user initiates a task when the pool is at 499k, the system *will* allow the execution to complete even if it costs 3k tokens (bringing the total to 502k).  
  * *Hard Stop:* However, once the pool mathematically exceeds 100%, the "Execute" and "Open AI Assistant" buttons across ALL markets are instantly disabled.

**4\. Edge Cases & Error Handling**

* **Massive Payload Rejection:** If a user requests a massive Type B code generation that exceeds the remaining quota *and* the 5% overdraft buffer within a single call, the LLM request is aborted. The UI throws a 402 Payment Required equivalent: "AI Quota Exceeded. The execution was halted to prevent overage. Please upgrade your plan."  
* **Local Custom Task Consumption:** As defined in Section 4.3, custom Type C tasks created by local users *do* drain this central quota, making the progress bar an essential auditing tool for Global Admins.

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Global Admins (for monitoring), Local Users (experience the limits).  
* **Value:** Protects Stradia's gross margins from abusive or infinite-looping API calls while providing predictable pricing for the client.  
* **Out of Scope:** Granular token limits per individual market or per user.

---

### **\[SECTION 7.3\] Infrastructure-as-Code (IaC) Export**

**1\. Context & Purpose**

The enterprise off-ramp. It allows advanced technical teams to take the visual, UI-driven Strategy they built in Stradia and export it into standardized Infrastructure-as-Code (IaC) formats, bridging the gap between Stradia's UI and traditional DevOps version control.

**2\. Detailed System Behavior (The "Happy Path")**

1. Global Admin navigates to the Strategy Editor (Section 3.1) and views a Published Strategy.  
2. Admin clicks the "Export as Code" button in the header.  
3. A dropdown appears offering target syntax formats: "Terraform (HCL)" or "Standard JSON".  
4. Admin selects "Terraform".  
5. The backend compiles all *Type C (Executive)* tasks within that strategy. It maps the Verified Action JSON schemas (e.g., GTM Tag creation) into their corresponding Terraform resource blocks.  
6. The system generates a .tf text file.  
7. The file automatically downloads to the Admin's local machine.

**3\. Business Logic & Constraints (The Rules)**

* **Exclusion of Non-Deterministic Tasks:** Type A (Manual) and Type B (Generative Text/Code blocks) are strictly excluded from the IaC export. Only Type C tasks—which possess strictly typed JSON payloads targeting specific API endpoints—can be reliably converted into infrastructure code.  
* **Sanitization:** The export engine must automatically strip any local Market\_ID or user-specific metadata from the payload, exporting a "clean" global template.

**4\. Edge Cases & Error Handling**

* **Empty Export:** If an Admin attempts to export a Strategy that consists entirely of Type A and Type B tasks, the system disables the "Export as Code" button and displays a tooltip: "Export unavailable: This strategy contains no executive (Type C) infrastructure tasks."

**5\. Scope, Users & Value (The Product Hint)**

* **Target User:** Global Admins, DevOps Engineers, and Enterprise IT.  
* **Value:** Assures massive enterprise clients that they are not permanently locked into Stradia's proprietary database format. They own their configuration data and can integrate it into their CI/CD pipelines if they outgrow the UI.  
* **Out of Scope:** Two-way sync. You cannot import a .tf file to auto-generate a visual Stradia Strategy board in V1. It is strictly a one-way export.

---

