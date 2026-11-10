// #region AI Q&A view
// The AI Q&A tab: quick prompt chips above a real coach session. The session
// plumbing (create / follow / prompt / fold) lives in src/03-chat.js and is
// shared with the other tabs through the panel's queued-prompt channel.

/** Quick prompts shown above the chat composer. */
const MYSQL_AI_QUICK_PROMPTS = [
	{ id: 'quick1', label: 'ai.quick1', prompt: 'ai.quick1.prompt' },
	{ id: 'quick2', label: 'ai.quick2', prompt: 'ai.quick2.prompt' },
	{ id: 'quick3', label: 'ai.quick3', prompt: 'ai.quick3.prompt' },
	{ id: 'quick4', label: 'ai.quick4', prompt: 'ai.quick4.prompt' },
	{ id: 'quick5', label: 'ai.quick5', prompt: 'ai.quick5.prompt' }
];

/** The AI Q&A view. */
function MysqlAiView(props) {
	const t = props.t;
	const workspaceId = props.workspaceId === undefined ? null : props.workspaceId;
	const pane = mysqlUsePaneSession(workspaceId, t, true);
	const [quickPrompt, setQuickPrompt] = React.useState(null);
	const onPromptSent = typeof props.onPromptSent === 'function' ? props.onPromptSent : function () {};
	// A prompt coming from another tab (knowledge/labs/playground) wins; otherwise
	// the last quick prompt is queued until the coach session is ready.
	const pending = props.queuedPrompt !== null && props.queuedPrompt !== undefined ? props.queuedPrompt : quickPrompt;
	const handleSent = React.useCallback((id) => {
		setQuickPrompt((current) => (current !== null && current.id === id ? null : current));
		onPromptSent(id);
	}, [onPromptSent]);
	const askQuick = (promptKey) => {
		setQuickPrompt({ id: mysqlRequestId(), text: t(promptKey) });
	};
	return h('div', { className: 'myai-view' },
		h('style', { key: 'ai-styles' }, MYSQL_CSS_AI),
		h('div', { className: 'myai-quick' },
			h('span', { className: 'myai-quickLabel' }, MysqlGlyph({ name: 'spark', size: 13 }), h('span', null, t('ai.quickTitle'))),
			MYSQL_AI_QUICK_PROMPTS.map((entry) => h('button', {
				key: entry.id,
				className: 'my-topicChip',
				type: 'button',
				title: t(entry.prompt),
				onClick: () => askQuick(entry.prompt)
			}, h('span', null, t(entry.label))))
		),
		h('div', { className: 'myai-chat' },
			h(MysqlChatPane, {
				t,
				pane,
				pendingPrompt: pending,
				onPromptSent: handleSent
			})
		)
	);
}
// #endregion
