# **5\. Stradia: UX Design**

---

### 

#### **1\. The Global Design System (The "Lego Bricks")**

* **UI Core Library:** Shadcn/UI (leveraging Radix UI primitives for uncompromised accessibility, keyboard navigation, and screen reader support).  
* **CSS Framework:** Tailwind CSS (utilizing strict theme tokens, completely avoiding arbitrary/artisanal values).  
* **Typography:** We will use **Inter** (or a similar Neo-Grotesque like Helvetica Neue) to capture that Swiss design ethos. We will rely heavily on typographic scale and font-weight for hierarchy rather than relying on color.  
* **Color Tokens (Light Mode Minimalist):**  
  * **Backgrounds:** bg-white for primary application areas and cards; bg-slate-50 or bg-zinc-50 for the app canvas/sidebar to create subtle depth.  
  * **Text:** text-slate-900 (near black) for primary headings; text-slate-500 for secondary metadata.  
  * **Primary Action:** A stark bg-slate-900 (Black) for primary buttons to maintain the high-contrast minimalist aesthetic.  
  * **Semantic/Feedback:** Muted but distinct semantic tokens (destructive for red/errors, success for green/passed pre-flight scans, warning for blocked tasks).  
* **Iconography:** Lucide React (clean, consistent 2px stroke weight to match the typography).  
* **Data Density:** We will utilize Shadcn's Data Table (TanStack Table) for dense lists and Resizable Panels for code/split-view execution screens.

#### **2\. The Scope (Screen & Flow Inventory)**

Based on the Product Requirements Document, Functional Spec, and Domain Model provided, I have mapped out the distinct UI contexts required for Stradia:

**Module 1: Public & Authentication**

1. **Public Landing & Lead Capture Flow:** The unauthenticated marketing page and the "Request Demo" lead capture modal (with strict corporate email validation).  
2. **Authentication Flow:** Login screen and JWT session handling.

**Module 2: Global Administration (The "Guardian" View)**

3\. **Global Dashboard (Compliance Heatmap):** The data-dense, cross-tenant dashboard displaying real-time deployment status and mathematically accurate compliance metrics across all markets.

4\. **Master Strategy Builder:** The authoring interface where Global Admins create standardized deployment templates, define JSON schemas, and set natural language governance policies.

5\. **IAM & Tenant Management:** The settings interface for user provisioning, RBAC assignment, and Market limit management.

**Module 3: Local Execution (The "Airgap" Loop)**

6\. **Local Execution Board (Kanban):** The localized, multi-tenant workspace where Local Users see assigned strategies and move tasks through their lifecycles (TODO \-\> IN\_PROGRESS \-\> DONE).

7\. **Task Execution & Validation Panel:** The complex slide-out sheet (or split screen) where a user executes a specific task. This includes the Gemini AI prompt interface, the JSON payload preview (Monaco editor), the Pre-Flight Scan status, and the external API execution trigger.

---

### **1\. Public Landing & Lead Capture Flow Specification**

We will now detail the unauthenticated front door of Stradia: the **Public Landing & Lead Capture Flow**. Because self-serve onboarding is disabled for V1 (requiring high-touch enterprise sales), this interface is optimized entirely for communicating the "State Guardian" value proposition and capturing qualified leads.

#### **1\. The Mental Model**

This acts as a high-trust, low-friction "Enterprise Concierge." The visual language should lean heavily into the "Swiss International" Light Mode we defined—stark white backgrounds, sharp typography, and high-contrast black buttons. It must feel less like a self-serve startup tool and more like an established, secure enterprise infrastructure platform.

#### **2\. The User Journey (Step-by-Step)**

1. **The Hook:** The user lands on the marketing page, viewing the primary value proposition (e.g., "Deterministic AI Governance for Global Deployments").  
2. **The Call to Action:** The user clicks the primary "Request Demo" button.  
3. **The Focus Trap:** A modal (Dialog) opens. The background slightly dims, trapping keyboard focus within the form for accessibility.  
4. **Data Entry & Validation:** The user fills out their details. If they enter a free email address (e.g., @gmail.com), the form instantly rejects it on onBlur or onSubmit, enforcing the B2B requirement.  
5. **Submission:** The user submits the form. A loading state prevents double-submission.  
6. **Confirmation:** The modal content swaps to a success state, confirming the sales team will be in touch, and offering a button to close the modal.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+-----------------------------------------------------------------------------------+  
|  \[Logo\] Stradia                                                    \[ Login \-\> \]   |  
|-----------------------------------------------------------------------------------|  
|                                                                                   |  
|                                                                                   |  
|                   Deterministic Analytics Governance.                             |  
|                   Secure, deploy, and audit global tracking                       |  
|                   with AI-enforced guardrails.                                    |  
|                                                                                   |  
|                           \[ Request Demo \]                                        |  
|                                                                                   |  
| \+ \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \+ |  
| |  Dialog: Request Enterprise Demo                                        \[X\]   | |  
| |  \---------------------------------------------------------------------------  | |  
| |  First Name                     Last Name                                     | |  
| |  \[                        \]     \[                        \]                    | |  
| |                                                                               | |  
| |  Work Email (Required)                                                        | |  
| |  \[ user@company.com                                       \]                   | |  
| |  \! Please use a corporate email address.                                      | |  
| |                                                                               | |  
| |  Company Name                                                                 | |  
| |  \[                        \]                                                   | |  
| |                                                                               | |  
| |  \[ Submit Request \]                                                           | |  
| \+ \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \- \+ |  
\+-----------------------------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

PageLayout (bg-white, min-h-screen)  
  \> SiteHeader (py-6, px-8, container, mx-auto)  
    \> FlexContainer (justify-between, items-center)  
      \> BrandLogo (size="lg")  
      \> Button (variant="ghost", asChild) \<- Mapped to \-\> Action: Route to app.stradia.io/login  
        \> Link (href="/login") \<- "Login"

  \> MainContent (container, mx-auto, px-8, py-24, text-center)  
    \> Typography (variant="h1", text-slate-900, max-w-4xl, mx-auto) \<- "Deterministic Analytics Governance."  
    \> Typography (variant="lead", text-slate-500, mt-6, max-w-2xl, mx-auto) \<- "Secure, deploy, and audit global tracking..."  
      
    \> Dialog (Lead Capture Modal)  
      \> DialogTrigger \> Button (variant="default", size="lg", mt-10) \<- "Request Demo"  
      \> DialogContent (sm:max-w-\[500px\])  
        \> DialogHeader  
          \> DialogTitle \<- "Request Enterprise Demo"  
          \> DialogDescription \<- "Provide your details and our implementation team will reach out."  
          
        \# State: Form Input  
        \> RenderIf (LeadStatus \=== 'IDLE' || LeadStatus \=== 'ERROR')  
          \> Form (onSubmit=handleSubmit)  
            \> Grid (grid-cols-2, gap-4)  
              \> FormItem  
                \> FormLabel \<- "First Name"  
                \> Input \<- Mapped to \-\> LeadDTO.first\_name  
              \> FormItem  
                \> FormLabel \<- "Last Name"  
                \> Input \<- Mapped to \-\> LeadDTO.last\_name  
            \> FormItem (mt-4)  
              \> FormLabel \<- "Work Email"  
              \> Input (type="email") \<- Mapped to \-\> LeadDTO.work\_email  
              \> FormMessage (text-destructive) \<- Mapped to \-\> Validation Error (if free email)  
            \> FormItem (mt-4)  
              \> FormLabel \<- "Company Name"  
              \> Input \<- Mapped to \-\> LeadDTO.company\_name  
            \> FormItem (mt-4)  
              \> FormLabel \<- "Message (Optional)"  
              \> Textarea (rows=3) \<- Mapped to \-\> LeadDTO.message  
            \> DialogFooter (mt-6)  
              \> Button (type="submit", w-full, disabled=isSubmitting) \<- "Submit Request"  
          
        \# State: Success  
        \> RenderIf (LeadStatus \=== 'SUCCESS')  
          \> FlexContainer (flex-col, items-center, text-center, py-8)  
            \> Icon (name="CheckCircle", size="xl", text-success, mb-4)  
            \> Typography (variant="h3") \<- "Request Received"  
            \> Typography (text-slate-500, mt-2) \<- "We will be in touch shortly."  
            \> Button (variant="outline", mt-6, onClick=closeDialog) \<- "Close"

