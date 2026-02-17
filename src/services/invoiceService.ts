import { Project, BOMGroup } from '../types';

interface BOMData {
  groups: BOMGroup[];
  hardwareSummary: Record<string, number>;
  totalArea: number;
  totalLinearFeet: number;
  cabinetCount: number;
}

export const exportToInvoicePDF = (project: Project, data: BOMData, currency: string = 'LKR', totalWithMargin?: number) => {
  // This function now just triggers print - the invoice content should be rendered in the DOM
  // with appropriate print-only CSS classes
  return {
    project,
    data,
    currency,
    totalWithMargin
  };
};

export default exportToInvoicePDF;
