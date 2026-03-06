import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function exportElementToPdf(element: HTMLElement, filename: string, title?: string) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;

  if (title) {
    pdf.setFontSize(14);
    pdf.text(title, margin, margin);
  }

  const topOffset = title ? 18 : margin;
  let remainingHeight = imgHeight;
  let position = topOffset;

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, position, usableWidth, imgHeight, undefined, 'FAST');
  remainingHeight -= pageHeight - topOffset - margin;

  while (remainingHeight > 0) {
    pdf.addPage();
    position = remainingHeight - imgHeight + margin;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, position, usableWidth, imgHeight, undefined, 'FAST');
    remainingHeight -= pageHeight - margin * 2;
  }

  pdf.save(filename);
}
