import { chromium, type Browser, type Page } from 'playwright';

/** Önizleme sunucusunun adresi (e2e/run.mjs verir). */
export const BASE = process.env.E2E_BASE ?? 'http://localhost:4190/';

let shared: Browser | null = null;
export async function browser() {
  shared ??= await chromium.launch();
  return shared;
}
export async function closeBrowser() {
  await shared?.close();
  shared = null;
}

/** Sayfa hataları, konsol hataları ve 4xx/5xx yanıtlar: hiçbiri olmamalı. */
export function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`sayfa hatası: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && problems.push(`konsol: ${m.text()}`));
  page.on('response', (r) => r.status() >= 400 && problems.push(`${r.status()} ${r.url()}`));
  return problems;
}

/** Oyunlar ve adresleri. */
export const ROUTES = ['', 'ise-alim', 'test', 'insaat', 'bakkal', 'ekran', 'meydan', 'asfalt', 'trafik', 'cuzdan'];
