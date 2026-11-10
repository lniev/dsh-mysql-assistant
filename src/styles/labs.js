// #region enterprise labs styles
// Scenario cards + detail column with steps, SQL blocks, checklist and pitfalls.

const MYSQL_CSS_LABS = `
.mylab-view { flex: 1; min-height: 0; display: flex; background: var(--dsw-alias-bg-base); overflow: hidden; }
.mylab-main { flex: 1; min-width: 0; min-height: 0; overflow-y: auto; padding: 20px 26px 40px; scrollbar-gutter: stable; }
.mylab-head { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 4px; }
.mylab-headText { min-width: 0; flex: 1; }
.mylab-stats { flex: none; }
.mylab-hint { display: flex; align-items: center; gap: 6px; margin: 10px 0 14px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.mylab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 11px; }
.mylab-card {
  display: flex; flex-direction: column; gap: 7px; text-align: left; padding: 13px 14px 11px;
  border-radius: 16px; cursor: pointer;
  border: 1px solid var(--my-hairline);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  transition: border-color 140ms ease, background 140ms ease, transform 140ms ease, box-shadow 140ms ease;
}
.mylab-card:hover { border-color: var(--my-hairline); background: var(--dsw-alias-bg-layer-2); transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.07); }
.mylab-card[data-selected="true"] {
  border-color: color-mix(in srgb, var(--my-accent) 45%, transparent);
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: inset 3px 0 0 var(--my-accent);
}
.mylab-cardTop { display: flex; align-items: flex-start; gap: 8px; }
.mylab-cardTitle { margin: 0; flex: 1; min-width: 0; font-size: 13px; font-weight: 650; line-height: 1.4; }
.mylab-cardGoal { margin: 0; font-size: 11.5px; line-height: 1.65; color: var(--dsw-alias-label-secondary); }
.mylab-cardFoot { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: auto; }
.mylab-level {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  min-width: 26px; height: 18px; padding: 0 6px; border-radius: 6px;
  font-size: 9.5px; font-weight: 600; color: #fff;
  background: var(--my-accent);
}

.mylab-detail {
  width: 430px; flex: none; min-height: 0; display: flex; flex-direction: column;
  border-left: 1px solid var(--my-hairline);
  background: var(--my-surface-muted);
}
.mylab-detailEmpty { justify-content: center; }
.mylab-detailHead { flex: none; padding: 15px 18px 11px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.mylab-titleRow { display: flex; align-items: flex-start; gap: 9px; }
.mylab-title { margin: 0; flex: 1; font-size: 16px; font-weight: 700; line-height: 1.35; }
.mylab-metaRow { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.mylab-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 9px; }
.mylab-detailBody { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 18px 32px; scrollbar-gutter: stable; }
.mylab-block { margin-bottom: 16px; }
.mylab-blockTitle { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: 12.5px; font-weight: 650; }
.mylab-blockTitle .my-glyph { color: var(--my-accent); }
.mylab-paragraph { margin: 0; font-size: 12px; line-height: 1.75; }
.mylab-goalCard {
  padding: 12px 14px; border-radius: 12px; margin-bottom: 16px;
  border: 1px solid var(--my-hairline);
  border-left: 3px solid var(--my-accent);
  background: var(--dsw-alias-bg-layer-1);
}
.mylab-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.mylab-step { position: relative; padding-left: 30px; }
.mylab-stepHead { display: flex; align-items: center; gap: 8px; }
.mylab-stepIndex {
  position: absolute; left: 0; top: 0;
  width: 21px; height: 21px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 10.5px; font-weight: 600; color: #fff;
  background: var(--my-accent);
  border: 1px solid transparent;
}
.mylab-stepTitle { margin: 0; font-size: 12.5px; font-weight: 650; }
.mylab-stepDetail { margin: 3px 0 0; font-size: 11.5px; line-height: 1.7; color: color-mix(in srgb, var(--dsw-alias-label-primary) 90%, transparent); }
.mylab-stepSql { margin-top: 7px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; overflow: hidden; background: var(--dsw-alias-bg-layer-1); }
.mylab-stepSqlHead { display: flex; align-items: center; gap: 8px; padding: 4px 7px 4px 10px; border-bottom: 1px solid var(--dsw-alias-border-l1); background: color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent); }
.mylab-stepSqlLabel { flex: 1; font-size: 10px; font-weight: 700; letter-spacing: 0.6px; color: var(--dsw-alias-label-secondary); text-transform: uppercase; }
.mylab-stepSqlTools { display: flex; align-items: center; gap: 4px; flex: none; }
.mylab-code { margin: 0; padding: 9px 11px; overflow-x: auto; font-size: 11.5px; line-height: 1.6; white-space: pre; background: var(--my-one-bg); color: var(--my-one-fg); }
.mylab-checks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.mylab-checks li { display: flex; gap: 7px; font-size: 11.5px; line-height: 1.6; }
.mylab-checks .my-glyph { color: var(--dsw-alias-state-success-primary); margin-top: 2px; flex: none; }
.mylab-pitfalls { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.mylab-pitfalls li { display: flex; gap: 7px; font-size: 11.5px; line-height: 1.6; }
.mylab-pitfallMark {
  flex: none; width: 15px; height: 15px; margin-top: 2px; border-radius: 4px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 9.5px; font-weight: 800; color: var(--dsw-alias-state-warn-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
}

@media (max-width: 980px) {
  .mylab-detail { width: 340px; }
  .mylab-main { padding: 16px 16px 30px; }
}
`;
// #endregion