*Data Contract Binding Note:* Since this is an unauthenticated public route, the LeadDTO acts as a data transfer object for the external CRM or internal lead database endpoint, distinct from the core User schema.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **FSM \- Form Validation (The "Corporate Email" Gate):**  
  * State: IDLE \-\> Event: SUBMIT\_FORM \-\> State: VALIDATING.  
  * Condition 1: Are all required fields (first\_name, last\_name, work\_email, company\_name) populated?  
  * Condition 2: Does work\_email match a regex excluding common free providers (e.g., \*@gmail.com, \*@yahoo.com)?  
  * If Condition 2 is FALSE: \-\> State: FORM\_ERROR \-\> Highlights the Email input border in destructive red and renders the err\_free\_email microcopy in the FormMessage component.  
  * If TRUE: \-\> State: SUBMITTING.  
* **FSM \- Submission & Rate Limiting:**  
  * State: SUBMITTING \-\> Button text changes to "Submitting...", interactions are disabled.  
  * Event: API\_RESPONSE\_429 (Too Many Requests) \-\> State: ERROR \-\> Show Toast with err\_rate\_limit.  
  * Event: API\_RESPONSE\_200 \-\> State: SUCCESS \-\> Unmount form, mount Success view.

#### **5\. Microcopy Specifications**

| Component ID | Element | Actual Text Content |
| :---- | :---- | :---- |
| btn\_login\_nav | Navigation Link | Login |
| hero\_h1 | Heading 1 | Deterministic Analytics Governance. |
| hero\_sub | Subtitle | Secure, deploy, and audit global tracking with AI-enforced guardrails. |
| btn\_request\_demo | Button Label | Request Demo |
| modal\_title | Dialog Title | Request Enterprise Demo |
| modal\_desc | Dialog Desc | Provide your details and our implementation team will reach out to schedule a platform walkthrough. |
| btn\_submit\_lead | Button Label | Submit Request |
| btn\_submitting | Button Label | Submitting... |
| err\_free\_email | Inline Error | Please provide a valid corporate email address (free providers are not accepted). |
| err\_rate\_limit | Toast Error | You have submitted too many requests. Please try again later. |
| success\_title | Success Heading | Request Received |
| success\_desc | Success Desc | Thank you. A member of our enterprise sales team will contact you shortly. |

---

### **2\. Authentication Flow Specification**

We will now continue our scope with the **Authentication Flow**. Because Stradia is a high-touch enterprise product (where tenants are created via sales and users are provisioned via the IAM Settings we designed in step 5), this flow is strictly for **Login and Session Recovery**. There is no self-serve "Sign Up" route.

#### **1\. The Mental Model**

The login screen is the secure gateway to the "State Guardian." It must feel institutional, highly secure, and distraction-free. The visual hierarchy focuses entirely on the credential input. We will use a classic, horizontally centered, vertical-stack card layout against a subtle gray canvas to maintain the clean, "Swiss International" aesthetic.

#### **2\. The User Journey (Step-by-Step)**

1. **Access:** The user navigates to app.stradia.io/login (or is redirected here from an unauthenticated route or expired session).  
2. **Credential Input:** The user enters their provisioned corporate Email and Password.  
3. **Authentication:** The user clicks "Sign In." A loading state engages to prevent double-submission while the system verifies credentials and mints the JWT.  
4. **Role-Based Routing (The Divergence):** \* If the JWT decodes to GLOBAL\_ADMIN or SUPERVISOR, they are redirected to the **Global Dashboard (Heatmap)**.  
   * If the JWT decodes to LOCAL\_USER, the system checks their market\_id and redirects them to their specific **Local Execution Board**.  
5. **Session Recovery (Edge Case):** If the user forgot their password, they click the recovery link, transitioning to a localized "Send Reset Link" sub-flow.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+-----------------------------------------------------------------------------------+  
|                                                                                   |  
|                                                                                   |  
|                                 \[Logo\] Stradia                                    |  
|                                                                                   |  
|                   \+---------------------------------------+                       |  
|                   |  Sign in to your account              |                       |  
|                   |  \-----------------------------------  |                       |  
|                   |                                       |                       |  
|                   |  Work Email                           |                       |  
|                   |  \[ user@acmecorp.com                \] |                       |  
|                   |                                       |                       |  
|                   |  Password                             |                       |  
|                   |  \[ ••••••••••••••••••               \] |                       |  
|                   |                                       |                       |  
|                   |  \[ Sign In \]                          |                       |  
|                   |                                       |                       |  
|                   |  Forgot your password?                |                       |  
|                   \+---------------------------------------+                       |  
|                                                                                   |  
|                 Stradia Enterprise Security. Powered by AI.                       |  
\+-----------------------------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

PageLayout (bg-slate-50, min-h-screen, flex flex-col, justify-center, items-center)  
  \> MainContent (w-full, max-w-\[400px\], flex flex-col, gap-6, px-4)  
      
    \# Brand Header  
    \> FlexContainer (flex-col, items-center, gap-2)  
      \> BrandLogo (size="xl")  
      
    \# Login Card  
    \> Card (shadow-sm, border)  
      \> CardHeader (space-y-1, text-center)  
        \> CardTitle (text-2xl, tracking-tight) \<- "Sign in to your account"  
        \> CardDescription \<- "Enter your corporate credentials to access your secure workspace."  
        
      \> CardContent  
        \# Error Alert (Conditional)  
        \> RenderIf (AuthStatus \=== 'ERROR\_CREDENTIALS')  
          \> Alert (variant="destructive", mb-4)  
            \> Icon (name="AlertCircle", size="sm")  
            \> AlertTitle \<- "Authentication Failed"  
            \> AlertDescription \<- "Invalid email or password. Please try again."  
          
        \> Form (onSubmit=handleLogin)  
          \> FlexContainer (flex-col, gap-4)  
            \> FormItem  
              \> FormLabel \<- "Work Email"  
              \> FormControl  
                \> Input (  
                    type="email",   
                    placeholder="name@company.com",  
                    autoComplete="email",  
                    disabled= (AuthStatus \=== 'LOADING')  
                  ) \<- Mapped to \-\> AuthDTO.email  
              
            \> FormItem  
              \> FlexContainer (justify-between, items-center)  
                \> FormLabel \<- "Password"  
                \> Button (  
                    variant="link",   
                    size="sm",   
                    className="px-0 font-normal",  
                    onClick=routeToPasswordRecovery  
                  ) \<- "Forgot password?"  
              \> FormControl  
                \> Input (  
                    type="password",  
                    autoComplete="current-password",  
                    disabled= (AuthStatus \=== 'LOADING')  
                  ) \<- Mapped to \-\> AuthDTO.password  
              
            \> Button (  
                type="submit",   
                w-full,   
                mt-2,  
                disabled= (AuthStatus \=== 'LOADING')  
              )  
              \> RenderIf (AuthStatus \=== 'IDLE' || AuthStatus \=== 'ERROR\_CREDENTIALS') \<- "Sign In"  
              \> RenderIf (AuthStatus \=== 'LOADING')  
                \> Icon (name="Loader2", className="animate-spin mr-2")  
                \> Typography \<- "Authenticating..."  
      
    \# Footer Meta  
    \> FlexContainer (justify-center, mt-4)  
      \> Typography (text-sm, text-slate-500) \<- "Stradia Enterprise Security. Strict access enforced."

