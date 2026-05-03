import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Download, FileSpreadsheet, Wrench, CreditCard, Layers, DollarSign, Scissors, FileCode, Check, Lock } from 'lucide-react';
import { Project, SheetType, PresetType, CabinetType } from '../types';
import { Button } from '../components/Button';
import { CutPlanVisualizer } from '../components/CutPlanVisualizer';
import { WallVisualizer } from '../components/WallVisualizer';
import { KitchenPlanCanvas } from '../components/KitchenPlanCanvas';
import { generateProjectBOM, exportToExcel, calculateProjectCost, buildProjectConstructionData } from '../services/bomService';
import { sheetTypeService } from '../services/sheetTypeService';
import { expenseTemplateService, ExpenseTemplate } from '../services/expenseTemplateService';
import { optimizeCuts } from '../services/nestingService';
import { exportAllSheetsToDXFZip, exportSingleSheetToDXF, exportAllDrillingToZip } from '../services/dxfExportService';
import { generateQuotationPDF } from '../services/pdfService';
import { projectService } from '../services/projectService';

interface ScreenBOMReportProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  isUserPro: boolean;
}

const ScreenBOMReport = ({ project, setProject, isUserPro }: ScreenBOMReportProps) => {
  const navigate = useNavigate();
  // Use more specific dependencies to prevent unnecessary recalculations
  const data = useMemo(() => generateProjectBOM(project), [project.id, project.zones, project.settings]);
  const [activeView, setActiveView] = useState<'list' | 'cutplan' | 'wallplan' | 'quotation'>('list');

  // Load sheet types from database for pricing and nesting
  const [sheetTypes, setSheetTypes] = useState<SheetType[]>([]);
  useEffect(() => {
    const loadSheetTypes = async () => {
      const types = await sheetTypeService.getSheetTypes();
      setSheetTypes(types);
    };
    loadSheetTypes();
  }, []);

  const cutPlan = useMemo(() => optimizeCuts(data.groups.flatMap(g => g.items), project.settings, sheetTypes), [data.groups, sheetTypes, project.settings.kerf]);
  const currency = project.settings.currency || '$';

  // Load accessories from database
  const [accessories, setAccessories] = useState<ExpenseTemplate[]>([]);
  useEffect(() => {
    const loadAccessories = async () => {
      const templates = await expenseTemplateService.getTemplates();
      setAccessories(templates);
    };
    loadAccessories();
  }, []);


  // Calculate total doors for hinge calculation
  // Ruby CBX door threshold: < 599.5mm = single door, >= 600mm = double doors
  const RUBY_DOOR_THRESHOLD = 599.5;
  const totalDoors = useMemo(() => {
    let doors = 0;
    project.zones.forEach(zone => {
      zone.cabinets.forEach(cab => {
        // Count doors: base door cabinets have 1 or 2 doors depending on width
        if (cab.preset === PresetType.BASE_DOOR) {
          doors += cab.width >= RUBY_DOOR_THRESHOLD ? 2 : 1;
        }
        // Wall cabinets also have doors
        if (cab.type === CabinetType.WALL && cab.preset !== PresetType.OPEN_BOX) {
          doors += cab.width >= RUBY_DOOR_THRESHOLD ? 2 : 1;
        }
        // Tall cabinets
        if (cab.type === CabinetType.TALL) {
          doors += 1;
        }
      });
    });
    return doors;
  }, [project.zones]);

  // Calculate hinge quantity (2 per door)
  const hingeQuantity = totalDoors * 2;

  // Calculate installation nails (6 per hinge)
  const totalNails = hingeQuantity * 6;

  // Calculate adjustable legs (4 per BASE or TALL cabinet)
  const totalLegs = useMemo(() => {
    let legs = 0;
    project.zones.forEach(zone => {
      zone.cabinets.forEach(cab => {
        if (cab.type === CabinetType.BASE || cab.type === CabinetType.TALL) {
          legs += 4;
        }
      });
    });
    return legs;
  }, [project.zones]);

  // Calculate wall hangers (1 per WALL cabinet)
  const totalHangers = useMemo(() => {
    let hangers = 0;
    project.zones.forEach(zone => {
      zone.cabinets.forEach(cab => {
        if (cab.type === CabinetType.WALL) {
          hangers += 1;
        }
      });
    });
    return hangers;
  }, [project.zones]);

  // Get hinge cost from accessories
  const hingeAccessory = accessories.find(acc =>
    acc.name.toLowerCase().includes('hinge') ||
    acc.name.toLowerCase().includes('soft-close')
  );
  const hingeUnitCost = hingeAccessory?.default_amount || project.settings.costs.pricePerHardwareUnit;
  const hingeTotalCost = hingeQuantity * hingeUnitCost;

  // Calculate total drawers (from drawer cabinets)
  const totalDrawers = useMemo(() => {
    let drawers = 0;
    project.zones.forEach(zone => {
      zone.cabinets.forEach(cab => {
        // Base drawer cabinets have 3 drawers
        if (cab.preset === PresetType.BASE_DRAWER_3) {
          drawers += 3;
        }
      });
    });
    return drawers;
  }, [project.zones]);

  // Calculate Handle/Knob quantity (doors + drawers)
  const handleQuantity = totalDoors + totalDrawers;
  const handleAccessory = accessories.find(acc =>
    acc.name.toLowerCase().includes('handle') ||
    acc.name.toLowerCase().includes('knob')
  );
  const handleUnitCost = handleAccessory?.default_amount || project.settings.costs.pricePerHardwareUnit;
  const handleTotalCost = handleQuantity * handleUnitCost;

  // Calculate Drawer Slide quantity (pairs) = number of drawers
  const drawerSlideQuantity = totalDrawers;
  const drawerSlideAccessory = accessories.find(acc =>
    acc.name.toLowerCase().includes('drawer slide') ||
    acc.name.toLowerCase().includes('slide')
  );
  const drawerSlideUnitCost = drawerSlideAccessory?.default_amount || project.settings.costs.pricePerHardwareUnit;
  const drawerSlideTotalCost = drawerSlideQuantity * drawerSlideUnitCost;

  // Calculate total Granite area in square feet
  // 1 sqft = 92903.04 mm2
  const totalGraniteSqft = useMemo(() => {
    let areaMm2 = 0;
    project.zones.forEach(zone => {
      zone.cabinets.forEach(cab => {
        if (cab.type === CabinetType.BASE && 
            cab.preset !== PresetType.SINK_UNIT && 
            cab.preset !== PresetType.COOKER_HOB &&
            !(cab.preset === PresetType.BASE_DRAWER_3 && cab.width >= 600)) {
          const depth = cab.advancedSettings?.depth || project.settings.depthBase || 560;
          areaMm2 += cab.width * depth;
        }
      });
    });
    return areaMm2 / 92903.04;
  }, [project.zones, project.settings.depthBase]);

  const graniteAccessory = accessories.find(acc => acc.name.toLowerCase() === 'granite');
  const graniteUnitCost = graniteAccessory?.default_amount || 0;
  const graniteTotalCost = totalGraniteSqft * graniteUnitCost;

  // Calculate total hardware cost from all individual items (only those actually used in project)
  const otherAccessoriesCost = useMemo(() => {
    return Object.entries(data.hardwareSummary)
      .filter(([name]) => {
        const lower = name.toLowerCase();
        // Skip items already calculated separately with special logic
        return !lower.includes('hinge') && 
               !lower.includes('handle') && 
               !lower.includes('knob') && 
               !lower.includes('slide') &&
               !lower.includes('granite');
      })
      .reduce((sum, [name, qty]) => {
        // Find best match in accessories list
        const accessory = accessories.find(acc => 
          acc.name.toLowerCase() === name.toLowerCase() ||
          acc.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(acc.name.toLowerCase())
        );
        
        const unitCost = accessory?.default_amount || project.settings.costs.pricePerHardwareUnit;
        return sum + (qty * unitCost);
      }, 0);
  }, [data.hardwareSummary, accessories, project.settings.costs.pricePerHardwareUnit]);

  const totalHardwareCost = hingeTotalCost + handleTotalCost + drawerSlideTotalCost + graniteTotalCost + otherAccessoriesCost;

  // Calculate base costs with proper hardware total
  const baseCosts = useMemo(() => calculateProjectCost(data, cutPlan, project.settings, totalHardwareCost, sheetTypes), [data, cutPlan, project.settings.costs, totalHardwareCost, sheetTypes]);

  // Use base costs directly (no additional expenses)
  const costs = baseCosts;

  // Calculate Sheet Summary for Table
  const materialSummary = useMemo(() => {
    const summary: Record<string, { sheets: number, waste: number, area: number }> = {};
    cutPlan.sheets.forEach(s => {
      if (!summary[s.material]) summary[s.material] = { sheets: 0, waste: 0, area: s.width * s.length };
      summary[s.material].sheets++;
      summary[s.material].waste += s.waste;
    });

    // Helper to find price for a material from database
    const findSheetPrice = (materialName: string): number => {
      const matched = sheetTypes.find(st =>
        materialName.toLowerCase().includes(st.name.toLowerCase()) ||
        st.name.toLowerCase().includes(materialName.toLowerCase())
      );
      if (matched && matched.price_per_sheet > 0) {
        return matched.price_per_sheet;
      }
      return project.settings.costs?.pricePerSheet ?? 85.00;
    };

    return Object.entries(summary).map(([mat, data]) => {
      const matched = sheetTypes.find(st => 
        mat.toLowerCase().includes(st.name.toLowerCase()) || 
        st.name.toLowerCase().includes(mat.toLowerCase())
      );
      return {
        material: mat,
        sheets: data.sheets,
        waste: Math.round(data.waste / data.sheets),
        dims: (matched && matched.length && matched.width) 
          ? `${matched.length} x ${matched.width}` 
          : '1220 x 2440',
        cost: data.sheets * findSheetPrice(mat)
      };
    });
  }, [cutPlan, project.settings, sheetTypes]);

  // Calculate Quotation Specifications with Filters
  const quotationSpecifications = useMemo(() => {
    const specs: string[] = [];

    // 1. Materials Detail
    if (project.settings.materialSettings) {
      const ms = project.settings.materialSettings;
      if (ms.carcassMaterial) specs.push(`Carcass Material: ${ms.carcassMaterial}`);
      if (ms.doorMaterial) specs.push(`Door/Front Material: ${ms.doorMaterial}`);
      if (ms.shelfMaterial) specs.push(`Internal Shelf Material: ${ms.shelfMaterial}`);
      if (ms.backMaterial) specs.push(`Back Panel Material: ${ms.backMaterial}`);
      if (ms.drawerMaterial) specs.push(`Drawer Box Material: ${ms.drawerMaterial}`);
    } else {
      materialSummary.forEach(m => {
        specs.push(`Main material: ${m.material}`);
      });
    }

    // 2. Cabinet Summary
    const cabSummary: Record<string, number> = {};
    project.zones.forEach(z => {
      z.cabinets.forEach(c => {
        const key = `${c.preset} (${c.width}mm)`;
        cabSummary[key] = (cabSummary[key] || 0) + 1;
      });
    });

    Object.entries(cabSummary).forEach(([desc, qty]) => {
      specs.push(`${qty}x ${desc}`);
    });

    // 3. Hardware/Accessories from BOM table logic
    const hardwareItems = [
      { name: 'Soft-Close Hinges', qty: hingeQuantity },
      { name: `Handle/Knob`, qty: handleQuantity },
      { name: `Drawer Slide (Pair)`, qty: drawerSlideQuantity },
      ...accessories.filter(acc =>
        !acc.name.toLowerCase().includes('hinge') &&
        !acc.name.toLowerCase().includes('handle') &&
        !acc.name.toLowerCase().includes('knob') &&
        !acc.name.toLowerCase().includes('drawer slide') &&
        !acc.name.toLowerCase().includes('slide') &&
        !acc.name.toLowerCase().includes('granite')
      ).map(acc => ({ name: acc.name, qty: 1 })),
      { name: `Granite Countertop (Sqft)`, qty: Number(totalGraniteSqft.toFixed(2)) }
    ];

    // Apply USER Exclusions
    const exclusions = ['wall hanger', 'installation nail', 'transport', 'soft-close hinges'];

    hardwareItems.forEach(item => {
      const isExcluded = exclusions.some(ex => item.name.toLowerCase().includes(ex));
      if (!isExcluded && item.qty > 0) {
        specs.push(`${item.name}${item.qty > 1 ? ` (${item.qty})` : ''}`);
      }
    });

    return specs;
  }, [project.settings.materialSettings, project.zones, materialSummary, hingeQuantity, handleQuantity, drawerSlideQuantity, accessories]);

  const handlePrint = () => {
    setTimeout(() => window.print(), 100);
  };
  const handlePrintQuotation = async () => {
    await generateQuotationPDF(project, quotationSpecifications, costs, currency, isUserPro, {
      companyAddress: ['Katuwawala Road', 'Borelesgamuwa', 'Western Province', 'Sri Lanka'],
      phone: '0777163564',
      email: 'luxuselemente@gmail.com',
      bankName: 'Seylan Bank',
      accountNumber: '021 013 279 542 001'
    });
  };

  // Calculate quotation data
  const quotationDate = new Date();
  const dueDate = new Date(quotationDate);
  dueDate.setDate(dueDate.getDate() + 30);
  const quotationNumber = `QT-${Date.now().toString().slice(-6)}`;

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 w-full overflow-hidden">
      <div className="p-2 sm:p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 print:hidden">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto">
          {['list', 'cutplan', 'wallplan', 'quotation'].map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v as any)}
              className={`px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-bold rounded-md capitalize whitespace-nowrap ${activeView === v ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {v === 'list' ? 'Material List' : v === 'cutplan' ? 'Cut Plan' : v === 'wallplan' ? 'Wall Plans' : (project.settings.quotationStatus === 'invoice' ? 'Invoice Review' : 'Quotation Review')}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrint} className="h-9 text-[10px] sm:text-xs px-3">
            <Printer size={14} className="mr-1.5" /> <span>Report</span>
          </Button>

          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => isUserPro ? exportToExcel(data.groups, cutPlan, project) : navigate('/pricing')} 
            className="h-9 text-[10px] sm:text-xs px-3 gap-1.5"
          >
            {isUserPro ? <FileSpreadsheet size={14} /> : <Lock size={12} className="text-amber-500" />}
            Excel
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => {
              if (!isUserPro) {
                navigate('/pricing');
                return;
              }
              const allCabinets = project.zones.flatMap(z => z.cabinets);
              exportAllDrillingToZip(allCabinets, project.settings, project.name);
            }} 
            className="h-9 text-[10px] sm:text-xs px-3 gap-1.5"
          >
            {isUserPro ? <Wrench size={14} /> : <Lock size={12} className="text-amber-500" />}
            <span>Drilling</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setActiveView('quotation')} className="h-9 text-[10px] sm:text-xs px-3 gap-1.5">
            <CreditCard size={14} /> {project.settings.quotationStatus === 'invoice' ? 'Invoice' : 'Quotation'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 space-y-6 sm:space-y-8 bg-white dark:bg-slate-950 print:p-4 print:pb-24 print:overflow-visible h-full">
        {/* BOM CONTENT */}
        <div className={`${activeView !== 'quotation' ? 'flex' : 'hidden print:flex'} flex-col gap-10 sm:gap-14`}>

          {/* COSTING CARD */}
          <div className={`${activeView === 'list' ? 'block' : 'hidden print:block'} bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 sm:p-6 rounded-xl sm:rounded-2xl print:bg-white print:text-black print:border-2 print:border-black print:break-inside-avoid shadow-xl print:shadow-none`}>
            <h3 className="text-amber-600 dark:text-amber-500 font-bold mb-3 sm:mb-4 flex items-center gap-2 print:text-black text-base sm:text-lg"><DollarSign size={18} /> Cost Estimate</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
              <div><div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Material</div><div className="text-lg sm:text-xl font-bold">{currency}{baseCosts.materialCost.toFixed(2)}</div></div>
              <div><div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Hardware</div><div className="text-lg sm:text-xl font-bold">{currency}{baseCosts.hardwareCost.toFixed(2)}</div></div>
              <div><div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Labor</div><div className="text-lg sm:text-xl font-bold">{currency}{baseCosts.laborCost.toFixed(2)}</div></div>
              <div><div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Transport</div><div className="text-lg sm:text-xl font-bold">{currency}{baseCosts.transportCost.toFixed(2)}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 print:border-black">
              <div>
                <div className="text-slate-500 dark:text-slate-400 text-xs uppercase print:text-black">Total</div>
                <div className="text-xl sm:text-2xl font-bold">{currency}{baseCosts.subtotal.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-amber-600 dark:text-amber-500 text-xs uppercase print:text-black">Sub Total ({(project.settings.costs?.marginPercent ?? 50)}% margin)</div>
                <div className="text-2xl sm:text-3xl font-black">{currency}{costs.totalPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* MATERIAL & HARDWARE SUMMARY */}
          <div className={`${activeView === 'list' ? 'grid' : 'hidden print:grid'} grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 break-inside-avoid`}>
            {/* Sheet Material Summary */}
            <div className="space-y-4">
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest flex items-center gap-2 border-b-2 border-black pb-2">
                <Layers size={18} /> Sheet Materials
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs sm:text-sm text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 font-black uppercase text-[10px] tracking-wider text-slate-500">Material</th>
                      <th className="p-3 font-black uppercase text-[10px] tracking-wider text-slate-500 text-center">Size</th>
                      <th className="p-3 font-black uppercase text-[10px] tracking-wider text-slate-500 text-center">Qty</th>
                      <th className="p-3 font-black uppercase text-[10px] tracking-wider text-slate-500 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {materialSummary.map((m) => (
                      <tr key={m.material} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-white print:text-black">{m.material}</td>
                        <td className="p-3 text-center font-mono text-slate-500">{m.dims}</td>
                        <td className="p-3 text-center font-black text-lg text-amber-600">{m.sheets}</td>
                        <td className="p-3 text-right font-medium">{currency}{m.cost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hardware Summary */}
            <div className="space-y-4">
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest flex items-center gap-2 border-b-2 border-black pb-2">
                <Wrench size={18} /> Hardware & Accessories
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs sm:text-sm text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 font-black uppercase text-[10px] tracking-wider text-slate-500">Item</th>
                      <th className="p-3 font-black uppercase text-[10px] tracking-wider text-slate-500 text-center">Qty</th>
                      <th className="p-3 font-black uppercase text-[10px] tracking-wider text-slate-500 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {/* Hinges */}
                    {hingeQuantity > 0 && (
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-white print:text-black">Soft-Close Hinges</td>
                        <td className="p-3 text-center font-black text-amber-600">{hingeQuantity}</td>
                        <td className="p-3 text-right font-medium">{currency}{hingeTotalCost.toFixed(2)}</td>
                      </tr>
                    )}
                    {/* Handles */}
                    {handleQuantity > 0 && (
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-white print:text-black">Handle/Knob Set</td>
                        <td className="p-3 text-center font-black text-amber-600">{handleQuantity}</td>
                        <td className="p-3 text-right font-medium">{currency}{handleTotalCost.toFixed(2)}</td>
                      </tr>
                    )}
                    {/* Slides */}
                    {drawerSlideQuantity > 0 && (
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-white print:text-black">Drawer Slides (Pairs)</td>
                        <td className="p-3 text-center font-black text-amber-600">{drawerSlideQuantity}</td>
                        <td className="p-3 text-right font-medium">{currency}{drawerSlideTotalCost.toFixed(2)}</td>
                      </tr>
                    )}
                    {/* Granite */}
                    {totalGraniteSqft > 0 && (
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-white print:text-black">Granite Countertop (Sqft)</td>
                        <td className="p-3 text-center font-black text-amber-600">{totalGraniteSqft.toFixed(2)}</td>
                        <td className="p-3 text-right font-medium">{currency}{graniteTotalCost.toFixed(2)}</td>
                      </tr>
                    )}
                    {/* Legs */}
                    {totalLegs > 0 && (
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-white print:text-black">Adjustable Legs</td>
                        <td className="p-3 text-center font-black text-amber-600">{totalLegs}</td>
                        <td className="p-3 text-right font-medium">{currency}{(totalLegs * (accessories.find(a => a.name.toLowerCase().includes('adjustable leg'))?.default_amount || 2)).toFixed(2)}</td>
                      </tr>
                    )}
                    {/* Other Accessories */}
                    {accessories
                      .filter(acc =>
                        !acc.name.toLowerCase().includes('hinge') &&
                        !acc.name.toLowerCase().includes('handle') &&
                        !acc.name.toLowerCase().includes('knob') &&
                        !acc.name.toLowerCase().includes('drawer slide') &&
                        !acc.name.toLowerCase().includes('slide') &&
                        !acc.name.toLowerCase().includes('adjustable leg') &&
                        !acc.name.toLowerCase().includes('wall hanger') &&
                        !acc.name.toLowerCase().includes('installation nail')
                      )
                      .map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-bold text-slate-900 dark:text-white print:text-black">{acc.name}</td>
                          <td className="p-3 text-center font-black text-amber-600">1</td>
                          <td className="p-3 text-right font-medium">{currency}{acc.default_amount.toFixed(2)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>



          {/* CUT PLAN VIEW */}
          <div className={activeView === 'cutplan' ? 'block' : 'hidden print:block print:break-before-page'}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 sm:mb-4 print:hidden">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2"><Scissors size={18} /> Cut Optimization</h3>
              <Button
                variant={isUserPro ? "secondary" : "outline"}
                size="sm"
                onClick={() => isUserPro ? exportAllSheetsToDXFZip(cutPlan.sheets, project.settings, project.name) : navigate('/pricing')}
                className="min-h-[40px] gap-2"
              >
                {isUserPro ? <FileCode size={16} /> : <Lock size={14} className="text-amber-500" />}
                Export All DXF (ZIP)
              </Button>
            </div>
            {/* Screen view - grid layout */}
            <div className="max-w-full px-2 sm:px-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">{cutPlan.sheets.map((sheet, i) => (
                <div key={i} className="relative border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <CutPlanVisualizer sheet={sheet} index={i} settings={project.settings} />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => isUserPro ? exportSingleSheetToDXF(sheet, project.settings, i, project.name) : navigate('/pricing')}
                    className="absolute top-2 right-2 print:hidden gap-1"
                  >
                    {isUserPro ? <FileCode size={14} /> : <Lock size={12} className="text-amber-500" />}
                    DXF
                  </Button>
                </div>
              ))}</div>
            </div>
            {/* Print view - 2 per page in landscape */}
            <div className="hidden print:block">
              {Array.from({ length: Math.ceil(cutPlan.sheets.length / 2) }).map((_, pageIndex) => (
                <div key={pageIndex} className="print:break-before-page print:break-inside-avoid">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Scissors size={18} /> Cut Optimization - Sheets {(pageIndex * 2) + 1}-{Math.min((pageIndex * 2) + 2, cutPlan.sheets.length)}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {cutPlan.sheets.slice(pageIndex * 2, pageIndex * 2 + 2).map((sheet, i) => (
                      <CutPlanVisualizer key={pageIndex * 2 + i} sheet={sheet} index={pageIndex * 2 + i} settings={project.settings} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WALL PLAN VIEW */}
          <div className={activeView === 'wallplan' ? 'block' : 'hidden print:block print:break-before-page'}>
            <div className="max-w-[1600px] mx-auto px-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 print:block print:space-y-0">
                {project.zones.filter(z => z.active).map((zone, zoneIndex) => (
                  <div key={zone.id} className={`${zoneIndex > 0 ? 'print:break-before-page' : ''} h-full`}>
                    {/* PRINT VIEW: Table first, then visualization */}
                    <div className="hidden print:block">
                      {/* Page 1: Unit Schedule Table */}
                      <div className="border-4 border-black p-4 bg-white min-h-[calc(100vh-80px)]">
                        <h3 className="text-xl font-black uppercase mb-4 border-b-2 border-black pb-2 tracking-widest">{zone.id} - Unit Schedule</h3>
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Unit Schedule</h4>
                          <table className="w-full text-sm text-left uppercase font-bold border-collapse">
                            <thead>
                              <tr className="border-b-2 border-black text-slate-500">
                                <th className="pb-2">POS</th>
                                <th className="pb-2">Description</th>
                                <th className="pb-2 text-right">Width</th>
                                <th className="pb-2 text-right">Type</th>
                                <th className="pb-2 text-right">Qty</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black/10">
                              {[...zone.cabinets].sort((a, b) => (a.label || '').localeCompare(b.label || '')).map((cab, idx) => (
                                <tr key={idx}>
                                  <td className="py-3 text-amber-600 font-black italic">{cab.label}</td>
                                  <td className="py-3 font-black tracking-tight">{cab.preset}</td>
                                  <td className="py-3 text-right font-mono">{cab.width}mm</td>
                                  <td className="py-3 text-right text-xs opacity-60">{cab.type}</td>
                                  <td className="py-3 text-right">1</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Page 2: Wall Visualization - full page, no title */}
                      <div className="bg-white w-full h-[calc(100vh-80px)] flex flex-col items-center justify-start">
                        <div className="w-full flex items-center justify-center pt-8" style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                          <WallVisualizer zone={zone} height={zone.wallHeight || 2400} settings={project.settings} hideArrows={true} />
                        </div>
                      </div>
                    </div>

                    {/* SCREEN VIEW: Elevation Grid Item (A4 Style) */}
                    <div className="print:hidden h-full flex flex-col bg-[#fafafa] rounded-none shadow-2xl border-2 border-slate-300 relative overflow-hidden group">
                      {/* Technical Drawing Frame */}
                      <div className="absolute inset-4 border border-slate-400/30 pointer-events-none" />
                      <div className="absolute inset-5 border border-slate-400/20 pointer-events-none" />
                      
                      <div className="px-10 py-6 flex justify-between items-start z-10">
                        <div>
                          <h3 className="text-xl font-serif font-black text-slate-800 uppercase tracking-widest">{zone.id}</h3>
                          <div className="h-0.5 w-12 bg-amber-500 mt-1" />
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">ELEVATION PLAN / ARCHITECTURAL DRAWING</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-300 uppercase italic">SCALE: NTS</p>
                          <p className="text-[9px] font-black text-slate-300 uppercase">UNIT: MM</p>
                        </div>
                      </div>

                      <div className="p-8 flex-1 flex items-center justify-center min-h-[550px] relative">
                        {/* Block all interactions to make it look like a drawing */}
                        <div className="absolute inset-0 z-20 cursor-default" />
                        
                        <div className="w-full h-full">
                          <WallVisualizer 
                            zone={zone} 
                            height={zone.wallHeight || 2400} 
                            settings={project.settings} 
                            isStatic={true} 
                            forceWhite={true} 
                          />
                        </div>
                      </div>
                      
                      {/* Technical Footer Info */}
                      <div className="px-10 py-4 flex justify-between items-center bg-slate-100/50 border-t border-slate-200">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Project: {project.name || 'Standard Kitchen'}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Page: {zoneIndex + 1}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* QUOTATION PREVIEW */}
        <div className={`${activeView === 'quotation' ? 'block' : 'hidden'} print:hidden max-w-4xl mx-auto bg-white dark:bg-slate-900 shadow-2xl rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-black animate-in fade-in slide-in-from-bottom-4 duration-500`}>
          {/* Quotation Header (Matching PDF Layout) */}
          <div className="bg-slate-800 dark:bg-black text-white p-8 sm:p-12 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-6 print:bg-slate-800 print:text-white">
            <div>
              <h1 className="text-4xl sm:text-5xl font-light tracking-[0.2em] uppercase mb-2">{project.settings.quotationStatus === 'invoice' ? 'Invoice' : 'Quotation'}</h1>
              <p className="text-slate-400 text-xs tracking-widest uppercase">{project.settings.quotationStatus === 'invoice' ? 'Invoice / Bill' : 'Quotation / Bill of Quantities'}</p>
            </div>
            <div className="text-center sm:text-right">
              <div className="font-black text-lg uppercase mb-1 tracking-tight">{project.company || "Company Name"}</div>
              <div className="text-[10px] sm:text-xs space-y-1 opacity-70 uppercase tracking-wide">
                <div>Katuwawala Road, Borelesgamuwa,</div>
                <div>Western Province, Sri Lanka</div>
                <div className="font-bold text-amber-500">0777163564 | luxuselemente@gmail.com</div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-12 space-y-12 bg-white text-slate-900">
            {/* Total Banner */}
            <div className="bg-slate-50 p-6 flex justify-end items-end gap-12 border-b border-slate-100 rounded-lg">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1 text-right">Total Amount</div>
                <div className="text-4xl font-black tracking-tighter text-slate-900">{formatCurrency(costs.totalPrice)}</div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
              <div>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Bill To</div>
                <div className="text-2xl font-black uppercase tracking-tight text-slate-800">{project.name || "Customer Name"}</div>
                {project.company && <div className="text-slate-500 font-bold uppercase text-xs mt-1">{project.company}</div>}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between sm:justify-end gap-6 text-xs">
                  <span className="text-slate-400 uppercase font-bold tracking-widest">Quotation#</span>
                  <span className="font-bold text-slate-800">{quotationNumber}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-6 text-xs">
                  <span className="text-slate-400 uppercase font-bold tracking-widest">Quotation Date</span>
                  <span className="text-slate-800">{quotationDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-6 text-xs">
                  <span className="text-slate-400 uppercase font-bold tracking-widest">Due Date</span>
                  <span className="text-slate-800">{dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] font-bold italic tracking-widest">
                    <th className="pb-4 text-left w-12">#</th>
                    <th className="pb-4 text-left">Item & Description</th>
                    <th className="pb-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="border-t border-slate-200 divide-y divide-slate-100">
                  <tr>
                    <td className="py-6 align-top font-bold text-slate-400">01</td>
                    <td className="py-6 align-top">
                      <div className="font-black text-slate-800 uppercase tracking-tight mb-2">{(project.name || 'Cabinet Project') + ' Specifications'}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-[10px] text-slate-500 font-medium">
                        {quotationSpecifications.map((spec, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-amber-500">{(idx + 1).toString().padStart(2, '0')}.</span>
                            <span>{spec}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-6 align-top text-right font-black text-slate-900 text-lg">{formatCurrency(costs.totalPrice)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Note */}
            <div className="bg-amber-50/50 p-4 border-l-4 border-amber-200 text-[10px] text-amber-800 rounded-r-lg font-medium">
              <span className="font-black uppercase mr-2">Note:</span>
              Sink, tap, cooker, and hood to be provided by the customer unless mentioned above.
            </div>

            {/* PAGE BREAK / DIVIDER */}
            <div className="border-t-2 border-dashed border-slate-200 my-12 relative">
               <span className="absolute left-1/2 -top-3 -translate-x-1/2 bg-white px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Page 02 - Materials</span>
            </div>

            {/* MATERIAL SELECTIONS SECTION (PAGE 2) */}
            <div className="space-y-8">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4">Material Selections</h4>
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                      <th className="p-4">Cabinet Part</th>
                      <th className="p-4">Material / Finish Name</th>
                      <th className="p-4 text-center">Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(() => {
                      const matSettings = project.settings.materialSettings;
                      const textures = matSettings?.textureUrls || {};
                      
                      const selections = [
                        { label: 'Carcass (Internal)', name: matSettings?.carcassMaterial, img: textures['carcass'] },
                        { label: 'Door & Fronts', name: matSettings?.doorMaterial, img: textures['door'] || textures['carcass'] },
                        { label: 'Shelves', name: matSettings?.shelfMaterial, img: textures['shelf'] || textures['carcass'] },
                        { label: 'Back Panels', name: matSettings?.backMaterial, img: textures['back'] || textures['carcass'] },
                        { label: 'Drawer Boxes', name: matSettings?.drawerMaterial, img: textures['drawer'] || textures['carcass'] },
                      ];

                      return selections.map((mat, i) => (
                        <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4 font-black text-slate-700 uppercase tracking-tight">{mat.label}</td>
                          <td className="p-4 text-slate-500 font-bold">{mat.name || 'Standard Selection'}</td>
                          <td className="p-4">
                            <div className="flex justify-center">
                              {mat.img ? (
                                <div className="w-16 h-10 rounded border border-slate-200 overflow-hidden shadow-sm">
                                  <img src={mat.img} alt={mat.name} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-16 h-10 rounded bg-slate-100 border border-dashed border-slate-300" />
                              )}
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions Box */}
            <div className="pt-12 flex flex-col items-center gap-4 print:hidden border-t border-slate-100">
              {project.settings.quotationStatus !== 'invoice' ? (
                <Button variant="secondary" size="lg" onClick={async () => { const updated = { ...project, settings: { ...project.settings, quotationStatus: 'invoice' as const, quotationApprovedDate: new Date().toISOString() } }; setProject(updated); await projectService.updateProject(project.id, updated); }} className="gap-3 px-12 py-6 rounded-full shadow-lg hover:scale-105 transition-transform">
                  <Check size={24} /> Mark as Approved (Convert to Invoice)
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-green-600 font-bold">
                  <Check size={20} /> Invoice Approved on {new Date(project.settings.quotationApprovedDate || '').toLocaleDateString('en-GB')}
                </div>
              )}
              <Button variant="primary" size="lg" onClick={handlePrintQuotation} className="gap-3 px-12 py-6 rounded-full shadow-2xl shadow-amber-500/20 hover:scale-105 transition-transform">
                <Download size={24} /> {project.settings.quotationStatus === 'invoice' ? 'Download Invoice PDF' : 'Download Quotation PDF'}
              </Button>
              <button onClick={() => setActiveView('list')} className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest">Back to Report</button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-100 dark:border-slate-800 text-center text-[8px] text-slate-400 uppercase font-black tracking-[0.5em]">
            Generated by CABENGINE
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenBOMReport;
