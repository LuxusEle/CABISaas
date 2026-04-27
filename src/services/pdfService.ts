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

// Helper to load images
const loadImageBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

export const generateQuotationPDF = async (
  project: Project,
  specifications: string[],
  costs: Costs,
  currency: string,
  isPro: boolean,
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
  doc.text('QUOTATION', pageWidth / 2, 22, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  const displayCompany = isPro ? (project.company || 'Company Name') : 'CABENGINE (FREE)';
  doc.text(displayCompany, pageWidth - margin, 12, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const addressLines = (isPro && additionalInfo?.companyAddress) ? additionalInfo.companyAddress : [
    'Professional Cabinet Engineering',
    'Get PRO for custom branding',
    'www.cabengine.com'
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

  const quotationDate = new Date();
  const dueDate = new Date(quotationDate);
  dueDate.setDate(dueDate.getDate() + 30);
  const quotationNumber = `QT-${Date.now().toString().slice(-6)}`;

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const customerName = isPro ? (project.name || 'Customer Name') : 'VALUED CUSTOMER';
  doc.text(customerName, margin, yPos);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 140, 140);
  doc.text('Quotation#', pageWidth - 70, yPos);
  doc.text('Quotation Date', pageWidth - 70, yPos + 5);
  doc.text('Due Date', pageWidth - 70, yPos + 10);

  doc.setTextColor(40, 40, 40);
  doc.text(quotationNumber, pageWidth - margin, yPos, { align: 'right' });
  doc.text(quotationDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), pageWidth - margin, yPos + 5, { align: 'right' });
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

  const colWidth = (pageWidth - margin * 2 - 10) / 2;
  const startY = yPos;
  let maxColumnY = yPos;

  specifications.forEach((spec, idx) => {
    const col = idx % 2;
    const x = margin + 10 + col * colWidth;
    
    // Reset yPos for the second column if needed
    if (col === 0 && idx > 0) {
      yPos = maxColumnY;
    } else if (col === 1) {
      yPos = Math.max(startY + Math.floor(idx / 2) * 5, yPos - (doc.splitTextToSize(specifications[idx-1], colWidth - 5).length * 4)); 
      // Simplified: just use a fixed increment or track per column
    }

    // Better approach: track Y for each column independently
  });

  // Re-writing the loop for better column management
  let leftY = startY;
  let rightY = startY;

  specifications.forEach((spec, idx) => {
    const isLeft = idx % 2 === 0;
    const x = isLeft ? margin + 10 : margin + 10 + colWidth;
    let currentY = isLeft ? leftY : rightY;

    const lines = doc.splitTextToSize(`${(idx + 1).toString().padStart(2, '0')}. ${spec}`, colWidth - 5);
    
    if (currentY + lines.length * 4 > summaryY - 10) {
      doc.addPage();
      leftY = margin;
      rightY = margin;
      currentY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 165, 0); // Orange like preview
    doc.text(`${(idx + 1).toString().padStart(2, '0')}.`, x, currentY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(112, 112, 112);
    
    lines.forEach((line: string, lIdx: number) => {
      // Remove the number from the first line for display if needed, but here we just print
      const textToPrint = lIdx === 0 ? line.substring(4) : line;
      doc.text(textToPrint, x + 6, currentY);
      currentY += 4;
    });

    if (isLeft) leftY = currentY;
    else rightY = currentY;
  });

  yPos = Math.max(leftY, rightY);

  yPos += 10;

  doc.setFontSize(8);
  doc.setTextColor(144, 144, 144);
  doc.setFont('helvetica', 'italic');
  doc.text('Note: Sink, tap, cooker, and hood to be provided by the customer unless mentioned above.', margin, yPos);

  yPos += 20;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.text('Looking forward for your business.', margin, yPos);

  if (isPro && (additionalInfo?.bankName || additionalInfo?.accountNumber)) {
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

  // Page 2: Material Selections & Terms
  doc.addPage();
  yPos = margin;

  // Material Selections Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('MATERIAL SELECTIONS', margin, yPos);
  
  yPos += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Table Headers
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text('CABINET PART', margin + 5, yPos);
  doc.text('MATERIAL NAME', margin + 50, yPos);
  doc.text('VISUAL PREVIEW', pageWidth - margin - 30, yPos, { align: 'center' });

  yPos += 5;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  const parts = [
    { label: 'Carcass', name: project.settings.materialSettings?.carcassMaterial, key: 'carcass' },
    { label: 'Doors/Fronts', name: project.settings.materialSettings?.doorMaterial, key: 'door' },
    { label: 'Shelves', name: project.settings.materialSettings?.shelfMaterial, key: 'shelf' }
  ];

  for (const part of parts) {
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(part.label, margin + 5, yPos + 10);

    doc.setFont('helvetica', 'normal');
    doc.text(part.name || 'Standard Wood', margin + 50, yPos + 10);

    // Try to add image
    const textureUrl = project.settings.materialSettings?.textureUrls?.[part.key];
    if (textureUrl) {
      try {
        const base64 = await loadImageBase64(textureUrl);
        doc.addImage(base64, 'PNG', pageWidth - margin - 45, yPos, 30, 20);
      } catch (err) {
        doc.setFontSize(8);
        doc.setTextColor(200, 100, 100);
        doc.text('(Image not available)', pageWidth - margin - 45, yPos + 10);
      }
    } else {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Standard finish', pageWidth - margin - 45, yPos + 10);
    }

    yPos += 25;
    doc.setDrawColor(240, 240, 240);
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
  }

  yPos += 10;

  // Page 3: Terms & Conditions
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

  doc.save(`${project.name || 'Quotation'}_Quotation.pdf`);
};

export default { generateQuotationPDF };
