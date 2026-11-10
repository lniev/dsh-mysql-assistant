// #region AI Q&A styles
// Quick prompt strip + a centered coach chat column. Chat bubbles, composer and
// tool rows are styled in src/03-styles-base.js (shared with the coach pane).

const MYSQL_CSS_AI = `
.myai-view { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--dsw-alias-bg-base); }
.myai-quick {
  flex: none; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 18px 11px;
  border-bottom: 1px solid var(--my-hairline);
  background: var(--dsw-alias-bg-base);
}
.myai-quickLabel { display: inline-flex; align-items: center; gap: 6px; margin-right: 2px; font-size: 11px; font-weight: 700; color: var(--my-warm-text); }
.myai-quickLabel .my-glyph { color: var(--my-accent-text); }
.myai-chat { flex: 1; min-height: 0; display: flex; justify-content: center; background: var(--dsw-alias-bg-base); }
.myai-chat .my-chatPane { flex: 0 1 960px; width: 100%; min-width: 0; border-left: 1px solid var(--my-hairline); border-right: 1px solid var(--my-hairline); }
.myai-chat .my-chatPaneHead { background: var(--dsw-alias-bg-base); border-bottom: 1px solid var(--my-hairline); }
.myai-chat .my-composer { background: var(--dsw-alias-bg-base); border-top: 1px solid var(--my-hairline); }
.myai-chat .my-sendBtn { background: var(--my-accent); box-shadow: none; }
.myai-chat .my-composerInput:focus { border-color: var(--my-accent-border); box-shadow: 0 0 0 3px color-mix(in srgb, var(--my-accent) 12%, transparent); }
.myai-chat .my-transcript { padding: 18px 22px 22px; }
`;
// #endregion
