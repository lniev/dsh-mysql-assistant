// #region learning route styles
// Vertical roadmap: progress header, track switcher, stage timeline with
// checkable item cards and stage checkpoints. Theme tokens only.

const MYSQL_CSS_ROUTE = `
.myr-view { flex: 1; min-height: 0; display: flex; background: var(--dsw-alias-bg-base); }
.myr-main { flex: 1; min-height: 0; overflow-y: auto; padding: 0 0 40px; scrollbar-gutter: stable; }
.myr-head { display: flex; align-items: flex-start; gap: 26px; padding: 20px 26px 8px; }
.myr-headText { min-width: 0; flex: 1; }
.myr-progressBox { width: 260px; flex: none; padding: 12px 14px; border-radius: 11px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); }
.myr-progressRow { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); margin-bottom: 7px; }
.myr-progressValue { font-weight: 650; color: var(--dsw-alias-label-primary); }
.myr-bar { position: relative; height: 6px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent); }
.myr-barBig { height: 8px; margin-bottom: 8px; }
.myr-barFill { display: block; height: 100%; border-radius: inherit; background: var(--my-accent); transition: width 260ms ease; }
.myr-progressMeta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.myr-tracks { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; padding: 6px 26px 0; }
.myr-trackLabel { font-size: 11.5px; color: var(--dsw-alias-label-secondary); margin-right: 2px; }
.myr-track {
  display: inline-flex; align-items: center; gap: 7px; padding: 5px 12px;
  border-radius: 980px; cursor: pointer; font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  border: 1px solid transparent; background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);
  transition: background 120ms ease, color 120ms ease;
}
.myr-track:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent); color: var(--dsw-alias-label-primary); }
.myr-track[data-active="true"] { color: var(--my-accent); background: var(--my-accent-soft); font-weight: 600; }
.myr-trackName { white-space: nowrap; }
.myr-trackCount { font-size: 10px; padding: 0 5px; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); }
.myr-trackSummary { display: flex; align-items: flex-start; gap: 16px; margin: 12px 26px 0; padding: 12px 15px; border-radius: 14px; border: 1px solid var(--my-hairline); background: var(--dsw-alias-bg-layer-1); }
.myr-trackSummaryText { min-width: 0; flex: 1; }
.myr-trackSummaryTitle { font-size: 12.5px; }
.myr-trackSummaryDesc { margin: 2px 0 0; font-size: 11.5px; color: var(--dsw-alias-label-secondary); line-height: 1.6; }
.myr-trackSkipped { margin: 5px 0 0; font-size: 10.5px; color: var(--dsw-alias-label-secondary); }
.myr-trackStats { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: none; }
.myr-timeline { padding: 16px 26px 0; }

.myr-stage { position: relative; display: flex; gap: 16px; padding-bottom: 22px; }
.myr-stageRail { width: 30px; flex: none; display: flex; flex-direction: column; align-items: center; }
.myr-stageIndex {
  width: 27px; height: 27px; flex: none; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; color: #fff;
  background: var(--my-accent);
  border: 1px solid transparent;
}
.myr-stageLine { flex: 1; width: 1.5px; margin-top: 8px; background: linear-gradient(180deg, color-mix(in srgb, var(--my-accent) 25%, transparent), transparent); }
.myr-stage:last-child .myr-stageLine { display: none; }
.myr-stageBody { flex: 1; min-width: 0; }
.myr-stageHead { display: flex; align-items: flex-start; gap: 16px; padding: 1px 0 10px; }
.myr-stageTitleWrap { flex: 1; min-width: 0; }
.myr-stageTitleRow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.myr-stageTitle { margin: 0; font-size: 14px; font-weight: 700; }
.myr-stageGoal { margin: 4px 0 0; font-size: 12px; color: var(--dsw-alias-label-secondary); line-height: 1.65; max-width: 760px; }
.myr-stageProgress { flex: none; width: 170px; display: flex; flex-direction: column; gap: 5px; align-items: flex-end; }
.myr-stageCount { font-size: 11px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.myr-bars { width: 100%; }
.myr-stageProgress .myr-bar { width: 100%; }
.myr-items { display: flex; flex-direction: column; gap: 9px; }

.myr-item {
  padding: 12px 14px 11px; border-radius: 14px;
  border: 1px solid var(--my-hairline);
  background: var(--dsw-alias-bg-layer-1);
  transition: border-color 140ms ease, background 140ms ease;
}
.myr-item[data-done="true"] { border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 30%, var(--dsw-alias-border-l1)); background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 4%, var(--dsw-alias-bg-layer-1)); }
.myr-itemHead { display: flex; align-items: flex-start; gap: 9px; }
.myr-check {
  width: 19px; height: 19px; flex: none; margin-top: 1px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
  border: 1.5px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-bg-base); transition: background 130ms ease, border-color 130ms ease;
}
.myr-check:hover { border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 65%, transparent); }
.myr-item[data-done="true"] .myr-check { background: var(--dsw-alias-state-success-primary); border-color: var(--dsw-alias-state-success-primary); }
.myr-itemTitleWrap { flex: 1; min-width: 0; }
.myr-itemTitle { margin: 0; font-size: 12.5px; font-weight: 650; }
.myr-itemGoal { margin: 2px 0 0; font-size: 11.5px; color: var(--dsw-alias-label-secondary); line-height: 1.6; }
.myr-itemMeta { display: flex; align-items: center; gap: 5px; flex: none; }
.myr-level {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 24px; height: 17px; padding: 0 5px; border-radius: 5px;
  font-size: 9.5px; font-weight: 700; color: var(--my-accent);
  background: color-mix(in srgb, var(--my-accent) 10%, transparent);
}
.myr-points { margin: 8px 0 0 28px; padding-left: 16px; font-size: 11.5px; color: color-mix(in srgb, var(--dsw-alias-label-primary) 88%, transparent); }
.myr-points li { margin: 2px 0; line-height: 1.6; }
.myr-facts { margin: 9px 0 0 28px; display: flex; flex-direction: column; gap: 5px; }
.myr-fact { margin: 0; display: flex; gap: 8px; font-size: 11.5px; line-height: 1.6; }
.myr-factLabel { flex: none; min-width: 58px; color: var(--my-accent); font-weight: 650; }
.myr-factText { min-width: 0; color: color-mix(in srgb, var(--dsw-alias-label-primary) 90%, transparent); }
.myr-factPractice .myr-factText { color: var(--dsw-alias-label-secondary); }
.myr-itemFoot { display: flex; align-items: flex-end; gap: 10px; justify-content: space-between; margin: 10px 0 0 28px; flex-wrap: wrap; }
.myr-itemActions { display: flex; align-items: center; gap: 6px; margin-left: auto; }

.myr-checkpoints { margin: 6px 26px 0 72px; padding: 15px 17px; border-radius: 16px; border: 1px solid var(--my-hairline); background: var(--dsw-alias-bg-layer-1); }
.myr-checkpointsTitle { display: flex; align-items: center; gap: 7px; margin: 0 0 10px; font-size: 13px; font-weight: 650; }
.myr-checkpointsTitle .my-glyph { color: var(--my-accent); }
.myr-checkpointGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.myr-checkpoint { display: flex; gap: 8px; padding: 9px 10px; border-radius: 9px; background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l1); }
.myr-checkpointIndex { flex: none; width: 17px; height: 17px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: var(--dsw-alias-bg-base); background: var(--dsw-alias-state-success-primary); margin-top: 1px; }
.myr-checkpoint strong { font-size: 12px; }
.myr-checkpoint p { margin: 2px 0 0; font-size: 11px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }

@media (max-width: 900px) {
  .myr-head { flex-direction: column; gap: 12px; }
  .myr-progressBox { width: 100%; }
  .myr-stageProgress { width: 120px; }
  .myr-facts, .myr-points, .myr-itemFoot { margin-left: 0; }
  .myr-checkpoints { margin-left: 46px; }
}
`;
// #endregion