*Data Contract Binding Note:* The AuthDTO is sent to the backend. Upon a 200 OK response, the client will receive a JWT. The frontend state management (e.g., Zustand or React Context) must instantly decode this JWT to extract the UserRole and TenantID to execute the correct routing logic.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **FSM \- Primary Login:**  
  * State: IDLE \-\> Event: SUBMIT\_FORM \-\> State: VALIDATING\_LOCAL.  
  * Condition: Are both email and password populated?  
  * If FALSE: \-\> Stay IDLE, trigger native HTML5 form validation (tooltips).  
  * If TRUE: \-\> State: LOADING \-\> Inputs freeze, button shows spinner.  
  * Event: API\_RESPONSE\_401 \-\> State: ERROR\_CREDENTIALS \-\> Render Alert component, clear password input, reset button.  
  * Event: API\_RESPONSE\_403 (Inactive Account) \-\> State: ERROR\_INACTIVE \-\> Render Alert component ("Your account has been deactivated. Contact your Global Admin.").  
  * Event: API\_RESPONSE\_200 (Success) \-\> State: REDIRECTING \-\> Evaluate JWT role \-\> Push new route.  
* **FSM \- Session Expiry Re-entry:**  
  * If the user was redirected here due to an expired JWT (401 from a protected route), a Toast is automatically triggered on mount: "Your session has expired. Please sign in again."

#### **5\. Microcopy Specifications**

| Component ID | Element | Actual Text Content |
| :---- | :---- | :---- |
| card\_title\_login | Heading | Sign in to your account |
| card\_desc\_login | Description | Enter your corporate credentials to access your secure workspace. |
| label\_email | Form Label | Work Email |
| label\_password | Form Label | Password |
| placeholder\_email | Input Placeholder | name@company.com |
| btn\_forgot\_pwd | Text Link | Forgot password? |
| btn\_sign\_in | Button Label | Sign In |
| btn\_loading | Button Label | Authenticating... |
| alert\_auth\_failed | Alert Title | Authentication Failed |
| alert\_auth\_desc | Alert Desc | Invalid email or password. Please try again. |
| toast\_expired | Toast Message | Your session has expired. Please sign in again to continue. |

### **3\. Global Dashboard (Compliance Heatmap) Specification**

This is the **Global Dashboard (Compliance Heatmap)**, which is the primary landing screen for Global Admins and Supervisors.

#### **1\. The Mental Model**

This screen is the "Command Center" or "Radar." It must provide an immediate, mathematically accurate bird's-eye view of the entire enterprise's deployment status. It should feel data-dense but highly scannable, similar to a financial terminal or an enterprise security matrix. The core visual paradigm is a cross-referenced grid: Markets (Rows) vs. Strategies (Columns).

#### **2\. The User Journey (Step-by-Step)**

1. **Initial Assessment:** The Global Admin logs in and immediately views the top-level KPI cards (Global Compliance Score, Active Markets, Total Pending Tasks).  
2. **Scanning the Matrix:** The user scans the Heatmap Table. They look for red (FAILED) or yellow (PENDING) indicators across the grid, which represent Local Boards that are falling behind the Master Strategy.  
3. **Drill-Down:** The user clicks on a specific intersecting cell (e.g., "Spain" x "Data Layer 2026").  
4. **Contextual Inspection:** A side Sheet or Modal opens, displaying a read-only summary of that specific Local Board, showing exactly which tasks are blocking 100% compliance without forcing the user to leave the global view.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+-----------------------------------------------------------------------------------+  
|  \[Logo\] Stradia                         \[Tenant: Acme Corp\] \[User: Global Admin\]  |  
|-----------------------------------------------------------------------------------|  
|                                                                                   |  
|  \[ Global Score: 82% \]       \[ Active Markets: 14 \]      \[ Pending Tasks: 45 \]    |  
|  \+-------------------+       \+--------------------+      \+-------------------+    |  
|                                                                                   |  
|  \[ Filter: All Markets v \]   \[ Search Strategies... \]    \[ Export Report (CSV) \]  |  
|                                                                                   |  
|  | Market \\ Strategy | Data Layer 2026  | GA4 Migration    | Consent Mode V2   |  |  
|  |-------------------|------------------|------------------|-------------------|  |  
|  | Spain             | \[Badge: 100%\]    | \[Badge: 85%\]     | \[Badge: 10%\]      |  |  
|  | Germany           | \[Badge: 90%\]     | \[Badge: 100%\]    | \[Badge: 100%\]     |  |  
|  | France            | \[Badge: 40%\]     | \[Badge: 100%\]    | \[Badge: 0%\]       |  |  
|  | Japan             | \[Badge: 100%\]    | \[Badge: 100%\]    | \[Badge: 100%\]     |  |  
|                                                                                   |  
\+-----------------------------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

PageLayout (bg-slate-50, min-h-screen, flex flex-col)  
  \> TopNav (border-b, bg-white, h-16)  
    \> FlexContainer (justify-between, items-center, px-6)  
      \> BrandLogo  
      \> UserNavDropdown \<- Mapped to \-\> User.email, Tenant.name

  \> MainContent (flex-grow, p-8, max-w-\[1600px\], mx-auto, w-full, flex flex-col gap-6)  
      
    \# 1\. KPI Ribbon  
    \> Grid (grid-cols-3, gap-6)  
      \> Card  
        \> CardHeader (pb-2) \> CardTitle (text-sm, text-slate-500) \<- "Global Compliance Score"  
        \> CardContent \> Typography (text-3xl, font-bold) \<- Mapped to \-\> Aggregate(LocalBoard.heatmap\_score)  
      \> Card  
        \> CardHeader (pb-2) \> CardTitle (text-sm, text-slate-500) \<- "Active Markets"  
        \> CardContent \> Typography (text-3xl, font-bold) \<- Mapped to \-\> Count(Tenant.active\_markets)  
      \> Card  
        \> CardHeader (pb-2) \> CardTitle (text-sm, text-slate-500) \<- "Pending Executions"  
        \> CardContent \> Typography (text-3xl, font-bold) \<- Mapped to \-\> Count(TaskStatus.PENDING)

    \# 2\. Controls Toolbar  
    \> FlexContainer (justify-between, items-center, mt-4)  
      \> FlexContainer (gap-4)  
        \> Select \<- "Filter by Region"  
        \> Input (type="search", placeholder, Icon="Search") \<- "Search Markets or Strategies"  
      \> Button (variant="outline", Icon="Download") \<- "Export CSV"

    \# 3\. The Heatmap Matrix (Data Table)  
    \> Card (className="flex-grow overflow-hidden")  
      \> ScrollArea (w-full, h-full)  
        \> Table (className="w-full text-sm")  
          \> TableHeader (bg-slate-100, sticky, top-0)  
            \> TableRow  
              \> TableHead (w-\[200px\], font-semibold) \<- "Market"  
              \# Strategy Columns Iterator  
              \> TableHead (text-center, font-semibold) \<- Mapped to \-\> MasterStrategy.title  
            
          \> TableBody  
            \# Market Rows Iterator  
            \> TableRow (hover:bg-slate-50) \<- Mapped to \-\> Market.id  
              \> TableCell (font-medium) \<- Mapped to \-\> Market.name  
                
              \# Intersection Cells Iterator (Local Board Status)  
              \> TableCell (text-center) \<- Mapped to \-\> LocalBoard.id (Intersection of Market x Strategy)  
                \> Badge (  
                    variant= LocalBoard.heatmap\_score \=== 100 ? "success"   
                           : LocalBoard.heatmap\_score \> 50 ? "warning"   
                           : "destructive",  
                    className="cursor-pointer hover:opacity-80 transition-opacity"  
                    onClick=handleCellClick(LocalBoard.id)  
                  ) \<- Mapped to \-\> LocalBoard.heatmap\_score \+ "%"

