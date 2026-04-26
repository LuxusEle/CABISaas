

# CABENGINE - Cabinet Design & Manufacturing Platform

CABENGINE is a professional-grade web application for 3D kitchen design, automated Bill of Materials (BOM) generation, and manufacturing optimization.

## 🚀 Core Features

### 1. 3D Kitchen Planner
* **Dynamic Layouts**: Add Base, Wall, Tall, and Corner cabinets to multiple walls.
* **Real-time Visualization**: High-fidelity 3D rendering with material textures and lighting.
* **Unit Presets**: Selection of standard presets (Single Door, Drawer Stacks, Sink Units, etc.).
* **Gola & Standard Handles**: Support for modern handleless (Gola) designs and traditional handle styles.

### 2. Manufacturing Reports (BOM)
* **Automated BOM**: Instant generation of all panels required for the project.
* **Cost Estimation**: Real-time pricing based on material usage, hardware, labor, and transport.
* **Material Summary**: Grouping of required sheets by material type and thickness.
* **Hardware Tracking**: Automatic calculation of hinges, handles, and drawer slides.

### 3. Professional Views
* **Transparent View**: Toggle transparency to inspect internal structural components.
* **Skeleton View**: View the kitchen as a wireframe to see construction details.
* **Wall Plans**: Technical 2D elevations with POS markers for installation.

---

## 💎 Free vs. PRO Features

The platform follows a "Design for Free, Manufacture with PRO" model.

### Free Tier
Ideal for designers and homeowners to visualize their space.
* **Up to 3 Projects**: Create and save up to 3 distinct kitchen designs.
* **Unlimited 3D Designing**: Full access to the layout tools within your projects.
* **Standard Presets**: Use all built-in cabinet types.
* **On-Screen Reports**: View BOM, Cut Plans, and Wall Plans in the browser.
* **Basic Browser Printing**: Print any screen using the browser's default print function.
* **Branded PDF Preview**: Download Quotations/Invoices with generic branding.

### PRO Tier
Designed for professionals, workshops, and manufacturers.
* **Advanced 3D Editor**: Unlock the sidebar to customize fine details (Panel thicknesses, Gola depths, hardware offsets).
* **Technical Exports**:
    * **Excel Export**: Download the BOM as `.xlsx` for procurement.
    * **DXF Bundles**: Download CAD-ready files for all parts (individual or zip).
    * **Drilling Data**: Export CNC-ready maps for hinges and hardware markers.
* **Professional Documentation**:
    * **Custom Branding**: Generate PDF Quotations/Invoices with *your* company name and logo.
    * **Client Data**: Address PDFs to specific customers.
    * **Bank Integration**: Include payment instructions/bank details on every document.

---

## 🛠 Technical Stack
* **Frontend**: React, Three.js (React Three Fiber), Tailwind CSS.
* **3D Engine**: Custom Three.js components for dynamic geometry generation.
* **PDF Engine**: jsPDF for client-side document generation.
* **DXF Engine**: @tarikjabiri/dxf for vector exports.
* **Payments**: Integrated with Paddle for subscription management.

## 📦 Installation
1. Clone the repository.
2. Run `npm install`.
3. Start the development server with `npm run dev`.
