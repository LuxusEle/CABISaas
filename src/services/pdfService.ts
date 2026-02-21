import jsPDF from 'jspdf';
import { Project } from '../types';

interface MaterialSummary {
  material: string;
  sheets: number;
  dims: string;
}

interface Costs {
  materialCost: number;
  hardwareCost: number;
  laborCost: number;
  subtotal: number;
  totalPrice: number;
}

export const generateInvoicePDF = (
  project: Project,
  specifications: string[],
  costs: Costs,
  currency: string,
  additionalInfo?: {
    companyAddress?: string[];
    phone?: string;
    email?: string;
    bankName?: string;
    accountNumber?: string;
  }
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const summaryY = pageHeight - 60;
  let yPos = margin;

  // Dark header
  doc.setFillColor(40, 40, 40);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'normal');
  doc.text('INVOICE', pageWidth / 2, 22, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(project.company || 'Company Name', pageWidth - margin, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const addressLines = additionalInfo?.companyAddress || [
    'Katuwawala Road',
    'Borelesgamuwa',
    'Western Province',
    'Sri Lanka'
  ];
  addressLines.forEach((line, idx) => {
    doc.text(line, pageWidth - margin, 17 + idx * 4, { align: 'right' });
  });

  yPos = 45;

  // Total banner
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - margin * 2, 15, 'F');

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text('TOTAL', pageWidth - 80, yPos + 10);
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${currency}${costs.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, yPos + 11, { align: 'right' });

  yPos += 30;

  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 30);
  const invoiceNumber = `QT-${Date.now().toString().slice(-6)}`;

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(project.company || 'Customer Name', margin, yPos);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 140, 140);
  doc.text('Invoice#', pageWidth - 70, yPos);
  doc.text('Invoice Date', pageWidth - 70, yPos + 5);
  doc.text('Due Date', pageWidth - 70, yPos + 10);

  doc.setTextColor(40, 40, 40);
  doc.text(invoiceNumber, pageWidth - margin, yPos, { align: 'right' });
  doc.text(invoiceDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), pageWidth - margin, yPos + 5, { align: 'right' });
  doc.text(dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), pageWidth - margin, yPos + 10, { align: 'right' });

  yPos += 30;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text('#', margin, yPos);
  doc.text('ITEM & DESCRIPTION', margin + 10, yPos);
  doc.text('AMOUNT', pageWidth - margin, yPos, { align: 'right' });

  yPos += 8;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('1', margin, yPos);
  doc.text((project.name || 'Cabinet Project') + ' Specifications', margin + 10, yPos);

  doc.text(`${currency}${costs.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, yPos, { align: 'right' });

  yPos += 8;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(112, 112, 112);

  specifications.forEach((spec, idx) => {
    // Handle long text wrapping for specifications
    const lines = doc.splitTextToSize(`${idx + 1}. ${spec}`, pageWidth - margin - (margin + 10));
    lines.forEach((line: string) => {
      if (yPos > summaryY - 10) { // Check if near footer
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin + 10, yPos);
      yPos += 4;
    });
  });

  yPos += 10;

  doc.setFontSize(8);
  doc.setTextColor(144, 144, 144);
  doc.setFont('helvetica', 'italic');
  doc.text('Note: Sink, tap, cooker, and hood to be provided by the customer unless mentioned above.', margin, yPos);

  yPos += 20;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.text('Looking forward for your business.', margin, yPos);

  if (additionalInfo?.bankName || additionalInfo?.accountNumber) {
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text(project.company?.toUpperCase() || 'COMPANY', margin, yPos);
    yPos += 4;
    doc.setFont('helvetica', 'normal');
    if (additionalInfo.bankName) {
      doc.text(`BANK NAME - ${additionalInfo.bankName.toUpperCase()}`, margin, yPos);
      yPos += 4;
    }
    if (additionalInfo.accountNumber) {
      doc.text(`ACCOUNT NUMBER - ${additionalInfo.accountNumber}`, margin, yPos);
    }
  }



  doc.setFillColor(248, 248, 248);
  doc.rect(margin, summaryY, pageWidth - margin * 2, 35, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, summaryY, pageWidth - margin, summaryY);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Sub Total', pageWidth - 80, summaryY + 12);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text(`${currency}${costs.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, summaryY + 12, { align: 'right' });

  doc.line(pageWidth - 80, summaryY + 18, pageWidth - margin, summaryY + 18);

  doc.setFontSize(12);
  doc.text('Total', pageWidth - 80, summaryY + 28);
  doc.setFontSize(14);
  doc.text(`${currency}${costs.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin, summaryY + 28, { align: 'right' });

  // Page 2: Terms & Conditions
  doc.addPage();
  yPos = margin;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('TERMS & CONDITIONS', margin, yPos);
  doc.line(margin, yPos + 3, margin + 40, yPos + 3);
  yPos += 12;

  const terms = [
    '1. ADVANCE OF 85% FROM THE ESTIMATE SHOULD BE PLACED IN THE COMPANY ACCOUNT TO COMMENCE THE PROJECT. (ADVANCED WILL NOT BE REFUNDED AFTER THE PROJECT STARTS).',
    '2. PROJECT STARTS AFTER THE DULY SIGNED PROJECT DOCUMENT IS RECEIVED BY THE PRODUCTION UNIT AND CLARIFICATION OF THE SPECIAL REQUESTS IS COMPLETED AND DULLY ACCEPTED BY THE CLIENT.',
    '3. 30 DAYS WILL BE ALLOCATED FOR THE PRODUCTION FROM THE FINAL CLARIFICATIONS DATE MENTIONED 2. ABOVE.',
    '4. CLIENT SHOULD PROVIDE ACCESS TO THE SITE UN UNINTERRUPTEDLY UNLESS THE PROJECT MAY HOLD TILL SUCH ARRANGEMENTS ARE MADE.',
    '5. SELECTION OF MATERIAL AND DESIGN ARE FINAL AND AMENDING/ CHANGING DURING PRODUCTION INCUR EXTRA CHARGES.',
    '6. FULL PAYMENT FOR ACCESSORIES (IF ANY) SHOULD BE PAID TO START PRODUCTION',
    '7. PRODUCTION IS COMPLETED UPON FULL PAYMENT MADE BY THE CUSTOMER',
    '8. PARTS ARE WITHOUT LABOR COST IF ASSEMBLY IS DONE BY INFINITY FIXING CHARGE PER LINEAR FOOT ADDED',
    '9. ABOVE PRICING ARE FOR THE UNITS ONLY WHICH EXCLUDES FROM ALL OTHER ACCESSORY, FITTING, WIRING, PLUMBING, TRANSPORT, AND HANDLING COSTS OR ANY COST NOT DIRECTLY RELATED TO THE MAKING OF STORAGE COMPARTMENTS.',
    '10. ACCESSORIES (UNLESS MENTIONED IN THE PRODUCT SECTION) ARE TO BE PROVIDED BY THE CUSTOMER BEFORE PRODUCTION STARTS',
    '11. GRANITE / MARBLE OR ANY OTHER TOP SHOULD BE PROVIDED BY THE CUSTOMER (INFINITY MAY PROVIDE AN OPINION FOR THE COLOR / MATERIAL SELECTION AS A FREE SERVICE).',
    '12. 220V ELECTRICAL WIRING AND SINK, WASTE PLUMBING FUME HOOD VENTILATION, GAS LINES, POWER FOR THE COOKER, POWER LINE FOR OWENS, OR ANY ELECTRICAL DEVICE (OR MUST BE CARRIED OUT ACCORDING TO THE PROJECT PLASE BY COMPETENT TECHNICAL STAFF) MUST BE ARRANGED BY THE CUSTOMER BEFORE PRODUCTION START UNIT REPLACEMENT OR INSTALLATION.'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);

  terms.forEach(term => {
    const lines = doc.splitTextToSize(term, pageWidth - margin * 2);
    lines.forEach((line: string) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 3;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Generated by CABENGINE', pageWidth / 2, pageHeight - 10, { align: 'center' });

  doc.save(`${project.name || 'Invoice'}_Invoice.pdf`);
};

export default { generateInvoicePDF };