*Data Contract Binding Note:* The Table component requires a complex pivoted DTO from the API. The API must return a matrix format where Rows \= Markets, Columns \= MasterStrategies, and Cells \= LocalBoard.heatmap\_score. If the API only returns flat lists of LocalBoards, the frontend will have to process this pivot, which is a performance risk for a large number of markets. We should flag this as a required API contract optimization for the backend team.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **State: INITIAL\_LOADING**  
  * The KPI numbers show Skeleton boxes (h-8 w-24).  
  * The Table body renders 5 dummy rows with Skeleton elements in the cells to indicate a loading grid.  
* **State: EMPTY\_STATE (No Strategies)**  
  * If MasterStrategies.length \=== 0.  
  * Hide the Table. Show an EmptyState component centered in the Card:  
  * Icon: FolderPlus  
  * Title: "No Master Strategies Defined"  
  * Description: "Create your first global strategy to begin tracking market compliance."  
  * Action: Primary Button \-\> "Create Strategy".  
* **State: CELL\_DRILL\_DOWN**  
  * *Event:* User clicks a Badge cell.  
  * *Action:* Opens a Sheet (right-side drawer) named LocalBoardSummarySheet.  
  * *Sheet Content:* Displays a read-only list of LocalTasks for that specific board, grouped by TaskStatus so the Global Admin can immediately see *why* the score is 85% instead of 100%.

#### **5\. Microcopy Specifications**

| Component ID | Element | Actual Text Content |
| :---- | :---- | :---- |
| kpi\_global\_score | Card Title | Global Compliance Score |
| kpi\_active\_markets | Card Title | Active Markets |
| kpi\_pending\_tasks | Card Title | Pending Executions |
| search\_input | Placeholder | Search strategies or markets... |
| btn\_export | Button Label | Export CSV |
| empty\_state\_title | Heading | No Master Strategies Defined |
| empty\_state\_desc | Paragraph | Create your first global strategy to begin tracking market compliance across your tenant. |
| btn\_create\_strategy | Button Label | Create Master Strategy |

---

### **4\. Master Strategy Builder Specification**

We will now detail the **Master Strategy Builder**. This is the authoring interface where the Global Admin defines the blueprints that ultimately populate the Local Execution Boards.

#### **1\. The Mental Model**

Think of this interface as a "Linear Blueprint Editor." It behaves similarly to an enterprise form builder or a CI/CD pipeline configurator. The user is stacking mandatory requirements (Global Tasks) sequentially. Because this defines the rules for the entire organization, the UI must feel deliberate and structured, guiding the admin to provide explicit instructions and strict AI guardrails.

#### **2\. The User Journey (Step-by-Step)**

1. **Strategy Initialization:** The Global Admin creates a new strategy, defining its Title, Description, and overarching Goal.  
2. **Task Stacking:** The admin clicks "Add Global Task" to append a new requirement to the blueprint.  
3. **Type Selection & Configuration:** For the new task, they select a TaskType (Manual, Generative, or Executive).  
4. **Guardrail Definition (Type C focus):** If they select C\_EXECUTIVE, the form dynamically expands to require a TargetPlatform (e.g., GTM), a Natural Language Prompt Template for the AI, and a JSON schema.  
5. **Publish & Export:** Once the blueprint is complete, the Admin can "Publish" it (deploying it to Local Boards) or use the "Export as Code" feature to download the Type C tasks as a Terraform .tf file.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+-----------------------------------------------------------------------------------+  
|  \< Back to Strategies        \[Badge: DRAFT\]                \[Export .tf\] \[Publish\] |  
|-----------------------------------------------------------------------------------|  
|  Strategy Name: \[ Data Layer 2026 Foundation                                    \] |  
|  Description:   \[ Global mandate for e-commerce tracking standard.              \] |  
|-----------------------------------------------------------------------------------|  
|                                                                                   |  
|  v Task 1: Initialize GA4 Configuration                         \[Type C\] \[Delete\] |  
|    \---------------------------------------------------------------------------    |  
|    | Task Title: \[ Initialize GA4 Configuration                              \] |  |  
|    | Type: \[ C\_EXECUTIVE v \]          Target: \[ GTM v \]                        |  |  
|    |                                                                           |  |  
|    | Instructions for Local Team:                                              |  |  
|    | \[ Ensure local market properties are correctly linked to the container. \] |  |  
|    |                                                                           |  |  
|    | AI Prompt Guardrails (Stradia AI):                                        |  |  
|    | \[ Generate a GA4 config tag. Ensure the measurement ID is dynamic.      \] |  |  
|    \---------------------------------------------------------------------------    |  
|                                                                                   |  
|  \> Task 2: Review Privacy Policy Mapping                        \[Type A\] \[Delete\] |  
|                                                                                   |  
|  \[ \+ Add Global Task \]                                                            |  
\+-----------------------------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

