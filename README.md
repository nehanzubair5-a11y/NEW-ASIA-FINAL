
# New Asia Dealer Management System (DMS)

## Project Overview
This is a comprehensive Dealer Management System designed for **New Asia** and **Ramza** automotive brands. It manages the entire lifecycle of vehicle sales, including:
- **Dealer Portal:** Dealers can book vehicles, order stock, view their financials, and manage inventory.
- **Admin Dashboard:** Head office staff can approve orders, manage products, track sales, and view reports.
- **RBAC:** Role-Based Access Control for Admin, Super Admin, Finance, Logistics, etc.

## 🛠 Tech Stack (Current Frontend)
- **Framework:** React 18 (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Context API (No external Redux/Zustand required yet)
- **Charts:** Recharts
- **Icons:** Custom SVG Component System
- **Build Tool:** Vite
- **PWA:** Vite Plugin PWA (Offline capabilities enabled)

## 🏗 Current Architecture (Critical Note for Developer)
**The application is currently in "Mock Mode".**
- **Data Layer:** All data interactions are handled in `src/api/index.ts`.
- **Simulation:** Network delays and database operations are simulated using JavaScript Promises and in-memory arrays.
- **Persistence:** Some data uses `localStorage` via the `useStickyState` hook in `AppContext.tsx`, but there is **no real backend database** connected yet.

## 🚀 Outstanding Tasks (Backend Development Required)
To deploy this for production, the following work is required:

### 1. Backend API Development
You need to build a RESTful API (Node.js/Express, Python/Django, or Go) that mirrors the functions defined in `src/api/index.ts`.
- **Endpoints needed:**
  - `GET /users`, `POST /users`
  - `GET /dealers`, `POST /dealers`, `PUT /dealers/:id`
  - `GET /stock`, `POST /stock` (VIN management)
  - `GET /orders`, `POST /orders` (Stock ordering)
  - `GET /bookings`, `POST /bookings` (Customer sales)

### 2. Database Setup
Set up a database (MongoDB is recommended due to the JSON-like structure of the current mock data, or PostgreSQL).
- **Entities:** Users, Roles, Dealers, Products (with Variants), StockItems, StockOrders, Bookings, Payments, AuditLogs.
- *Refer to `src/types.ts` for the exact schema definitions.*

### 3. Authentication
- Replace the mock `login` function in `AuthContext.tsx`.
- Implement JWT (JSON Web Token) authentication.
- Secure routes on the backend.

### 4. Integration
- Go to `src/api/index.ts`.
- Replace the `setTimeout` mock functions with real `fetch()` or `axios` calls to your new backend API.

## 💻 How to Run Locally
1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Start Development Server:**
   ```bash
   npm run dev
   ```
3. **Build for Production:**
   ```bash
   npm run build
   ```

## 📂 Key Directory Structure
- `/src/components`: UI Components (Pages, Modals, Shared widgets).
- `/src/context`: Global State (Auth, Data, App settings).
- `/src/hooks`: Custom hooks (Permissions, Pagination).
- `/src/types.ts`: **Source of Truth** for all data models.
- `/src/api/index.ts`: **Mock API Layer** (Replace this with real API integration).
- `/src/permissions.ts`: Granular permission definitions.

## 🎨 UI/UX Notes
- The app supports Dark Mode (system preference or toggle in settings).
- Responsive design is handled via Tailwind classes (mobile-first).
- Printing is handled via a custom `printElementById` utility in `utils/print.ts`.
