# REPAY: Detailed UI/UX Execution & Workflow Documentation

## 1. Introduction
This document serves as the absolute point of truth for AI agents (like Antigravity) and front-end engineers to understand the **Key Entities** in the REPAY ecosystem, **Where to Place Them** in the UI, and the exact **API/UX Execution workflows** required to build the frontend.

---

## 2. Global State & App Navigation

### A. Authentication & Session Management
- **Key Entity**: The authenticated user's Wallet Address, JWT Token, and Blockchain Role.
- **UI/UX Execution**:
  1. User lands on the App. Unauthenticated state shows a "Connect Wallet" button universally placed in the Top-Right corner.
  2. Click triggers Wallet Provider (MetaMask/WalletConnect).
  3. User signs the message: `Login to Repay Network with address: <address>`.
  4. **API Call**: `POST /auth/login` payload: `{ address, signature }`.
  5. **Response**: `{ token: "...", role: "...", expiresAt: "..." }`.
  6. **Role Mapping**: The system automatically assigns one of the following primary roles:
     - `ADMIN`: Full system control.
     - `GOVERNMENT`: Oversees auctions and company verification.
     - `TRANSIT_AUTHORITY`: Manages routes and validates tickets.
     - `AI_ORACLE`: Backend service for Smart Bin classification.
     - `MINTER`: Authorized to issue EcoTokens.
     - `RECYCLER`: B2B buyer of materials.
     - `COMPANY`: Eco-Manufacturer registering products.
     - `BIN`: Physical IoT device.
     - `USER`: Regular citizen.
  7. **State Action**: Store JWT and `UserRole` in secure browser storage. Initialize app context.

### B. Navigation Architecture
The frontend should utilize Role-Based Routing.

*   **Citizen Routes**: `/home`, `/transit`, `/marketplace`, `/history`
*   **Company Routes**: `/company/dashboard`, `/company/products`
*   **Recycler Routes**: `/auctions/live`, `/auctions/won`
*   **Government Routes**: `/admin/verification`, `/admin/bins`, `/admin/auctions`

---

## 3. UI/UX Executions by Persona

### Persona 1: The Citizen (End User)

#### Screen 1: User Home & Dashboard
*   **Purpose**: The central hub showing wealth and environmental impact.
*   **Entity Placement**:
    *   **ECO Token Balance**: Massive, stylized text placed Top-Center. Give it a dynamic counting animation on page load. Use a "Glassmorphism" card to give a premium web3 feel.
    *   **Recycling History**: Placed directly below the balance as a chronologically ordered Vertical Timeline.
*   **UX Execution Workflow**:
    1. **On Mount**: Show Skeleton Loader for the balance card.
    2. **API Call**: `GET /tokens/eco/balance/:address` -> Animate the result into the UI.
    3. **API Call**: `GET /rewards/history/:userAddress`.
    4. **Render**: Map through history. Use green icons (`#10B981`) for completed drops based on the `classification` data returned from the API.

#### Screen 2: Transit & Mobility Tab
*   **Purpose**: Spending ECO tokens on public transit tickets.
*   **Entity Placement**:
    *   **Active Tickets**: A horizontal slider (swipeable on mobile) at the top of the screen. Each ticket is rendered like a holographic NFT card (use CSS gradients).
    *   **Purchase Menu**: Form placed below the slider to select routes and travel dates.
*   **UX Execution Workflow**:
    1. **Load Active**: `GET /tickets/user/:address`.
    2. If array is empty, show a beautifully illustrated empty state ("No upcoming trips").
    3. **Purchase Flow**: User selects route -> UI calculates cost -> User clicks "Buy Ticket".
    4. **API Call**: `POST /tickets/purchase`.
    5. **UX Feedback**: Show an overlay modal with a Spinner. Once the backend confirms the blockchain transaction (Return `201 Created`), dismiss modal, show a Confetti animation, and automatically re-fetch active tickets.

#### Screen 3: Marketplace Tab
*   **Purpose**: P2P Exchange for ETH and Government Service Vouchers.
*   **Entity Placement**:
    *   **Dual Tabs**: Provide a Segmented Control at the top: `[ P2P Trading ] | [ Gov Services ]`.
