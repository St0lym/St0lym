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

function card(width, height, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="14" fill="${C.bg}" stroke="${C.border}" stroke-width="1.4"/>
  ${inner}
</svg>\n`;
}

function statsCard(user, repos) {
  const stars = repos.reduce((n, r) => n + r.stargazers_count, 0);
  const forks = repos.reduce((n, r) => n + r.forks_count, 0);
  const cells = [
    ["Public repos", user.public_repos],
    ["Stars earned", stars],
    ["Forks", forks],
    ["Followers", user.followers],
  ];
  const inner = `
  <text x="28" y="44" style="font:700 18px ${FONT};fill:${C.accent};letter-spacing:.04em">GitHub · live</text>
  ${cells.map(([label, val], i) => {
    const x = 28 + (i % 2) * 220, y = 88 + Math.floor(i / 2) * 64;
    return `<text x="${x}" y="${y}" style="font:800 30px ${FONT};fill:${C.ink}">${val}</text>
  <text x="${x}" y="${y + 20}" style="font:500 13px ${FONT};fill:${C.steel}">${label}</text>`;
  }).join("\n  ")}
  <text x="28" y="208" style="font:500 11px ${FONT};fill:${C.steel}">Updated ${new Date().toISOString().slice(0, 10)} · real GitHub API data</text>`;
  return card(460, 230, inner);
}

function languagesCard(langTotals) {
  const total = Object.values(langTotals).reduce((a, b) => a + b, 0) || 1;
  const top = Object.entries(langTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
  let y = 78;
  const rows = top.map(([name, bytes]) => {
    const pct = ((bytes / total) * 100);
    const w = Math.max(6, (pct / 100) * 300);
    const row = `<text x="28" y="${y - 6}" style="font:600 13px ${FONT};fill:${C.text}">${esc(name)}</text>
  <text x="416" y="${y - 6}" text-anchor="end" style="font:600 13px ${FONT};fill:${C.steel}">${pct.toFixed(1)}%</text>
  <rect x="28" y="${y}" width="388" height="8" rx="4" fill="${C.soft}"/>
  <rect x="28" y="${y}" width="${(pct / 100) * 388}" height="8" rx="4" fill="${C.accent}"/>`;
    y += 40;
    return row;
  }).join("\n  ");
  const inner = `<text x="28" y="44" style="font:700 18px ${FONT};fill:${C.accent}">Top languages · public</text>
  ${rows || `<text x="28" y="90" style="font:500 14px ${FONT};fill:${C.steel}">No public language data yet.</text>`}`;
  return card(460, Math.max(120, 70 + top.length * 40), inner);
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
