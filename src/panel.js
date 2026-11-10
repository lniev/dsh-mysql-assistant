// #region panel
// The MySQL Assistant page: header (brand + knowledge stats), four tabs
// (knowledge map, learning route, enterprise labs, SQL playground) and the
// shared cross-tab handoff state. Views receive everything they render as
// props; they never fetch the knowledge base or touch plugin state themselves.

/** Tabs, in display order. */
const MYSQL_TABS = [
	{ id: 'map', glyph: 'map', label: 'tab.map' },
	{ id: 'route', glyph: 'route', label: 'tab.route' },
	{ id: 'labs', glyph: 'layers', label: 'tab.labs' },
	{ id: 'playground', glyph: 'terminal', label: 'tab.playground' },
	{ id: 'ai', glyph: 'spark', label: 'tab.ai' }
];

/** Read the persisted tab, falling back to the knowledge map. */
function mysqlReadTab() {
	const stored = mysqlReadStore('tab', null);
	if (stored === 'map' || stored === 'route' || stored === 'labs' || stored === 'playground' || stored === 'ai') return stored;
	return 'map';
}

/** Execution-environment switcher in the panel header (compat kernel vs real MySQL). */
function MysqlEnvControl(props) {
	const t = props.t;
	const environment = props.environment === undefined ? null : props.environment;
	const onChange = typeof props.onChange === 'function' ? props.onChange : function () {};
	const [open, setOpen] = React.useState(false);
	const [target, setTarget] = React.useState('compat');
	const [form, setForm] = React.useState({ host: '127.0.0.1', port: '3306', user: 'root', password: '', database: 'mysql_learn' });
	const [busy, setBusy] = React.useState(false);
	const [message, setMessage] = React.useState(null);
	const isMysql = environment !== null && environment.mode === 'mysql';
	const mysqlConfig = environment !== null && environment.mysql !== undefined ? environment.mysql : null;
	const connected = environment !== null && environment.status !== undefined && environment.status.connected === true;

	React.useEffect(() => {
		if (environment === null) return;
		setTarget(environment.mode === 'mysql' ? 'mysql' : 'compat');
		setForm({
			host: environment.mysql === undefined ? '127.0.0.1' : environment.mysql.host,
			port: String(environment.mysql === undefined ? 3306 : environment.mysql.port),
			user: environment.mysql === undefined ? 'root' : environment.mysql.user,
			password: '',
			database: environment.mysql === undefined ? 'mysql_learn' : environment.mysql.database
		});
	}, [environment]);

	const field = (key, label, options) => {
		const opts = options === undefined ? {} : options;
		return h('label', { className: 'my-envField' + (opts.wide === true ? ' my-envFieldWide' : ''), key },
			h('span', null, label),
			h('input', {
				type: opts.type === undefined ? 'text' : opts.type,
				value: form[key],
				placeholder: opts.placeholder === undefined ? '' : opts.placeholder,
				'aria-label': label,
				disabled: busy,
				onChange: (event) => setForm((current) => Object.assign({}, current, { [key]: event.target.value }))
			}));
	};

	const submit = async (mode) => {
		if (busy) return;
		setBusy(true);
		setMessage(null);
		try {
			const body = mode === 'mysql'
				? {
					mode: 'mysql',
					mysql: {
						host: form.host.trim(),
						port: Number(form.port),
						user: form.user.trim(),
						password: form.password === '' ? undefined : form.password,
						database: form.database.trim()
					}
				}
				: { mode: 'compat' };
			const payload = await mysqlFetchJson('/playground/environment', { method: 'POST', body: JSON.stringify(body) });
			onChange(payload.environment === undefined ? null : payload.environment);
			setOpen(false);
			setMessage(null);
		} catch (error) {
			setMessage({ tone: 'error', text: mysqlErrorMessage(error) });
		} finally {
			setBusy(false);
		}
	};

	const test = async () => {
		if (busy) return;
		setBusy(true);
		setMessage(null);
		try {
			const payload = await mysqlFetchJson('/playground/environment/test', {
				method: 'POST',
				body: JSON.stringify({
					mysql: {
						host: form.host.trim(),
						port: Number(form.port),
						user: form.user.trim(),
						password: form.password === '' ? undefined : form.password,
						database: form.database.trim()
					}
				})
			});
			const info = payload.info === undefined ? {} : payload.info;
			setMessage({ tone: 'ok', text: t('pg.env.testOk', { version: info.version === undefined ? '' : info.version, db: info.database === undefined ? '' : info.database }) });
		} catch (error) {
			setMessage({ tone: 'error', text: mysqlErrorMessage(error) });
		} finally {
			setBusy(false);
		}
	};

	return h('div', { className: 'my-envWrap' },
		h('button', {
			className: 'my-envBtn',
			type: 'button',
			'aria-expanded': open ? 'true' : 'false',
			onClick: () => setOpen((current) => !current)
		},
			MysqlGlyph({ name: 'compass', size: 12 }),
			h('span', null, t('pg.env.label')),
			h('span', { className: 'my-envModeValue' }, isMysql ? t('pg.env.mysql') : t('pg.env.compat')),
			isMysql ? h('span', { className: 'my-envDot', 'data-connected': connected ? 'true' : 'false' }) : null,
			MysqlGlyph({ name: 'chevronDown', size: 11 })),
		open ? h('div', { className: 'my-envScrim', onClick: () => setOpen(false) }) : null,
		open
			? h('div', { className: 'my-envPopover', role: 'dialog', 'aria-label': t('pg.env.label') },
				h('div', { className: 'my-envHead' },
					h('strong', null, t('pg.env.label')),
					h('button', { className: 'my-iconBtn', type: 'button', 'aria-label': t('common.close'), onClick: () => setOpen(false) },
						MysqlGlyph({ name: 'plus', size: 11 }))),
				h('div', { className: 'my-envModes', role: 'tablist' },
					h('button', { className: 'my-envMode', type: 'button', 'data-active': target === 'compat' ? 'true' : 'false', onClick: () => setTarget('compat') }, t('pg.env.compat')),
					h('button', { className: 'my-envMode', type: 'button', 'data-active': target === 'mysql' ? 'true' : 'false', onClick: () => setTarget('mysql') }, t('pg.env.mysql'))),
				target === 'mysql'
					? h('div', { className: 'my-envBody' },
						h('div', { className: 'my-envGrid' },
							field('host', t('pg.env.host')),
							field('port', t('pg.env.port'), { type: 'number' }),
							field('user', t('pg.env.user')),
							field('password', t('pg.env.password'), { type: 'password', placeholder: mysqlConfig !== null && mysqlConfig.hasPassword === true ? t('pg.env.passwordSaved') : '' }),
							field('database', t('pg.env.database'), { wide: true })),
						h('p', { className: 'my-envHint' }, t('pg.env.dockerHint')),
						h('div', { className: 'my-envActions' },
							h('button', { className: 'my-btn my-btnSmall', type: 'button', disabled: busy, onClick: test }, busy ? t('pg.env.testing') : t('pg.env.test')),
							h('button', { className: 'my-btn my-btnSmall my-btnPrimary', type: 'button', disabled: busy, onClick: () => submit('mysql') }, busy ? t('pg.env.connecting') : t('pg.env.connect'))))
					: h('div', { className: 'my-envBody' },
						h('p', { className: 'my-envHint' }, t('pg.env.compatHint')),
						isMysql
							? h('div', { className: 'my-envActions' },
								h('button', { className: 'my-btn my-btnSmall', type: 'button', disabled: busy, onClick: () => submit('compat') }, t('pg.env.backToCompat')))
							: h('span', { className: 'my-envStatus' }, t('pg.env.usingCompat'))),
				connected
					? h('p', { className: 'my-envStatus', 'data-tone': 'ok' }, t('pg.env.connected', { version: environment.status.version, db: environment.status.database }))
					: (isMysql ? h('p', { className: 'my-envStatus', 'data-tone': 'warn' }, t('pg.env.disconnected')) : null),
				message !== null ? h('p', { className: 'my-envStatus', 'data-tone': message.tone }, message.text) : null,
				h('button', { className: 'my-linkBtn my-envClose', type: 'button', onClick: () => setOpen(false) }, t('common.collapse')))
			: null);
}

