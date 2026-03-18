import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function ReportSection({ title, content, number }) {
  if (!content) return null;

  return (
    <section className="mb-12">
      <div className="flex items-baseline gap-3 mb-4">
        <span
          className="font-sans text-xs font-bold px-2 py-1 rounded-full text-white"
          style={{ background: '#1B2A4A' }}
        >
          {number}
        </span>
        <h2 className="font-serif text-2xl font-bold">{title}</h2>
      </div>
      <div className="prose prose-lg max-w-none font-serif leading-[1.8] text-gray-800">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </section>
  );
}