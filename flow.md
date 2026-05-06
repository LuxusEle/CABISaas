# CabEngine: Complete Application Flow & Features

This document outlines the step-by-step workflow of the CabEngine Kitchen SaaS application, from project initiation to manufacturing output.

---

## 🚀 Phase 1: Entry & Authentication
1.  **Landing Page**: Users are greeted with a premium interface showcasing the capabilities of the automated design engine.
2.  **Authentication**: Secure login and signup via Supabase.
3.  **Project Initiation**:
    *   **Dashboard**: Users manage their project portfolio.
    *   **New Project**: Create a fresh project with a unique identifier.
    *   **Resume Project**: Load previous drafts from the cloud/local storage.

---

## 🧙 Phase 2: The Project Setup Wizard
A structured, step-by-step configuration process to define project constraints.

1.  **Client Identity**:
    *   Input client details (Name, Site Address, Contact).
2.  **Room Layout (Walls)**:
    *   Define the physical environment.
    *   Add walls with specific lengths (mm/ft).
    *   Interactive wall editor to visualize the room footprint.
3.  **Wall Limits**:
    *   Define precise "Zones" on walls where cabinets are allowed.
    *   Set start and end offsets to accommodate architectural features.
4.  **Special Units (Smart Preferences)**:
    *   Toggle the inclusion of specialized units: **Tall Units**, **Sink Bases**, **Cooking Hubs**, and **Drawer Stacks**.
    *   The engine uses these preferences to intelligently populate the layout.
5.  **Materials (Sheet Inventory)**:
    *   Configure sheet types (MDF, Plywood, Melamine, etc.).
    *   Define dimensions, kerf, and unit pricing.
    *   Manage textures and visual appearances.
6.  **Hardware & Fittings**:
    *   Select standard hinges, handles, and runners.
    *   Define hardware costs for accurate BOM calculation.
7.  **Construction Standards**:
    *   **Global Settings**: Kerf, Countertop thickness.
    *   **Unit Dimensions**: Define standard heights and depths for Base, Wall, and Tall units.
    *   **Material Allocation**: Assign specific sheet types to cabinet components (Carcass, Doors, Back Panels).
8.  **Pricing & Financials**:
    *   **Expense Manager**: Add custom overheads (Labor, Transport, Site prep).
    *   **Profit Margin**: Set a global percentage to automatically calculate selling prices.

---

## 🎨 Phase 3: The Design Studio (Editor)
The core interactive environment for layout refinement.

1.  **3D ISO & 2D Views**:
    *   **Studio View**: Immersive, full-screen 3D environment for realistic project presentation.
    *   **ISO View**: High-end 3D visualization with realistic textures and lighting.
    *   **Plan/Elevation**: Precise technical views for structural validation.
    *   **Wall Plans**: Individual wall elevation drawings with unit schedules.
2.  **Interactive Layout Control**:
    *   **Cabinet Management**: Add, delete, or replace units from a comprehensive library.
    *   **Collision Resolution**: The engine automatically prevents overlaps and adjusts adjacent units.
    *   **Exposed Panels**: Toggle aesthetic side panels for end-of-run cabinets.
    *   **Custom Cabinet Presets**: Save and reuse personalized cabinet configurations (shelves, drawers, door counts).
3.  **Backsplash System**:
    *   Zone-based tiling that spans continuously across walls.
    *   Obstacle-aware height adjustments (e.g., behind hobs).

---

## 📊 Phase 4: Bill of Materials & Reports
Transforming the design into actionable data.

1.  **BOM Generation**:
    *   Comprehensive list of every panel with exact dimensions.
    *   Material usage summary (total sheets required).
2.  **Accessory Counting**:
    *   Automated count of hinges, handles, and drawer pairs based on cabinet count.
3.  **Financial Summary**:
    *   Real-time breakdown of Material Costs + Overheads + Profit Margin = Total Quotation.
4.  **Quotation & Invoicing**:
    *   Professional quotation generation with material specifications.
    *   Approval workflow to convert quotations into final invoices.
    *   PDF export for client communication.
5.  **Cut Plan Visualization**:
    *   Optimized sheet nesting diagrams to minimize material waste.
6.  **Exports**:
    *   **Manufacturing DXF**: CNC-ready files for every panel.
    *   **Drilling Data (ZIP)**: Dedicated export for CNC drilling machines containing precise hole coordinates.
    *   **Excel Export**: Detailed project data for procurement and client quoting.

---

## 🛠️ Specialized Technical Features
*   **Unit Conversion**: Seamlessly switch between Millimeters and Feet across the entire app.
*   **Auto-Save**: State persistence to prevent data loss during the design process.
*   **Pro Module**: Advanced construction editor for granular control over cabinet engineering.
*   **Documentation & Help**: Integrated docs and interactive help center for user onboarding.
*   **Payments & Subscriptions**: Pro-tier access management via Paddle integration.
*   **Feedback & Support**: Direct feedback system for bug reporting and feature requests.
