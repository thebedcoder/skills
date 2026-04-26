// Self-contained stylesheet for the admin panel.
// Hand-rolled subset of Tailwind utility classes used in templates.ts +
// server.ts. Inlined into the page so the admin works offline / behind
// proxies that block public CDNs.

export const STYLES = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: #f8fafc;
  color: #0f172a;
  min-height: 100vh;
}
a { color: inherit; text-decoration: none; }
button { font: inherit; cursor: pointer; border: 0; }
input, select, textarea { font: inherit; }
pre { margin: 0; }

/* layout */
.min-h-screen { min-height: 100vh; }
.max-w-7xl { max-width: 80rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
.px-2 { padding-left: .5rem; padding-right: .5rem; }
.px-3 { padding-left: .75rem; padding-right: .75rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.py-0\\.5 { padding-top: .125rem; padding-bottom: .125rem; }
.py-1 { padding-top: .25rem; padding-bottom: .25rem; }
.py-1\\.5 { padding-top: .375rem; padding-bottom: .375rem; }
.py-2 { padding-top: .5rem; padding-bottom: .5rem; }
.py-3 { padding-top: .75rem; padding-bottom: .75rem; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
.p-3 { padding: .75rem; }
.p-4 { padding: 1rem; }
.p-5 { padding: 1.25rem; }
.pt-4 { padding-top: 1rem; }
.mt-1 { margin-top: .25rem; }
.mt-3 { margin-top: .75rem; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }
.mb-3 { margin-bottom: .75rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.ml-4 { margin-left: 1rem; }
.ml-auto { margin-left: auto; }

.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }
.gap-1 { gap: .25rem; }
.gap-2 { gap: .5rem; }
.gap-3 { gap: .75rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }

.grid { display: grid; }
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-\\[180px_1fr\\] { grid-template-columns: 180px 1fr; }
@media (min-width: 768px) {
  .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .md\\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .md\\:col-span-2 { grid-column: span 2 / span 2; }
}
@media (min-width: 1024px) {
  .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

.space-y-1 > * + * { margin-top: .25rem; }
.space-y-4 > * + * { margin-top: 1rem; }
.space-y-6 > * + * { margin-top: 1.5rem; }

.w-full { width: 100%; }
.w-20 { width: 5rem; }

.overflow-x-auto { overflow-x: auto; }
.whitespace-pre-wrap { white-space: pre-wrap; }
.list-disc { list-style: disc; }

/* typography */
.text-xs { font-size: .75rem; line-height: 1rem; }
.text-sm { font-size: .875rem; line-height: 1.25rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
.uppercase { text-transform: uppercase; }
.tracking-wide { letter-spacing: .025em; }
.italic { font-style: italic; }
.inline-block { display: inline-block; }

.num { font-variant-numeric: tabular-nums; }

/* colors */
.bg-white { background: #fff; }
.bg-slate-50 { background: #f8fafc; }
.bg-slate-100 { background: #f1f5f9; }
.bg-slate-900 { background: #0f172a; }
.bg-emerald-50 { background: #ecfdf5; }
.bg-emerald-100 { background: #d1fae5; }
.bg-amber-50 { background: #fffbeb; }
.bg-amber-100 { background: #fef3c7; }
.bg-rose-50 { background: #fff1f2; }
.bg-rose-100 { background: #ffe4e6; }
.bg-blue-50 { background: #eff6ff; }

.text-white { color: #fff; }
.text-slate-500 { color: #64748b; }
.text-slate-600 { color: #475569; }
.text-slate-700 { color: #334155; }
.text-slate-900 { color: #0f172a; }
.text-emerald-700 { color: #047857; }
.text-amber-800 { color: #92400e; }
.text-rose-700 { color: #be123c; }
.text-blue-700 { color: #1d4ed8; }

/* borders + radius + shadow */
.border { border: 1px solid #e2e8f0; }
.border-0 { border: 0; }
.border-b { border-bottom: 1px solid #e2e8f0; }
.border-slate-100 { border-color: #f1f5f9; }
.border-slate-200 { border-color: #e2e8f0; }
.border-blue-200 { border-color: #bfdbfe; }
.border-emerald-300 { border-color: #6ee7b7; }
.border-amber-300 { border-color: #fcd34d; }
.border-rose-300 { border-color: #fda4af; }

.rounded { border-radius: .25rem; }
.rounded-md { border-radius: .375rem; }
.rounded-lg { border-radius: .5rem; }

.shadow-sm { box-shadow: 0 1px 2px rgba(15, 23, 42, .04); }

.last\\:border-0:last-child { border: 0; }

/* hover */
.hover\\:bg-slate-50:hover { background: #f8fafc; }
.hover\\:bg-slate-100:hover { background: #f1f5f9; }
.hover\\:bg-slate-700:hover { background: #334155; }
.hover\\:underline:hover { text-decoration: underline; }

/* tables */
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; vertical-align: top; }

/* form basics */
input[type=text], input:not([type]), select {
  background: #fff; color: inherit; border: 1px solid #cbd5e1;
}
button[type=submit] {
  background: #0f172a; color: #fff;
}
button[type=submit]:hover { background: #334155; }

/* code */
code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: .875em; }
`;
