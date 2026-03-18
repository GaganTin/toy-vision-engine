import React from 'react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, FileType } from 'lucide-react';

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDateForFilename(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) { return '' }
}


// Convert markdown bold (**text**) to plain text with bold for PDF, and just plain for TXT
function markdownToPlainWithBold(text, forPdf = false) {
  if (!text) return '';
  // Replace **bold** with just bold text, optionally with PDF bold
  if (forPdf) {
    // We'll handle bold in PDF export below
    return text;
  }
  // For TXT, just remove ** but keep the text
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*/g, '');
}

function reportToText(report) {
  const title = markdownToPlainWithBold(report.title || 'Report');
  const date = report.created_date || report.updated_date || '';
  // Clean, minimal header then body, remove markdown for TXT
  return `${title}\n${date}\n\n` + markdownToPlainWithBold(report.report || '');
}

function reportToCsv(report) {
  const title = (report.title || 'Report').replace(/"/g, '""');
  const date = (report.created_date || report.updated_date || '').replace(/"/g, '""');
  const body = (report.report || '').replace(/"/g, '""');
  const rows = [
    ['Title', 'Date', 'Report'],
    [`"${title}"`, `"${date}"`, `"${body}"`]
  ];
  return rows.map(r => r.join(',')).join('\n');
}

export default function ReportExporter({ report, title }) {
  const useTitle = report?.title || title || 'strategy-report';
  const dateStamp = formatDateForFilename(report?.created_date || report?.updated_date || new Date().toISOString());
  const safeName = (useTitle + (dateStamp ? `-${dateStamp}` : '')).toLowerCase().replace(/[^a-z0-9\-]+/g, '-');

  const exportPdf = () => {
    const doc = new jsPDF();
    const title = markdownToPlainWithBold(report.title || 'Report', true);
    const date = report.created_date || report.updated_date || '';
    let y = 20;
    doc.setFontSize(12);
    doc.text(title, 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(date, 20, y);
    y += 10;
    // Split report into lines, handle bold
    const body = report.report || '';
    // Split by lines
    const lines = body.split(/\r?\n/);
    lines.forEach(line => {
      let cursorX = 20;
      // Find all **bold** segments
      let match;
      let lastIndex = 0;
      const boldRegex = /\*\*(.*?)\*\*/g;
      while ((match = boldRegex.exec(line)) !== null) {
        // Print text before bold
        if (match.index > lastIndex) {
          const before = line.substring(lastIndex, match.index);
          doc.setFont(undefined, 'normal');
          doc.text(before, cursorX, y, { baseline: 'top' });
          cursorX += doc.getTextWidth(before);
        }
        // Print bold text
        doc.setFont(undefined, 'bold');
        doc.text(match[1], cursorX, y, { baseline: 'top' });
        cursorX += doc.getTextWidth(match[1]);
        lastIndex = match.index + match[0].length;
      }
      // Print any remaining text
      if (lastIndex < line.length) {
        doc.setFont(undefined, 'normal');
        doc.text(line.substring(lastIndex), cursorX, y, { baseline: 'top' });
      }
      y += 6;
      if (y > 275) { doc.addPage(); y = 20; }
    });
    doc.save(`${safeName}.pdf`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="font-sans text-sm gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="font-sans">
        <DropdownMenuItem onClick={exportPdf}>
          <FileText className="w-4 h-4 mr-2" /> Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadFile(reportToCsv(report), `${safeName}.csv`, 'text/csv')}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadFile(reportToText(report), `${safeName}.txt`, 'text/plain')}>
          <FileType className="w-4 h-4 mr-2" /> Export as Text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}