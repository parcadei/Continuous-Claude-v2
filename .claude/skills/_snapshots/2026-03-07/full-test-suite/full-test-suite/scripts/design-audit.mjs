#!/usr/bin/env node
/**
 * Frontend Design Audit - 25 automated design quality checks via CDP
 *
 * Categories:
 *   Anti-Patterns (4): viewport zoom, paste prevention, outline removal, transition-all
 *   Semantic HTML (4): clickable divs, focus rings, input labels, autocomplete
 *   Interaction (3): cursor pointer, hover layout shift, touch targets
 *   Visual (4): contrast ratio, emoji icons, font quality, color palette
 *   Accessibility (3): icon button labels, heading hierarchy, clickable labels
 *   Layout (4): readable font size, horizontal scroll, line-height, img dimensions
 *   Performance/Polish (3): reduced motion, lazy loading, z-index sanity
 *
 * Usage: node design-audit.mjs [--config path] [--depth quick|standard|comprehensive] [--output path]
 *
 * Requires: playwright-core, Chrome CDP on port 9222
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf('--' + name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const configPath = getArg('config', null);
const depthArg = getArg('depth', null);
const outputPath = getArg('output', null);

// --- Load config ---
let config = {};
if (configPath && existsSync(configPath)) {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
}

const BASE_URL = process.env.TEST_BASE_URL || config.baseUrl || 'http://localhost:3000';
const CDP_URL = process.env.TEST_CDP_URL || config.cdpUrl || 'http://localhost:9222';
const DEPTH = depthArg || config.depth || 'standard';
const MIN_CONTRAST = config.thresholds?.design?.minContrastRatio || 4.5;
const MIN_TOUCH = config.thresholds?.design?.minTouchTarget || 44;
const MAX_COLORS = config.thresholds?.design?.maxUniqueColors || 15;

const ALL_ROUTES = config.routes || [{ path: '/', name: 'dashboard' }];

// Depth -> route count
function getRoutes() {
  if (DEPTH === 'quick') return ALL_ROUTES.slice(0, 2);
  return ALL_ROUTES;
}

// --- Check registry ---
const CHECK_REGISTRY = [
  // Anti-Patterns
  { id: 'no-user-scalable-no', category: 'anti-patterns', severity: 'error', depth: ['quick', 'standard', 'comprehensive'] },
  { id: 'no-paste-prevention', category: 'anti-patterns', severity: 'warning', depth: ['quick', 'standard', 'comprehensive'] },
  { id: 'no-outline-removal', category: 'anti-patterns', severity: 'error', depth: ['standard', 'comprehensive'] },
  { id: 'no-transition-all', category: 'anti-patterns', severity: 'warning', depth: ['standard', 'comprehensive'] },
  // Semantic HTML
  { id: 'clickable-divs', category: 'semantic-html', severity: 'error', depth: ['standard', 'comprehensive'] },
  { id: 'focus-ring-visible', category: 'semantic-html', severity: 'error', depth: ['standard', 'comprehensive'] },
  { id: 'inputs-have-labels', category: 'semantic-html', severity: 'error', depth: ['standard', 'comprehensive'] },
  { id: 'inputs-have-autocomplete', category: 'semantic-html', severity: 'warning', depth: ['standard', 'comprehensive'] },
  // Interaction Quality
  { id: 'cursor-pointer', category: 'interaction', severity: 'warning', depth: ['standard', 'comprehensive'] },
  { id: 'no-layout-shift-on-hover', category: 'interaction', severity: 'warning', depth: ['comprehensive'] },
  { id: 'touch-targets-44px', category: 'interaction', severity: 'error', depth: ['comprehensive'] },
  // Visual Quality
  { id: 'contrast-ratio', category: 'visual', severity: 'error', depth: ['standard', 'comprehensive'] },
  { id: 'no-emoji-icons', category: 'visual', severity: 'info', depth: ['comprehensive'] },
  { id: 'font-quality', category: 'visual', severity: 'info', depth: ['comprehensive'] },
  { id: 'color-palette', category: 'visual', severity: 'info', depth: ['comprehensive'] },
  // Accessibility/Semantic (new)
  { id: 'icon-button-labels', category: 'accessibility', severity: 'error', depth: ['standard', 'comprehensive'] },
  { id: 'heading-hierarchy', category: 'accessibility', severity: 'error', depth: ['standard', 'comprehensive'] },
  { id: 'clickable-labels', category: 'accessibility', severity: 'warning', depth: ['comprehensive'] },
  // Layout/Visual Quality (new)
  { id: 'readable-font-size', category: 'layout', severity: 'error', depth: ['standard', 'comprehensive'] },
  { id: 'horizontal-scroll', category: 'layout', severity: 'error', depth: ['standard', 'comprehensive'] },
  { id: 'line-height-readability', category: 'layout', severity: 'warning', depth: ['comprehensive'] },
  { id: 'img-dimensions', category: 'layout', severity: 'warning', depth: ['comprehensive'] },
  // Performance/Polish (new)
  { id: 'reduced-motion-support', category: 'performance-polish', severity: 'warning', depth: ['comprehensive'] },
  { id: 'img-lazy-loading', category: 'performance-polish', severity: 'info', depth: ['comprehensive'] },
  { id: 'z-index-sanity', category: 'performance-polish', severity: 'info', depth: ['comprehensive'] },
];

function getActiveChecks() {
  return CHECK_REGISTRY.filter(c => c.depth.includes(DEPTH));
}

// --- Contrast helpers ---
function luminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- Results ---
const results = {
  meta: { baseUrl: BASE_URL, depth: DEPTH, timestamp: new Date().toISOString(), checksRun: 0 },
  checks: [],
  summary: { errors: 0, warnings: 0, infos: 0, passed: 0 },
};

let browser;
try {
  console.log(`Connecting to Chrome CDP at ${CDP_URL}...`);
  browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0];
  console.log('Connected!\n');

  const routes = getRoutes();
  const activeChecks = getActiveChecks();
  console.log(`Depth: ${DEPTH} | Routes: ${routes.length} | Checks: ${activeChecks.length}\n`);

  // Helper: new page per route
  async function withPage(url, testFn) {
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(2000);
      return await testFn(page);
    } catch (e) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        return await testFn(page);
      } catch (e2) {
        return { error: e2.message };
      }
    } finally {
      await page.close().catch(() => {});
    }
  }

  // ===== CHECK IMPLEMENTATIONS =====

  async function checkNoUserScalableNo(page) {
    return page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      if (!meta) return { pass: true, detail: 'No viewport meta found' };
      const content = meta.getAttribute('content') || '';
      const blocked = /user-scalable\s*=\s*no/i.test(content) || /maximum-scale\s*=\s*1([^.]|$)/i.test(content);
      return { pass: !blocked, detail: blocked ? `Viewport blocks zoom: "${content}"` : 'Zoom allowed' };
    });
  }

  async function checkNoPastePrevention(page) {
    return page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea');
      const blocked = [];
      inputs.forEach(el => {
        // Check inline onpaste
        if (el.getAttribute('onpaste')) {
          blocked.push(el.outerHTML.slice(0, 100));
        }
      });
      // Also check via getEventListeners if available (not in standard DOM)
      return {
        pass: blocked.length === 0,
        count: blocked.length,
        detail: blocked.length ? `${blocked.length} inputs block paste` : 'No paste prevention found',
        elements: blocked.slice(0, 5),
      };
    });
  }

  async function checkNoOutlineRemoval(page) {
    return page.evaluate(() => {
      const issues = [];
      // Sample interactive elements
      const elements = document.querySelectorAll('a, button, input, select, textarea, [tabindex], [role="button"]');
      const sampled = Array.from(elements).slice(0, 50);
      for (const el of sampled) {
        try {
          const styles = window.getComputedStyle(el);
          const outline = styles.outline;
          const outlineStyle = styles.outlineStyle;
          // Check for outline:none or outline-style:none without a visible focus replacement
          if (outlineStyle === 'none' || outline === '0px none rgb(0, 0, 0)') {
            // Check pseudo :focus styles - can't directly in evaluate, so just flag
            const boxShadow = styles.boxShadow;
            const border = styles.border;
            // If no visible replacement indicator, flag it
            if (boxShadow === 'none' && !border.includes('2px')) {
              issues.push({
                tag: el.tagName,
                text: (el.textContent || '').trim().slice(0, 30),
                html: el.outerHTML.slice(0, 100),
              });
            }
          }
        } catch (e) { /* cross-origin or detached */ }
      }
      return {
        pass: issues.length === 0,
        count: issues.length,
        detail: issues.length ? `${issues.length} elements may have invisible focus` : 'Focus outlines preserved',
        elements: issues.slice(0, 5),
      };
    });
  }

  async function checkNoTransitionAll(page) {
    return page.evaluate(() => {
      const issues = [];
      const allEls = document.querySelectorAll('*');
      const sampled = Array.from(allEls).slice(0, 200);
      for (const el of sampled) {
        try {
          const transition = window.getComputedStyle(el).transition;
          if (transition && /\ball\b/.test(transition) && transition !== 'all 0s ease 0s') {
            issues.push({
              tag: el.tagName,
              className: el.className?.toString().slice(0, 50) || '',
              transition: transition.slice(0, 80),
            });
          }
        } catch (e) { /* skip */ }
      }
      return {
        pass: issues.length === 0,
        count: issues.length,
        detail: issues.length ? `${issues.length} elements use transition:all` : 'No transition:all found',
        elements: issues.slice(0, 5),
      };
    });
  }

  async function checkClickableDivs(page) {
    return page.evaluate(() => {
      const issues = [];
      document.querySelectorAll('div[onclick], span[onclick]').forEach(el => {
        const role = el.getAttribute('role');
        const tabindex = el.getAttribute('tabindex');
        if (!role || (role !== 'button' && role !== 'link')) {
          issues.push({
            tag: el.tagName,
            role: role || 'none',
            tabindex: tabindex || 'none',
            html: el.outerHTML.slice(0, 100),
          });
        }
      });
      // Also check elements with click handlers via cursor style
      document.querySelectorAll('div, span').forEach(el => {
        try {
          const cursor = window.getComputedStyle(el).cursor;
          if (cursor === 'pointer') {
            const role = el.getAttribute('role');
            const tag = el.tagName.toLowerCase();
            if (tag !== 'a' && tag !== 'button' && !role) {
              // Has pointer cursor but no semantic role
              issues.push({
                tag: el.tagName,
                role: 'none',
                inferredBy: 'cursor:pointer',
                html: el.outerHTML.slice(0, 100),
              });
            }
          }
        } catch (e) { /* skip */ }
      });
      // Dedupe
      const unique = issues.filter((item, idx) =>
        issues.findIndex(i => i.html === item.html) === idx
      ).slice(0, 20);
      return {
        pass: unique.length === 0,
        count: unique.length,
        detail: unique.length ? `${unique.length} clickable divs/spans without role` : 'All clickable elements have proper roles',
        elements: unique.slice(0, 5),
      };
    });
  }

  async function checkFocusRingVisible(page) {
    // Tab through first 20 focusable elements
    const result = await page.evaluate(() => {
      const focusable = Array.from(document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )).slice(0, 20);

      const issues = [];
      for (const el of focusable) {
        try {
          el.focus();
          const styles = window.getComputedStyle(el);
          const outline = styles.outlineStyle;
          const outlineWidth = parseFloat(styles.outlineWidth) || 0;
          const boxShadow = styles.boxShadow;

          const hasOutline = outline !== 'none' && outlineWidth > 0;
          const hasShadow = boxShadow && boxShadow !== 'none';

          if (!hasOutline && !hasShadow) {
            issues.push({
              tag: el.tagName,
              text: (el.textContent || '').trim().slice(0, 30),
              type: el.type || '',
            });
          }
        } catch (e) { /* detached */ }
      }
      // Blur last element
      if (document.activeElement) document.activeElement.blur();

      return {
        pass: issues.length === 0,
        total: focusable.length,
        count: issues.length,
        detail: issues.length
          ? `${issues.length}/${focusable.length} focusable elements lack visible focus indicator`
          : `All ${focusable.length} focusable elements have visible focus`,
        elements: issues.slice(0, 5),
      };
    });
    return result;
  }

  async function checkInputsHaveLabels(page) {
    return page.evaluate(() => {
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');
      const issues = [];
      inputs.forEach(el => {
        const id = el.id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const closestLabel = el.closest('label');
        if (!hasLabel && !ariaLabel && !ariaLabelledBy && !closestLabel) {
          issues.push({
            tag: el.tagName,
            type: el.type || '',
            name: el.name || '',
            placeholder: el.placeholder || '',
            html: el.outerHTML.slice(0, 100),
          });
        }
      });
      return {
        pass: issues.length === 0,
        total: inputs.length,
        count: issues.length,
        detail: issues.length
          ? `${issues.length}/${inputs.length} inputs lack proper labels`
          : `All ${inputs.length} inputs have labels`,
        elements: issues.slice(0, 5),
      };
    });
  }

  async function checkInputsHaveAutocomplete(page) {
    return page.evaluate(() => {
      const autoFields = {
        email: 'email', password: 'current-password', tel: 'tel',
        name: 'name', 'given-name': 'given-name', 'family-name': 'family-name',
        address: 'street-address', 'postal-code': 'postal-code',
      };
      const inputs = document.querySelectorAll('input');
      const issues = [];
      inputs.forEach(el => {
        const type = el.type || 'text';
        const name = (el.name || '').toLowerCase();
        const autocomplete = el.getAttribute('autocomplete');
        // Check if this looks like a field that should have autocomplete
        const shouldHave = type === 'email' || type === 'tel' || type === 'password'
          || name.includes('email') || name.includes('phone') || name.includes('name')
          || name.includes('address') || name.includes('zip') || name.includes('postal');
        if (shouldHave && !autocomplete) {
          issues.push({
            type, name,
            suggestion: autoFields[type] || autoFields[name] || 'on',
            html: el.outerHTML.slice(0, 100),
          });
        }
      });
      return {
        pass: issues.length === 0,
        count: issues.length,
        detail: issues.length
          ? `${issues.length} inputs missing autocomplete`
          : 'All relevant inputs have autocomplete',
        elements: issues.slice(0, 5),
      };
    });
  }

  async function checkCursorPointer(page) {
    return page.evaluate(() => {
      const interactive = document.querySelectorAll('button, a[href], [role="button"], [role="link"], [role="tab"], [role="menuitem"]');
      const issues = [];
      const sampled = Array.from(interactive).slice(0, 50);
      for (const el of sampled) {
        try {
          const cursor = window.getComputedStyle(el).cursor;
          if (cursor !== 'pointer' && !el.disabled) {
            issues.push({
              tag: el.tagName,
              role: el.getAttribute('role') || '',
              cursor,
              text: (el.textContent || '').trim().slice(0, 30),
            });
          }
        } catch (e) { /* skip */ }
      }
      return {
        pass: issues.length === 0,
        total: sampled.length,
        count: issues.length,
        detail: issues.length
          ? `${issues.length}/${sampled.length} interactive elements lack cursor:pointer`
          : `All ${sampled.length} interactive elements have cursor:pointer`,
        elements: issues.slice(0, 5),
      };
    });
  }

  async function checkNoLayoutShiftOnHover(page) {
    // Hover over 10 interactive elements and check for layout shift
    const result = await page.evaluate(() => {
      const interactive = Array.from(
        document.querySelectorAll('button, a[href], [role="button"]')
      ).slice(0, 10);
      const shifts = [];
      for (const el of interactive) {
        try {
          const before = el.getBoundingClientRect();
          // Simulate hover via class or :hover isn't reliable in evaluate
          // Instead, check if computed styles change dimension-affecting props
          const styles = window.getComputedStyle(el);
          const padding = styles.padding;
          const border = styles.borderWidth;
          const transform = styles.transform;
          // Flag elements with border changes on hover (common layout shift cause)
          if (border === '0px' && styles.borderStyle !== 'none') {
            shifts.push({
              tag: el.tagName,
              text: (el.textContent || '').trim().slice(0, 30),
              concern: 'border may change on hover',
            });
          }
        } catch (e) { /* skip */ }
      }
      return {
        pass: shifts.length === 0,
        count: shifts.length,
        detail: shifts.length
          ? `${shifts.length} elements may shift on hover`
          : 'No hover layout shift detected',
        elements: shifts,
      };
    });
    return result;
  }

  async function checkTouchTargets(page) {
    return page.evaluate((minSize) => {
      const interactive = document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"], [role="tab"]');
      const issues = [];
      const sampled = Array.from(interactive).slice(0, 50);
      for (const el of sampled) {
        try {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.width < minSize || rect.height < minSize) {
              issues.push({
                tag: el.tagName,
                text: (el.textContent || '').trim().slice(0, 30),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                html: el.outerHTML.slice(0, 100),
              });
            }
          }
        } catch (e) { /* skip */ }
      }
      return {
        pass: issues.length === 0,
        total: sampled.length,
        count: issues.length,
        detail: issues.length
          ? `${issues.length}/${sampled.length} targets smaller than ${minSize}x${minSize}px`
          : `All ${sampled.length} touch targets meet ${minSize}px minimum`,
        elements: issues.slice(0, 5),
      };
    }, MIN_TOUCH);
  }

  async function checkContrastRatio(page) {
    return page.evaluate((minRatio) => {
      const textElements = document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6, li, td, th, label, div');
      const sampled = Array.from(textElements).filter(el => {
        const text = (el.textContent || '').trim();
        return text.length > 0 && el.children.length === 0; // leaf text nodes only
      }).slice(0, 50);

      function parseColor(colorStr) {
        const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
        return null;
      }

      function luminance(r, g, b) {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
      }

      function contrastRatio(l1, l2) {
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      const issues = [];
      for (const el of sampled) {
        try {
          const styles = window.getComputedStyle(el);
          const fg = parseColor(styles.color);
          const bg = parseColor(styles.backgroundColor);
          if (fg && bg) {
            const fgL = luminance(fg.r, fg.g, fg.b);
            const bgL = luminance(bg.r, bg.g, bg.b);
            const ratio = contrastRatio(fgL, bgL);
            const fontSize = parseFloat(styles.fontSize);
            const fontWeight = parseInt(styles.fontWeight) || 400;
            const isLargeText = fontSize >= 24 || (fontSize >= 18.67 && fontWeight >= 700);
            const requiredRatio = isLargeText ? 3 : minRatio;

            if (ratio < requiredRatio) {
              issues.push({
                tag: el.tagName,
                text: (el.textContent || '').trim().slice(0, 30),
                fg: styles.color,
                bg: styles.backgroundColor,
                ratio: Math.round(ratio * 100) / 100,
                required: requiredRatio,
                isLargeText,
              });
            }
          }
        } catch (e) { /* skip */ }
      }
      return {
        pass: issues.length === 0,
        total: sampled.length,
        count: issues.length,
        detail: issues.length
          ? `${issues.length}/${sampled.length} text elements fail contrast (< ${minRatio}:1)`
          : `All ${sampled.length} sampled elements pass contrast`,
        elements: issues.slice(0, 5),
      };
    }, MIN_CONTRAST);
  }

  async function checkNoEmojiIcons(page) {
    return page.evaluate(() => {
      // Common UI emoji patterns used instead of proper icons
      const uiEmojiPattern = /[\u{1F4DD}\u{1F4E6}\u{1F527}\u{2699}\u{1F50D}\u{1F5D1}\u{2795}\u{2796}\u{274C}\u{2714}\u{1F4CB}\u{1F4C4}\u{1F4C1}\u{1F512}\u{1F513}\u{26A0}\u{2139}\u{1F6A8}\u{1F504}\u{1F4AC}\u{1F464}\u{1F465}]/u;
      const elements = document.querySelectorAll('button, a, [role="button"], nav *, header *');
      const issues = [];
      const sampled = Array.from(elements).slice(0, 100);
      for (const el of sampled) {
        const text = el.textContent || '';
        if (uiEmojiPattern.test(text)) {
          issues.push({
            tag: el.tagName,
            emoji: text.match(uiEmojiPattern)?.[0],
            text: text.trim().slice(0, 40),
          });
        }
      }
      return {
        pass: issues.length === 0,
        count: issues.length,
        detail: issues.length
          ? `${issues.length} UI elements use emoji instead of SVG icons`
          : 'No emoji icons detected',
        elements: issues.slice(0, 5),
      };
    });
  }

  async function checkFontQuality(page) {
    return page.evaluate(() => {
      const genericFonts = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded']);
      const systemFonts = new Set(['arial', 'helvetica', 'times new roman', 'times', 'courier new', 'courier', 'verdana', 'georgia', 'trebuchet ms', 'segoe ui']);
      const qualityFonts = new Set(['inter', 'roboto', 'open sans', 'lato', 'poppins', 'nunito', 'montserrat', 'source sans', 'source sans pro', 'ibm plex sans', 'dm sans', 'manrope', 'space grotesk', 'playfair display', 'geist']);

      const fontFamilies = new Set();
      const elements = document.querySelectorAll('body, h1, h2, h3, p, a, button, input, span');
      const sampled = Array.from(elements).slice(0, 50);

      for (const el of sampled) {
        try {
          const ff = window.getComputedStyle(el).fontFamily;
          if (ff) fontFamilies.add(ff);
        } catch (e) { /* skip */ }
      }

      const parsed = [];
      for (const ff of fontFamilies) {
        const fonts = ff.split(',').map(f => f.trim().replace(/['"]/g, '').toLowerCase());
        const primary = fonts[0];
        const isGenericOnly = fonts.every(f => genericFonts.has(f) || systemFonts.has(f));
        const hasQuality = fonts.some(f => qualityFonts.has(f));
        parsed.push({ family: ff, primary, isGenericOnly, hasQuality });
      }

      const genericOnlyCount = parsed.filter(p => p.isGenericOnly).length;
      const hasAnyQuality = parsed.some(p => p.hasQuality);

      return {
        pass: hasAnyQuality,
        totalFamilies: parsed.length,
        genericOnly: genericOnlyCount,
        qualityFonts: parsed.filter(p => p.hasQuality).map(p => p.primary),
        detail: hasAnyQuality
          ? `${parsed.length} font families found, includes quality fonts`
          : `${parsed.length} font families, all generic/system only`,
        families: parsed.slice(0, 10),
      };
    });
  }

  async function checkColorPalette(page) {
    return page.evaluate((maxColors) => {
      const colors = new Map();
      const elements = document.querySelectorAll('*');
      const sampled = Array.from(elements).slice(0, 200);

      for (const el of sampled) {
        try {
          const styles = window.getComputedStyle(el);
          [styles.color, styles.backgroundColor, styles.borderColor].forEach(c => {
            if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') {
              colors.set(c, (colors.get(c) || 0) + 1);
            }
          });
        } catch (e) { /* skip */ }
      }

      // Sort by frequency
      const sorted = Array.from(colors.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([color, count]) => ({ color, count }));

      // Count CSS custom properties
      let customProps = 0;
      try {
        const allStyles = document.querySelectorAll('style');
        const styleText = Array.from(allStyles).map(s => s.textContent).join('');
        customProps = (styleText.match(/--[\w-]+/g) || []).length;
      } catch (e) { /* skip */ }

      // Check for animations
      let hasAnimations = false;
      let hasReducedMotion = false;
      try {
        const allStyles = document.querySelectorAll('style');
        const styleText = Array.from(allStyles).map(s => s.textContent).join('');
        hasAnimations = /@keyframes/.test(styleText) || /transition/.test(styleText);
        hasReducedMotion = /prefers-reduced-motion/.test(styleText);
      } catch (e) { /* skip */ }

      return {
        pass: sorted.length <= maxColors,
        uniqueColors: sorted.length,
        maxAllowed: maxColors,
        detail: sorted.length > maxColors
          ? `${sorted.length} unique colors exceeds ${maxColors} limit`
          : `${sorted.length} unique colors within ${maxColors} limit`,
        topColors: sorted.slice(0, 10),
        designSystem: {
          customProperties: customProps,
          hasAnimations,
          hasReducedMotion,
        },
      };
    }, MAX_COLORS);
  }

  // ===== NEW CHECK IMPLEMENTATIONS (16-25) =====

  async function checkIconButtonLabels(page) {
    return page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      const issues = [];
      for (const btn of buttons) {
        const hasText = (btn.textContent || '').trim().length > 0;
        const hasAriaLabel = btn.getAttribute('aria-label');
        const hasAriaLabelledBy = btn.getAttribute('aria-labelledby');
        const hasTitle = btn.getAttribute('title');
        const hasImg = btn.querySelector('svg, img, i, [class*="icon"]');
        // Icon-only button: has an icon element but no visible text or ARIA label
        if (hasImg && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
          // Check if text content is only whitespace or empty
          const textOnly = (btn.textContent || '').replace(/\s/g, '');
          if (textOnly.length === 0) {
            issues.push({
              tag: btn.tagName,
              html: btn.outerHTML.slice(0, 120),
              iconType: btn.querySelector('svg') ? 'svg' : btn.querySelector('img') ? 'img' : 'icon-class',
            });
          }
        }
      }
      return {
        pass: issues.length === 0,
        count: issues.length,
        detail: issues.length
          ? `${issues.length} icon-only buttons lack accessible labels`
          : 'All icon buttons have labels',
        elements: issues.slice(0, 5),
      };
    });
  }

  async function checkHeadingHierarchy(page) {
    return page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const levels = Array.from(headings).map(h => parseInt(h.tagName[1]));
      const issues = [];
      for (let i = 1; i < levels.length; i++) {
        const gap = levels[i] - levels[i - 1];
        if (gap > 1) {
          issues.push({
            from: `h${levels[i - 1]}`,
            to: `h${levels[i]}`,
            skipped: `h${levels[i - 1] + 1}`,
            text: (headings[i].textContent || '').trim().slice(0, 40),
          });
        }
      }
      // Also check: no h1 on page
      const h1Count = levels.filter(l => l === 1).length;
      if (h1Count === 0 && headings.length > 0) {
        issues.push({ from: 'none', to: `h${levels[0]}`, skipped: 'h1', text: 'No h1 found on page' });
      }
      if (h1Count > 1) {
        issues.push({ from: 'h1', to: 'h1', skipped: 'none', text: `${h1Count} h1 elements (should be 1)` });
      }
      return {
        pass: issues.length === 0,
        count: issues.length,
        totalHeadings: headings.length,
        detail: issues.length
          ? `${issues.length} heading hierarchy issues (${headings.length} total headings)`
          : `${headings.length} headings in correct hierarchy`,
        elements: issues.slice(0, 5),
      };
    });
  }

  async function checkClickableLabels(page) {
    return page.evaluate(() => {
      const labels = document.querySelectorAll('label');
      const issues = [];
      for (const label of labels) {
        const forAttr = label.getAttribute('for');
        const wrapsInput = label.querySelector('input, select, textarea');
        if (!forAttr && !wrapsInput) {
          issues.push({
            text: (label.textContent || '').trim().slice(0, 40),
            html: label.outerHTML.slice(0, 100),
          });
        }
        if (forAttr) {
          const target = document.getElementById(forAttr);
          if (!target) {
            issues.push({
              text: (label.textContent || '').trim().slice(0, 40),
              for: forAttr,
              reason: 'for attribute references non-existent id',
            });
          }
        }
      }
      return {
        pass: issues.length === 0,
        total: labels.length,
        count: issues.length,
        detail: issues.length
          ? `${issues.length}/${labels.length} labels not properly associated`
          : `All ${labels.length} labels properly associated`,
        elements: issues.slice(0, 5),
      };
    });
  }

  async function checkReadableFontSize(page) {
    return page.evaluate(() => {
      const textElements = document.querySelectorAll('p, span, li, td, th, dd, dt, blockquote, label');
      const issues = [];
      const sampled = Array.from(textElements).filter(el =>
        (el.textContent || '').trim().length > 5 && el.children.length === 0
      ).slice(0, 50);
      for (const el of sampled) {
        try {
          const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
          if (fontSize < 14) {
            issues.push({
              tag: el.tagName,
              text: (el.textContent || '').trim().slice(0, 30),
              fontSize: Math.round(fontSize * 10) / 10,
            });
          }
        } catch (e) { /* skip */ }
      }
      return {
        pass: issues.length === 0,
        total: sampled.length,
        count: issues.length,
        detail: issues.length
          ? `${issues.length}/${sampled.length} text elements below 14px`
          : `All ${sampled.length} sampled text elements >= 14px`,
        elements: issues.slice(0, 5),
      };
    });
  }

  async function checkHorizontalScroll(page) {
    return page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const hasHScroll = scrollWidth > docWidth + 1; // 1px tolerance
      const overflowElements = [];
      if (hasHScroll) {
        // Find elements causing overflow
        const allEls = document.querySelectorAll('*');
        for (const el of allEls) {
          const rect = el.getBoundingClientRect();
          if (rect.right > docWidth + 5) {
            overflowElements.push({
              tag: el.tagName,
              className: (el.className?.toString() || '').slice(0, 50),
              width: Math.round(rect.width),
              right: Math.round(rect.right),
            });
            if (overflowElements.length >= 5) break;
          }
        }
      }
      return {
        pass: !hasHScroll,
        docWidth,
        scrollWidth,
        detail: hasHScroll
          ? `Horizontal scroll detected (${scrollWidth}px > ${docWidth}px viewport)`
          : 'No horizontal scrollbar',
        elements: overflowElements,
      };
    });
  }

  async function checkLineHeightReadability(page) {
    return page.evaluate(() => {
      const textElements = document.querySelectorAll('p, li, dd, blockquote');
      const issues = [];
      const sampled = Array.from(textElements).filter(el =>
        (el.textContent || '').trim().length > 20
      ).slice(0, 30);
      for (const el of sampled) {
        try {
          const styles = window.getComputedStyle(el);
          const lineHeight = parseFloat(styles.lineHeight);
          const fontSize = parseFloat(styles.fontSize);
          if (!isNaN(lineHeight) && !isNaN(fontSize) && fontSize > 0) {
            const ratio = lineHeight / fontSize;
            if (ratio < 1.35 || ratio > 2.0) {
              issues.push({
                tag: el.tagName,
                text: (el.textContent || '').trim().slice(0, 30),
                lineHeight: Math.round(lineHeight * 10) / 10,
                fontSize: Math.round(fontSize * 10) / 10,
                ratio: Math.round(ratio * 100) / 100,
              });
            }
          }
        } catch (e) { /* skip */ }
      }
      return {
        pass: issues.length === 0,
        total: sampled.length,
        count: issues.length,
        detail: issues.length
          ? `${issues.length}/${sampled.length} text blocks have poor line-height (outside 1.35-2.0x)`
          : `All ${sampled.length} text blocks have readable line-height`,
        elements: issues.slice(0, 5),
      };
    });
  }

  async function checkImgDimensions(page) {
    return page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const issues = [];
      for (const img of images) {
        const hasWidth = img.hasAttribute('width') || img.style.width;
        const hasHeight = img.hasAttribute('height') || img.style.height;
        const hasAspectRatio = img.style.aspectRatio;
        if (!hasWidth || !hasHeight) {
          if (!hasAspectRatio) {
            issues.push({
              src: (img.src || '').slice(-60),
              alt: (img.alt || '').slice(0, 30),
              hasWidth: !!hasWidth,
              hasHeight: !!hasHeight,
            });
          }
        }
      }
      return {
        pass: issues.length === 0,
        total: images.length,
        count: issues.length,
        detail: issues.length
          ? `${issues.length}/${images.length} images missing explicit dimensions (CLS risk)`
          : `All ${images.length} images have explicit dimensions`,
        elements: issues.slice(0, 5),
      };
    });
  }

  async function checkReducedMotionSupport(page) {
    return page.evaluate(() => {
      // Check if any stylesheets contain prefers-reduced-motion
      let hasReducedMotion = false;
      let hasAnimations = false;
      const styleSheets = document.querySelectorAll('style');
      const linkSheets = document.querySelectorAll('link[rel="stylesheet"]');
      let styleText = '';
      for (const s of styleSheets) {
        styleText += s.textContent || '';
      }
      hasAnimations = /@keyframes|animation:|transition:/.test(styleText);
      hasReducedMotion = /prefers-reduced-motion/.test(styleText);
      // Also check computed styles for animations
      if (!hasAnimations) {
        const allEls = Array.from(document.querySelectorAll('*')).slice(0, 100);
        for (const el of allEls) {
          try {
            const styles = window.getComputedStyle(el);
            const anim = styles.animationName;
            const trans = styles.transition;
            if ((anim && anim !== 'none') || (trans && trans !== 'all 0s ease 0s' && trans !== 'none')) {
              hasAnimations = true;
              break;
            }
          } catch (e) { /* skip */ }
        }
      }
      const pass = !hasAnimations || hasReducedMotion;
      return {
        pass,
        hasAnimations,
        hasReducedMotion,
        externalSheets: linkSheets.length,
        detail: !hasAnimations
          ? 'No animations detected'
          : hasReducedMotion
            ? 'Animations found with prefers-reduced-motion support'
            : 'Animations found WITHOUT prefers-reduced-motion media query',
      };
    });
  }

  async function checkImgLazyLoading(page) {
    return page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const viewportHeight = window.innerHeight;
      const issues = [];
      for (const img of images) {
        const rect = img.getBoundingClientRect();
        const isBelowFold = rect.top > viewportHeight;
        const hasLazy = img.getAttribute('loading') === 'lazy';
        if (isBelowFold && !hasLazy && img.src) {
          issues.push({
            src: (img.src || '').slice(-60),
            alt: (img.alt || '').slice(0, 30),
            topOffset: Math.round(rect.top),
          });
        }
      }
      return {
        pass: issues.length === 0,
        total: images.length,
        count: issues.length,
        detail: issues.length
          ? `${issues.length} below-fold images without loading="lazy"`
          : `All below-fold images use lazy loading (${images.length} total)`,
        elements: issues.slice(0, 5),
      };
    });
  }

  async function checkZIndexSanity(page) {
    return page.evaluate(() => {
      const allEls = document.querySelectorAll('*');
      const zIndices = [];
      const issues = [];
      for (const el of allEls) {
        try {
          const z = window.getComputedStyle(el).zIndex;
          if (z !== 'auto') {
            const zNum = parseInt(z);
            if (!isNaN(zNum) && zNum !== 0) {
              zIndices.push(zNum);
              // Flag non-standard z-index values (not multiples of 10, except 1/-1)
              if (Math.abs(zNum) > 1 && zNum % 10 !== 0) {
                issues.push({
                  tag: el.tagName,
                  className: (el.className?.toString() || '').slice(0, 50),
                  zIndex: zNum,
                });
              }
            }
          }
        } catch (e) { /* skip */ }
      }
      const uniqueZ = [...new Set(zIndices)].sort((a, b) => a - b);
      return {
        pass: issues.length === 0,
        uniqueValues: uniqueZ.length,
        range: uniqueZ.length ? `${uniqueZ[0]} to ${uniqueZ[uniqueZ.length - 1]}` : 'none',
        count: issues.length,
        detail: issues.length
          ? `${issues.length} non-standard z-index values (not multiples of 10)`
          : `${uniqueZ.length} z-index values, all well-organized`,
        values: uniqueZ.slice(0, 10),
        elements: issues.slice(0, 5),
      };
    });
  }

  // --- Check dispatcher ---
  const checkFns = {
    'no-user-scalable-no': checkNoUserScalableNo,
    'no-paste-prevention': checkNoPastePrevention,
    'no-outline-removal': checkNoOutlineRemoval,
    'no-transition-all': checkNoTransitionAll,
    'clickable-divs': checkClickableDivs,
    'focus-ring-visible': checkFocusRingVisible,
    'inputs-have-labels': checkInputsHaveLabels,
    'inputs-have-autocomplete': checkInputsHaveAutocomplete,
    'cursor-pointer': checkCursorPointer,
    'no-layout-shift-on-hover': checkNoLayoutShiftOnHover,
    'touch-targets-44px': checkTouchTargets,
    'contrast-ratio': checkContrastRatio,
    'no-emoji-icons': checkNoEmojiIcons,
    'font-quality': checkFontQuality,
    'color-palette': checkColorPalette,
    'icon-button-labels': checkIconButtonLabels,
    'heading-hierarchy': checkHeadingHierarchy,
    'clickable-labels': checkClickableLabels,
    'readable-font-size': checkReadableFontSize,
    'horizontal-scroll': checkHorizontalScroll,
    'line-height-readability': checkLineHeightReadability,
    'img-dimensions': checkImgDimensions,
    'reduced-motion-support': checkReducedMotionSupport,
    'img-lazy-loading': checkImgLazyLoading,
    'z-index-sanity': checkZIndexSanity,
  };

  // ===== RUN CHECKS =====
  for (const route of routes) {
    const url = BASE_URL + route.path;
    console.log(`\n--- ${route.name} (${route.path}) ---`);

    const routeResults = await withPage(url, async (page) => {
      const checkResults = [];

      for (const check of activeChecks) {
        const fn = checkFns[check.id];
        if (!fn) continue;

        try {
          const result = await fn(page);
          const checkResult = {
            id: check.id,
            category: check.category,
            severity: check.severity,
            route: route.path,
            ...result,
          };
          checkResults.push(checkResult);
          results.meta.checksRun++;

          const icon = result.pass ? 'PASS' : check.severity === 'error' ? 'FAIL' : check.severity === 'warning' ? 'WARN' : 'INFO';
          console.log(`  [${icon}] ${check.id}: ${result.detail}`);
        } catch (e) {
          checkResults.push({
            id: check.id,
            category: check.category,
            severity: check.severity,
            route: route.path,
            pass: null,
            error: e.message,
          });
          console.log(`  [ERR] ${check.id}: ${e.message}`);
        }
      }

      return checkResults;
    });

    if (routeResults.error) {
      console.log(`  Route error: ${routeResults.error}`);
    } else if (Array.isArray(routeResults)) {
      results.checks.push(...routeResults);
    }
  }

} catch (err) {
  console.error('FATAL:', err.message);
  results.fatalError = err.message;
} finally {
  if (browser) await browser.close();
}

// ===== Summarize =====
for (const check of results.checks) {
  if (check.pass === true) results.summary.passed++;
  else if (check.pass === false) {
    if (check.severity === 'error') results.summary.errors++;
    else if (check.severity === 'warning') results.summary.warnings++;
    else results.summary.infos++;
  }
}

console.log('\n========================================');
console.log('DESIGN AUDIT SUMMARY');
console.log('========================================\n');
console.log(`Checks run:  ${results.meta.checksRun}`);
console.log(`Passed:      ${results.summary.passed}`);
console.log(`Errors:      ${results.summary.errors}`);
console.log(`Warnings:    ${results.summary.warnings}`);
console.log(`Info:        ${results.summary.infos}`);

// ===== Output =====
const outFile = outputPath || './design-audit-results.json';
writeFileSync(resolve(outFile), JSON.stringify(results, null, 2));
console.log(`\nResults written to: ${outFile}`);