*   **UX Execution Workflow (Gov Services Section)**:
    1. **Load**: `GET /marketplace/services`. Render as a Grid of Digital Coupons.
    2. User clicks a service (e.g., "Monthly Bus Pass").
    3. **API Call**: `POST /marketplace/services/redeem`.
    4. Redirect to User Vouchers view (`GET /marketplace/vouchers/:address`).

---

### Persona 2: The Eco-Manufacturer (Company Portal)

#### Screen 1: Company Registration & Onboarding
*   **Entity Placement**: Centered, multi-step onboarding wizard.
*   **UX Execution Workflow**:
    1. Unregistered wallet connects. Router attempts to fetch `GET /registry/companies/:address`.
    2. Backend returns `404 Not Found`. Router redirects to `/company/onboarding`.
    3. User fills out Company Name.
    4. **API Call**: `POST /registry/companies`.
    5. **State**: Show a persistent "Pending Government Verification" banner across the top of their UI until the admin approves them. Disable "Add Product" buttons.

#### Screen 2: Product Management Dashboard
*   **Entity Placement**:
    *   **Product List**: Desktop-optimized Data Table (Columns: ID, Name, Category, Recycled Status).
    *   **Floating Action Button (FAB)**: Bottom right for "Register New Product".
*   **UX Execution Workflow**:
    1. Click FAB -> Opens Slide-over panel.
    2. User inputs details and uploads product image. Frontend generates metadata and uploads to IPFS.
    3. **API Call**: `POST /registry/products` passing `metadataURI`.
    4. Add optimistic UI update to the table while transaction mines.

---

### Persona 3: The Recycler (B2B Material Buyer)

#### Screen 1: B2B Auction House
*   **Purpose**: Buy large quantities of recycled materials from the Smart Bins.
*   **Entity Placement**:
    *   **Live Auctions**: Grid layout of cards. Crucial UI element: A live, ticking `<CountdownTimer />` on every card based on the `durationSeconds`.
*   **UX Execution Workflow**:
    1. **Validation**: Check if wallet is verified (`GET /auctions/recyclers/:address`). If false, show a "Access Denied: Unverified Recycler" strict error boundary.
    2. **Load Data**: `GET /auctions?status=OPEN`.
    3. **Bidding Flow**: Click Auction Card -> Open Modal -> Show `minBidETH` -> User inputs higher `amountETH` -> Click "Place Bid".
    4. **API Call**: `POST /auctions/:id/bids`. Prompt wallet to sign the ETH transfer.
    5. **UX Feedback**: Highlight the user's row in green if they are the current highest bidder.

---

### Persona 4: The Government (System Admin Console)

#### Screen 1: Verification & Oversight Center
*   **Entity Placement**:
    *   A high-density side-pane layout. Left side: Navigation (Verify Companies, Verify Recyclers, Hardware Bins). Right side: Content tables.
*   **UX Execution Workflow**:
    1. Load pending companies.
    2. Admin checks real-world documentation (off-chain), then clicks "Verify" in UI.
    3. **API Call**: `PATCH /registry/companies/:address/verify`. Wallet signature required to establish Admin authority.

#### Screen 2: Smart Bin Deployment & Smart Contracts
*   **UX Execution Workflow**:
    1. Government installs a new physical bin.
    2. Admin goes to "Add Bin" module. Enters the bin's static wallet address and GPS location.
    3. **API Call**: `POST /bins`.
    4. Now the Bin's IoT hardware can authenticate via the API and successfully call `POST /bins/:address/drop` when citizens deposit waste.

---

## 4. Hardware Interaction UX (Smart Bins)
While not a web interface, the interaction between the physical bin and the user's mobile app is critical.
1. Citizen opens REPAY mobile app and generates a momentary QR Code (containing their `walletAddress`).
2. Smart Bin scanner reads the QR.
3. User drops item. AI Oracle classifies.
4. IoT Device calls `POST /bins/:address/drop`.
5. Frontend WebSockets/Polling detects balance change on Citizen's dashboard -> Triggers immediate push-notification-style local alert: *"Item Recycled! +5 ECO"*.
