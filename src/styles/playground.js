// #region SQL playground styles
// Left exercise/schema rail, right task card + editor + result area. The panel
// uses theme tokens only; code blocks stay monospace and neutral.

const MYSQL_CSS_PLAYGROUND = `
.mypg-view { flex: 1; min-height: 0; display: flex; background: var(--dsw-alias-bg-base); overflow: hidden; }

/* ---- left rail ---- */
.mypg-side {
  width: 292px; flex: none; min-height: 0; display: flex; flex-direction: column;
  border-right: 1px solid var(--dsw-alias-border-l1);
  background: var(--my-surface-muted);
}
.mypg-sideHead { flex: none; padding: 14px 14px 10px; border-bottom: 1px solid var(--my-hairline); }
.mypg-sideTitleText { margin: 2px 0 0; font-size: 14px; font-weight: 700; }
.mypg-sideIntro { margin: 4px 0 8px; font-size: 11px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.mypg-sideStats { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.mypg-schemaEmpty[data-tone="error"] { color: var(--dsw-alias-state-error-primary); }
.mypg-sideScroll { flex: 1; min-height: 0; overflow-y: auto; padding: 9px 8px 14px; scrollbar-gutter: stable; }
.mypg-sideFoot { flex: none; padding: 9px 12px; border-top: 1px solid var(--my-hairline); display: flex; justify-content: flex-end; }
.mypg-freeBtn {
  display: flex; align-items: center; gap: 7px; width: 100%; margin-bottom: 8px;
  padding: 8px 11px; border-radius: 10px; cursor: pointer; font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  border: 1px dashed var(--my-hairline); background: transparent;
  transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
}
.mypg-freeBtn:hover { color: var(--dsw-alias-label-primary); background: color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent); }
.mypg-freeBtn[data-active="true"] { color: var(--my-accent-text); border-color: var(--my-accent-border); background: var(--my-accent-soft); font-weight: 650; }

.mypg-stage { margin-bottom: 8px; }
.mypg-stageHead { display: flex; align-items: center; gap: 6px; padding: 5px 7px 5px 9px; }
.mypg-stageTitle { font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px; color: var(--dsw-alias-label-secondary); text-transform: none; }
.mypg-stageCount { margin-left: auto; font-size: 9.5px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.mypg-stageBar { width: 46px; height: 3px; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent); overflow: hidden; }
.mypg-stageBar span { display: block; height: 100%; background: var(--dsw-alias-state-success-primary); border-radius: inherit; }
.mypg-ex {
  display: flex; flex-direction: column; gap: 2px; width: 100%; margin-bottom: 2px;
  padding: 6px 8px 6px 9px; border-radius: 8px; cursor: pointer; text-align: left;
  border: 1px solid transparent; background: transparent; color: var(--dsw-alias-label-primary);
  transition: background 110ms ease, border-color 110ms ease;
}
.mypg-ex:hover { background: var(--my-accent-softer); }
.mypg-ex[data-active="true"] { background: var(--dsw-alias-bg-layer-1); border-color: var(--my-hairline); box-shadow: inset 2px 0 0 var(--my-accent), 0 1px 2px rgba(0, 0, 0, 0.05); }
.mypg-exTop { display: flex; align-items: center; gap: 6px; min-width: 0; }
.mypg-exId {
  flex: none; min-width: 21px; height: 16px; padding: 0 4px; border-radius: 5px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 700; font-family: ui-monospace, Menlo, monospace;
  color: var(--dsw-alias-label-secondary);
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent);
}
.mypg-ex[data-done="true"] .mypg-exId { color: var(--dsw-alias-state-success-primary); background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent); }
.mypg-exTitle { flex: 1; min-width: 0; font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mypg-exDone { color: var(--dsw-alias-state-success-primary); display: inline-flex; flex: none; }
.mypg-exMeta { display: flex; align-items: center; gap: 6px; padding-left: 27px; font-size: 9.5px; color: var(--dsw-alias-label-secondary); }
.mypg-dots { display: inline-flex; align-items: center; gap: 2px; }
.mypg-dots i { width: 4px; height: 4px; border-radius: 50%; background: color-mix(in srgb, var(--dsw-alias-label-secondary) 28%, transparent); }
.mypg-dots i[data-on="true"] { background: color-mix(in srgb, var(--my-accent) 78%, transparent); }

.mypg-schema { margin: 12px 2px 0; border-top: 1px solid var(--dsw-alias-border-l1); padding-top: 9px; }
.mypg-sideTitle { display: flex; align-items: center; gap: 6px; padding: 2px 7px 6px; font-size: 11px; font-weight: 650; color: var(--dsw-alias-label-secondary); }
.mypg-sideTitle .my-glyph { color: var(--my-accent); }
.mypg-sideHint { margin-left: auto; font-weight: 400; font-size: 9.5px; }
.mypg-schemaTable { margin-bottom: 1px; }
.mypg-schemaHead {
  display: flex; align-items: center; gap: 6px; width: 100%; padding: 4px 7px;
  border: none; background: transparent; cursor: pointer; border-radius: 6px;
  color: var(--dsw-alias-label-primary); font-size: 11px; text-align: left;
}
.mypg-schemaHead:hover { background: var(--my-accent-softer); }
.mypg-schemaChevron { display: inline-flex; color: var(--dsw-alias-label-secondary); transition: transform 130ms ease; }
.mypg-schemaChevron[data-open="true"] { transform: rotate(90deg); }
.mypg-schemaName { font-family: ui-monospace, Menlo, monospace; font-size: 10.5px; }
.mypg-schemaCount { margin-left: auto; font-size: 9px; color: var(--dsw-alias-label-secondary); }
.mypg-schemaBody { margin: 1px 0 4px 18px; padding-left: 8px; border-left: 1px solid var(--dsw-alias-border-l1); }
.mypg-schemaCol { display: flex; align-items: center; gap: 5px; padding: 1px 2px; font-size: 10px; }
.mypg-keyBadge { flex: none; font-size: 7.5px; font-weight: 700; padding: 0 3px; border-radius: 3px; color: var(--my-accent); background: color-mix(in srgb, var(--my-accent) 13%, transparent); }
.mypg-keySpacer { width: 15px; flex: none; }
.mypg-schemaColName { font-family: ui-monospace, Menlo, monospace; color: var(--dsw-alias-label-primary); }
.mypg-schemaColType { margin-left: auto; color: var(--dsw-alias-label-secondary); font-size: 9px; white-space: nowrap; }
.mypg-schemaEmpty { padding: 10px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.mypg-engineNote { margin: 12px 7px 0; font-size: 10px; line-height: 1.6; color: color-mix(in srgb, var(--dsw-alias-label-secondary) 82%, transparent); }

/* ---- right main ---- */
.mypg-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.mypg-taskCard { flex: none; max-height: 44%; overflow-y: auto; padding: 14px 18px 12px; border-bottom: 1px solid var(--my-hairline); background: var(--dsw-alias-bg-base); }
.mypg-taskHead { display: flex; align-items: flex-start; gap: 14px; }
.mypg-taskTitleWrap { min-width: 0; flex: 1; }
.mypg-taskKicker { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 3px; }
.mypg-taskLabel { font-size: 10px; font-weight: 800; letter-spacing: 0.8px; color: var(--my-warm-text); text-transform: uppercase; }
.mypg-taskTitle { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.35; }
.mypg-taskActions { display: flex; align-items: center; gap: 5px; flex: none; }
.mypg-taskDesc { margin: 6px 0 0; font-size: 12px; line-height: 1.65; color: var(--dsw-alias-label-secondary); }
.mypg-taskBody { margin-top: 6px; }
.mypg-taskGoal { display: flex; align-items: flex-start; gap: 6px; margin: 0 0 4px; font-size: 12px; line-height: 1.65; }
.mypg-taskGoal .my-glyph { color: var(--my-accent); margin-top: 3px; flex: none; }
.mypg-taskPrompt { margin: 0; font-size: 12.5px; line-height: 1.7; color: color-mix(in srgb, var(--dsw-alias-label-primary) 94%, transparent); }
.mypg-taskHint { display: flex; align-items: flex-start; gap: 6px; margin: 7px 0 0; padding: 7px 10px; border-radius: 8px; font-size: 11.5px; line-height: 1.6; color: var(--dsw-alias-label-secondary); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, transparent); border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 22%, transparent); }
.mypg-taskHint .my-glyph { color: var(--dsw-alias-state-warn-primary); margin-top: 2px; flex: none; }
.mypg-solution { margin-top: 8px; border: 1px solid var(--my-hairline); border-radius: 10px; overflow: hidden; background: var(--dsw-alias-bg-base); }
.mypg-solutionHead { display: flex; align-items: center; gap: 8px; padding: 4px 7px 4px 10px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.mypg-solutionLabel { flex: 1; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; color: var(--dsw-alias-state-warn-primary); text-transform: uppercase; }
.mypg-code { margin: 0; padding: 8px 11px; overflow-x: auto; font-size: 11.5px; line-height: 1.6; white-space: pre; background: var(--my-one-bg); color: var(--my-one-fg); }
.mypg-related { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 9px; }
.mypg-notice {
  display: flex; align-items: center; gap: 7px; margin-top: 9px; padding: 6px 10px;
  border-radius: 8px; font-size: 11.5px; color: var(--my-accent);
  background: color-mix(in srgb, var(--my-accent) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--my-accent) 22%, transparent);
}
.mypg-notice .my-iconBtn { margin-left: auto; transform: rotate(45deg); }

.mypg-editorWrap { flex: none; display: flex; flex-direction: column; padding: 10px 18px 0; }
.mypg-editorBar { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.mypg-editorLabel { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 650; color: var(--dsw-alias-label-secondary); min-width: 0; }
.mypg-themeChip { flex: none; padding: 1px 6px; border-radius: 5px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 9px; font-weight: 600; letter-spacing: 0.3px; color: #abb2bf; background: #282c34; border: 1px solid #3e4451; }
.mypg-editorHint { font-weight: 400; font-size: 10px; color: color-mix(in srgb, var(--dsw-alias-label-secondary) 78%, transparent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mypg-editorActions { margin-left: auto; display: flex; align-items: center; gap: 5px; flex: none; }
.mypg-editorShell {
  position: relative; height: 212px; border-radius: 12px; overflow: hidden;
  color-scheme: dark;
  border: 1px solid #3e4451;
  background: var(--my-one-bg);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.mypg-editorShell:focus-within {
  border-color: var(--my-one-function);
  box-shadow: 0 0 0 3px rgba(97, 175, 239, 0.16);
}
.mypg-editorHighlight {
  position: absolute; inset: 0; margin: 0; padding: 10px 12px;
  overflow: hidden; pointer-events: none; background: transparent;
  color: var(--my-one-fg); white-space: pre;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px; line-height: 1.65; tab-size: 2;
}
.mypg-editorHighlight code { display: block; will-change: transform; }
.mypg-editorPlaceholder { color: var(--my-one-comment); }
.mypg-editor {
  position: absolute; inset: 0; width: 100%; height: 100%; margin: 0;
  padding: 10px 12px; border: none; outline: none; resize: none;
  background: transparent; color: transparent; caret-color: #dcdfe4;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px; line-height: 1.65; tab-size: 2; white-space: pre;
  overflow: auto; scrollbar-gutter: stable;
}
.mypg-editor::selection { background: rgba(97, 175, 239, 0.28); }
.mypg-editor:focus { border: none; box-shadow: none; }
.mypg-statusBar { display: flex; align-items: center; gap: 10px; padding: 6px 2px 9px; }
.mypg-statusText { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--dsw-alias-label-secondary); min-width: 0; }
.mypg-statusText[data-tone="error"] { color: var(--dsw-alias-state-error-primary); }
.mypg-statusText[data-tone="warn"] { color: var(--dsw-alias-state-warn-primary); }
.mypg-statusRight { margin-left: auto; font-size: 10px; color: color-mix(in srgb, var(--dsw-alias-label-secondary) 75%, transparent); white-space: nowrap; }

.mypg-output { flex: 1; min-height: 0; overflow-y: auto; padding: 2px 18px 20px; display: flex; flex-direction: column; gap: 9px; scrollbar-gutter: stable; }
.mypg-placeholder { flex: 1; min-height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--dsw-alias-label-secondary); font-size: 12px; text-align: center; }
.mypg-placeholder p { margin: 0; max-width: 460px; line-height: 1.7; }
.mypg-errorBox { padding: 10px 12px; border-radius: 9px; border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 28%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, transparent); }
.mypg-errorBox strong { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dsw-alias-state-error-primary); }
.mypg-errorText { margin: 6px 0 0; font-size: 11.5px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--dsw-alias-state-error-primary); }
.mypg-resultCard, .mypg-messages { border: 1px solid var(--my-hairline); border-radius: 12px; overflow: hidden; background: var(--dsw-alias-bg-base); flex: none; }
.mypg-resultHead { display: flex; align-items: center; gap: 8px; padding: 7px 12px; border-bottom: 1px solid var(--my-hairline); background: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent); }
.mypg-resultTitle { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 650; }
.mypg-resultTitle .my-glyph { color: var(--my-accent); }
.mypg-resultMeta { margin-left: auto; font-size: 10px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.mypg-tableWrap { overflow: auto; max-height: 46vh; }
.mypg-table { border-collapse: collapse; width: 100%; font-size: 11.5px; }
.mypg-table th, .mypg-table td { padding: 6px 11px; border-bottom: 1px solid var(--my-hairline); text-align: left; vertical-align: top; white-space: nowrap; }
.mypg-table th { position: sticky; top: 0; z-index: 1; background: var(--dsw-alias-bg-layer-1); font-weight: 600; font-size: 10.5px; color: var(--dsw-alias-label-secondary); }
.mypg-table td { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; }
.mypg-table tr:last-child td { border-bottom: none; }
.mypg-table tbody tr:hover td { background: color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent); }
.mypg-table th[data-num="true"], .mypg-table td[data-num="true"] { text-align: right; }
.mypg-table td[data-null="true"] { color: var(--dsw-alias-label-secondary); font-style: italic; font-size: 10px; }
.mypg-noRows { padding: 14px 12px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); text-align: center; font-family: inherit; }
.mypg-truncated { margin: 0; padding: 6px 11px; font-size: 10px; color: var(--dsw-alias-state-warn-primary); border-top: 1px solid var(--dsw-alias-border-l1); }
.mypg-messageLine { margin: 0; padding: 5px 11px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); font-family: ui-monospace, Menlo, monospace; border-bottom: 1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 55%, transparent); }
.mypg-messageLine:last-child { border-bottom: none; }

.mypg-check { border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; padding: 10px 12px; background: var(--dsw-alias-bg-base); flex: none; }
.mypg-check[data-pass="true"] { border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 38%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 6%, transparent); }
.mypg-check[data-pass="false"] { border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 34%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 5%, transparent); }
.mypg-checkHead { display: flex; align-items: center; gap: 7px; }
.mypg-checkIcon { display: inline-flex; }
.mypg-check[data-pass="true"] .mypg-checkIcon { color: var(--dsw-alias-state-success-primary); }
.mypg-check[data-pass="false"] .mypg-checkIcon { color: var(--dsw-alias-state-warn-primary); }
.mypg-checkTitle { font-size: 12.5px; }
.mypg-checkReason { margin: 6px 0 0; font-size: 11.5px; line-height: 1.65; }
.mypg-checkActions { display: flex; justify-content: flex-end; margin-top: 8px; }
.mypg-errorHead { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.mypg-errorHead strong { display: flex; align-items: center; gap: 6px; }
.mypg-checkHint { display: flex; align-items: flex-start; gap: 6px; margin: 5px 0 0; font-size: 11px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.mypg-checkHint .my-glyph { color: var(--my-accent); margin-top: 2px; flex: none; }
.mypg-previewRow { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 9px; }
.mypg-previewTitle { margin: 0 0 3px; font-size: 10px; font-weight: 700; letter-spacing: 0.4px; color: var(--dsw-alias-label-secondary); text-transform: uppercase; }
.mypg-preview .mypg-tableWrap { max-height: 170px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; }

@media (max-width: 980px) {
  .mypg-side { width: 240px; }
  .mypg-previewRow { grid-template-columns: 1fr; }
  .mypg-editorHint { display: none; }
}
`;
// #endregion
