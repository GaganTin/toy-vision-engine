import React from 'react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileType } from 'lucide-react';

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
  const date = formatDateForFilename(report.created_date || report.updated_date || '');
  return `${title}\n${date}\n\n` + markdownToPlainWithBold(report.report || '');
}

function reportToWord(report, projectTitle) {
  const title = projectTitle || report.title || 'Report';
  const date = formatDateForFilename(report.created_date || report.updated_date || '');
  const body = (report.report || '')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1><p style="color:#666;font-size:12px">${date}</p><br>${body}</body></html>`;
}

export default function ReportExporter({ report, title: projectTitle }) {
  const useTitle = report?.title || projectTitle || 'strategy-report';
  const dateStamp = formatDateForFilename(report?.created_date || report?.updated_date || new Date().toISOString());
  const safeName = (useTitle + (dateStamp ? `-${dateStamp}` : '')).toLowerCase().replace(/[^a-z0-9\-]+/g, '-');

  const exportPdf = () => {
    const doc = new jsPDF();
    const title = markdownToPlainWithBold(projectTitle || report.title || 'Report', true);
    const date = report.created_date || report.updated_date || '';
    const dateFormatted = formatDateForFilename(date);
    let y = 20;
    doc.setFontSize(12);
    doc.text(title, 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(dateFormatted, 20, y);
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
        <DropdownMenuItem onClick={() => downloadFile(reportToWord(report, projectTitle), `${safeName}.doc`, 'application/msword')}>
          <FileText className="w-4 h-4 mr-2" /> Save as Word
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadFile(reportToText(report), `${safeName}.txt`, 'text/plain')}>
          <FileType className="w-4 h-4 mr-2" /> Export as Text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}