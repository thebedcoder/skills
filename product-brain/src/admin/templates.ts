// Server-rendered HTML helpers. Tagged template literal `html` does HTML escaping
// of interpolated values; pre-rendered HTML can be passed via `raw()` to opt out.

import { STYLES } from "./styles.js";

const ESCAPE_RE = /[&<>"']/g;
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export class Raw {
  constructor(public readonly value: string) {}
}

export function raw(s: string | number | boolean): Raw {
  return new Raw(String(s));
}

function escape(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Raw) return v.value;
  if (Array.isArray(v)) return v.map(escape).join("");
  return String(v).replace(ESCAPE_RE, (c) => ESCAPE_MAP[c] ?? c);
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): Raw {
  let out = "";
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) out += escape(values[i]);
  }
  return new Raw(out);
}

export interface LayoutOpts {
  title: string;
  active: "dashboard" | "audit" | "repos" | "queue" | "settings" | "about";
  body: Raw;
}

const NAV_ITEMS: Array<{ slug: LayoutOpts["active"]; label: string; href: string }> = [
  { slug: "dashboard", label: "Dashboard", href: "/admin/" },
  { slug: "audit", label: "Audit", href: "/admin/audit" },
  { slug: "repos", label: "Repos", href: "/admin/repos" },
  { slug: "queue", label: "Queue", href: "/admin/queue" },
  { slug: "settings", label: "Settings", href: "/admin/settings" },
  { slug: "about", label: "About", href: "/admin/about" },
];

export function layout(opts: LayoutOpts): string {
  const nav: Raw[] = NAV_ITEMS.map((item) => {
    const cls =
      item.slug === opts.active
        ? "px-3 py-2 rounded-md bg-slate-900 text-white text-sm font-medium"
        : "px-3 py-2 rounded-md text-slate-700 hover:bg-slate-100 text-sm font-medium";
    return html`<a href="${item.href}" class="${cls}">${item.label}</a>`;
  });

  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${opts.title} · product-brain admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${raw(STYLES)}</style>
  </head>
  <body class="bg-slate-50 text-slate-900 min-h-screen">
    <header class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
        <span class="text-lg">🧠</span>
        <span class="font-semibold">product-brain admin</span>
        <nav class="flex gap-1 ml-auto">${nav}</nav>
      </div>
    </header>
    <main class="max-w-7xl mx-auto px-6 py-6">${opts.body}</main>
  </body>
</html>`.value;
}

export function card(title: string, body: Raw): Raw {
  return html`<section class="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
    <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">${title}</h2>
    ${body}
  </section>`;
}

export function statTile(label: string, value: string | number, sub?: string): Raw {
  return html`<div class="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
    <div class="text-xs uppercase tracking-wide text-slate-500">${label}</div>
    <div class="text-2xl font-semibold num mt-1">${value}</div>
    ${sub ? html`<div class="text-xs text-slate-500 mt-1">${sub}</div>` : raw("")}
  </div>`;
}

export function table(
  headers: string[],
  rows: Array<Array<string | number | Raw>>,
  opts: { empty?: string } = {},
): Raw {
  if (rows.length === 0) {
    return html`<div class="text-sm text-slate-500 italic py-4">${opts.empty ?? "(no rows)"}</div>`;
  }
  const head = html`<thead><tr>
    ${headers.map((h) => html`<th class="text-left text-xs uppercase tracking-wide text-slate-500 font-medium px-3 py-2 border-b">${h}</th>`)}
  </tr></thead>`;
  const body = html`<tbody>${rows.map(
    (row) => html`<tr class="hover:bg-slate-50">${row.map(
      (cell) => html`<td class="px-3 py-2 border-b border-slate-100 text-sm num">${cell}</td>`,
    )}</tr>`,
  )}</tbody>`;
  return html`<div class="overflow-x-auto"><table class="w-full">${head}${body}</table></div>`;
}

export function badge(text: string, kind: "ok" | "warn" | "err" | "neutral" = "neutral"): Raw {
  const cls = {
    ok: "bg-emerald-100 text-emerald-700",
    warn: "bg-amber-100 text-amber-800",
    err: "bg-rose-100 text-rose-700",
    neutral: "bg-slate-100 text-slate-700",
  }[kind];
  return html`<span class="inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}">${text}</span>`;
}