/** The MySQL Assistant page rendered into the shell's `main` slot. */
function MysqlAssistantPanel(props) {
	const t = props.t;

	// The AI Q&A tab hosts a real DSH session, so it needs the current workspace.
	const sessionState = typeof props.useSessions === 'function' ? props.useSessions((state) => state) : null;
	const workspaceState = typeof props.useWorkspaces === 'function' ? props.useWorkspaces((state) => state) : null;
	const sessionsById = sessionState !== null && sessionState !== undefined && sessionState.byId !== undefined ? sessionState.byId : {};
	const workspaces = workspaceState !== null && workspaceState !== undefined && Array.isArray(workspaceState.items) ? workspaceState.items : MYSQL_EMPTY;
	const [workspaceChoice, setWorkspaceChoice] = React.useState(null);
	let workspace = null;
	if (workspaceChoice !== null) {
		for (const candidate of workspaces) if (candidate.workspaceId === workspaceChoice) workspace = candidate;
	}
	if (workspace === null) workspace = mysqlResolveWorkspace(workspaces, sessionsById);
	const workspaceId = workspace === null ? null : workspace.workspaceId;

	const [tab, setTab] = React.useState(mysqlReadTab);
	const [environment, setEnvironment] = React.useState(null);
	React.useEffect(() => {
		let alive = true;
		mysqlFetchJson('/playground/environment').then((payload) => {
			if (alive) setEnvironment(payload.environment === undefined ? null : payload.environment);
		}, () => {});
		return () => {
			alive = false;
		};
	}, []);
	React.useEffect(() => {
		mysqlWriteStore('tab', tab);
	}, [tab]);
	React.useEffect(() => {
		if (workspaceId !== null) mysqlWriteStore('workspace', workspaceId);
	}, [workspaceId]);

	const [kbState, setKbState] = React.useState({ phase: 'loading', knowledge: null, error: null });
	const [kbToken, setKbToken] = React.useState(0);
	React.useEffect(() => {
		let alive = true;
		setKbState((previous) => (previous.knowledge === null ? { phase: 'loading', knowledge: null, error: null } : Object.assign({}, previous, { phase: 'refreshing' })));
		mysqlFetchJson('/kb').then((payload) => {
			if (!alive) return;
			const knowledge = payload !== null && payload !== undefined ? payload.knowledge : null;
			if (knowledge === null || typeof knowledge !== 'object') {
				setKbState({ phase: 'error', knowledge: null, error: '返回数据为空' });
				return;
			}
			setKbState({ phase: 'ready', knowledge, error: null });
		}, (error) => {
			if (!alive) return;
			setKbState({ phase: 'error', knowledge: null, error: mysqlErrorMessage(error) });
		});
		return () => {
			alive = false;
		};
	}, [kbToken]);

	const knowledge = kbState.knowledge;
	const pages = knowledge !== null && knowledge.pages !== undefined ? knowledge.pages : {};
	const pageCount = Object.keys(pages).length;

	// Knowledge map selection + "learned" marks.
	const [mapPageId, setMapPageId] = React.useState(null);
	const [learned, setLearned] = React.useState(() => {
		const stored = mysqlReadStore('learnedTopics', null);
		return stored !== null && typeof stored === 'object' ? stored : {};
	});
	const toggleLearned = React.useCallback((pageId) => {
		setLearned((previous) => {
			const next = Object.assign({}, previous);
			if (next[pageId] === true) delete next[pageId];
			else next[pageId] = true;
			mysqlWriteStore('learnedTopics', next);
			return next;
		});
	}, []);

	// Learning route progress.
	const [progress, setProgress] = React.useState(() => {
		const stored = mysqlReadStore('routeProgress', null);
		return stored !== null && typeof stored === 'object' ? stored : {};
	});
	const toggleRouteItem = React.useCallback((itemId) => {
		setProgress((previous) => {
			const next = Object.assign({}, previous);
			if (next[itemId] === true) delete next[itemId];
			else next[itemId] = true;
			mysqlWriteStore('routeProgress', next);
			return next;
		});
	}, []);

	// Cross-tab handoff: map/labs -> playground with SQL pre-filled.
	const [pendingSql, setPendingSql] = React.useState(null);
	const runInPlayground = React.useCallback((text, title) => {
		if (typeof text !== 'string' || text.trim() === '') return;
		setPendingSql({ id: mysqlRequestId(), text, title: typeof title === 'string' ? title : '' });
		setTab('playground');
	}, []);
	const onPendingSqlConsumed = React.useCallback((id) => {
		setPendingSql((current) => (current !== null && current.id === id ? null : current));
	}, []);

	// Cross-tab handoff: knowledge/labs/playground -> AI Q&A with a prepared question.
	const [queuedPrompt, setQueuedPrompt] = React.useState(null);
	const askAi = React.useCallback((text) => {
		if (typeof text !== 'string' || text.trim() === '') return;
		setQueuedPrompt({ id: mysqlRequestId(), text: text.trim() });
		setTab('ai');
	}, []);
	const onPromptSent = React.useCallback((id) => {
		setQueuedPrompt((current) => (current !== null && current.id === id ? null : current));
	}, []);
	const onKnowledgeAsk = React.useCallback((page) => {
		if (page === null || page === undefined) return;
		const title = typeof page.titleZh === 'string' && page.titleZh !== '' ? page.titleZh : page.title;
		askAi(mysqlFormat(t('ai.promptExplain'), { title, id: page.id }));
	}, [t, askAi]);
	const onLabAsk = React.useCallback((scenario) => {
		if (scenario === null || scenario === undefined) return;
		const title = typeof scenario.titleZh === 'string' ? scenario.titleZh : scenario.id;
		askAi(mysqlFormat(t('ai.promptLab'), { title, goal: scenario.goal === undefined ? '' : scenario.goal }));
	}, [t, askAi]);
	const describeResult = React.useCallback((result) => {
		if (result === null || result === undefined) return t('ai.resultNotRun');
		if (typeof result.error === 'string' && result.error !== '') return mysqlFormat(t('ai.resultError'), { error: result.error });
		const columns = Array.isArray(result.columns) ? result.columns.join('、') : '';
		const rows = Array.isArray(result.rows) ? result.rows.slice(0, 5).map((row) => JSON.stringify(row)).join('\n') : '';
		const count = typeof result.rowCount === 'number' ? result.rowCount : (Array.isArray(result.rows) ? result.rows.length : 0);
		return mysqlFormat(t('ai.resultRows'), { n: count, columns, preview: rows === '' ? t('ai.resultEmpty') : rows });
	}, [t]);
	const onExerciseAsk = React.useCallback((exercise, sql, result, environment) => {
		const code = typeof sql === 'string' && sql.trim() !== '' ? '```sql\n' + sql.trim() + '\n```' : t('ai.noSqlYet');
		const exerciseText = exercise === null || exercise === undefined
			? t('ai.promptPlaygroundFree')
			: '(' + exercise.id + ') ' + (typeof exercise.titleZh === 'string' ? exercise.titleZh : exercise.id) + '\n' + t('ai.exerciseGoal') + (exercise.goal === undefined ? '' : exercise.goal) + '\n' + t('ai.exercisePrompt') + (exercise.prompt === undefined ? '' : exercise.prompt);
		const envText = environment !== null && environment !== undefined && environment.mode === 'mysql'
			? mysqlFormat(t('ai.envMysql'), { db: environment.mysql === undefined ? '' : environment.mysql.database })
			: t('ai.envCompat');
		askAi(mysqlFormat(t('ai.promptPlayground'), { exercise: exerciseText, sql: code, result: describeResult(result), env: envText }));
	}, [t, askAi, describeResult]);

	const openPage = React.useCallback((pageId) => {
		if (typeof pageId !== 'string' || pageId === '') return;
		setMapPageId(pageId);
		setTab('map');
	}, []);

	const goPlayground = React.useCallback(() => {
		setTab('playground');
	}, []);

	let body = null;
	if (kbState.phase === 'loading') {
		body = h('div', { className: 'my-loadingLine' }, MysqlSpinner({}), h('span', null, t('loading')));
	} else if (kbState.phase === 'error') {
		body = h('div', { className: 'my-errorBox' },
			h('div', null, t('common.errorPrefix') + String(kbState.error === null ? '' : kbState.error)),
			h('button', { className: 'my-btn', type: 'button', onClick: () => setKbToken((value) => value + 1) }, t('common.retry'))
		);
	} else if (tab === 'route') {
		body = h(MysqlRouteView, {
			key: 'route',
			t,
			kb: knowledge,
			progress,
			onToggleItem: toggleRouteItem,
			onOpenPage: openPage,
			onGoPlayground: goPlayground
		});
	} else if (tab === 'labs') {
		body = h(MysqlLabsView, {
			key: 'labs',
			t,
			kb: knowledge,
			onOpenPage: openPage,
			onRunSql: runInPlayground,
			onAskAi: onLabAsk
		});
	} else if (tab === 'playground') {
		body = h(MysqlPlaygroundView, {
			key: 'playground',
			t,
			kb: knowledge,
			environment,
			pendingSql,
			onPendingSqlConsumed,
			onOpenPage: openPage,
			onAskAi: onExerciseAsk
		});
	} else if (tab === 'ai') {
		body = h(MysqlAiView, {
			key: 'ai',
			t,
			workspaceId,
			workspaces,
			queuedPrompt,
			onPromptSent,
			onOpenPage: openPage
		});
	} else {
		body = h(MysqlMapView, {
			key: 'map',
			t,
			kb: knowledge,
			initialPageId: mapPageId,
			learned,
			onToggleLearned: toggleLearned,
			onOpenPage: openPage,
			onRunSql: runInPlayground,
			onAskAi: onKnowledgeAsk
		});
	}

	const labCount = knowledge !== null && knowledge.labs !== null && knowledge.labs !== undefined && Array.isArray(knowledge.labs.scenarios) ? knowledge.labs.scenarios.length : 0;
	const routeData = knowledge === null || knowledge === undefined ? null : knowledge.learningRoute;

	return h('section', { className: 'my-page', 'aria-label': t('title') },
		h('style', { key: 'base-styles' }, MYSQL_CSS_BASE),
		h('header', { className: 'my-header' },
			h('div', { className: 'my-brand' },
				h('span', { className: 'my-brandMark', 'aria-hidden': true }, MysqlPanelIcon({ size: 20 })),
				h('div', { className: 'my-brandText' },
					h('h1', { className: 'my-title' }, t('title')),
					h('p', { className: 'my-subtitle' }, t('subtitle'))
				)
			),
			h('div', { className: 'my-headerEnd' },
				h(MysqlEnvControl, { t, environment, onChange: setEnvironment }),
				workspaces.length > 0
					? h('label', { className: 'my-wsField' },
						h('span', null, t('workspace.label')),
						h('select', {
							className: 'my-wsSelect',
							value: workspaceId === null ? '' : workspaceId,
							'aria-label': t('workspace.label'),
							onChange: (event) => setWorkspaceChoice(event.target.value)
						}, workspaces.map((candidate) => h('option', { key: candidate.workspaceId, value: candidate.workspaceId }, mysqlWorkspaceLabel(candidate)))))
					: null,
				knowledge === null
					? null
					: h('span', { className: 'my-statChip', title: t('map.introFallback') },
						MysqlGlyph({ name: 'book', size: 12 }),
						h('span', null, t('common.pages', { n: pageCount }))
					),
				knowledge === null || labCount === 0
					? null
					: h('span', { className: 'my-statChip' },
						MysqlGlyph({ name: 'layers', size: 12 }),
						h('span', null, t('labs.scenarios', { n: labCount }))
					),
				routeData !== null && Array.isArray(routeData.stages)
					? h('span', { className: 'my-statChip' },
						MysqlGlyph({ name: 'route', size: 12 }),
						h('span', null, t('route.stages', { n: routeData.stages.length }))
					)
					: null
			)
		),
		h('nav', { className: 'my-tabs', role: 'tablist', 'aria-label': t('title') },
			MYSQL_TABS.map((entry) => h('button', {
				key: entry.id,
				className: 'my-tab',
				type: 'button',
				role: 'tab',
				'aria-selected': tab === entry.id ? 'true' : 'false',
				onClick: () => setTab(entry.id)
			}, MysqlGlyph({ name: entry.glyph, size: 15 }), h('span', null, t(entry.label))))
		),
		h('div', { className: 'my-body' }, body)
	);
}
/** Display label of a workspace: stored title, then folder basename, then id. */
function mysqlWorkspaceLabel(workspace) {
	if (workspace === null || workspace === undefined) return '';
	if (typeof workspace.title === 'string' && workspace.title.trim() !== '') return workspace.title;
	const full = typeof workspace.path === 'string' ? workspace.path.replace(/[/\\]+$/, '') : '';
	const separator = Math.max(full.lastIndexOf('/'), full.lastIndexOf('\\'));
	const base = full.slice(separator + 1);
	return base !== '' ? base : String(workspace.workspaceId);
}

