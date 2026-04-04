import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Utility to download data as a CSV file.
 * @param data Array of objects representing rows.
 * @param filename Desired name of the file (e.g., 'export.csv').
 */
export const downloadCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(fieldName => {
        const value = row[fieldName];
        const escaped = ('' + (value ?? '')).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Utility to download data as a branded PDF file.
 * @param data Array of objects representing rows.
 * @param title Title of the document.
 * @param filename Desired name of the file.
 */
export const downloadPDF = (data: any[], title: string, filename: string) => {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();
  const headers = Object.keys(data[0]);
  const rows = data.map(item => Object.values(item)) as any[][];

  // Branding: Moore Hotel & Suites
  doc.setFontSize(22);
  doc.setTextColor(2, 6, 23); // Slate 950
  doc.text("MOORE HOTEL & SUITES", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("OPERATIONAL INTELLIGENCE & FORENSIC LEDGER", 14, 28);
  
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.line(14, 32, 196, 32);

  // Document Title
  doc.setFontSize(16);
  doc.setTextColor(2, 6, 23);
  doc.text(title.toUpperCase(), 14, 45);
  
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 50);

  // Data Table
  autoTable(doc, {
    startY: 55,
    head: [headers.map(h => h.toUpperCase())],
    body: rows,
    theme: 'grid',
    headStyles: { 
      fillColor: [2, 6, 23], 
      textColor: [255, 255, 255], 
      fontSize: 8, 
      fontStyle: 'bold' 
    },
    styles: { 
      fontSize: 7, 
      cellPadding: 3,
      valign: 'middle'
    },
    alternateRowStyles: { 
      fillColor: [248, 250, 252] // Slate 50
    },
    margin: { top: 55 }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `MOORE HOTEL & SUITES • SECURITY PROTOCOL • Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save(filename);
};

/**
 * Calculates password strength on a scale of 0-5.
 */
export const calculateStrength = (p: string) => {
  let score = 0;
  if (!p) return 0;
  if (p.length >= 6) score += 1;
  if (p.length >= 10) score += 1;
  if (/[A-Z]/.test(p)) score += 1;
  if (/[0-9]/.test(p)) score += 1;
  if (/[^A-Za-z0-9]/.test(p)) score += 1;
  return score;
};
