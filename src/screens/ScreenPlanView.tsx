import React, { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { Project } from '../types';
import { Button } from '../components/Button';
import { KitchenPlanCanvas } from '../components/KitchenPlanCanvas';
import { generateProjectBOM, buildProjectConstructionData } from '../services/bomService';

// We might need to pass TitleBlock as a prop or define it here if it's small
// For now, I'll assume TitleBlock is still in App.tsx or we can move it too.

interface ScreenPlanViewProps {
  project: Project;
  TitleBlock: React.ComponentType<{ project: Project; pageTitle: string }>;
}

const ScreenPlanView = ({ project, TitleBlock }: ScreenPlanViewProps) => {
  const bomData = useMemo(() => generateProjectBOM(project), [project.id, project.zones, project.settings]);
  const handlePrint = () => setTimeout(() => window.print(), 100);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <TitleBlock project={project} pageTitle="Shop Filing Document - Plan View" />

      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0 print:hidden">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Technical Plan View</h2>
        <Button variant="primary" size="sm" onClick={handlePrint} leftIcon={<Printer size={16} />}>Print Shop Filing Doc (A4)</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-950 print:bg-white print:p-0">
        <div className="max-w-6xl mx-auto space-y-8 print:space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl shadow-sm border dark:border-slate-800 print:border-none print:shadow-none print:p-0">
            <KitchenPlanCanvas data={buildProjectConstructionData(project)} scalePxPerMeter={120} />
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl shadow-sm border dark:border-slate-800 print:border-4 print:border-black print:p-4 print:rounded-none print:break-before-page">
            <h3 className="text-xl font-black mb-6 uppercase tracking-widest border-b-2 pb-2 print:border-b-4 print:border-black">Project BOM (Bill of Materials)</h3>
            <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
              {bomData.groups.map((group, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-xl print:border-2 print:border-black print:rounded-none print:break-inside-avoid">
                  <div className="font-bold text-amber-600 mb-2 text-sm uppercase">{group.cabinetName}</div>
                  <table className="w-full text-xs italic">
                    <tbody>
                      {group.items.map((item, j) => (
                        <tr key={j} className="border-b dark:border-slate-800 print:border-black/10">
                          <td className="py-1">{item.name}</td>
                          <td className="py-1 text-right font-mono opacity-60">{item.length}x{item.width}</td>
                          <td className="py-1 text-right font-bold">x{item.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t-2 border-slate-100 dark:border-slate-800 print:border-t-4 print:border-black">
              <h4 className="font-black uppercase mb-4 text-slate-400 print:text-black">Hardware Summary</h4>
              <div className="flex flex-wrap gap-4">
                {Object.entries(bomData.hardwareSummary).map(([name, qty]) => (
                  <div key={name} className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg print:border print:border-black">
                    <span className="text-xs font-bold mr-2 uppercase opacity-60">{name}</span>
                    <span className="font-black text-amber-600 print:text-black">{qty}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenPlanView;