/** Workspace whose sessions were updated most recently (the shell's own rule). */
function mysqlPickRecentWorkspace(workspaces, sessionsById) {
	let selected = null;
	let selectedTime = -Infinity;
	for (const workspace of workspaces) {
		let latest = -Infinity;
		const sessionIds = Array.isArray(workspace.sessionIds) ? workspace.sessionIds : [];
		for (const id of sessionIds) {
			const summary = sessionsById[id];
			if (summary !== undefined && summary !== null && typeof summary.updatedAt === 'number') latest = Math.max(latest, summary.updatedAt);
		}
		if (latest === -Infinity) latest = Date.parse(workspace.createdAt) || 0;
		if (selected === null || latest > selectedTime) {
			selected = workspace.workspaceId;
			selectedTime = latest;
		}
	}
	return selected;
}

/** Resolve the workspace the panel should use: stored choice, else most recent. */
function mysqlResolveWorkspace(workspaces, sessionsById) {
	const stored = mysqlReadStore('workspace', null);
	if (typeof stored === 'string' && stored !== '') {
		for (const workspace of workspaces) if (workspace.workspaceId === stored) return workspace;
	}
	const recentId = mysqlPickRecentWorkspace(workspaces, sessionsById);
	if (recentId !== null) {
		for (const workspace of workspaces) if (workspace.workspaceId === recentId) return workspace;
	}
	return workspaces.length > 0 ? workspaces[0] : null;
}
// #endregion