PageLayout (bg-slate-50, min-h-screen)  
  \> TopBar (border-b, bg-white, h-16, sticky, top-0, z-10)  
    \> FlexContainer (justify-between, items-center, px-6)  
      \> Button (variant="ghost", Icon="ArrowLeft") \<- "Back"  
      \> FlexContainer (gap-4, items-center)  
        \> Badge (variant="secondary") \<- Mapped to \-\> MasterStrategy.status  
        \# Export button only active if Strategy has Type C tasks  
        \> Button (variant="outline", Icon="Download") \<- "Export as Code (.tf)"  
        \> Button (variant="default") \<- "Publish Strategy"

  \> MainContent (max-w-\[800px\], mx-auto, py-8, flex flex-col gap-8)  
    \# Strategy Meta Section  
    \> Card  
      \> CardHeader  
        \> CardTitle \<- "Strategy Details"  
      \> CardContent (flex flex-col gap-4)  
        \> FormItem  
          \> FormLabel \<- "Strategy Title"  
          \> Input \<- Mapped to \-\> MasterStrategy.title  
        \> FormItem  
          \> FormLabel \<- "Description"  
          \> Textarea \<- Mapped to \-\> MasterStrategy.description

    \# Task Builder Section  
    \> Accordion (type="multiple", w-full)  
      \# Task Iterator  
      \> AccordionItem (value=GlobalTask.id) \<- Mapped to \-\> GlobalTask\[\]  
        \> AccordionTrigger (hover:bg-slate-100, px-4, rounded-t-md, border)  
          \> FlexContainer (justify-between, w-full, pr-4)  
            \> Typography (font-medium) \<- Mapped to \-\> GlobalTask.title  
            \> Badge (variant="outline") \<- Mapped to \-\> GlobalTask.task\_type  
          
        \> AccordionContent (p-6, border, border-t-0, rounded-b-md, bg-white)  
          \> FlexContainer (flex-col, gap-6)  
              
            \# Row 1: Title & Type  
            \> Grid (grid-cols-2, gap-4)  
              \> FormItem  
                \> FormLabel \<- "Task Title"  
                \> Input \<- Mapped to \-\> GlobalTask.title  
              \> FormItem  
                \> FormLabel \<- "Task Type"  
                \> Select \<- Mapped to \-\> GlobalTask.task\_type  
                  \> SelectTrigger \> SelectValue  
                  \> SelectContent  
                    \> SelectItem (value="A\_MANUAL") \<- "Manual Review"  
                    \> SelectItem (value="B\_GENERATIVE") \<- "Generative Content"  
                    \> SelectItem (value="C\_EXECUTIVE") \<- "API Execution (Stradia AI)"  
              
            \# Conditional Rendering: Only show if Type \== C\_EXECUTIVE  
            \> RenderIf (GlobalTask.task\_type \=== 'C\_EXECUTIVE')  
              \> Separator  
              \> FormItem  
                \> FormLabel \<- "Target Platform"  
                \> Select \<- Mapped to \-\> GlobalTask.target\_platform  
                  \> SelectTrigger \> SelectValue  
                  \> SelectContent  
                    \> SelectItem (value="GTM") \<- "Google Tag Manager"  
                    \> SelectItem (value="GA4") \<- "Google Analytics 4"  
              \> FormItem  
                \> FormLabel \<- "AI Prompt Guardrails"  
                \> FormDescription \<- "Natural language rules the AI must follow when validating local configurations."  
                \> Textarea (rows=4) \<- Mapped to \-\> GlobalTask.prompt\_template

            \# Universal Fields  
            \> FormItem  
              \> FormLabel \<- "Instructions for Local User"  
              \> Textarea (rows=3) \<- Mapped to \-\> GlobalTask.detailed\_instructions  
              
            \> FlexContainer (justify-end, mt-4)  
              \> Button (variant="destructive", size="sm", Icon="Trash") \<- "Delete Task"

    \# Add Task Trigger  
    \> Button (variant="outline", className="w-full border-dashed", Icon="Plus") \<- "Add Global Task"

*Data Contract Binding Note:* When the user selects "Export as Code (.tf)", the API will only process GlobalTask entities within this MasterStrategy where task\_type \=== 'C\_EXECUTIVE'. If the strategy contains no such tasks, the frontend must disable the export button to prevent an empty request, per the PRD constraints.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **FSM \- Form Validation (Publishing):**  
  * State: DRAFT \-\> Event: CLICK\_PUBLISH \-\> State: VALIDATING.  
  * Condition 1: Does MasterStrategy.title exist?  
  * Condition 2: Does it have at least one GlobalTask?  
  * Condition 3: For every Type C task, is target\_platform and prompt\_template defined?  
  * If FALSE: \-\> State: VALIDATION\_ERROR \-\> Action: Highlight missing fields in Red, show Toast.  
  * If TRUE: \-\> State: SAVING \-\> State: ACTIVE (Published). Once active, a strategy becomes strictly read-only to preserve the integrity of the audit trails on the local boards.  
* **FSM \- Type Switching:**  
  * Changing a task from Type C back to Type A will trigger a warning Dialog: "Changing this task type will clear your configured AI prompts and target platforms. Proceed?"  
* **Export State:**  
  * If Count(GlobalTasks where type \== 'C\_EXECUTIVE') \=== 0, the Export button is disabled. Hovering shows a Tooltip: "Export unavailable: This strategy contains no executive infrastructure tasks."

#### **5\. Microcopy Specifications**

| Component ID | Element | Actual Text Content |
| :---- | :---- | :---- |
| btn\_publish | Button Label | Publish Strategy |
| btn\_export | Button Label | Export as Code (.tf) |
| tooltip\_export\_disabled | Tooltip Text | Export unavailable: This strategy contains no executive (Type C) infrastructure tasks. |
| label\_ai\_guardrails | Form Label | AI Prompt Guardrails (Stradia AI) |
| desc\_ai\_guardrails | Help Text | Natural language rules the AI must follow when validating local configurations. |
| dialog\_warn\_type | Modal Text | Changing this task type will permanently delete your configured AI prompts and target integrations. Do you wish to proceed? |
| btn\_add\_task | Button Label | \+ Add Global Task |

---

### **5\. IAM & Tenant Management Specification**

Now we will design the **IAM (Identity and Access Management) & Tenant Management** interface. This is strictly accessible only to the GLOBAL\_ADMIN role and serves as the administrative control panel for the entire enterprise account.

#### **1\. The Mental Model**

This interface follows a classic "Enterprise Settings Hub" pattern. It should feel stable, secure, and highly organized. We will use a vertical left-hand navigation layout (Sidebar) paired with a wider right-hand content area. This clearly separates distinct administrative domains (e.g., Users, Markets, Billing Limits) and allows for future scalability as the platform's configuration needs grow.

#### **2\. The User Journey (Step-by-Step)**

1. **Overview & Limits Check:** The Admin navigates to the Settings area. They land on the "Tenant Profile & Limits" tab, checking their current Stripe-enforced limits (active\_markets\_limit and user\_seat\_limit).  
2. **User Provisioning:** The Admin switches to the "Users & Roles" tab to onboard a new regional manager.  
3. **Role Assignment:** They click "Invite User," which opens a Modal. They input the user's email and select the LOCAL\_USER role.  
4. **Market Context Binding:** Because the user is a LOCAL\_USER, the UI dynamically reveals a "Market Assignment" selector, ensuring the user is strictly sandboxed to their specific region (e.g., "Germany").  
5. **Execution:** The Admin submits the form. The system sends an invitation email and adds the user to the pending list.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+-----------------------------------------------------------------------------------+  
|  \[Logo\] Stradia                         \[Tenant: Acme Corp\] \[User: Global Admin\]  |  
|-----------------------------------------------------------------------------------|  
|                                                                                   |  
|  Settings                                                                         |  
|  \-------------------------------------------------------------------------------  |  
|  | \[ Users & Roles     \] |  Users & Roles                                      |  |  
|  |   Markets & Regions   |  \[ \+ Invite User \]                                  |  |  
|  |   Tenant Profile      |                                                     |  |  
|  |   API & Webhooks      |  Seat Usage: \[||||||||      \] 3 / 5 Seats           |  |  
|  |                       |                                                     |  |  
|  |                       |  | Email             | Role       | Market Access | |  |  
|  |                       |  |-------------------|------------|---------------| |  |  
|  |                       |  | admin@acme.com    | GLOBAL     | All Markets   | |  |  
|  |                       |  | hans@acme.de      | LOCAL      | Germany       | |  |  
|  |                       |  | luc@acme.fr       | LOCAL      | France        | |  |  
\+-----------------------------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

