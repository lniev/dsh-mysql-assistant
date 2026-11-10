// #region knowledge map styles
// Five-column dependency map with SVG edges + reading column. Only host theme
// tokens are used as colors; sizes are tuned for the panel's 13px base text.

const MYSQL_CSS_MAP = `
.mymap-view { flex: 1; min-height: 0; display: flex; background: var(--dsw-alias-bg-base); overflow: hidden; }
.mymap-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.mymap-head { flex: none; display: flex; align-items: flex-start; gap: 18px; padding: 16px 18px 4px; }
.mymap-headText { min-width: 0; flex: 1; }
.mymap-headStats { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: none; padding-top: 4px; }

.mymap-toolbar {
  flex: none; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 12px 18px 9px; border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-bg-layer-1) 62%, transparent), transparent);
}
.mymap-searchBox {
  display: flex; align-items: center; gap: 7px; min-width: 240px; flex: 0 1 320px;
  padding: 0 9px; min-height: 32px; border-radius: 8px; color: var(--dsw-alias-label-secondary);
  border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.mymap-searchBox:focus-within { border-color: color-mix(in srgb, var(--my-accent) 55%, var(--dsw-alias-border-l1)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--my-accent) 9%, transparent); }
.mymap-searchBox .my-iconBtn { transform: rotate(45deg); }
.mymap-searchInput { flex: 1; min-width: 0; border: none; background: transparent; outline: none; font-size: 12px; padding: 6px 0; }
.mymap-searchInput::placeholder { color: color-mix(in srgb, var(--dsw-alias-label-secondary) 78%, transparent); }
.mymap-pathRow { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; }
.mymap-pathLabel { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); margin-right: 2px; }
.mymap-pathChip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 999px; font-size: 11.5px; cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary); white-space: nowrap;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}
.mymap-pathChip:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); }
.mymap-pathChip[data-active="true"] {
  color: var(--my-accent-text);
  border-color: var(--my-accent-border);
  background: var(--my-accent-soft);
  font-weight: 650;
}
.mymap-matchInfo { font-size: 11.5px; color: var(--dsw-alias-label-secondary); margin-left: auto; }
.mymap-pathHint {
  flex: none; display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
  margin: 8px 18px 0; padding: 6px 10px; border-radius: 8px; font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  background: color-mix(in srgb, var(--my-accent) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--my-accent) 16%, transparent);
}
.mymap-pathDesc { color: var(--dsw-alias-label-secondary); opacity: 0.85; }

.mymap-canvasArea { position: relative; flex: 1; min-height: 0; display: flex; }
.mymap-canvasScroll { flex: 1; min-height: 0; overflow: auto; scrollbar-gutter: stable; }
.mymap-farOverlay { position: absolute; inset: 0; z-index: 4; pointer-events: none; overflow: hidden; }
.mymap-farOverlay::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 34px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-bg-base) 82%, transparent) 52%, transparent);
  border-bottom: 1px dashed color-mix(in srgb, var(--dsw-alias-border-l1) 72%, transparent);
}
.mymap-farSvg { position: absolute; inset: 0; overflow: visible; }
.mymap-farLabel {
  position: absolute; top: 7px; left: 12px; z-index: 1;
  display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px;
  border-radius: 999px; font-size: 9.5px; font-weight: 600; color: var(--my-accent-text);
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 86%, transparent);
  border: 1px solid var(--my-accent-border);
  backdrop-filter: blur(4px);
}
.mymap-farSvg path { fill: none; transition: stroke 160ms ease, opacity 160ms ease; }
.mymap-farSvg path[data-active="true"] { stroke: var(--my-accent); stroke-width: 1.9; opacity: 0.95; }
.mymap-farSvg path[data-path="true"] { stroke: var(--my-accent-warm); stroke-width: 2.1; stroke-dasharray: 5 4; opacity: 1; }
.mymap-farSvg path[data-dim="true"] { stroke: color-mix(in srgb, var(--dsw-alias-label-secondary) 38%, transparent); stroke-width: 1; stroke-dasharray: 3 4; opacity: 0.32; }
.mymap-farDot { fill: var(--my-accent); }
.mymap-farDot[data-tone="path"] { fill: var(--my-accent-warm); }
.mymap-farOrigin { fill: color-mix(in srgb, var(--my-accent) 55%, transparent); }
/* Reserve a top lane for cross-layer rails so they never cover the column titles. */
.mymap-canvasInner { position: relative; display: inline-block; min-width: 100%; padding: 46px 18px 26px 44px; }
.mymap-edges { position: absolute; inset: 0; overflow: visible; pointer-events: none; }
.mymap-edges path {
  fill: none;
  stroke: color-mix(in srgb, var(--my-accent) 42%, transparent);
  stroke-width: 1.4;
  opacity: 0.55;
  transition: stroke 160ms ease, opacity 160ms ease, stroke-width 160ms ease;
}
.mymap-edges path[data-background="true"] {
  stroke: color-mix(in srgb, var(--my-accent) 48%, var(--dsw-alias-label-secondary));
  stroke-width: 1.15;
  stroke-dasharray: 3 4;
  opacity: 0.38;
}
.mymap-edges path[data-dim="true"] {
  stroke: color-mix(in srgb, var(--dsw-alias-label-secondary) 40%, transparent);
  stroke-width: 1;
  opacity: 0.3;
}
.mymap-edges path[data-active="true"] {
  stroke: var(--my-accent);
  stroke-width: 1.9;
  opacity: 0.95;
}
.mymap-edges path[data-path="true"] {
  stroke: var(--my-accent-warm);
  stroke-width: 2.2;
  stroke-dasharray: 5 4;
  opacity: 1;
}
.mymap-edgeDot { fill: var(--my-accent); }
.mymap-edgeDot[data-tone="path"] { fill: var(--my-accent-warm); }
.mymap-edgeOrigin { fill: color-mix(in srgb, var(--my-accent) 55%, transparent); }
.mymap-edgeOrigin:has(+ *) { }
.mymap-hintRow {
  flex: none; display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  margin: 6px 18px 0; font-size: 11px; color: var(--dsw-alias-label-secondary);
}
.mymap-hintText { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.mymap-hintText .my-glyph { color: var(--my-accent); flex: none; }
.mymap-legend { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; }
.mymap-legendSample { width: 26px; height: 0; border-top: 1.6px solid var(--my-accent); position: relative; flex: none; }
.mymap-legendSample::after {
  content: ''; position: absolute; right: -1px; top: -4px;
  border-left: 5px solid var(--my-accent);
  border-top: 3px solid transparent; border-bottom: 3px solid transparent;
}
.mymap-legendText { white-space: nowrap; }
.mymap-toggle {
  display: inline-flex; align-items: center; gap: 5px; flex: none;
  padding: 3px 9px; border-radius: 999px; cursor: pointer; font-size: 10.5px;
  color: var(--dsw-alias-label-secondary);
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base);
  transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
}
.mymap-toggle:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
.mymap-toggle[data-on="true"] {
  color: var(--my-accent-text);
  border-color: var(--my-accent-border);
  background: var(--my-accent-soft);
}

.mymap-columns { position: relative; display: flex; align-items: flex-start; gap: 40px; }
.mymap-layer { width: 236px; flex: none; }
.mymap-layerHead { min-height: 60px; padding: 2px 2px 10px; border-bottom: 1px solid var(--dsw-alias-border-l1); margin-bottom: 10px; }
.mymap-layerTitle { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--my-accent-text); }
.mymap-layerDesc { margin: 4px 0 0; font-size: 10.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.mymap-chapterGroup { margin-bottom: 10px; }
.mymap-chapterTitle { margin: 6px 2px 5px; font-size: 10.5px; font-weight: 650; letter-spacing: 0.2px; color: var(--dsw-alias-label-secondary); text-transform: none; }

.mymap-node {
  display: flex; flex-direction: column; gap: 4px; width: 100%; text-align: left;
  padding: 8px 10px; margin-bottom: 5px; border-radius: 12px; cursor: pointer;
  border: 1px solid var(--my-hairline);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  transition: border-color 130ms ease, background 130ms ease, opacity 160ms ease, transform 130ms ease, box-shadow 130ms ease;
}
.mymap-node:hover { border-color: var(--my-hairline); background: var(--dsw-alias-bg-layer-2); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07); }
.mymap-node[data-active="true"] {
  border-color: color-mix(in srgb, var(--my-accent) 45%, transparent);
  background: var(--my-accent-soft);
  box-shadow: inset 3px 0 0 var(--my-accent);
}
.mymap-node[data-dim="true"] { opacity: 0.28; }
.mymap-node[data-dim="true"]:hover { opacity: 0.85; }
.mymap-node[data-learned="true"] .mymap-nodeTitle { color: color-mix(in srgb, var(--dsw-alias-label-primary) 82%, var(--dsw-alias-state-success-primary)); }
.mymap-nodeTop { display: flex; align-items: center; gap: 6px; min-width: 0; }
.mymap-nodeDot { width: 5px; height: 5px; flex: none; border-radius: 50%; background: color-mix(in srgb, var(--my-accent) 62%, transparent); }
.mymap-nodeOrder {
  flex: none; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 9.5px; font-weight: 700; color: #fff;
  background: var(--my-warm-gradient);
  box-shadow: 0 1px 4px color-mix(in srgb, var(--my-accent-warm) 35%, transparent);
}
.mymap-nodeTitle { flex: 1; min-width: 0; font-size: 11.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mymap-nodeCheck { color: var(--dsw-alias-state-success-primary); display: inline-flex; flex: none; }
.mymap-nodeMeta { display: flex; align-items: center; gap: 6px; padding-left: 11px; }
.mymap-nodeTag { font-size: 9.5px; color: var(--dsw-alias-label-secondary); }
.mymap-dots { display: inline-flex; align-items: center; gap: 2px; margin-left: auto; }
.mymap-dots i { width: 4px; height: 4px; border-radius: 50%; background: color-mix(in srgb, var(--dsw-alias-label-secondary) 30%, transparent); }
.mymap-dots i[data-on="true"] { background: color-mix(in srgb, var(--my-accent) 80%, transparent); }

.mymap-detail {
  width: 400px; flex: none; min-height: 0; display: flex; flex-direction: column;
  border-left: 1px solid var(--my-hairline);
  background: var(--my-surface-muted);
}
.mymap-detailEmpty { justify-content: center; }
.mymap-detailHead { position: relative; flex: none; padding: 14px 44px 11px 18px; border-bottom: 1px solid var(--my-hairline); }
.mymap-detailClose { position: absolute; top: 9px; right: 10px; transform: rotate(45deg); }
.mymap-breadcrumb { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--dsw-alias-label-secondary); margin-bottom: 5px; }
.mymap-breadcrumbChapter { color: var(--my-accent-text); }
.mymap-breadcrumbSep { opacity: 0.5; }
.mymap-titleRow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mymap-title { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.35; }
.mymap-metaRow { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.mymap-detailBody { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 18px 32px; scrollbar-gutter: stable; }
.mymap-summaryCard {
  padding: 12px 14px; border-radius: 12px; margin-bottom: 14px;
  border: 1px solid var(--my-hairline);
  border-left: 3px solid var(--my-accent);
  background: var(--dsw-alias-bg-layer-1);
}
.mymap-blockTitle { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: 12.5px; font-weight: 650; }
.mymap-blockTitle .my-glyph { color: var(--my-accent); }
.mymap-summaryText { margin: 0; font-size: 12.5px; line-height: 1.75; }
.mymap-block { margin-bottom: 16px; }
.mymap-section { margin-bottom: 10px; }
.mymap-sectionHeading { margin: 0 0 3px; font-size: 12px; font-weight: 650; color: var(--dsw-alias-label-primary); }
.mymap-sectionText { margin: 0; font-size: 12px; line-height: 1.7; color: color-mix(in srgb, var(--dsw-alias-label-primary) 92%, transparent); }
.mymap-snippet { margin-bottom: 9px; border: 1px solid var(--my-hairline); border-radius: 10px; overflow: hidden; background: var(--dsw-alias-bg-layer-1); }
.mymap-snippetHead { display: flex; align-items: center; gap: 8px; padding: 5px 8px 5px 10px; border-bottom: 1px solid var(--dsw-alias-border-l1); background: color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent); }
.mymap-snippetTitle { flex: 1; min-width: 0; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.mymap-snippetTools { display: flex; align-items: center; gap: 4px; flex: none; }
.mymap-code { margin: 0; padding: 9px 11px; overflow-x: auto; font-size: 11.5px; line-height: 1.6; white-space: pre; background: var(--my-one-bg); color: var(--my-one-fg); }
.mymap-points { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.mymap-point { display: flex; gap: 8px; font-size: 12px; line-height: 1.6; }
.mymap-pointIndex {
  flex: none; width: 17px; height: 17px; margin-top: 1px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 9.5px; font-weight: 700; color: var(--my-accent-text);
  background: var(--my-accent-soft);
}
.mymap-pitfalls { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.mymap-pitfalls li { display: flex; gap: 7px; font-size: 12px; line-height: 1.6; }
.mymap-pitfallMark {
  flex: none; width: 15px; height: 15px; margin-top: 2px; border-radius: 4px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 9.5px; font-weight: 800; color: var(--dsw-alias-state-warn-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
}
.mymap-enterpriseCard {
  padding: 12px 14px; border-radius: 12px; margin-bottom: 16px;
  border: 1px solid var(--my-hairline);
  background: var(--dsw-alias-bg-layer-1);
}
.mymap-enterpriseCard p { margin: 0; font-size: 12px; line-height: 1.7; }
`;
// #endregion
