#!/usr/bin/env node
/**
 * Renders a PDF page component through the real html2canvas pipeline and
 * saves a screenshot of the resulting canvas — i.e. the exact pixels that
 * will end up in the generated PDF.
 *
 * Usage:
 *   node .claude/skills/verify-pdf/render-pdf-page.mjs <Component> \
 *     [--props fixture.json] [--width 794] [--height 1123] [--out out.png]
 */
import { spawn, execSync } from "node:child_process";
import { existsSync, globSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const component = args.find((a) => !a.startsWith("--"));
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
if (!component) {
  console.error("Usage: render-pdf-page.mjs <Component> [--props f.json] [--width N] [--height N] [--out f.png]");
  process.exit(1);
}

const root = process.cwd();
const width = Number(opt("width", "794"));
const height = Number(opt("height", "1123"));
const out = opt("out", `/tmp/pdf-verify-${component}.png`);
const propsFile = opt("props", null);
const props = propsFile ? readFileSync(resolve(propsFile), "utf8") : "undefined";
const port = 8123;

const componentFile = `src/components/pdf/pages/${component}.tsx`;
if (!existsSync(resolve(root, componentFile))) {
  console.error(`Composant introuvable : ${componentFile}`);
  process.exit(1);
}

// --- Locate or install a Playwright Chromium ---------------------------------
const findChrome = () =>
  [
    ...globSync("/opt/pw-browsers/chromium-*/chrome-linux/chrome"),
    ...globSync(`${process.env.HOME}/.cache/ms-playwright/chromium-*/chrome-linux/chrome`),
  ][0];
let chrome = findChrome();
if (!chrome) {
  console.log("Installation de Chromium (playwright)...");
  execSync("npx -y playwright install chromium", { stdio: "inherit" });
  chrome = findChrome();
}
if (!chrome) {
  console.error("Chromium introuvable après installation.");
  process.exit(1);
}

// --- Ensure playwright-core is importable ------------------------------------
let pwPath = resolve(root, "node_modules/playwright-core/index.mjs");
if (!existsSync(pwPath)) {
  console.log("Installation de playwright-core (sans modifier package.json)...");
  execSync("npm i --no-save playwright-core", { cwd: root, stdio: "inherit" });
}

// --- Generate the temporary harness ------------------------------------------
const htmlPath = resolve(root, "pdf-harness-tmp.html");
const tsxPath = resolve(root, "src/pdf-harness-tmp.tsx");
writeFileSync(
  htmlPath,
  `<!doctype html><html lang="fr"><head><meta charset="UTF-8"/><title>PDF harness</title></head>
<body style="margin:0"><div id="root"></div><script type="module" src="/src/pdf-harness-tmp.tsx"></script></body></html>`
);
writeFileSync(
  tsxPath,
  `import { createRoot } from "react-dom/client";
import { useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { ${component} } from "./components/pdf/pages/${component}";

const props: any = ${props};

const Harness = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    (async () => {
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 600));
      const page = ref.current?.querySelector("[data-pdf-page]") ?? ref.current?.firstElementChild;
      if (!page) return;
      const canvas = await html2canvas(page as HTMLElement, {
        scale: 2, useCORS: true, allowTaint: true, logging: false,
        backgroundColor: "#ffffff", windowWidth: ${width}, windowHeight: ${height},
      });
      canvas.style.width = "${width}px";
      canvas.id = "pdf-canvas";
      document.body.innerHTML = "";
      document.body.appendChild(canvas);
    })();
  }, []);
  return <div ref={ref} style={{ width: "${width}px" }}><${component} {...(props ?? {})} /></div>;
};

createRoot(document.getElementById("root")!).render(<Harness />);
`
);

const cleanup = () => {
  rmSync(htmlPath, { force: true });
  rmSync(tsxPath, { force: true });
};

// --- Start vite, screenshot, cleanup ------------------------------------------
const vite = spawn("npx", ["vite", "--port", String(port), "--host", "127.0.0.1", "--strictPort"], {
  cwd: root,
  stdio: "ignore",
  detached: true,
});

try {
  // Wait for the dev server
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/pdf-harness-tmp.html`);
      up = res.ok;
    } catch { /* retry */ }
  }
  if (!up) throw new Error("Le serveur vite n'a pas démarré.");

  const { chromium } = await import(pwPath);
  const browser = await chromium.launch({ executablePath: chrome, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: width + 100, height: height + 200 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/pdf-harness-tmp.html`);
  try {
    await page.waitForSelector("#pdf-canvas", { timeout: 30000 });
  } catch {
    console.error("Le canvas n'a pas été produit. Erreurs navigateur :");
    errors.forEach((e) => console.error("  " + e));
    throw new Error("Échec du rendu (props manquantes ?)");
  }
  await page.waitForTimeout(300);
  await page.locator("#pdf-canvas").screenshot({ path: out });
  await browser.close();
  console.log(`Capture du rendu PDF : ${out}`);
} finally {
  cleanup();
  try { process.kill(-vite.pid); } catch { /* already gone */ }
}
