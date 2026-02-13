import jsPDF from 'jspdf';
import { Project, BOMGroup } from '../types';

interface BOMData {
  groups: BOMGroup[];
  hardwareSummary: Record<string, number>;
  totalArea: number;
  totalLinearFeet: number;
  cabinetCount: number;
}

export const exportToInvoicePDF = (project: Project, data: BOMData, currency: string = 'LKR', totalWithMargin?: number) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Header Section with Dark Background
  doc.setFillColor(40, 40, 40);
  doc.rect(0, 0, pageWidth, 60, 'F');
  
  // Company Logo (if exists) - Left side
  if (project.settings.logoUrl) {
    try {
      doc.addImage(project.settings.logoUrl, 'JPEG', 20, 10, 35, 35);
    } catch (e) {
      console.log('Logo could not be loaded');
    }
  }
  
  // INVOICE Title - Center
  doc.setFontSize(36);
  doc.setTextColor(200, 200, 200);
  doc.setFont('helvetica', 'normal');
  doc.text('INVOICE', pageWidth / 2, 40, { align: 'center' });
  
  // Company Info - Right side
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(project.company || 'Company Name', pageWidth - 20, 15, { align: 'right' });
  doc.text('Cabinet Manufacturing Services', pageWidth - 20, 21, { align: 'right' });
  
  // Calculate costs for display (without margin)
  const costs = project.settings.costs;
  let materialTotal = 0;
  let hardwareTotal = 0;
  
  // Calculate material costs
  const materialSummary: Record<string, { qty: number, cost: number }> = {};
  data.groups.forEach(group => {
    group.items.forEach(item => {
      if (!item.isHardware && item.qty > 0) {
        const key = item.material || 'Material';
        if (!materialSummary[key]) {
          materialSummary[key] = { qty: 0, cost: 0 };
        }
        materialSummary[key].qty += item.qty;
      }
    });
  });
  
  // Calculate material costs
  Object.entries(materialSummary).forEach(([material, value]) => {
    const cost = value.qty * (costs?.pricePerSheet || 85);
    materialSummary[material].cost = cost;
    materialTotal += cost;
  });
  
  // Calculate hardware costs
  data.hardwareSummary && Object.entries(data.hardwareSummary).forEach(([name, qty]) => {
    if (qty > 0) {
      hardwareTotal += qty * (costs?.pricePerHardwareUnit || 5);
    }
  });
  
  // Calculate labor costs
  const laborHours = data.cabinetCount * (costs?.laborHoursPerCabinet || 1.5);
  const laborCost = laborHours * (costs?.laborRatePerHour || 60);
  
  // Use provided total with margin, or calculate if not provided
  const subtotalAmount = materialTotal + hardwareTotal + laborCost;
  const marginPercent = costs?.marginPercent || 50;
  const totalAmount = totalWithMargin !== undefined ? totalWithMargin : subtotalAmount * (1 + marginPercent / 100);
  
  // Total Banner
  doc.setFillColor(240, 240, 240);
  doc.rect(0, 60, pageWidth, 30, 'F');
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL', pageWidth - 100, 78, { align: 'right' });
  
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalAmount), pageWidth - 20, 78, { align: 'right' });
  
  let yPos = 105;
  
  // Customer Info Section - Left
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text(project.company || 'Client Company', 20, yPos);
  
  // Invoice Details - Right side
  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 30);
  const invoiceNumber = `QT-${Date.now().toString().slice(-6)}`;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  
  const detailsX = pageWidth - 120;
  doc.text('Invoice#', detailsX, yPos);
  doc.setTextColor(40, 40, 40);
  doc.text(invoiceNumber, pageWidth - 20, yPos, { align: 'right' });
  
  doc.setTextColor(100, 100, 100);
  doc.text('Invoice Date', detailsX, yPos + 7);
  doc.setTextColor(40, 40, 40);
  doc.text(invoiceDate.toLocaleDateString('en-GB'), pageWidth - 20, yPos + 7, { align: 'right' });
  
  doc.setTextColor(100, 100, 100);
  doc.text('Due Date', detailsX, yPos + 14);
  doc.setTextColor(40, 40, 40);
  doc.text(dueDate.toLocaleDateString('en-GB'), pageWidth - 20, yPos + 14, { align: 'right' });
  
  yPos += 35;
  
  // Column Headers
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(20, yPos - 5, pageWidth - 20, yPos - 5);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('#', 30, yPos);
  doc.text('ITEM & DESCRIPTION', 50, yPos);
  doc.text('AMOUNT', pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 5;
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 15;
  
  // Main Item Row
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.text('1', 30, yPos);
  doc.text(`${project.name} Specifications`, 50, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalAmount), pageWidth - 20, yPos, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`1.00 x ${formatCurrency(totalAmount)}`, pageWidth - 20, yPos + 6, { align: 'right' });
  
  yPos += 15;
  
  // Item Specifications/Bullet Points
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  
  // Collect specifications
  const specs: string[] = [];
  
  // Add materials
  Object.entries(materialSummary).forEach(([material, value]) => {
    if (value.qty > 0) {
      const materialName = material.replace(/\d+mm\s*/, '').trim();
      specs.push(`${specs.length + 1}.${materialName} material included`);
    }
  });
  
  // Add hardware summary
  data.hardwareSummary && Object.entries(data.hardwareSummary).forEach(([name, qty]) => {
    if (qty > 0) {
      specs.push(`${specs.length + 1}.${name} included`);
    }
  });
  
  // Add labor
  if (laborCost > 0) {
    specs.push(`${specs.length + 1}.Installation and labor included`);
  }
  
  // Add cabinet count
  if (data.cabinetCount > 0) {
    specs.push(`${specs.length + 1}.${data.cabinetCount} cabinet units`);
  }
  
  // Draw specifications
  specs.forEach((spec) => {
    doc.text(spec, 50, yPos);
    yPos += 6;
  });
  
  // Note
  yPos += 5;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Note: Installation and delivery as per project specifications.', 50, yPos);
  
  yPos += 20;
  
  // Check if we need a new page for the summary
  if (yPos > pageHeight - 100) {
    doc.addPage();
    yPos = 30;
  }
  
  // Summary Section
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 12;
  
  // Looking forward message - Left
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text('Looking forward for your business.', 20, yPos);
  
  // Sub Total - Right
  doc.setTextColor(100, 100, 100);
  doc.text('Sub Total', pageWidth - 100, yPos, { align: 'right' });
  doc.setTextColor(40, 40, 40);
  doc.text(formatCurrency(subtotalAmount), pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 15;
  
  // Total - Right
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', pageWidth - 100, yPos, { align: 'right' });
  doc.text(formatCurrency(totalAmount), pageWidth - 20, yPos, { align: 'right' });
  
  // Company Bank Details - Bottom Left
  yPos += 20;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text((project.company || 'Company Name').toUpperCase(), 20, yPos);
  doc.text('BANK NAME - BANK ACCOUNT', 20, yPos + 5);
  doc.text('ACCOUNT NUMBER - XXXX XXXX XXXX', 20, yPos + 10);
  
  // Terms & Conditions - Bottom
  yPos += 25;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Payment due within 30 days from the invoice date. All prices are inclusive of applicable taxes.', 20, yPos + 5);
  
  // Save PDF
  doc.save(`Invoice-${project.name.replace(/\s+/g, '-')}-${invoiceDate.toISOString().split('T')[0]}.pdf`);
};

export default exportToInvoicePDF;
