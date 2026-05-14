import { Project } from '../types';

export interface ProjectTask {
  id: string;
  label: string;
  done: boolean;
}

export interface ProjectProgressStats {
  setup: { done: number; total: number; status: 'not_started' | 'in_progress' | 'complete'; tasks: ProjectTask[] };
  walls: { done: number; total: number; status: 'not_started' | 'in_progress' | 'complete'; tasks: ProjectTask[] };
  output: { done: number; total: number; status: 'not_started' | 'in_progress' | 'complete'; tasks: ProjectTask[] };
}

export const calculateProjectProgress = (project: Project): ProjectProgressStats => {
  const completedSteps = project.settings.completedSteps || [];
  const progress = project.settings.progress || {
    dxfDownloaded: false,
    excelDownloaded: false,
    reportViewed: false,
    quotationGenerated: false
  };

  // 1. Setup Status
  const setupTasks: ProjectTask[] = [
    { id: 'project', label: 'Project Identity', done: project.name.trim().length > 0 },
    { id: 'walls', label: 'Room Layout', done: project.zones.length > 0 && project.zones.some(z => z.totalLength > 0) },
    { id: 'limits', label: 'Wall Limits', done: project.zones.length > 0 && project.zones.some(z => z.totalLength > 0) && project.zones.every(z => (z.startLimit !== undefined && z.endLimit !== undefined) || (z.startLimit === 0 && z.endLimit === z.totalLength)) },
    { id: 'preferences', label: 'Smart Preferences', done: !!project.settings.layoutPreferences || completedSteps.includes('preferences') },
    { id: 'materials', label: 'Materials', done: project.settings.materialSettings?.carcassMaterial !== '' || completedSteps.includes('sheets') },
    { id: 'hardware', label: 'Hardware & Fittings', done: completedSteps.includes('hardware') },
    { id: 'construction', label: 'Construction Rules', done: (() => {
      const mat = project.settings.materialSettings;
      if (!mat) return false;
      return !!mat.carcassMaterial && !!mat.doorMaterial && !!mat.drawerMaterial && !!mat.backMaterial && !!mat.shelfMaterial &&
             !!mat.textureUrls?.carcass && !!mat.textureUrls?.door && !!mat.textureUrls?.drawer && !!mat.textureUrls?.back && !!mat.textureUrls?.shelf;
    })() },
    { id: 'costs', label: 'Pricing & Margins', done: completedSteps.includes('costs') },
    { id: 'generation', label: 'Ready to Launch', done: project.name.trim().length > 0 && project.zones.some(z => z.totalLength > 0) && project.zones.every(z => z.startLimit !== undefined) && (!!project.settings.layoutPreferences || completedSteps.includes('preferences')) }
  ];
  const setupDone = setupTasks.filter(t => t.done).length;

  // 2. Walls/Design Status
  const designTasks: ProjectTask[] = [
    { id: '3d', label: '3D Layout Generated', done: project.zones.some(z => z.cabinets.length > 0) },
    { id: 'validation', label: 'No Overlaps/Errors', done: project.zones.some(z => z.cabinets.length > 0) }
  ];
  const designDone = designTasks.filter(t => t.done).length;

  // 3. BOM/Export Status
  const exportTasks: ProjectTask[] = [
    { id: 'report', label: 'BOM Report Viewed', done: progress.reportViewed },
    { id: 'dxf', label: 'DXF Manufacturing Files', done: progress.dxfDownloaded },
    { id: 'excel', label: 'Cutting List (Excel)', done: progress.excelDownloaded },
    { id: 'quotation', label: 'Quotation/Invoice', done: progress.quotationGenerated || project.settings.quotationStatus === 'invoice' }
  ];
  const exportDone = exportTasks.filter(t => t.done).length;

  const getStatus = (done: number, total: number) => {
    if (done === 0) return 'not_started';
    if (done < total) return 'in_progress';
    return 'complete';
  };

  return {
    setup: { done: setupDone, total: setupTasks.length, status: getStatus(setupDone, setupTasks.length), tasks: setupTasks },
    walls: { done: designDone, total: designTasks.length, status: getStatus(designDone, designTasks.length), tasks: designTasks },
    output: { done: exportDone, total: exportTasks.length, status: getStatus(exportDone, exportTasks.length), tasks: exportTasks }
  };
};