PageLayout (bg-slate-50, min-h-screen)  
  \> TopNav (border-b, bg-white, h-16)  
    \> FlexContainer (justify-between, items-center, px-6)  
      \> BrandLogo  
      \> UserNavDropdown

  \> MainContent (max-w-\[1200px\], mx-auto, py-8)  
    \> FlexContainer (items-center, mb-6)  
      \> Typography (variant="h2") \<- "Organization Settings"  
      
    \> Grid (grid-cols-12, gap-8, items-start)  
        
      \# Left Sidebar Navigation  
      \> GridItem (col-span-3)  
        \> Nav (flex flex-col gap-1)  
          \> Button (variant="secondary", justify="start") \<- "Users & Roles"  
          \> Button (variant="ghost", justify="start") \<- "Markets & Regions"  
          \> Button (variant="ghost", justify="start") \<- "Tenant Profile"  
        
      \# Right Content Area (Assuming "Users & Roles" is active)  
      \> GridItem (col-span-9, flex flex-col gap-6)  
          
        \# Seat Usage Indicator  
        \> Card  
          \> CardHeader (pb-2)  
            \> FlexContainer (justify-between, items-end)  
              \> CardTitle (text-sm, text-slate-500) \<- "User Seat Limit"  
              \> Typography (text-sm) \<- Mapped to \-\> Count(User) \+ " / " \+ Tenant.user\_seat\_limit  
          \> CardContent  
            \> Progress (value \<- Mapped to \-\> (Count(User) / Tenant.user\_seat\_limit) \* 100\)  
          
        \# Users Data Table  
        \> Card  
          \> CardHeader  
            \> FlexContainer (justify-between, items-center)  
              \> CardTitle \<- "Active Users"  
              \> Dialog (Invite User Modal)  
                \> DialogTrigger \> Button (Icon="UserPlus") \<- "Invite User"  
                \> DialogContent  
                  \> DialogHeader  
                    \> DialogTitle \<- "Invite New User"  
                  \> Form  
                    \> FormItem  
                      \> FormLabel \<- "Email Address"  
                      \> Input (type="email") \<- Mapped to \-\> User.email  
                    \> FormItem  
                      \> FormLabel \<- "Role"  
                      \> Select \<- Mapped to \-\> User.role  
                        \> SelectItem (value="GLOBAL\_ADMIN") \<- "Global Admin"  
                        \> SelectItem (value="SUPERVISOR") \<- "Supervisor (Read-Only Global)"  
                        \> SelectItem (value="LOCAL\_USER") \<- "Local User (Execution)"  
                      
                    \# Conditional Rendering: Only show if Role \== LOCAL\_USER  
                    \> RenderIf (SelectedRole \=== 'LOCAL\_USER')  
                      \> FormItem  
                        \> FormLabel \<- "Market Assignment"  
                        \> Select \<- Mapped to \-\> Market.id  
                          \# Market Iterator  
                          \> SelectItem \<- Mapped to \-\> Market.name  
                      
                    \> DialogFooter  
                      \> Button (variant="outline") \<- "Cancel"  
                      \> Button (type="submit") \<- "Send Invitation"

          \> CardContent (p-0)  
            \> Table  
              \> TableHeader  
                \> TableRow  
                  \> TableHead \<- "User"  
                  \> TableHead \<- "Role"  
                  \> TableHead \<- "Market Access"  
                  \> TableHead (text-right) \<- "Actions"  
              \> TableBody  
                \# User Iterator  
                \> TableRow \<- Mapped to \-\> User.id  
                  \> TableCell \> Typography (font-medium) \<- Mapped to \-\> User.email  
                  \> TableCell \> Badge (variant="outline") \<- Mapped to \-\> User.role  
                  \> TableCell   
                    \> RenderIf (User.role \=== 'GLOBAL\_ADMIN') \<- "All Markets"  
                    \> RenderIf (User.role \=== 'LOCAL\_USER') \<- Mapped to \-\> Market.name  
                  \> TableCell (text-right)  
                    \> Button (variant="ghost", size="icon", Icon="MoreVertical") \<- "Context Menu"

#### **4\. Interactive States & Logic (Finite State Machine)**

* **FSM \- Invite User (Seat Limit Check):**  
  * State: IDLE \-\> Event: CLICK\_INVITE\_USER.  
  * Condition: Check if Count(Active\_Users) \< Tenant.user\_seat\_limit.  
  * If FALSE: \-\> State: BLOCKED \-\> The "Invite User" button is disabled. Hovering triggers a Tooltip: "Seat limit reached. Upgrade your plan to invite more users."  
  * If TRUE: \-\> State: MODAL\_OPEN.  
* **FSM \- Form Submission:**  
  * State: MODAL\_OPEN \-\> Event: SUBMIT\_FORM \-\> State: SAVING.  
  * Button changes to "Sending...".  
  * If Success: \-\> State: SUCCESS \-\> Close Modal, trigger Toast ("Invitation sent successfully"), and optimistically append the user to the Table with a "Pending" badge.  
  * If Error (Duplicate Email): \-\> State: FORM\_ERROR \-\> Display inline red text below the email input ("This email is already associated with an account").

#### **5\. Microcopy Specifications**

| Component ID | Element | Actual Text Content |
| :---- | :---- | :---- |
| nav\_users | Nav Link | Users & Roles |
| nav\_markets | Nav Link | Markets & Regions |
| card\_title\_seats | Card Title | User Seat Limit |
| btn\_invite | Button Label | Invite User |
| tooltip\_seat\_limit | Tooltip | Seat limit reached. Please contact support or upgrade your plan in the Billing tab. |
| role\_global | Select Option | Global Admin (Full Access) |
| role\_local | Select Option | Local User (Market-Restricted Execution) |
| toast\_invite\_success | Toast Message | Invitation sent. They will appear as 'Pending' until they accept. |
| err\_email\_duplicate | Inline Error | A user with this email already exists in the system. |

---

### **6\. Local Execution Board (Kanban) Specification**

This is where the global strategy is actualized by local teams.

#### **1\. The Mental Model**

This interface should be perceived as a strictly controlled, left-to-right digital pipeline. Unlike open-ended project management tools (like Trello), this is a "guided execution sandbox." The UI must visually communicate immutability—columns cannot be altered, and certain actions (like completing a Type C task) are mathematically gated by AI validations.

#### **2\. The User Journey (Step-by-Step)**

1. **Context Initialization:** The Local User lands on the board and immediately sees their assigned Market context and the current Local Heatmap Score.  
2. **Triage:** The user reviews the "To Do" column, identifying standard mandates, "Ghost Cards" (optional updates) , and locked dependencies.  
3. **Execution Activation:** The user clicks and drags a standard card from "To Do" to "Pending" (In Progress) , which acquires a Mutex Lock preventing simultaneous edits.  
4. **Completion/Blockage:** The user attempts to drag the card to "Done." If it's a Type C task without a successful execution log, the UI snaps it back and throws an error. If blocked by external factors, they drag it to "Blocked," triggering a mandatory justification modal.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+-----------------------------------------------------------------------------------+  
|  \[Market Name: Spain\] \- \[Strategy: Data Layer 2026\]           \[Score: 85%\] \[Lang\] |  
|-----------------------------------------------------------------------------------|  
|  \[+ Add Local Task\]                                                               |  
|                                                                                   |  
|  \[ To Do (3) \]         \[ Pending (1) \]        \[ Blocked (1) \]       \[ Done (12) \] |  
|  \+---------+           \+---------+            \+---------+           \+---------+   |  
|  | \[Type A\]|           | \[Type C\]|(Lock)      | \[Type B\]|           | \[Type A\]|   |  
|  | Task 1  |           | Task 3  |            | Task 4  |           | Task 0  |   |  
|  | (Avata) |           | (Avata) |            |         |           | (Avata) |   |  
|  \+---------+           \+---------+            \+---------+           \+---------+   |  
|                                                                                   |  
|  \+ \- \- \- \- \+                                                                      |  
|  | \[Ghost\] |                                                                      |  
|  | Task 2  |                                                                      |  
|  \+ \- \- \- \- \+                                                                      |  
\+-----------------------------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

