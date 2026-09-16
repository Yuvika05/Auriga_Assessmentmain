# SplitPool — Group Expense & Farewell Gift Tracker

**SplitPool** is a shared collection and expense settlement web application designed to track group contributions (farewell gifts, vacation rentals, team dinners, or office pools). 

It specifically solves the common group pooling chaos where:
- The target budget is agreed upon, but people pay uneven amounts.
- Some members have paid in full, some made partial payments, some haven't paid yet.
- A generous member paid extra to cover a colleague's share.
- The target amount might change mid-way (e.g. upgraded gift or extra expenses).
- The organiser needs instant answers to: *"How much do I still owe?"*, *"Have we collected enough yet?"*, and *"Who should pay whom to settle up fairly in the fewest transactions?"*

---

## 🚀 Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Routing**: [React Router](https://reactrouter.com/) (declarative protected routes, deep URL sync)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (centralized reactive store, no prop drilling)
- **Validation**: [Zod](https://zod.dev/) (runtime validation schemas for all domain entities)
- **Persistence Layer**: Repository Pattern (`PoolRepository` and `AuthRepository`) with `localStorage` persistence, easily swappable for Firestore/Supabase/REST backends
- **Testing**: [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/)

---

## 🏃 Running the Application

### 1. In GitHub Codespaces
1. Open this repository in GitHub Codespaces.
2. The devcontainer automatically runs `npm install`.
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Codespaces will detect port **3000** and automatically provide an "Open in Browser" prompt.

### 2. Locally
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000 in your browser
```

---

## 🧪 Running Tests

The test suite thoroughly covers all core balance logic, fair share calculation, uneven remainders, target budget revisions, and the greedy debt simplification algorithm.

```bash
# Run unit tests
npm run test

# Run tests with Vitest interactive UI
npm run test:ui
```

---

## 📐 Settlement Algorithm: Plain Language Explanation

When a group chips in, participants end up in two groups:
1. **Debtors** (negative balance): People who paid less than their fair share and still owe money.
2. **Creditors** (positive balance): People who overpaid or covered someone else and need to be reimbursed.

SplitPool computes the **minimum number of peer-to-peer transfers** using an **$O(N \log N)$ greedy bipartite matching algorithm**:
1. It calculates each participant's net position (`amountCredited - fairShare`).
2. It sorts debtors by amount owed (most negative first) and creditors by amount owed to them (highest positive first).
3. Using a two-pointer approach, it pairs the largest debtor with the largest creditor:
   - The transfer amount is `min(|debtor balance|, creditor balance)`.
   - Both balances are reduced by that transfer amount.
   - Whichever person reaches a zero balance is moved past; the process repeats until all balances reach 0 within 1 minor currency unit (paise).
4. **Result**: An optimal, minimal transfer list (e.g. *"Rohan pays ₹500 to Sneha"*, *"Ananya pays ₹1,000 to Sneha"*).
5. Organisers can tick off transactions on an interactive checklist as friends pay up, complete with real-time progress and a celebratory state when all transfers are done.

---

## 💡 "Load Demo Data" Option

For quick assessment with zero manual typing:
1. On the login screen, click **"Continue as Guest (Instant Demo)"**.
2. SplitPool automatically provisions the classic **Farewell Gift Scenario**:
   - **Target Budget**: ₹6,000 (Target fair share: ₹1,000 across 6 team members)
   - **Amit (Organiser)**: Paid ₹1,000 (Settled)
   - **Priya**: Paid ₹1,000 (Settled)
   - **Sneha**: Generously paid ₹2,000 (₹1,000 for herself + covered ₹1,000 on behalf of Vikram)
   - **Vikram**: Paid ₹0 out-of-pocket, but ₹1,000 credited via Sneha's split (Settled)
   - **Rohan**: Paid partial ₹500 (Still owes ₹500)
   - **Ananya**: Paid ₹0 (Still owes ₹1,000)
   - **Kabir**: Member added to test dynamic fair share recalculation!
3. You can also reset any pool back to this demo dataset anytime under **Settings &rarr; "Reset to Farewell Gift Scenario"**.

---

## 📁 Folder Structure

```
splitpool/
├── .devcontainer/
│   └── devcontainer.json        # GitHub Codespaces config with port forwarding
├── src/
│   ├── components/              # Modular UI components
│   │   ├── ActivityLogTab.tsx   # Chronological budget & payment audit log
│   │   ├── AddParticipantModal.tsx # New participant modal with live share recalculation
│   │   ├── AuthScreen.tsx       # Login, signup, and 1-click guest mode
│   │   ├── ContributionFormModal.tsx # Add/edit payment with "on behalf of" split
│   │   ├── ContributionsTab.tsx # Full ledger list with edit/delete actions
│   │   ├── EditTargetModal.tsx  # Target budget modifier with audit logging
│   │   ├── ErrorBoundary.tsx    # Crash resilient React error boundary
│   │   ├── HeaderNav.tsx        # Multi-pool switcher & navigation bar
│   │   ├── NewPoolModal.tsx     # Create new collection pool modal
│   │   ├── ParticipantDetailModal.tsx # Member balance & copyable reminder
│   │   ├── ParticipantsTab.tsx  # Team member roster & filters
│   │   ├── PoolOverviewTab.tsx  # Hero metrics, progress bar, participant status
│   │   ├── SettingsTab.tsx      # Currency, JSON export, reset demo, logout
│   │   └── SettleUpTab.tsx      # Debt simplification checklist & algorithm toggle
│   ├── data/
│   │   └── defaultPools.ts      # Seed farewell gift scenario generator
│   ├── repositories/            # Repository pattern (LocalStorage / Swappable API)
│   │   └── index.ts             # LocalStoragePoolRepository & LocalStorageAuthRepository
│   ├── schemas/                 # Zod validation schemas
│   │   └── index.ts             # User, Pool, Participant, Contribution schemas
│   ├── store/
│   │   └── useAppStore.ts       # Zustand reactive state store
│   ├── types.ts                 # Global TypeScript interfaces & types
│   ├── utils/
│   │   ├── __tests__/           # Comprehensive Vitest tests
│   │   │   └── settlementMath.test.ts # Math, uneven splits & greedy settlement tests
│   │   └── settlementMath.ts    # Pure, testable balance & settlement math
│   ├── App.tsx                  # Main router & view composition
│   ├── main.tsx                 # Vite React application entry point
│   └── index.css                # Tailwind CSS styling
├── metadata.json                # Project identity metadata
├── package.json                 # Scripts and dependencies
└── tsconfig.json                # Strict TypeScript configuration
```
