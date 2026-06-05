#!/usr/bin/env node
/**
 * generate-profile.mjs
 * ---------------------
 * Fetches REAL public GitHub data and writes SVG snapshots into
 * assets/generated/. No figure is ever hand-written — if the API has nothing,
 * the script writes a "no data" card rather than inventing numbers.
 *
 * Usage:  GITHUB_TOKEN=xxx node scripts/generate-profile.mjs
 * Node 20+ (uses global fetch). Zero dependencies.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "generated");
const USER = process.env.PROFILE_USER || "St0lym";
const TOKEN = process.env.GITHUB_TOKEN;

const C = {
  bg: "#ffffff", border: "#d6e4fb", ink: "#0d1b2e",
  text: "#46566b", accent: "#1f6feb", soft: "#eaf2ff", steel: "#7c8aa0",
};
const FONT = "-apple-system,Segoe UI,Inter,sans-serif";

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "stolym-profile-generator",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

// Shared defs + framed card in the profile's visual language (gradient paper,
// hex bullet, accent line). Keeps generated cards cohesive with the SVG diagrams.
function frame(width, height, cap, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(cap)}">
  <defs>
    <linearGradient id="g-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f4f9ff"/></linearGradient>
    <linearGradient id="g-ac" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#1f6feb"/></linearGradient>
    <linearGradient id="g-bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#73c9e8"/></linearGradient>
  </defs>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="16" fill="url(#g-bg)" stroke="${C.border}" stroke-width="1.4"/>
  <g transform="translate(26,22)">
    <path d="M9 0 L18 5 L18 15 L9 20 L0 15 L0 5 Z" fill="#fff" stroke="url(#g-ac)" stroke-width="1.6"/>
    <path d="M6 16 L6 4 L8 4 L13 12 L13 4 L15 4 L15 16 L13 16 L8 8 L8 16 Z" fill="url(#g-ac)"/>
  </g>
  <text x="58" y="36" style="font:600 12px ${FONT};fill:${C.accent};letter-spacing:.14em">${esc(cap)}</text>
  <line x1="26" y1="50" x2="${width - 26}" y2="50" stroke="#eaf2ff" stroke-width="1"/>
  ${inner}
</svg>\n`;
}

function statsCard(user, repos) {
  const stars = repos.reduce((n, r) => n + r.stargazers_count, 0);
  const forks = repos.reduce((n, r) => n + r.forks_count, 0);
  const cells = [
    ["Public repos", user.public_repos],
    ["Stars earned", stars],
    ["Followers", user.followers],
    ["Following", user.following],
  ];
  const inner = `
  ${cells.map(([label, val], i) => {
    const x = 26 + (i % 2) * 214, y = 74 + Math.floor(i / 2) * 70;
    return `<rect x="${x}" y="${y}" width="200" height="58" rx="12" fill="#ffffff" stroke="#eaf2ff" stroke-width="1"/>
  <text x="${x + 18}" y="${y + 36}" style="font:800 28px ${FONT};fill:${C.ink}">${val}</text>
  <text x="${x + 182}" y="${y + 38}" text-anchor="end" style="font:600 12px ${FONT};fill:${C.steel};letter-spacing:.06em">${label.toUpperCase()}</text>`;
  }).join("\n  ")}
  <text x="26" y="222" style="font:500 11px ${FONT};fill:#aab8cc">@${esc(user.login)} · updated ${new Date().toISOString().slice(0, 10)} · GitHub API</text>`;
  return frame(440, 236, "ACTIVITY · LIVE", inner);
}

function languagesCard(langTotals) {
  const total = Object.values(langTotals).reduce((a, b) => a + b, 0) || 1;
  const top = Object.entries(langTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
  let y = 76;
  const rows = top.map(([name, bytes]) => {
    const pct = (bytes / total) * 100;
    const row = `<text x="26" y="${y - 5}" style="font:600 13px ${FONT};fill:${C.text}">${esc(name)}</text>
  <text x="414" y="${y - 5}" text-anchor="end" style="font:600 12px ${FONT};fill:${C.steel}">${pct.toFixed(1)}%</text>
  <rect x="26" y="${y}" width="388" height="9" rx="4.5" fill="#eaf2ff"/>
  <rect x="26" y="${y}" width="${Math.max(8, (pct / 100) * 388)}" height="9" rx="4.5" fill="url(#g-bar)"/>`;
    y += 38;
    return row;
  }).join("\n  ");
  const inner = `${rows || `<text x="26" y="92" style="font:500 14px ${FONT};fill:${C.steel}">No public language data yet.</text>`}`;
  return frame(440, Math.max(120, 66 + top.length * 38), "TOP LANGUAGES · PUBLIC", inner);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  try {
    const user = await gh(`/users/${USER}`);
    const repos = await gh(`/users/${USER}/repos?per_page=100&type=owner&sort=updated`);
    const langTotals = {};
    for (const r of repos.filter((r) => !r.fork).slice(0, 30)) {
      try {
        const langs = await gh(`/repos/${USER}/${r.name}/languages`);
        for (const [k, v] of Object.entries(langs)) langTotals[k] = (langTotals[k] || 0) + v;
      } catch { /* skip repos we cannot read */ }
    }
    await writeFile(join(OUT, "stats.svg"), statsCard(user, repos));
    await writeFile(join(OUT, "languages.svg"), languagesCard(langTotals));
    console.log(`✓ wrote stats.svg & languages.svg for ${USER} (${repos.length} repos)`);
  } catch (err) {
    console.error("✗ generation failed:", err.message);
    process.exitCode = 1;
  }
}

main();
