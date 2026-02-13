import React from 'react';
import { Book, ChevronRight, LayoutDashboard, Settings, Box, Table2, Map, CreditCard, FileText, Lightbulb, HelpCircle, CheckCircle } from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export const DocsPage: React.FC = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sections: DocSection[] = [
    {
      id: 'overview',
      title: 'Getting Started',
      icon: <Book className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Welcome to CabEngine Pro</h3>
          <p className="text-slate-600 dark:text-slate-300">
            CabEngine Pro is a comprehensive cabinet design and manufacturing application that helps you:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 ml-4">
            <li>Design kitchen and cabinet layouts with multiple wall zones</li>
            <li>Generate accurate Bill of Materials (BOM) with cost calculations</li>
            <li>Optimize material cutting patterns to minimize waste</li>
            <li>Create professional elevation drawings and plans</li>
            <li>Manage material types, hardware, and pricing</li>
            <li>Export data to Excel and PDF formats</li>
          </ul>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
            <h4 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Quick Tip
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
              All your work is automatically saved to the cloud. You can access your projects from any device by logging into your account.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'workflow',
      title: 'Complete Project Workflow',
      icon: <CheckCircle className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Step-by-Step Guide to Complete a Project</h3>
          
          <div className="space-y-6">
            <div className="border-l-4 border-amber-500 pl-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">Step 1: Project Setup</h4>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Configure your project settings including company name, currency, material costs, and nesting parameters.
              </p>
              <div className="mt-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <strong>Location:</strong> Click "Setup" in the sidebar → Fill in Project Info, Dimensions & Nesting settings
                </p>
              </div>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">Step 2: Configure Materials</h4>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Add your sheet types (plywood, MDF, melamine) with thickness and pricing. Also add hardware items like hinges, handles, and drawer slides.
              </p>
              <div className="mt-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <strong>Location:</strong> Setup page → "Sheet Types & Materials" and "Hardware & Accessories" sections
                </p>
              </div>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">Step 3: Material Allocation</h4>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Assign default materials to different cabinet components (carcass, doors, drawers, back panels, shelves).
              </p>
              <div className="mt-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <strong>Location:</strong> Setup page → "Material Allocation by Part Type" section
                </p>
              </div>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">Step 4: Design Walls</h4>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Add cabinets to your wall zones. You can manually place cabinets or use the auto-fill feature. Configure each cabinet's type, preset, and materials.
              </p>
              <div className="mt-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <strong>Location:</strong> Click "Walls" in the sidebar → Select wall zone → Add/Edit cabinets
                </p>
              </div>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">Step 5: Generate BOM</h4>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                View your complete Bill of Materials including material sheets, hardware quantities, and cost estimates. The system automatically calculates hinges (2 per door), handles, and drawer slides.
              </p>
              <div className="mt-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <strong>Location:</strong> Click "BOM" in the sidebar → View Material List, Cut Plan, or Wall Plans
                </p>
              </div>
            </div>

            <div className="border-l-4 border-teal-500 pl-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-lg">Step 6: Export & Print</h4>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Export your project to Excel, print PDF reports with elevations and cut plans, or save as JSON for integration with other systems.
              </p>
              <div className="mt-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <strong>Location:</strong> BOM page → Use the "Print / PDF", "JSON", or "Excel" buttons
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'setup',
      title: 'Project Setup',
      icon: <Settings className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Understanding Setup Options</h3>
          
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Project Information</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li><strong>Project Name:</strong> The name of your cabinet project</li>
                <li><strong>Company Name:</strong> Your company name (appears on reports)</li>
                <li><strong>Currency Symbol:</strong> Displayed on all cost calculations ($, €, £, etc.)</li>
                <li><strong>Logo URL:</strong> Optional company logo for professional reports</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Dimensions & Nesting</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li><strong>Base Height:</strong> Height of base cabinets (default: 720mm)</li>
                <li><strong>Sheet Length:</strong> Length of your material sheets (default: 2440mm)</li>
                <li><strong>Sheet Width:</strong> Width of your material sheets (default: 1220mm)</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Sheet Types & Materials</h4>
              <p className="text-slate-600 dark:text-slate-300 mb-2">
                Add different types of sheet materials you use:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li>• <strong>Material Name:</strong> E.g., "White Melamine 16mm"</li>
                <li>• <strong>Thickness:</strong> Sheet thickness in mm</li>
                <li>• <strong>Price per Sheet:</strong> Cost for cost calculations</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Hardware & Accessories</h4>
              <p className="text-slate-600 dark:text-slate-300 mb-2">
                Add hardware items that will appear in your BOM:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li>• <strong>Item Name:</strong> E.g., "Soft-Close Hinge"</li>
                <li>• <strong>Default Price:</strong> Unit cost for calculations</li>
              </ul>
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Note:</strong> Hinges, handles, and drawer slides are automatically calculated based on your cabinet design. Other accessories appear with quantity 1 by default.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Material Allocation by Part Type</h4>
              <p className="text-slate-600 dark:text-slate-300 mb-2">
                Assign default materials to different cabinet components:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li>• <strong>Carcass (Box):</strong> Material for sides, top, bottom panels</li>
                <li>• <strong>Front Doors:</strong> Material for cabinet door fronts</li>
                <li>• <strong>Drawer Boxes:</strong> Material for drawer bottoms and sides</li>
                <li>• <strong>Back Panels:</strong> Material for cabinet backs (typically thinner)</li>
                <li>• <strong>Shelves:</strong> Material for adjustable/fixed shelves</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'walls',
      title: 'Wall Editor',
      icon: <Box className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Designing Your Cabinets</h3>
          
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Wall Zones</h4>
              <p className="text-slate-600 dark:text-slate-300">
                You can design cabinets for multiple wall zones (Wall A, Wall B, Wall C, Island). Toggle zones on/off as needed. Each zone is designed independently.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Adding Cabinets</h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-300">
                <li>Click on the wall visualization where you want to add a cabinet</li>
                <li>Select the cabinet type: <strong>Base</strong>, <strong>Wall</strong>, or <strong>Tall</strong></li>
                <li>Choose a preset (e.g., Base 2-Door, Wall Standard, Tall Oven)</li>
                <li>Set the width (or use the default)</li>
                <li>Click "Add Cabinet"</li>
              </ol>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Cabinet Presets</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li><strong>Base 2-Door:</strong> Standard base cabinet with two doors</li>
                <li><strong>Base 3-Drawer:</strong> Base cabinet with three drawers</li>
                <li><strong>Base Corner:</strong> Corner cabinet for L-shaped layouts</li>
                <li><strong>Wall Standard:</strong> Standard wall cabinet</li>
                <li><strong>Tall Oven/Micro:</strong> Tall cabinet for built-in ovens</li>
                <li><strong>Tall Utility:</strong> Full-height storage cabinet</li>
                <li><strong>Sink Unit:</strong> Base cabinet designed for sinks</li>
                <li><strong>Open Box:</strong> Open shelving unit</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Editing & Arranging</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li><strong>Move:</strong> Click the arrow buttons to swap cabinet positions</li>
                <li><strong>Edit:</strong> Click on a cabinet to modify its width, preset, or materials</li>
                <li><strong>Delete:</strong> Select a cabinet and click the delete button</li>
                <li><strong>Auto-Fill:</strong> Use the "Auto Fill" button to automatically populate a zone with standard cabinets</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Obstacles</h4>
              <p className="text-slate-600 dark:text-slate-300 mb-2">
                Add obstacles like windows, doors, pipes, and columns to your wall:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li>Click on the wall to add an obstacle</li>
                <li>Select the type (window, door, pipe, column)</li>
                <li>Set the width and position</li>
                <li>Obstacles appear as hatched areas on the elevation</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'bom',
      title: 'Bill of Materials (BOM)',
      icon: <Table2 className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Understanding Your BOM</h3>
          
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Cost Estimate Card</h4>
              <p className="text-slate-600 dark:text-slate-300">
                At the top of the BOM page, you'll see a summary of costs:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                <li><strong>Material:</strong> Cost of all sheet materials</li>
                <li><strong>Hardware:</strong> Cost of hinges, handles, drawer slides, and accessories</li>
                <li><strong>Labor:</strong> Estimated labor cost based on cabinet count</li>
                <li><strong>Total:</strong> Complete project cost with margin</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Materials & Hardware Table</h4>
              <p className="text-slate-600 dark:text-slate-300 mb-2">
                This table shows all materials and hardware needed:
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li>• <strong>Sheet Materials:</strong> Lists each material type with quantity and cost</li>
                <li>• <strong>Soft-Close Hinges:</strong> Automatically calculated as 2 per door</li>
                <li>• <strong>Handle/Knob:</strong> Quantity = doors + drawers</li>
                <li>• <strong>Drawer Slide (Pair):</strong> Quantity = number of drawers</li>
                <li>• <strong>Other Accessories:</strong> From your hardware list</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Material List View</h4>
              <p className="text-slate-600 dark:text-slate-300">
                Shows a detailed breakdown of every part needed for each cabinet position (POS 1, POS 2, etc.). Each cabinet's parts are listed with dimensions.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Cut Plan View</h4>
              <p className="text-slate-600 dark:text-slate-300">
                Visual representation of how parts are arranged on material sheets to minimize waste. Shows each sheet with parts laid out and waste percentage.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Wall Plans View</h4>
              <p className="text-slate-600 dark:text-slate-300">
                Elevation drawings for each wall zone showing cabinet positions with dimensions. Includes unit schedule tables for reference.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Export Options</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li><strong>Print / PDF:</strong> Generate printable reports with title blocks</li>
                <li><strong>Excel:</strong> Export detailed parts list to spreadsheet</li>
                <li><strong>JSON:</strong> Export raw data for integration with other software</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'plan',
      title: 'Kitchen Plan',
      icon: <Map className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Kitchen Plan View</h3>
          
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Overview</h4>
              <p className="text-slate-600 dark:text-slate-300">
                The Kitchen Plan view provides a top-down 2D layout of all your wall zones. This helps visualize the overall kitchen layout and cabinet positioning.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Features</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li>• View all active wall zones in one diagram</li>
                <li>• See cabinet positions and dimensions from above</li>
                <li>• Obstacles (windows, doors) are clearly marked</li>
                <li>• Useful for overall space planning</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'pricing',
      title: 'Pricing & Subscription',
      icon: <CreditCard className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Subscription Plans</h3>
          
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Free Plan</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li>✓ Design up to 3 projects</li>
                <li>✓ Basic cabinet presets</li>
                <li>✓ Export to PDF</li>
                <li>✗ Limited material types</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border-2 border-amber-500 dark:border-amber-400">
              <h4 className="font-bold text-amber-600 dark:text-amber-400 mb-2">Pro Plan</h4>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li>✓ Unlimited projects</li>
                <li>✓ All cabinet presets including custom</li>
                <li>✓ Full BOM export (Excel, PDF, JSON)</li>
                <li>✓ Unlimited material types</li>
                <li>✓ Priority support</li>
                <li>✓ Cloud backup</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      title: 'FAQ & Troubleshooting',
      icon: <HelpCircle className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h3>
          
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Q: How do I change the currency?</h4>
              <p className="text-slate-600 dark:text-slate-300">
                A: Go to Setup → Project Info section → Change the "Currency Symbol" field. This will update all cost displays throughout the app.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Q: Can I add custom cabinet sizes?</h4>
              <p className="text-slate-600 dark:text-slate-300">
                A: Yes! When adding a cabinet, you can specify any width. You can also create custom cabinet presets with the Pro plan.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Q: How are hinge quantities calculated?</h4>
              <p className="text-slate-600 dark:text-slate-300">
                A: The system automatically calculates 2 hinges per door. Wall cabinets with 2 doors get 4 hinges, single-door cabinets get 2 hinges.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Q: Why is my wall plan cutting off in the PDF?</h4>
              <p className="text-slate-600 dark:text-slate-300">
                A: Make sure to use the "Print / PDF" button from the BOM page. The wall plans are automatically scaled to fit on the page. If you have many cabinets, they may span multiple pages.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Q: Can I save my project and continue later?</h4>
              <p className="text-slate-600 dark:text-slate-300">
                A: Yes! All projects are automatically saved to the cloud when you're logged in. You can access them from the Dashboard anytime.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Q: How do I delete a cabinet?</h4>
              <p className="text-slate-600 dark:text-slate-300">
                A: Click on the cabinet you want to delete in the wall editor, then click the "Delete" button in the edit panel.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shrink-0">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-amber-500" />
          Documentation
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Complete guide to using CabEngine Pro
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar Navigation */}
        <aside className="hidden md:block w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-left"
              >
                {section.icon}
                <span className="flex-1">{section.title}</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {section.icon}
                    {section.title}
                  </h2>
                </div>
                <div className="p-6">
                  {section.content}
                </div>
              </section>
            ))}

            {/* Footer */}
            <div className="text-center py-8 text-slate-400 dark:text-slate-600">
              <p className="text-sm">
                Need more help? Contact support at support@cabengine.pro
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DocsPage;
