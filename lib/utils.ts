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
export const createReportPDF = (data: Record<string, unknown>[], title: string) => {
  const headers = data.length ? Object.keys(data[0]) : [];
  const doc = new jsPDF({ orientation: headers.length > 5 ? 'landscape' : 'portrait' });
  const width = doc.internal.pageSize.getWidth();
  doc.setFontSize(18); doc.text('MOORE HOTEL & SUITES', 14, 18);
  doc.setFontSize(12); doc.text(title, 14, 26);
  doc.setFontSize(8); doc.text('Generated: ' + new Date().toLocaleString('en-GB'), 14, 33);
  const format = (key: string, value: unknown) => {
    if (value == null) return '';
    if (/amount|total|paid|refund/i.test(key) && typeof value === 'number') return 'NGN ' + value.toLocaleString('en-NG', {minimumFractionDigits:2,maximumFractionDigits:2});
    if (/checkin|checkout|createdat|date/i.test(key) && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0,10);
    return String(value);
  };
  if (!data.length) doc.text('No records for this selection.', 14, 44);
  else autoTable(doc, {
    startY: 40,
    head: [headers.map(key=>key.replace(/([a-z])([A-Z])/g,'$1 $2'))],
    body: data.map(row=>headers.map(key=>format(key,row[key]))),
    theme: 'grid', rowPageBreak: 'avoid', showHead: 'everyPage',
    headStyles: {fillColor:[2,6,23],textColor:255,fontSize:8,fontStyle:'bold'},
    styles: {fontSize:8,cellPadding:2,valign:'middle',overflow:'linebreak'},
    alternateRowStyles:{fillColor:[248,250,252]},
    columnStyles:Object.fromEntries(headers.map((key,index)=>[index,/^(ref|reference|bookingcode)$/i.test(key) ? {minCellWidth:30} : /transaction|bankreference/i.test(key) ? {minCellWidth:45} : /checkin|checkout|createdat/i.test(key) ? {minCellWidth:23} : {}])),
    margin:{top:18,bottom:18,left:14,right:14}
  });
  const count=doc.getNumberOfPages();
  for(let page=1;page<=count;page++){
    doc.setPage(page);doc.setFontSize(8);
    doc.text('Moore Hotels & Suites | Page '+page+' of '+count,width/2,doc.internal.pageSize.getHeight()-9,{align:'center'});
  }
  return doc;
};
export const downloadPDF = (data: Record<string, unknown>[], title: string, filename: string) => createReportPDF(data, title).save(filename);

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
