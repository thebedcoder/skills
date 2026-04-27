import { describe, expect, it } from "vitest";
import { Raw, badge, card, html, layout, raw, statTile, table } from "../../src/admin/templates.js";

describe("html escape", () => {
  it("escapes interpolated values", () => {
    const dangerous = "<script>alert(1)</script>";
    const out = html`<p>${dangerous}</p>`.value;
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("does not escape Raw values", () => {
    const safe = raw("<b>safe</b>");
    expect(html`<p>${safe}</p>`.value).toBe("<p><b>safe</b></p>");
  });

  it("returns a Raw instance", () => {
    expect(html`hi`).toBeInstanceOf(Raw);
  });

  it("renders arrays of Raw values without re-escaping", () => {
    const items = [html`<li>a</li>`, html`<li>b</li>`];
    const out = html`<ul>${items}</ul>`.value;
    expect(out).toBe("<ul><li>a</li><li>b</li></ul>");
  });

  it("escapes ampersands and quotes", () => {
    const out = html`<a href="${"x?a=1&b=2"}" title='${'he said "hi"'}'>x</a>`.value;
    expect(out).toContain("a=1&amp;b=2");
    expect(out).toContain("&quot;hi&quot;");
  });
});

describe("layout", () => {
  it("renders the document and marks the active nav item", () => {
    const out = layout({ title: "Test", active: "audit", body: html`<p>content</p>` });
    expect(out).toContain("<!doctype html>");
    expect(out).toContain("<title>Test · product-brain admin</title>");
    expect(out).toContain("<p>content</p>");
    // active class should appear next to the audit link
    const auditMatch = /<a[^>]*href="\/admin\/audit"[^>]*class="([^"]+)"/.exec(out);
    expect(auditMatch?.[1]).toContain("bg-slate-900");
    // dashboard link should NOT carry the active class
    const dashMatch = /<a[^>]*href="\/admin\/"[^>]*class="([^"]+)"/.exec(out);
    expect(dashMatch?.[1]).not.toContain("bg-slate-900");
  });
});

describe("card / statTile / table / badge", () => {
  it("card renders a section with title and body", () => {
    const out = card("Stuff", html`<p>x</p>`).value;
    expect(out).toContain("Stuff");
    expect(out).toContain("<p>x</p>");
  });

  it("statTile renders label and value", () => {
    const out = statTile("Cost", "$1.23", "30d").value;
    expect(out).toContain("Cost");
    expect(out).toContain("$1.23");
    expect(out).toContain("30d");
  });

  it("table renders headers and rows", () => {
    const out = table(["A", "B"], [
      ["1", "2"],
      ["3", "4"],
    ]).value;
    expect(out).toContain("<th");
    expect(out).toContain("A");
    expect(out).toContain("3");
  });

  it("table renders empty state when no rows", () => {
    const out = table(["A"], [], { empty: "nothing here" }).value;
    expect(out).toContain("nothing here");
  });

  it("badge picks the right colour class", () => {
    expect(badge("ok", "ok").value).toContain("emerald");
    expect(badge("warn", "warn").value).toContain("amber");
    expect(badge("err", "err").value).toContain("rose");
  });
});
