// #region base styles
// Shared chrome for the MysqlJS Assistant panel: page layout, header, tabs,
// buttons, chips, transcript rows and the coach composer. View-specific styles
// live in src/styles/*.js and only add their own prefixed rules.
// Only host theme tokens are used as colors; literal colors never appear here.

const MYSQL_CSS_BASE = `
.my-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: var(--my-font);
  font-size: 13px;
  line-height: 1.55;
  overflow: hidden;
  /* identity palette: MySQL teal + warm orange, readable on light and dark host themes */
  /* Apple 设计语言：系统蓝 #007AFF / 营销蓝 #0071E3，系统橙 #FF9500 作为少量强调 */
  --my-accent: #0071e3;
  --my-accent-2: #0a84ff;
  --my-accent-strong: #0058b0;
  --my-accent-warm: #ff9500;
  --my-accent-warm-2: #ffb340;
  --my-accent-text: color-mix(in srgb, var(--my-accent) 82%, var(--dsw-alias-label-primary));
  --my-accent-soft: color-mix(in srgb, var(--my-accent) 10%, transparent);
  --my-accent-softer: color-mix(in srgb, var(--my-accent) 6%, transparent);
  --my-accent-border: color-mix(in srgb, var(--my-accent) 34%, transparent);
  --my-warm-text: color-mix(in srgb, var(--my-accent-warm) 80%, var(--dsw-alias-label-primary));
  --my-warm-soft: color-mix(in srgb, var(--my-accent-warm) 12%, transparent);
  --my-warm-border: color-mix(in srgb, var(--my-accent-warm) 30%, transparent);
  --my-surface-muted: color-mix(in srgb, var(--dsw-alias-bg-base) 95%, var(--dsw-alias-label-primary));
  --my-hairline: color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent);
  --my-primary-gradient: linear-gradient(180deg, #0a84ff 0%, #0071e3 100%);
  --my-primary-gradient-hover: linear-gradient(180deg, #2b95ff 0%, #0077ed 100%);
  --my-warm-gradient: linear-gradient(180deg, #ffb340 0%, #ff9500 100%);
  --my-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "PingFang SC", "Helvetica Neue", "Segoe UI", Arial, sans-serif;
}
.my-page *, .my-page *::before, .my-page *::after { box-sizing: border-box; }
:where(.my-page) button, :where(.my-page) input, :where(.my-page) textarea, :where(.my-page) select {
  font-family: inherit; color: inherit;
}
.my-page code, .my-page pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }

.my-header {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 60px;
  padding: 10px 22px;
  flex: none;
  border-bottom: 1px solid var(--my-hairline);
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 82%, transparent);
  backdrop-filter: saturate(180%) blur(20px);
}
.my-brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
.my-brandMark {
  width: 38px; height: 38px; flex: none;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 11px; color: #fff;
  background: linear-gradient(180deg, #0a84ff 0%, #0071e3 100%);
  border: 1px solid transparent;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--my-accent) 26%, transparent);
}
.my-brandText { min-width: 0; }
.my-title { margin: 0; font-size: 17px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.35; }
.my-subtitle { margin: 2px 0 0; font-size: 11.5px; color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.my-headerEnd { margin-left: auto; display: flex; align-items: center; gap: 9px; flex: none; }
.my-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 1.35px; color: var(--my-warm-text); text-transform: uppercase; }

.my-wsField { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.my-wsSelect {
  max-width: 190px; min-height: 29px; padding: 5px 8px; border-radius: 8px; font-size: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1); outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.my-wsSelect:focus { border-color: color-mix(in srgb, var(--my-accent) 55%, var(--dsw-alias-border-l1)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--my-accent) 9%, transparent); }
.my-statChip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px; border-radius: 999px; font-size: 11px;
  color: var(--dsw-alias-label-secondary);
  border: 1px solid var(--my-hairline);
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 68%, transparent);
}
.my-statChip .my-glyph { color: var(--dsw-alias-label-secondary); }
.my-header { position: relative; z-index: 30; }
.my-envWrap { position: relative; flex: none; }
.my-envBtn {
  display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding: 5px 11px;
  border-radius: 980px; cursor: pointer; font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  border: 1px solid var(--my-hairline); background: var(--dsw-alias-bg-layer-1);
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.my-envBtn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.my-envModeValue { font-weight: 600; color: var(--my-accent); }
.my-envDot { width: 6px; height: 6px; flex: none; border-radius: 50%; background: var(--dsw-alias-label-secondary); opacity: 0.5; }
.my-envDot[data-connected="true"] { background: var(--dsw-alias-state-success-primary); opacity: 1; box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-success-primary) 22%, transparent); }
.my-envScrim { position: fixed; inset: 0; z-index: 80; background: transparent; }
.my-envPopover {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 81; width: 348px;
  display: flex; flex-direction: column; gap: 9px; padding: 12px;
  border-radius: 14px; border: 1px solid var(--my-hairline);
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.18);
}
.my-envHead { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.my-envHead strong { font-size: 12.5px; font-weight: 650; }
.my-envHead .my-iconBtn { transform: rotate(45deg); }
.my-envModes { display: flex; gap: 3px; padding: 3px; border-radius: 10px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); }
.my-envMode { flex: 1; padding: 6px; border: none; border-radius: 8px; background: transparent; cursor: pointer; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.my-envMode[data-active="true"] { background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-weight: 600; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08); }
.my-envBody { display: flex; flex-direction: column; gap: 7px; }
.my-envGrid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 6px; }
.my-envField { display: flex; flex-direction: column; gap: 3px; min-width: 0; font-size: 9.5px; color: var(--dsw-alias-label-secondary); }
.my-envFieldWide { grid-column: 1 / -1; }
.my-envField input {
  width: 100%; min-width: 0; box-sizing: border-box;
  min-height: 28px; padding: 4px 8px; border-radius: 8px; font-size: 11.5px;
  border: 1px solid var(--my-hairline); background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary); outline: none;
}
.my-envField input:focus { border-color: var(--my-accent-border); box-shadow: 0 0 0 3px color-mix(in srgb, var(--my-accent) 10%, transparent); }
.my-envActions { display: flex; gap: 6px; flex-wrap: wrap; }
.my-envStatus { margin: 0; font-size: 10px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }
.my-envStatus[data-tone="error"] { color: var(--dsw-alias-state-error-primary); }
.my-envStatus[data-tone="ok"] { color: var(--dsw-alias-state-success-primary); }
.my-envStatus[data-tone="warn"] { color: var(--dsw-alias-state-warn-primary); }
.my-envHint { margin: 0; font-size: 9.5px; line-height: 1.55; color: color-mix(in srgb, var(--dsw-alias-label-secondary) 85%, transparent); }
.my-envClose { align-self: flex-start; }

.my-tabs {
  align-self: flex-start; display: inline-flex; gap: 2px; flex: none;
  margin: 8px 18px 10px; padding: 3px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent);
  border: 1px solid transparent;
}
.my-tab {
  position: relative;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 13px; border: 1px solid transparent; background: transparent; cursor: pointer;
  color: var(--dsw-alias-label-secondary); font-size: 12.5px;
  border-radius: 9px;
  transition: color 140ms ease, background 140ms ease, box-shadow 140ms ease;
}
.my-tab .my-glyph { opacity: 0.9; }
.my-tab:hover { color: var(--dsw-alias-label-primary); background: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent); }
.my-tab[aria-selected="true"] {
  color: var(--dsw-alias-label-primary); font-weight: 600;
  background: var(--dsw-alias-bg-layer-1);
  border-color: transparent;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 1px 1px rgba(0, 0, 0, 0.04);
}
.my-tab[aria-selected="true"] .my-glyph { color: var(--my-accent); opacity: 1; }
.my-tab:focus-visible, .my-btn:focus-visible, .my-iconBtn:focus-visible, .my-linkBtn:focus-visible {
  outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--my-accent) 26%, transparent);
}

.my-body { flex: 1; min-height: 0; display: flex; overflow: hidden; }
.my-scroll { overflow-y: auto; overflow-x: hidden; scrollbar-gutter: stable; }
.my-scroll::-webkit-scrollbar, .my-transcript::-webkit-scrollbar, .my-codeScroll::-webkit-scrollbar { width: 9px; height: 9px; }
.my-scroll::-webkit-scrollbar-track, .my-transcript::-webkit-scrollbar-track { background: transparent; }
.my-scroll::-webkit-scrollbar-thumb, .my-transcript::-webkit-scrollbar-thumb, .my-codeScroll::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--dsw-alias-label-secondary) 24%, transparent);
  border-radius: 999px; border: 2px solid transparent; background-clip: content-box;
}
.my-scroll::-webkit-scrollbar-thumb:hover, .my-transcript::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--dsw-alias-label-secondary) 40%, transparent); background-clip: content-box; }
.my-muted { color: var(--dsw-alias-label-secondary); }
.my-empty { padding: 34px 18px; text-align: center; color: var(--dsw-alias-label-secondary); display: flex; flex-direction: column; align-items: center; gap: 10px; }

.my-input, .my-select {
  min-height: 30px; padding: 6px 11px; border-radius: 10px; font-size: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary); outline: none; min-width: 0;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.my-input:hover, .my-select:hover { border-color: var(--dsw-alias-border-l2); }
.my-input:focus, .my-select:focus {
  border-color: color-mix(in srgb, var(--my-accent) 55%, var(--dsw-alias-border-l1));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--my-accent) 9%, transparent);
}
.my-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-height: 30px; padding: 5px 13px; border-radius: 980px; cursor: pointer;
  border: 1px solid transparent;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);
  color: var(--dsw-alias-label-primary); font-size: 12px; font-weight: 500;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
  white-space: nowrap;
}
.my-btn .my-glyph { opacity: 0.9; }
.my-btn:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent); border-color: transparent; color: var(--dsw-alias-label-primary); }
.my-btn:active:not(:disabled) { transform: translateY(1px); }
.my-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.my-btnPrimary {
  background: var(--my-accent); border-color: transparent; color: #fff; font-weight: 600;
  box-shadow: none;
}
.my-btnPrimary:hover {
  background: #0077ed; color: #fff; border-color: transparent;
  box-shadow: none;
}
.my-btnPrimary .my-glyph { opacity: 1; }
.my-btnWarm {
  background: var(--my-accent-warm); border-color: transparent; color: #fff; font-weight: 600;
}
.my-btnWarm:hover { color: #fff; border-color: transparent; background: #ffa51f; }
.my-btnGhost { background: transparent; border-color: transparent; }
.my-btnGhost:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); border-color: transparent; color: var(--dsw-alias-label-primary); }
.my-btnSmall { padding: 4px 10px; font-size: 11.5px; border-radius: 980px; min-height: 26px; }
.my-btnDanger { color: var(--dsw-alias-state-error-primary); }
.my-linkBtn { border: none; background: none; padding: 0; color: var(--my-accent); cursor: pointer; font-size: 12px; font-weight: 500; }
.my-linkBtn:hover { text-decoration: underline; }
.my-iconBtn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
  border: 1px solid transparent; background: transparent; color: var(--dsw-alias-label-secondary);
  transition: background 120ms ease, color 120ms ease;
}
.my-iconBtn:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); color: var(--dsw-alias-label-primary); }
.my-iconBtn:active { background: color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent); }
.my-iconBtn:disabled { opacity: 0.4; cursor: not-allowed; }

.my-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 9px; border-radius: 999px; font-size: 10.5px;
  border: 1px solid transparent;
  color: var(--dsw-alias-label-secondary);
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);
  white-space: nowrap; line-height: 1.6;
}
.my-chipSoft { border-color: transparent; background: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent); }
.my-chipBrand { color: var(--my-accent); border-color: transparent; background: var(--my-accent-soft); font-weight: 500; }
.my-chipWarm { color: var(--my-warm-text); border-color: var(--my-warm-border); background: var(--my-warm-soft); font-weight: 600; }
.my-pillRow { display: flex; flex-wrap: wrap; gap: 6px; }

.my-topicChip {
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 11px;
  border-radius: 980px; cursor: pointer; font-size: 11px; font-weight: 500;
  color: var(--dsw-alias-label-primary);
  border: 1px solid var(--my-hairline);
  background: var(--dsw-alias-bg-layer-1);
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease, transform 120ms ease;
}
.my-topicChip .my-glyph { color: var(--my-accent-text); }
.my-topicChip:hover {
  border-color: var(--my-accent-border);
  background: var(--my-accent-softer);
  color: var(--my-accent-text);
  transform: translateY(-1px);
}

.my-sectionTitle { margin: 0; font-size: 13.5px; font-weight: 650; }
.my-sectionHead { display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px 12px; flex: none; }
.my-sectionHeading { min-width: 0; }
.my-sectionIntro { margin: 4px 0 0; color: var(--dsw-alias-label-secondary); font-size: 12px; max-width: 780px; }

.my-spinner {
  width: 14px; height: 14px; flex: none; display: inline-block;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--dsw-alias-label-secondary) 30%, transparent);
  border-top-color: var(--my-accent-text);
  animation: my-spin 0.8s linear infinite;
}
.my-spinnerOnBrand { border-color: color-mix(in srgb, var(--dsw-alias-bg-base) 35%, transparent); border-top-color: var(--dsw-alias-bg-base); }
@keyframes my-spin { to { transform: rotate(360deg); } }

.my-statusPill { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.my-statusDot { width: 7px; height: 7px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary); flex: none; }
.my-statusPill[data-tone="running"] .my-statusDot { background: var(--dsw-alias-state-success-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent); animation: my-pulse 1.6s ease-in-out infinite; }
.my-statusPill[data-tone="error"] .my-statusDot { background: var(--dsw-alias-state-error-primary); }
.my-statusPill[data-tone="warn"] .my-statusDot { background: var(--dsw-alias-state-warn-primary); }
@keyframes my-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }

.my-toast {
  position: absolute; right: 20px; bottom: 18px; max-width: 460px;
  padding: 10px 14px; border-radius: 12px; font-size: 12px; z-index: 20;
  background: var(--dsw-alias-bg-overlay);
  border: 1px solid var(--dsw-alias-border-l2);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent);
}
.my-toast[data-tone="error"] { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent); color: var(--dsw-alias-state-error-primary); }

/* SQL syntax highlighting: Atom One Dark palette */
:root, .my-page {
  --my-one-bg: #282c34;
  --my-one-bg-dark: #21252b;
  --my-one-fg: #abb2bf;
  --my-one-comment: #5c6370;
  --my-one-keyword: #c678dd;
  --my-one-string: #98c379;
  --my-one-number: #d19a66;
  --my-one-function: #61afef;
  --my-one-type: #e5c07b;
  --my-one-ident: #e06c75;
  --my-one-operator: #56b6c2;
}
.my-tok-kw { color: var(--my-one-keyword); font-weight: 600; }
.my-tok-type { color: var(--my-one-type); font-weight: 600; }
.my-tok-fn { color: var(--my-one-function); }
.my-tok-str { color: var(--my-one-string); }
.my-tok-num { color: var(--my-one-number); }
.my-tok-com { color: var(--my-one-comment); font-style: italic; }
.my-tok-op { color: var(--my-one-operator); }
.my-tok-ident { color: var(--my-one-ident); }
.my-tok-id { color: var(--my-one-fg); }

.my-inlineCode {
  padding: 1px 5px; border-radius: 5px; font-size: 0.92em;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
}
.my-inlineLink { color: var(--my-accent); text-decoration: none; }
.my-inlineLink:hover { text-decoration: underline; }
.my-richPara { margin: 0 0 9px; }
.my-richHead { margin: 14px 0 7px; font-size: 13.5px; }
.my-richList { margin: 0 0 10px; padding-left: 20px; }
.my-richList li { margin: 2px 0; }
.my-richQuote { margin: 0 0 10px; padding: 2px 12px; border-left: 2px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); }
.my-richCode {
  margin: 0 0 10px; padding: 10px 12px; border-radius: 8px; overflow-x: auto;
  background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1);
  font-size: 11.5px; line-height: 1.5;
}

/* ---- rendered markdown: One Dark code blocks, tables, rules ---- */
.my-oneDark {
  --my-od-bg: #282c34;
  --my-od-bg-deep: #21252b;
  --my-od-border: #181a1f;
  --my-od-fg: #abb2bf;
  --my-od-muted: #7f848e;
  --my-od-comment: #5c6370;
  --my-od-gutter: #4b5263;
  --my-od-purple: #c678dd;
  --my-od-green: #98c379;
  --my-od-orange: #d19a66;
  --my-od-yellow: #e5c07b;
  --my-od-blue: #61afef;
  --my-od-red: #e06c75;
  --my-od-cyan: #56b6c2;
}
.my-mdCode {
  margin: 0 0 10px; border: 1px solid var(--my-od-border); border-radius: 9px; overflow: hidden;
  background: var(--my-od-bg); color: var(--my-od-fg);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px; line-height: 1.6;
}
.my-mdCodeHead {
  display: flex; align-items: center; gap: 8px; min-height: 24px; padding: 3px 10px;
  background: var(--my-od-bg-deep); border-bottom: 1px solid var(--my-od-border);
  color: var(--my-od-muted); font-size: 10px; letter-spacing: 0.3px;
}
.my-mdCodeDots { display: inline-flex; align-items: center; gap: 4px; flex: none; }
.my-mdCodeDots i { width: 7px; height: 7px; border-radius: 50%; background: #4b5263; display: block; }
.my-mdCodeDots i:first-child { background: #e06c75; }
.my-mdCodeDots i:nth-child(2) { background: #e5c07b; }
.my-mdCodeDots i:nth-child(3) { background: #98c379; }
.my-mdCodeLang { margin-left: auto; color: var(--my-od-green); font-weight: 700; text-transform: uppercase; font-size: 9.5px; }
.my-mdCodePre { margin: 0; padding: 9px 12px; overflow-x: auto; white-space: pre; tab-size: 2; color: var(--my-od-fg); }
.my-mdTokLine { display: block; min-height: 1.6em; }
.my-mdTokKw { color: var(--my-od-purple); font-weight: 600; }
.my-mdTokStr { color: var(--my-od-green); }
.my-mdTokCom { color: var(--my-od-comment); font-style: italic; }
.my-mdTokDec { color: var(--my-od-yellow); }
.my-mdTokNum { color: var(--my-od-orange); }
.my-mdTokFn { color: var(--my-od-blue); }
.my-mdTokType { color: var(--my-od-yellow); }
.my-inlineDel { color: var(--dsw-alias-label-secondary); text-decoration: line-through; }
.my-mdHr { margin: 12px 0; border: none; border-top: 1px solid var(--dsw-alias-border-l2); }
.my-mdTableWrap { margin: 0 0 10px; overflow-x: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; }
.my-mdTable { border-collapse: collapse; width: 100%; font-size: 11.5px; }
.my-mdTable th, .my-mdTable td { padding: 5px 9px; border-bottom: 1px solid var(--dsw-alias-border-l1); text-align: left; vertical-align: top; }
.my-mdTable th { background: color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent); font-weight: 650; white-space: nowrap; color: var(--dsw-alias-label-primary); }
.my-mdTable tr:last-child td { border-bottom: none; }

/* ---- coach chat pane (used inside the playground) ---- */
.my-chatPane { display: flex; flex-direction: column; min-height: 0; min-width: 0; height: 100%; background: var(--dsw-alias-bg-base); }
.my-chatPaneHead {
  display: flex; align-items: center; gap: 10px; flex: none;
  padding: 13px 14px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base);
}
.my-chatIdentity { display: flex; align-items: center; gap: 9px; min-width: 0; }
.my-chatDot { width: 8px; height: 8px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary); flex: none; }
.my-chatDot[data-state="running"] { background: var(--dsw-alias-state-success-primary); animation: my-pulse 1.6s ease-in-out infinite; }
.my-chatText { min-width: 0; }
.my-chatTitle { margin: 0; font-size: 13px; font-weight: 650; }
.my-chatDesc { margin: 0; font-size: 11px; color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.my-chatActions { margin-left: auto; display: flex; gap: 2px; }
.my-chatPane .my-paneBody, .my-paneBody { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.my-transcript { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 14px 18px; display: flex; flex-direction: column; gap: 12px; }
.my-paneState { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; color: var(--dsw-alias-label-secondary); text-align: center; padding: 24px; font-size: 12.5px; }
.my-paneStateError { color: var(--dsw-alias-state-error-primary); }
.my-paneEmpty { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--dsw-alias-label-secondary); padding: 22px 12px; text-align: center; }
.my-paneBanner {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin: 8px 14px 0; padding: 7px 10px; border-radius: 8px; font-size: 11.5px;
  color: var(--dsw-alias-state-warn-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 9%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 28%, transparent);
}
.my-msg { display: flex; flex-direction: column; gap: 4px; }
.my-msgMeta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.my-msgWho { font-weight: 600; color: var(--dsw-alias-label-secondary); }
.my-msgTime { margin-left: auto; font-variant-numeric: tabular-nums; }
.my-aiBadge {
  display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px;
  border-radius: 6px; color: var(--my-accent);
  background: color-mix(in srgb, var(--my-accent) 12%, transparent);
}
.my-bubble { padding: 9px 12px; border-radius: 12px; font-size: 12.5px; overflow-wrap: anywhere; line-height: 1.6; }
.my-bubble > :last-child { margin-bottom: 0; }
.my-bubbleUser { background: var(--my-accent); color: #fff; border: 1px solid transparent; border-radius: 18px 18px 4px 18px; align-self: flex-end; max-width: 88%; }
.my-bubbleUser .my-inlineCode { background: rgba(255, 255, 255, 0.22); color: #fff; }
.my-bubbleUser .my-inlineLink { color: #fff; text-decoration: underline; }
.my-msgUser { align-items: flex-end; }
.my-msgUser .my-msgMeta { align-self: flex-end; }
.my-bubbleAi { background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); border: 1px solid transparent; border-radius: 18px 18px 18px 4px; box-shadow: none; }
.my-setupRow { border: 1px dashed var(--dsw-alias-border-l2); border-radius: 8px; padding: 7px 10px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.my-setupSummary { cursor: pointer; display: flex; align-items: center; gap: 6px; list-style: none; }
.my-setupText { margin: 8px 0 0; white-space: pre-wrap; }
.my-rowError {
  display: flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 8px; font-size: 11.5px;
  color: var(--dsw-alias-state-error-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 25%, transparent);
}
.my-rowNotice { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.my-toolRow { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); padding: 6px 9px; font-size: 11.5px; }
.my-toolRow[data-error="true"] { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent); }
.my-toolSummary { display: flex; align-items: center; gap: 6px; cursor: pointer; list-style: none; color: var(--dsw-alias-label-secondary); }
.my-toolName { color: var(--my-accent); font-size: 11px; }
.my-toolState { color: var(--dsw-alias-state-error-primary); }
.my-toolPre { margin: 7px 0 0; padding: 7px 9px; border-radius: 6px; overflow-x: auto; font-size: 11px; background: var(--dsw-alias-bg-layer-2); }
.my-caret { display: inline-block; width: 2px; height: 12px; margin-left: 2px; vertical-align: -2px; background: var(--my-accent); animation: my-blink 1s steps(2) infinite; }
@keyframes my-blink { 50% { opacity: 0; } }
.my-typing { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.my-typingDots { display: inline-flex; gap: 3px; }
.my-typingDots i { width: 4px; height: 4px; border-radius: 50%; background: currentColor; animation: my-typing 1.2s ease-in-out infinite; }
.my-typingDots i:nth-child(2) { animation-delay: 0.15s; }
.my-typingDots i:nth-child(3) { animation-delay: 0.3s; }
@keyframes my-typing { 0%,60%,100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-2px); } }
.my-composer { flex: none; padding: 10px 14px 11px; border-top: 1px solid var(--my-hairline); background: var(--dsw-alias-bg-base); }
.my-composerRow { display: flex; align-items: flex-end; gap: 8px; }
.my-composerInput {
  flex: 1; resize: none; min-height: 36px; max-height: 140px; padding: 9px 12px;
  border-radius: 18px; border: 1px solid var(--my-hairline);
  background: var(--dsw-alias-bg-layer-1); outline: none; font-size: 12.5px; line-height: 1.5;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.my-composerInput:focus { border-color: color-mix(in srgb, var(--my-accent) 55%, var(--dsw-alias-border-l1)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--my-accent) 10%, transparent); }
.my-sendBtn {
  width: 34px; height: 34px; flex: none; border-radius: 9px; border: none; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--my-accent); color: #fff;
}
.my-sendBtn:disabled { opacity: 0.45; cursor: not-allowed; }
.my-composerHint { margin: 6px 2px 0; font-size: 10.5px; color: var(--dsw-alias-label-secondary); }
.my-composerNotice { margin: 0 0 7px; font-size: 11.5px; color: var(--dsw-alias-state-error-primary); }

.my-glyph { display: block; flex: none; }
.my-loadingLine { display: flex; align-items: center; gap: 9px; padding: 22px; color: var(--dsw-alias-label-secondary); font-size: 12.5px; }
.my-errorBox {
  margin: 18px 20px; padding: 12px 14px; border-radius: 10px; font-size: 12.5px;
  color: var(--dsw-alias-state-error-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 25%, transparent);
  display: flex; flex-direction: column; gap: 8px; align-items: flex-start;
}

@media (max-width: 860px) {
  .my-header { flex-wrap: wrap; min-height: 58px; padding: 9px 14px; }
  .my-headerEnd { width: 100%; margin-left: 0; justify-content: flex-end; }
  .my-subtitle { display: none; }
  .my-tabs { padding: 0 10px; overflow-x: auto; }
  .my-tab { padding: 8px 10px 9px; white-space: nowrap; }
}

@media (prefers-reduced-motion: reduce) {
  .my-page *, .my-page *::before, .my-page *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;
// #endregion