PageLayout (bg-slate-50, min-h-screen, flex flex-col)  
  \> SiteHeader (border-b, bg-white, h-16)  
    \> FlexContainer (justify-between, items-center)  
      \> Breadcrumb  
        \> BreadcrumbItem \<- Mapped to \-\> Market.name \[cite: 82\]  
        \> BreadcrumbSeparator  
        \> BreadcrumbItem \<- Mapped to \-\> MasterStrategy.title \[cite: 106\]  
      \> FlexContainer (gap-4, items-center)  
        \> Badge (variant="secondary") \<- Mapped to \-\> LocalBoard.heatmap\_score \[cite: 147\]  
        \> Button (variant="outline", size="sm") \<- Mapped to \-\> Action: "Add Local Task" \[cite: 1066\]  
    
  \> ScrollArea (flex-grow, overflow-x-auto)  
    \> DragDropContext (onDragEnd event handler)  
      \> Grid (grid-cols-4, gap-6, p-6, min-w-\[1024px\])  
          
        \# Column Iterator (TODO, IN\_PROGRESS, BLOCKED, DONE)   
        \> DroppableColumn \<- Mapped to \-\> TaskStatus enum \[cite: 36\]  
          \> FlexContainer (flex-col, gap-3)  
            \> ColumnHeader (text-slate-500, font-semibold, text-sm, uppercase) \<- Mapped to \-\> Column Name  
              
            \# Task Card Iterator  
            \> DraggableCard \<- Mapped to \-\> LocalTask.id \[cite: 156\]  
              \> Card (  
                  variant= LocalTask.is\_ghost\_card ? "outline-dashed" : "default",   
                  className= LocalTask.is\_custom\_local\_task ? "border-l-4 border-l-blue-500" : "", \[cite: 1071\]  
                  opacity= LocalTask.is\_ghost\_card ? "50" : "100"   
                )  
                \> CardHeader (p-4, pb-2)  
                  \> FlexContainer (justify-between)  
                    \> Badge (  
                        variant= GlobalTask.task\_type \== 'C\_EXECUTIVE' ? "default" : "secondary"  
                      ) \<- Mapped to \-\> GlobalTask.task\_type \[cite: 120\]  
                      
                    \# Concurrency Lock Indicator \[cite: 1223\]  
                    \> RenderIf (LocalTask.locked\_by \!= null)  
                      \> Tooltip  
                        \> TooltipTrigger \> Icon (name="Lock", size="sm", text-slate-400)  
                        \> TooltipContent \<- Mapped to \-\> LocalTask.locked\_by \[cite: 167\]  
                  
                \> CardContent (p-4, pt-0)  
                  \> CardTitle (text-base, font-medium, leading-tight) \<- Mapped to \-\> GlobalTask.title \[cite: 121\]  
                  \> RenderIf (LocalTask.is\_ghost\_card \== true)   
                    \> Badge (variant="warning", size="sm", mt-2) \<- "Ghost Card"

*Contract Gap Flag:* The API DTO will need to join LocalTask with GlobalTask to populate the CardTitle and TaskType on the board view without requiring a separate fetch per card.

#### **4\. Interactive States & Logic (Finite State Machine)**

* **FSM \- Drag and Drop (The "Happy Path"):**  
  * State: TODO \-\> Event: DRAG\_END (Target: PENDING) \-\> State: SAVING\_TO\_DB \-\> Event: SUCCESS \-\> State: PENDING (Emit ws: MOVE\_TASK).  
* **FSM \- Blocked Enforcement:**  
  * State: PENDING \-\> Event: DRAG\_END (Target: BLOCKED) \-\> State: MODAL\_OPEN (Require Reason) \-\> Event: SUBMIT\_REASON \-\> State: BLOCKED. (If modal dismissed \-\> Revert to PENDING).  
* **FSM \- The Type C Execution Gate:**  
  * Event: DRAG\_END (Target: DONE) on a TaskType.C\_EXECUTIVE card.  
  * Condition: Check LocalTask.pre\_flight\_scan\_status.  
  * \+1  
  * If PASSED && External\_API\_Log \== SUCCESS: \-\> State: DONE.  
  * If PENDING or FAILED: \-\> Event: SNAP\_BACK \-\> State: PREVIOUS\_STATE \-\> Action: Fire Toast (Error).  
* **Ghost Card Click:**  
  * Clicking a card where is\_ghost\_card \=== true intercepts the standard slide-out drawer and instead opens the GhostCardResolutionModal (Accept/Reject logic).

#### **5\. Microcopy Specifications**

| Component ID | Element | Actual Text Content |
| :---- | :---- | :---- |
| btn\_add\_local\_task | Button Label | \+ Add Local Task |
| col\_header\_todo | Column Title | TO DO |
| col\_header\_pending | Column Title | IN PROGRESS |
| col\_header\_blocked | Column Title | BLOCKED |
| col\_header\_done | Column Title | DONE |
| toast\_err\_type\_c\_gate | Error Message | Execution required. Type C tasks must be successfully run via Stradia AI before completion. |
| tooltip\_locked\_task | Tooltip | Locked: Task 1 must be moved to Done first. |
| badge\_ghost\_card | Badge Label | Optional Update |
| modal\_blocked\_title | Modal Title | Task Blocked |
| modal\_blocked\_desc | Modal Desc | Please provide a mandatory justification for blocking this task. |

---

### **7\. Task Execution & Validation Panel Specification**

Moving directly from the Kanban board, we will now detail the **Task Execution & Validation Panel**. This interface is triggered when a user clicks on a Task Card (specifically Type B or Type C tasks) from the board.

#### **1\. The Mental Model**

This interface acts as an "Airlock" or a "Measure Twice, Cut Once" workbench. Because this interface handles AI-generated code and direct API injections to live environments (like Google Tag Manager), the UI must feel highly controlled, sequential, and safe. It is a focused sandbox that prevents the user from accidentally deploying unverified configurations.

#### **2\. The User Journey (Step-by-Step)**

1. **Context Switch:** User clicks a Type C (Executive) task on the board. A wide Sheet (drawer) slides in from the right, locking focus while keeping the board visible in the background overlay.  
2. **Review Mandate:** The user reads the read-only Global Strategy instructions (authored by the Global Admin).  
3. **AI Generation (The Draft):** The user clicks "Generate Payload." The UI enters a loading state while Gemini processes the prompt.  
4. **Human-in-the-Loop Review:** The AI outputs a JSON payload. The user reviews this in a syntax-highlighted Monaco Code Editor. They can manually edit the JSON if the AI missed a local nuance.  
5. **The Pre-Flight Scan:** The user clicks "Run Pre-Flight Scan." The UI locks the editor. The AI validates the JSON against the Global Admin's natural language guardrails.  
6. **Execution (The Plunge):** If the scan passes (Green state), the "Deploy to Target" button unlocks. The user clicks it, pushing the config via API. The task is then automatically moved to the "Done" column on the Kanban board, and the Sheet closes.

