import { jsPDF } from 'jspdf';

export interface ReportMetrics {
  totalLeads: number;
  conversions: number;
  revenue: number;
  avgDealSize: number;
}

export interface ChannelPerformance {
  name: string;
  leads: number;
  converted: number;
  value: number;
  color: string;
}

export interface ExecutivePerformance {
  name: string;
  region: string;
  conversionRate: number;
  revenue: number;
}

export interface ReportData {
  period: 'weekly' | 'monthly';
  generatedAt: string;
  metrics: ReportMetrics;
  channelPerformance: ChannelPerformance[];
  revenueData: { label: string; revenue: number }[];
  leadTrendData: { label: string; leads: number; converted: number }[];
  executives?: ExecutivePerformance[];
}

function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

function getPageHeight(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight();
}

function getPageWidth(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth();
}

export function generateReportPdf(data: ReportData): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = getPageWidth(doc);
  const pageHeight = getPageHeight(doc);
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header
  doc.setFillColor(99, 102, 241); // violet-600
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('LeadFlow', margin, 18);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Reports & Insights', margin, 26);
  doc.text(data.generatedAt, pageWidth - margin - doc.getTextWidth(data.generatedAt), 26);
  doc.setTextColor(0, 0, 0);
  y = 40;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.period === 'weekly' ? 'Weekly' : 'Monthly'} Performance Report`, margin, y);
  y += 10;

  // Key metrics
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Metrics', margin, y);
  y += 6;

  const metrics = [
    ['Total Leads', data.metrics.totalLeads.toString()],
    ['Conversions', data.metrics.conversions.toString()],
    ['Revenue', formatCurrency(data.metrics.revenue)],
    ['Avg Deal Size', formatCurrency(data.metrics.avgDealSize)],
  ];

  const colWidth = contentWidth / 4;
  const colSpacing = 4;
  metrics.forEach(([label, value], i) => {
    const x = margin + i * (colWidth + colSpacing);
    doc.setFillColor(250, 250, 249); // stone-50
    doc.roundedRect(x, y - 4, colWidth, 12, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(label, x + 4, y + 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(28, 25, 23);
    doc.text(value, x + 4, y + 8);
  });
  y += 18;

  // Channel performance
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Channel Performance', margin, y);
  y += 6;

  const maxChannelValue = Math.max(...data.channelPerformance.map((c) => c.value), 1);
  data.channelPerformance.forEach((ch) => {
    const convRate = ch.leads > 0 ? Math.round((ch.converted / ch.leads) * 100) : 0;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${ch.name}`, margin, y + 4);
    doc.text(`${ch.leads} leads • ${ch.converted} converted • ${convRate}%`, margin + 45, y + 4);
    doc.text(formatCurrency(ch.value), pageWidth - margin - doc.getTextWidth(formatCurrency(ch.value)), y + 4);

    const barWidth = (ch.value / maxChannelValue) * (contentWidth - 80);
    const [r, g, b] = hexToRgb(ch.color);
    doc.setFillColor(r, g, b);
    doc.roundedRect(margin + 45, y + 4, Math.max(barWidth, 2), 4, 1, 1, 'FD');
    y += 10;
  });
  y += 8;

  // Revenue trend
  if (data.revenueData.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Revenue Trend', margin, y);
    y += 6;

    const maxRev = Math.max(1, ...data.revenueData.map((d) => d.revenue));
    const barMaxWidth = contentWidth - 50;
    data.revenueData.forEach((d) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(d.label, margin, y + 5);
      doc.text(formatCurrency(d.revenue), pageWidth - margin - doc.getTextWidth(formatCurrency(d.revenue)), y + 5);
      const w = (d.revenue / maxRev) * barMaxWidth;
      doc.setFillColor(99, 102, 241);
      doc.roundedRect(margin + 45, y + 1, Math.max(w, 2), 6, 1, 1, 'FD');
      y += 10;
    });
    y += 8;
  }

  // Lead trend
  if (data.leadTrendData.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Lead Trend', margin, y);
    y += 6;

    const headers = ['Period', 'Leads', 'Converted'];
    const colW = contentWidth / 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setFillColor(245, 245, 244);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.text(headers[0], margin + 4, y + 5.5);
    doc.text(headers[1], margin + colW, y + 5.5);
    doc.text(headers[2], margin + colW * 2, y + 5.5);
    y += 8;

    doc.setFont('helvetica', 'normal');
    data.leadTrendData.forEach((d) => {
      doc.setFontSize(9);
      doc.text(d.label, margin + 4, y + 5);
      doc.text(d.leads.toString(), margin + colW, y + 5);
      doc.text(d.converted.toString(), margin + colW * 2, y + 5);
      y += 7;
    });
    y += 8;
  }

  // Team performance (admin only)
  if (data.executives && data.executives.length > 0) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Team Performance', margin, y);
    y += 6;

    const headers = ['Executive', 'Region', 'Conversion', 'Revenue'];
    const colW = contentWidth / 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setFillColor(245, 245, 244);
    doc.rect(margin, y, contentWidth, 8, 'F');
    headers.forEach((h, i) => doc.text(h, margin + 4 + i * colW, y + 5.5));
    y += 8;

    doc.setFont('helvetica', 'normal');
    data.executives.forEach((e) => {
      doc.setFontSize(9);
      doc.text(e.name, margin + 4, y + 5);
      doc.text(e.region, margin + 4 + colW, y + 5);
      doc.text(`${e.conversionRate}%`, margin + 4 + colW * 2, y + 5);
      doc.text(formatCurrency(e.revenue), margin + 4 + colW * 3, y + 5);
      y += 7;
    });
  }

  // Footer on each page
  let totalPages = 1;
  try {
    const pages = (doc as unknown as { internal?: { pages?: unknown[] } }).internal?.pages;
    totalPages = pages && Array.isArray(pages) ? Math.max(1, pages.length - 1) : 1;
  } catch {
    totalPages = 1;
  }
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(
      `Page ${i} of ${totalPages} • Generated by LeadFlow`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const safeDate = new Date().toISOString().slice(0, 10);
  const filename = `leadflow-report-${data.period}-${safeDate}.pdf`;
  doc.save(filename);
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [99, 102, 241];
}

// Legacy: keep for backward compatibility with section exports
export async function exportElementToPdf(element: HTMLElement, filename: string, title?: string) {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;
    const imgHeight = Math.min((canvas.height * usableWidth) / canvas.width, pageHeight - margin * 2);

    if (title) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, margin, margin + 6);
    }

    const topOffset = title ? 20 : margin;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, topOffset, usableWidth, imgHeight, undefined, 'FAST');
    pdf.save(filename);
  } catch (err) {
    console.error('PDF export failed:', err);
    throw new Error('Failed to generate PDF. Please try the "Download Full Report" button instead.');
  }
}