#### **3\. Visual Layout & Component Mapping**

**A. ASCII Wireframe**

Plaintext

\+-----------------------------------------------------------------------------+  
| \[X\] Close                                                                   |  
|  \[Badge: Type C\] Task: Implement GA4 Purchase Event          \[Status: Open\] |  
|-----------------------------------------------------------------------------|  
|  \[Tab: Instructions\]  \[Tab: AI Payload & Execution\]                         |  
|-----------------------------------------------------------------------------|  
|                                     |                                       |  
|  AI Prompt Context:                 |  {                                    |  
|  "Ensure currency is set to EUR"    |    "tag\_name": "GA4 \- Purchase",      |  
|                                     |    "type": "ga4\_event",               |  
|  \[ Generate Payload \]               |    "parameters": {                    |  
|                                     |       "currency": "EUR"               |  
|-------------------------------------|    }                                  |  
|  Pre-Flight Scan:                   |  }                                    |  
|  \[ Status: PASSED \] (Green)         |                                       |  
|  Log: "Matches compliance policy"   |                                       |  
|                                     |                                       |  
|                                     |  \[ Deploy to Target (GTM) \]           |  
\+-----------------------------------------------------------------------------+

**B. The Component Tree (The "Blueprints")**

Plaintext

Sheet (open=true, onOpenChange event handler)  
  \> SheetContent (side="right", className="w-\[800px\] sm:w-\[1000px\] sm:max-w-full")  
    \> SheetHeader (mb-6)  
      \> FlexContainer (items-center, gap-3)  
        \> Badge \<- Mapped to \-\> GlobalTask.task\_type  
        \> SheetTitle \<- Mapped to \-\> GlobalTask.title  
      \> SheetDescription \<- Mapped to \-\> GlobalTask.description  
      
    \> Tabs (defaultValue="execution", className="h-full flex flex-col")  
      \> TabsList  
        \> TabsTrigger (value="instructions") \<- "Instructions"  
        \> TabsTrigger (value="execution") \<- "AI Payload & Execution"  
        
      \# Tab 1: Read-Only Instructions  
      \> TabsContent (value="instructions", className="flex-grow mt-4")  
        \> ScrollArea  
          \> Prose (Markdown renderer) \<- Mapped to \-\> GlobalTask.detailed\_instructions  
        
      \# Tab 2: The Workbench  
      \> TabsContent (value="execution", className="flex-grow mt-4 grid grid-cols-12 gap-6")  
          
        \# Left Column: Controls & Scans  
        \> GridItem (col-span-5, flex flex-col gap-6)  
          \> Card  
            \> CardHeader \> CardTitle (text-sm) \<- "AI Context"  
            \> CardContent  
              \> Textarea (readOnly, text-sm) \<- Mapped to \-\> GlobalTask.prompt\_template  
              \> Button (w-full, mt-4, onClick=handleGenerate) \<- "1. Generate Payload"  
            
          \> Card  
            \> CardHeader \> CardTitle (text-sm) \<- "Pre-Flight Validation"  
            \> CardContent  
              \> Alert (variant= PreFlightStatus \=== 'PASSED' ? "success" : PreFlightStatus \=== 'FAILED' ? "destructive" : "default")  
                \> AlertTitle \<- Mapped to \-\> LocalTask.pre\_flight\_scan\_status  
                \> AlertDescription \<- Mapped to \-\> LocalTask.pre\_flight\_log  
              \> Button (w-full, mt-4, disabled= \!LocalTask.execution\_payload) \<- "2. Run Pre-Flight Scan"  
          
        \# Right Column: The Code & Final Execution  
        \> GridItem (col-span-7, flex flex-col gap-4)  
          \> Card (className="flex-grow flex flex-col overflow-hidden")  
            \> CardHeader (py-2 bg-slate-100 border-b)  
              \> FlexContainer (justify-between, items-center)  
                \> Label (text-xs, font-mono) \<- "payload.json"  
                \> Badge (variant="outline", size="sm") \<- Mapped to \-\> GlobalTask.target\_platform  
            \> CardContent (p-0 flex-grow)  
              \# The Monaco Editor Integration  
              \> CodeEditor (  
                  language="json",  
                  theme="vs-light",  
                  value \<- Mapped to \-\> LocalTask.execution\_payload,  
                  onChange=handlePayloadEdit,  
                  readOnly= (LocalTask.pre\_flight\_scan\_status \=== 'PASSED')  
                )  
            
          \> FlexContainer (justify-end, mt-2)  
            \> Button (  
                size="lg",   
                disabled= (LocalTask.pre\_flight\_scan\_status \!== 'PASSED')  
              ) \<- "3. Deploy to Target"

*Contract Binding Note:* The CodeEditor's readOnly state is strictly bound to the pre\_flight\_scan\_status. If the scan has passed, the user cannot edit the JSON without invalidating the scan (which would reset the status to PENDING).

#### **4\. Interactive States & Logic (Finite State Machine)**

This screen features the most complex FSM in the application:

* **State 1: IDLE (No Payload)**  
  * Editor is empty. "Run Pre-Flight" and "Deploy" buttons are disabled.  
* **State 2: GENERATING\_PAYLOAD**  
  * User clicks "Generate".  
  * UI shows Skeleton loader over the Code Editor. "Generate" button shows a Spinner and changes text to "Querying AI...".  
* **State 3: REVIEW\_EDIT**  
  * Generation complete. JSON populates the editor.  
  * "Run Pre-Flight Scan" unlocks.  
  * *Event:* User edits the JSON manually \-\> pre\_flight\_scan\_status is forced to PENDING (if it wasn't already).  
* **State 4: SCANNING**  
  * User clicks "Run Pre-Flight Scan".  
  * Alert box shows a loading spinner. Editor locks (readOnly=true) to prevent race conditions during the scan.  
* **State 5: SCAN\_FAILED**  
  * Alert turns red (destructive). Shows the AI reasoning (e.g., "Missing mandatory currency field").  
  * "Deploy" remains locked. Editor unlocks for user correction.  
* **State 6: SCAN\_PASSED**  
  * Alert turns green (success).  
  * "Deploy" button unlocks and pulses to draw attention.  
* **State 7: DEPLOYING**  
  * User clicks "Deploy".  
  * System locks all inputs. Button shows "Deploying to Target...".  
  * *If Success:* Sheet automatically closes, toast appears, card moves to "Done" on board.  
  * *If Network Error:* Toast appears, button reverts to "Deploy".

#### **5\. Microcopy Specifications**

| Component ID | Element | Actual Text Content |
| :---- | :---- | :---- |
| tab\_instructions | Tab Label | Instructions |
| tab\_execution | Tab Label | AI Payload & Execution |
| btn\_generate | Button Label | 1\. Generate Payload |
| btn\_generate\_loading | Button Label | Querying Gemini AI... |
| btn\_scan | Button Label | 2\. Run Pre-Flight Scan |
| btn\_scan\_loading | Button Label | Validating constraints... |
| btn\_deploy | Button Label | 3\. Deploy to Target |
| alert\_scan\_pending | Alert Title | Awaiting Scan |
| alert\_scan\_passed | Alert Title | Scan Passed: Ready for Deployment |
| alert\_scan\_failed | Alert Title | Policy Violation Detected |
| toast\_deploy\_success | Toast Notification | Successfully deployed to target API. Task marked as Done. |

