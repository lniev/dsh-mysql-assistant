// #region SQL playground view
// Two-pane SQL playground: exercise list + schema browser on the left, task card
// + editor + result table + auto-grading on the right. All execution happens in
// the Host half (`/mysql-assistant/api/playground/*`) against a MySQL-compatible
// engine, so this view only owns UI state.

/** Persisted key of the free-practice editor. */
const MYSQL_PG_FREE_KEY = '__free__';

/** Read the persisted playground drafts object. */
function mysqlPgReadDrafts() {
	const stored = mysqlReadStore('pgDrafts', null);
	return stored !== null && typeof stored === 'object' ? stored : {};
}

/** One result table (query result or check preview). */
function MysqlPgTable(props) {
	const columns = Array.isArray(props.columns) ? props.columns : [];
	const rows = Array.isArray(props.rows) ? props.rows : [];
	if (columns.length === 0) return null;
	const numeric = columns.map((column, index) => {
		let hits = 0;
		for (const row of rows) {
			const value = row[index];
			if (value !== null && value !== undefined && /^-?\d+(\.\d+)?$/.test(String(value))) hits += 1;
		}
		return rows.length > 0 && hits === rows.length;
	});
	return h('div', { className: 'mypg-tableWrap' },
		h('table', { className: 'mypg-table' },
			h('thead', null,
				h('tr', null, columns.map((column, index) => h('th', { key: 'h' + String(index), 'data-num': numeric[index] ? 'true' : 'false' }, String(column))))),
			h('tbody', null, rows.length === 0
				? h('tr', null, h('td', { className: 'mypg-noRows', colSpan: columns.length }, props.emptyLabel === undefined ? '0 行' : props.emptyLabel))
				: rows.map((row, rowIndex) => h('tr', { key: 'r' + String(rowIndex) }, row.map((value, index) => h('td', {
					key: 'c' + String(index),
					'data-num': numeric[index] ? 'true' : 'false',
					'data-null': value === null ? 'true' : 'false'
				}, value === null ? 'NULL' : String(value))))))
		));
}

/** Status line under the editor. */
function MysqlPgStatus(props) {
	const t = props.t;
	const result = props.result;
	if (result === null || result === undefined) return h('span', { className: 'mypg-statusText' }, t('pg.emptyResult'));
	let text = '';
	if (result.error !== undefined) text = t('pg.error');
	else if (result.columns !== undefined && result.columns.length > 0) text = t('pg.rowCount', { n: result.rowCount === undefined ? result.rows.length : result.rowCount }) + ' · ' + t('pg.elapsed', { n: result.elapsedMs === undefined ? 0 : result.elapsedMs });
	else if (result.affected !== undefined && result.affected > 0) text = t('pg.affected', { n: result.affected }) + ' · ' + t('pg.elapsed', { n: result.elapsedMs === undefined ? 0 : result.elapsedMs });
	else text = (Array.isArray(result.messages) && result.messages.length > 0 ? result.messages[result.messages.length - 1] : 'OK') + ' · ' + t('pg.elapsed', { n: result.elapsedMs === undefined ? 0 : result.elapsedMs });
	const tone = result.error !== undefined ? 'error' : (result.truncated === true ? 'warn' : 'idle');
	return h('span', { className: 'mypg-statusText', 'data-tone': tone }, MysqlGlyph({ name: tone === 'error' ? 'alert' : 'info', size: 12 }), h('span', null, text));
}

/** Auto-grading result card. */
function MysqlPgCheckCard(props) {
	const t = props.t;
	const check = props.check;
	if (check === null || check === undefined) return null;
	const pass = check.pass === true;
	return h('div', { className: 'mypg-check', 'data-pass': pass ? 'true' : 'false' },
		h('div', { className: 'mypg-checkHead' },
			h('span', { className: 'mypg-checkIcon' }, MysqlGlyph({ name: pass ? 'check' : 'alert', size: 14 })),
			h('strong', { className: 'mypg-checkTitle' }, pass ? t('pg.pass') : t('pg.fail')),
			typeof check.rowCount === 'number' && pass ? h('span', { className: 'my-chip my-chipSoft' }, t('pg.rowCount', { n: check.rowCount })) : null),
		typeof check.reason === 'string' && check.reason !== '' ? h('p', { className: 'mypg-checkReason' }, check.reason) : null,
		typeof check.hint === 'string' && check.hint !== '' ? h('p', { className: 'mypg-checkHint' }, MysqlGlyph({ name: 'spark', size: 12 }), h('span', null, check.hint)) : null,
		pass === false && typeof props.onAskAi === 'function'
			? h('div', { className: 'mypg-checkActions' },
				h('button', { className: 'my-btn my-btnSmall', type: 'button', onClick: props.onAskAi },
					MysqlGlyph({ name: 'spark', size: 11 }), h('span', null, t('pg.askAiWhy'))))
			: null,
		check.expected !== undefined || check.actual !== undefined
			? h('div', { className: 'mypg-previewRow' },
				check.expected === undefined ? null : h('div', { className: 'mypg-preview' },
					h('p', { className: 'mypg-previewTitle' }, t('pg.expected')),
					h(MysqlPgTable, { columns: check.expected.columns, rows: check.expected.rows, emptyLabel: '0 行' })),
				check.actual === undefined ? null : h('div', { className: 'mypg-preview' },
					h('p', { className: 'mypg-previewTitle' }, t('pg.actual')),
					h(MysqlPgTable, { columns: check.actual.columns, rows: check.actual.rows, emptyLabel: '0 行' })))
			: null);
}

/** Schema browser for the seeded sample database. */
function MysqlPgSchema(props) {
	const t = props.t;
	const schema = props.schema;
	const schemaError = props.schemaError === undefined ? null : props.schemaError;
	const [openTables, setOpenTables] = React.useState({});
	if (schema === null || schema === undefined || !Array.isArray(schema.tables)) {
		return schemaError === null
			? h('div', { className: 'mypg-schemaEmpty' }, t('common.loading'))
			: h('div', { className: 'mypg-schemaEmpty', 'data-tone': 'error' }, t('pg.env.schemaError') + schemaError);
	}
	let totalRows = 0;
	for (const table of schema.tables) totalRows += typeof table.rowCount === 'number' ? table.rowCount : 0;
	const toggle = (name) => {
		setOpenTables((current) => {
			const next = Object.assign({}, current);
			if (next[name] === true) delete next[name];
			else next[name] = true;
			return next;
		});
	};
	return h('div', { className: 'mypg-schema' },
		h('div', { className: 'mypg-sideTitle' },
			MysqlGlyph({ name: 'table', size: 13 }),
			h('span', null, t('pg.schema') + (schema.engine === 'mysql' && typeof schema.name === 'string' ? ' · ' + schema.name : '')),
			h('span', { className: 'mypg-sideHint' }, t('pg.tables', { n: schema.tables.length }) + ' · ' + t('pg.rows', { n: totalRows }))),
		h('div', { className: 'mypg-schemaList' }, schema.tables.map((table) => {
			const open = openTables[table.name] === true;
			return h('div', { className: 'mypg-schemaTable', key: table.name },
				h('button', {
					className: 'mypg-schemaHead',
					type: 'button',
					'aria-expanded': open ? 'true' : 'false',
					onClick: () => toggle(table.name)
				},
					h('span', { className: 'mypg-schemaChevron', 'data-open': open ? 'true' : 'false' }, MysqlGlyph({ name: 'chevron', size: 11 })),
					h('span', { className: 'mypg-schemaName' }, table.name),
					h('span', { className: 'mypg-schemaCount' }, t('pg.rows', { n: table.rowCount === undefined ? 0 : table.rowCount }))),
				open
					? h('div', { className: 'mypg-schemaBody' }, (Array.isArray(table.columns) ? table.columns : []).map((column) => h('div', { className: 'mypg-schemaCol', key: column.name },
						column.primaryKey ? h('span', { className: 'mypg-keyBadge' }, 'PK') : h('span', { className: 'mypg-keySpacer' }),
						h('span', { className: 'mypg-schemaColName' }, column.name),
						h('span', { className: 'mypg-schemaColType' }, column.type === undefined || column.type === '' ? 'TEXT' : column.type))))
					: null);
		})));
}

/** One exercise row in the left list. */
function MysqlPgExerciseItem(props) {
	const t = props.t;
	const exercise = props.exercise;
	const active = props.active;
	const done = props.done;
	return h('button', {
		className: 'mypg-ex',
		type: 'button',
		'data-active': active ? 'true' : 'false',
		'data-done': done ? 'true' : 'false',
		onClick: () => props.onSelect(exercise.id)
	},
		h('span', { className: 'mypg-exTop' },
			h('span', { className: 'mypg-exId' }, String(exercise.id)),
			h('span', { className: 'mypg-exTitle' }, String(exercise.titleZh === undefined ? exercise.title : exercise.titleZh)),
			done ? h('span', { className: 'mypg-exDone' }, MysqlGlyph({ name: 'check', size: 11 })) : null),
		h('span', { className: 'mypg-exMeta' },
			h('span', { className: 'mypg-dots', 'aria-hidden': true }, [1, 2, 3, 4].map((level) => h('i', { key: 'd' + String(level), 'data-on': level <= (exercise.difficulty === undefined ? 1 : exercise.difficulty) ? 'true' : 'false' }))),
			typeof exercise.minutes === 'number' ? h('span', null, t('pg.minutes', { n: exercise.minutes })) : null));
}

/** The SQL playground view. */
function MysqlPlaygroundView(props) {
	const t = props.t;
	const kb = props.kb;
	const pendingSql = props.pendingSql === undefined ? null : props.pendingSql;
	const onPendingSqlConsumed = typeof props.onPendingSqlConsumed === 'function' ? props.onPendingSqlConsumed : function () {};
	const onOpenPage = typeof props.onOpenPage === 'function' ? props.onOpenPage : function () {};
	const onAskAi = typeof props.onAskAi === 'function' ? props.onAskAi : function () {};
	const environment = props.environment === undefined ? null : props.environment;
	const isMysql = environment !== null && environment.mode === 'mysql';

	const [data, setData] = React.useState(null);
	const [loadError, setLoadError] = React.useState(null);
	const [loadToken, setLoadToken] = React.useState(0);
	const draftsRef = React.useRef(mysqlPgReadDrafts());
	const doneRef = React.useRef((() => {
		const stored = mysqlReadStore('pgDone', null);
		return stored !== null && typeof stored === 'object' ? stored : {};
	})());
	const [done, setDone] = React.useState(doneRef.current);
	const [activeExerciseId, setActiveExerciseId] = React.useState(() => {
		const stored = mysqlReadStore('pgActive', null);
		return typeof stored === 'string' && stored !== '' ? stored : null;
	});
	const [sql, setSql] = React.useState('');
	const [result, setResult] = React.useState(null);
	const [check, setCheck] = React.useState(null);
	const [running, setRunning] = React.useState(false);
	const [checking, setChecking] = React.useState(false);
	const [hintOpen, setHintOpen] = React.useState(false);
	const [solutionOpen, setSolutionOpen] = React.useState(false);
	const [notice, setNotice] = React.useState(null);
	const [schema, setSchema] = React.useState(null);
	const [schemaError, setSchemaError] = React.useState(null);
	const [resetPending, setResetPending] = React.useState(false);
	const editorRef = React.useRef(null);
	const highlightCodeRef = React.useRef(null);
	const saveTimer = React.useRef(null);
	const envSignatureRef = React.useRef(null);
	const syncEditorScroll = React.useCallback(() => {
		const input = editorRef.current;
		const code = highlightCodeRef.current;
		if (input === null || code === null) return;
		code.style.transform = 'translate(' + String(-input.scrollLeft) + 'px,' + String(-input.scrollTop) + 'px)';
	}, []);

	// ---- load exercise bundle + schema --------------------------------------
	React.useEffect(() => {
		let alive = true;
		mysqlFetchJson('/playground').then((payload) => {
			if (!alive) return;
			setData(payload.exercises);
			setSchema(payload.schema === undefined ? null : payload.schema);
			setSchemaError(payload.schemaError === undefined ? null : payload.schemaError);
			setLoadError(null);
		}, (error) => {
			if (!alive) return;
			setLoadError(mysqlErrorMessage(error));
		});
		return () => {
			alive = false;
		};
	}, [loadToken]);

	const exercisesData = data !== null && data !== undefined && Array.isArray(data.exercises) ? data.exercises : MYSQL_EMPTY;
	const stages = data !== null && data !== undefined && Array.isArray(data.stages) ? data.stages : MYSQL_EMPTY;
	const activeExercise = activeExerciseId === null ? null : exercisesData.find((entry) => entry.id === activeExerciseId) || null;
	const activeKey = activeExerciseId === null ? MYSQL_PG_FREE_KEY : activeExerciseId;

	// keep the highlighted layer aligned with the textarea after switching drafts
	React.useEffect(() => {
		syncEditorScroll();
	}, [activeKey, syncEditorScroll]);

	// ---- default exercise once data arrives (only on first load) -----------
	const pickedInitialExercise = React.useRef(false);
	React.useEffect(() => {
		if (data === null || exercisesData.length === 0 || pickedInitialExercise.current) return;
		pickedInitialExercise.current = true;
		// no stored exercise (or a stale id): start from the first exercise so
		// the user immediately sees a task instead of an empty free-practice editor
		if (activeExerciseId === null || activeExercise === null) setActiveExerciseId(exercisesData[0].id);
	}, [data, exercisesData.length, activeExerciseId, activeExercise]);

	// ---- editor content follows the active exercise (draft > starter) ------
	React.useEffect(() => {
		if (data === null) return;
		const draft = draftsRef.current[activeKey];
		if (typeof draft === 'string') {
			setSql(draft);
		} else if (activeExercise !== null) {
			setSql(String(activeExercise.starterSql === undefined ? '' : activeExercise.starterSql));
		} else {
			setSql('');
		}
		setResult(null);
		setCheck(null);
		setHintOpen(false);
		setSolutionOpen(false);
	}, [activeKey, data]);

	// ---- persist draft + active exercise ----------------------------------
	React.useEffect(() => {
		if (data === null) return;
		draftsRef.current[activeKey] = sql;
		if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
		saveTimer.current = window.setTimeout(() => {
			mysqlWriteStore('pgDrafts', draftsRef.current);
		}, 400);
		return () => {
			if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
		};
	}, [sql, activeKey, data]);

	React.useEffect(() => {
		if (activeExerciseId !== null) mysqlWriteStore('pgActive', activeExerciseId);
	}, [activeExerciseId]);

	// ---- pending SQL handed over from the map / labs tabs ------------------
	React.useEffect(() => {
		if (pendingSql === null) return;
		draftsRef.current[MYSQL_PG_FREE_KEY] = pendingSql.text;
		setActiveExerciseId(null);
		setSql(pendingSql.text);
		setResult(null);
		setCheck(null);
		setNotice(pendingSql.title === undefined || pendingSql.title === '' ? t('pg.pendingSqlNotice') : '「' + pendingSql.title + '」' + t('pg.pendingSqlNotice'));
		onPendingSqlConsumed(pendingSql.id);
	}, [pendingSql]);

	const selectExercise = (exerciseId) => {
		draftsRef.current[activeKey] = sql;
		setActiveExerciseId(exerciseId);
		setNotice(null);
	};
	const selectFree = () => {
		draftsRef.current[activeKey] = sql;
		setActiveExerciseId(null);
		setNotice(t('pg.freeModeHint'));
	};

	const run = React.useCallback(async () => {
		if (running || checking) return;
		setRunning(true);
		setCheck(null);
		try {
			const payload = await mysqlFetchJson('/playground/query', {
				method: 'POST',
				body: JSON.stringify({ sql })
			});
			setResult(payload.result);
		} catch (error) {
			setResult({ error: mysqlErrorMessage(error), columns: [], rows: [], messages: [] });
		} finally {
			setRunning(false);
		}
	}, [sql, running, checking]);

	const runAndCheck = React.useCallback(async () => {
		if (running || checking) return;
		if (activeExercise === null) {
			setNotice(t('pg.checkRequiresExercise'));
			return;
		}
		setRunning(true);
		setChecking(true);
		setCheck(null);
		try {
			const payload = await mysqlFetchJson('/playground/query', {
				method: 'POST',
				body: JSON.stringify({ sql })
			});
			setResult(payload.result);
		} catch (error) {
			setResult({ error: mysqlErrorMessage(error), columns: [], rows: [], messages: [] });
		}
		try {
			const payload = await mysqlFetchJson('/playground/check', {
				method: 'POST',
				body: JSON.stringify({ exerciseId: activeExercise.id, sql })
			});
			setCheck(payload.check);
			if (payload.check !== null && payload.check !== undefined && payload.check.pass === true) {
				const next = Object.assign({}, doneRef.current, { [activeExercise.id]: true });
				doneRef.current = next;
				mysqlWriteStore('pgDone', next);
				setDone(next);
			}
		} catch (error) {
			setCheck({ pass: false, reason: mysqlErrorMessage(error) });
		} finally {
			setRunning(false);
			setChecking(false);
		}
	}, [sql, running, checking, activeExercise, t]);

	const refreshSchema = async () => {
		try {
			const payload = await mysqlFetchJson('/playground/schema');
			setSchema(payload.schema === undefined ? null : payload.schema);
			setSchemaError(null);
		} catch (error) {
			setSchemaError(mysqlErrorMessage(error));
		}
	};

	// Refresh the schema browser when the header switches execution environment.
	React.useEffect(() => {
		if (environment === null) return;
		const signature = [environment.mode, environment.mysql === undefined ? '' : environment.mysql.host, environment.mysql === undefined ? '' : environment.mysql.port, environment.mysql === undefined ? '' : environment.mysql.database].join('|');
		if (envSignatureRef.current === null) {
			envSignatureRef.current = signature;
			return;
		}
		if (envSignatureRef.current === signature) return;
		envSignatureRef.current = signature;
		setResult(null);
		setCheck(null);
		setNotice(environment.mode === 'mysql' ? t('pg.env.switchedMysql') : t('pg.env.switchedCompat'));
		refreshSchema();
	}, [environment, t]);

	const resetDatabase = React.useCallback(async () => {
		if (resetPending) return;
		if (isMysql === true) {
			const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(t('pg.env.resetConfirm')) : false;
			if (!confirmed) return;
		}
		setResetPending(true);
		try {
			const body = isMysql === true ? { force: true } : {};
			const payload = await mysqlFetchJson('/playground/reset', { method: 'POST', body: JSON.stringify(body) });
			if (payload.schema !== undefined) setSchema(payload.schema);
			setResult(null);
			setCheck(null);
			setNotice(isMysql === true ? t('pg.env.resetDoneMysql') : t('pg.resetDone'));
		} catch (error) {
			setNotice(mysqlErrorMessage(error));
		} finally {
			setResetPending(false);
		}
	}, [resetPending, t, isMysql]);

	const onEditorKeyDown = (event) => {
		if (event.key === 'Enter' && (event.metaKey === true || event.ctrlKey === true)) {
			event.preventDefault();
			if (activeExercise !== null) runAndCheck();
			else run();
		}
	};

	const insertSnippet = (text) => {
		setSql((current) => (current.trim() === '' ? text : current + '\n\n' + text));
		if (editorRef.current !== null) {
			try {
				editorRef.current.focus();
			} catch (_error) {
				/* ignore */
			}
		}
	};

	// derived progress over all exercises
	let totalExercises = exercisesData.length;
	let doneExercises = 0;
	for (const exercise of exercisesData) if (done[exercise.id] === true) doneExercises += 1;
	const stageProgress = (stage) => {
		const list = exercisesData.filter((exercise) => exercise.stageId === stage.id);
		let finished = 0;
		for (const exercise of list) if (done[exercise.id] === true) finished += 1;
		return { total: list.length, done: finished };
	};

	if (loadError !== null) {
		return h('div', { className: 'mypg-view' },
			h('style', { key: 'pg-styles' }, MYSQL_CSS_PLAYGROUND),
			h('div', { className: 'my-errorBox' },
				h('div', null, t('common.errorPrefix') + loadError),
				h('button', { className: 'my-btn', type: 'button', onClick: () => setLoadToken((value) => value + 1) }, t('common.retry'))));
	}
	if (data === null) {
		return h('div', { className: 'mypg-view' },
			h('style', { key: 'pg-styles' }, MYSQL_CSS_PLAYGROUND),
			h('div', { className: 'my-loadingLine' }, MysqlSpinner({}), h('span', null, t('common.loading'))));
	}

	const relatedPages = activeExercise !== null && Array.isArray(activeExercise.pageIds) ? activeExercise.pageIds : MYSQL_EMPTY;
	const pages = kb === null || kb === undefined || kb.pages === undefined ? {} : kb.pages;
	const titleOf = (id) => {
		const page = pages[id];
		if (page === undefined) return id;
		return page.titleZh === undefined || page.titleZh === '' ? page.title : page.titleZh;
	};

	const resultColumns = result !== null && result !== undefined && Array.isArray(result.columns) ? result.columns : MYSQL_EMPTY;
	const resultRows = result !== null && result !== undefined && Array.isArray(result.rows) ? result.rows : MYSQL_EMPTY;
	const showTable = result !== null && result !== undefined && result.error === undefined && resultColumns.length > 0;

	return h('div', { className: 'mypg-view' },
		h('style', { key: 'pg-styles' }, MYSQL_CSS_PLAYGROUND),
		h('aside', { className: 'mypg-side' },
			h('div', { className: 'mypg-sideHead' },
				h('span', { className: 'my-eyebrow' }, t('pg.eyebrow')),
				h('h2', { className: 'mypg-sideTitleText' }, t('pg.title')),
				h('p', { className: 'mypg-sideIntro' }, t('pg.intro')),
				h('div', { className: 'mypg-sideStats' },
					h('span', { className: 'my-chip my-chipBrand' }, t('pg.exerciseDone', { done: doneExercises, total: totalExercises })),
					h('span', { className: 'my-chip', title: isMysql ? t('pg.env.mysqlNote') : t('pg.engineTitle') },
						MysqlGlyph({ name: isMysql ? 'layers' : 'table', size: 10 }),
						h('span', null, isMysql ? t('pg.env.chipMysql') : t('pg.env.chipCompat'))))),
			h('div', { className: 'mypg-sideScroll my-scroll' },
				h('button', {
					className: 'mypg-freeBtn',
					type: 'button',
					'data-active': activeExerciseId === null ? 'true' : 'false',
					onClick: selectFree
				}, MysqlGlyph({ name: 'terminal', size: 12 }), h('span', null, t('pg.freeMode'))),
				stages.map((stage) => {
					const progress = stageProgress(stage);
					const list = exercisesData.filter((exercise) => exercise.stageId === stage.id);
					return h('div', { className: 'mypg-stage', key: stage.id },
						h('div', { className: 'mypg-stageHead' },
							h('span', { className: 'mypg-stageTitle' }, stage.titleZh),
							h('span', { className: 'mypg-stageCount' }, String(progress.done) + '/' + String(progress.total)),
							h('div', { className: 'mypg-stageBar' }, h('span', { style: { width: String(progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)) + '%' } }))),
						list.map((exercise) => h(MysqlPgExerciseItem, {
							key: exercise.id,
							t,
							exercise,
							active: exercise.id === activeExerciseId,
							done: done[exercise.id] === true,
							onSelect: selectExercise
						})));
				}),
				h(MysqlPgSchema, { t, schema, schemaError }),
				h('p', { className: 'mypg-engineNote' }, isMysql ? t('pg.env.mysqlNote') : t('pg.engineNote'))),
			h('div', { className: 'mypg-sideFoot' },
				h('button', { className: 'my-btn', type: 'button', disabled: resetPending, onClick: resetDatabase },
					MysqlGlyph({ name: 'refresh', size: 12 }), h('span', null, resetPending ? t('common.loading') : (isMysql ? t('pg.env.initSample') : t('pg.reset'))))),
			),
		h('main', { className: 'mypg-main' },
			h('div', { className: 'mypg-taskCard' },
				h('div', { className: 'mypg-taskHead' },
					h('div', { className: 'mypg-taskTitleWrap' },
						h('div', { className: 'mypg-taskKicker' },
							h('span', { className: 'mypg-taskLabel' }, activeExercise === null ? t('pg.freeMode') : t('pg.exercise')),
							activeExercise === null ? null : h('span', { className: 'my-chip my-chipSoft' }, t('pg.difficulty', { level: activeExercise.difficulty === undefined ? 1 : activeExercise.difficulty })),
							activeExercise === null ? null : h('span', { className: 'my-chip my-chipSoft' }, t('pg.minutes', { n: activeExercise.minutes === undefined ? 5 : activeExercise.minutes }))),
						h('h3', { className: 'mypg-taskTitle' }, activeExercise === null ? t('pg.freeMode') : String(activeExercise.titleZh === undefined ? activeExercise.title : activeExercise.titleZh))),
					h('div', { className: 'mypg-taskActions' },
						h('button', {
							className: 'my-btn my-btnSmall my-btnGhost',
							type: 'button',
							onClick: () => onAskAi(activeExercise, sql, result, environment)
						}, MysqlGlyph({ name: 'spark', size: 11 }), h('span', null, activeExercise === null ? t('pg.askAiDebug') : t('pg.askAi'))),
						activeExercise === null ? null : h('button', {
							className: 'my-btn my-btnSmall my-btnGhost',
							type: 'button',
							onClick: () => setHintOpen((current) => !current)
						}, MysqlGlyph({ name: 'info', size: 11 }), h('span', null, hintOpen ? t('pg.hideHint') : t('pg.hint'))),
						activeExercise === null ? null : h('button', {
							className: 'my-btn my-btnSmall my-btnGhost',
							type: 'button',
							onClick: () => setSolutionOpen((current) => !current)
						}, MysqlGlyph({ name: 'code', size: 11 }), h('span', null, solutionOpen ? t('pg.hideSolution') : t('pg.solution'))))),
				activeExercise === null
					? h('p', { className: 'mypg-taskDesc' }, t('pg.freeModeHint'))
					: h('div', { className: 'mypg-taskBody' },
						h('p', { className: 'mypg-taskGoal' }, MysqlGlyph({ name: 'target', size: 12 }), h('span', null, String(activeExercise.goal === undefined ? '' : activeExercise.goal))),
						h('p', { className: 'mypg-taskPrompt' }, String(activeExercise.prompt === undefined ? '' : activeExercise.prompt)),
						hintOpen && typeof activeExercise.hint === 'string'
							? h('p', { className: 'mypg-taskHint' }, MysqlGlyph({ name: 'spark', size: 12 }), h('span', null, activeExercise.hint))
							: null,
						solutionOpen
							? h('div', { className: 'mypg-solution' },
								h('div', { className: 'mypg-solutionHead' },
									h('span', { className: 'mypg-solutionLabel' }, t('pg.solution')),
									h('button', { className: 'my-btn my-btnSmall', type: 'button', onClick: () => insertSnippet(String(activeExercise.solutionSql === undefined ? '' : activeExercise.solutionSql)) },
										MysqlGlyph({ name: 'plus', size: 11 }), h('span', null, t('common.copy')))),
								h('pre', { className: 'mypg-code' }, h('code', null, mysqlHighlightSql(String(activeExercise.solutionSql === undefined ? '' : activeExercise.solutionSql)))))
							: null,
						relatedPages.length > 0
							? h('div', { className: 'mypg-related' }, relatedPages.map((id) => h('button', {
								key: id,
								className: 'my-topicChip',
								type: 'button',
								onClick: () => onOpenPage(id)
							}, MysqlGlyph({ name: 'book', size: 10 }), h('span', null, titleOf(id)))))
							: null)),
				notice === null ? null : h('div', { className: 'mypg-notice' }, MysqlGlyph({ name: 'info', size: 12 }), h('span', null, notice), h('button', { className: 'my-iconBtn', type: 'button', 'aria-label': t('common.close'), onClick: () => setNotice(null) }, MysqlGlyph({ name: 'plus', size:11 }))),
			h('div', { className: 'mypg-editorWrap' },
				h('div', { className: 'mypg-editorBar' },
					h('span', { className: 'mypg-editorLabel' }, t('pg.currentSql'), h('span', { className: 'mypg-themeChip' }, 'One Dark'), h('span', { className: 'mypg-editorHint' }, t('pg.starterHint'))),
					h('div', { className: 'mypg-editorActions' },
						h('button', { className: 'my-btn my-btnSmall my-btnGhost', type: 'button', onClick: () => setSql('') }, t('common.clear')),
						h('button', { className: 'my-btn my-btnSmall', type: 'button', disabled: running, onClick: run },
							MysqlGlyph({ name: 'play', size: 11 }), h('span', null, running ? t('pg.running') : t('pg.run'))),
						h('button', { className: 'my-btn my-btnSmall my-btnPrimary', type: 'button', disabled: running || checking || activeExercise === null, onClick: runAndCheck },
							MysqlGlyph({ name: 'check', size: 11 }), h('span', null, checking ? t('pg.checking') : t('pg.runAndCheck'))))),
				h('div', { className: 'mypg-editorShell' },
					h('pre', { className: 'mypg-editorHighlight', 'aria-hidden': true },
						h('code', { ref: highlightCodeRef },
							sql === '' ? h('span', { className: 'mypg-editorPlaceholder' }, t('pg.editorPlaceholder')) : mysqlHighlightSql(sql),
							'\n')),
					h('textarea', {
						className: 'mypg-editor',
						ref: editorRef,
						value: sql,
						spellCheck: false,
						wrap: 'off',
						autoComplete: 'off',
						autoCorrect: 'off',
						autoCapitalize: 'off',
						'aria-label': t('pg.currentSql'),
						onChange: (event) => setSql(event.target.value),
						onKeyDown: onEditorKeyDown,
						onScroll: syncEditorScroll
					})),
				h('div', { className: 'mypg-statusBar' },
					MysqlPgStatus({ t, result }),
					h('span', { className: 'mypg-statusRight' }, isMysql ? t('pg.env.runHintMysql') : (activeExercise === null ? t('pg.draftSaved') : t('pg.runFirst'))))),
			h('div', { className: 'mypg-output my-scroll' },
				result !== null && result !== undefined && result.error !== undefined
					? h('div', { className: 'mypg-errorBox' },
						h('div', { className: 'mypg-errorHead' },
							h('strong', null, MysqlGlyph({ name: 'alert', size: 13 }), h('span', null, t('pg.error'))),
							h('button', { className: 'my-btn my-btnSmall', type: 'button', onClick: () => onAskAi(activeExercise, sql, result, environment) },
								MysqlGlyph({ name: 'spark', size: 11 }), h('span', null, t('pg.askAiWhy')))),
						h('pre', { className: 'mypg-errorText' }, String(result.error)))
					: null,
				check !== null && check !== undefined ? h(MysqlPgCheckCard, { t, check, onAskAi: () => onAskAi(activeExercise, sql, result, environment) }) : null,
				showTable
					? h('div', { className: 'mypg-resultCard' },
						h('div', { className: 'mypg-resultHead' },
							h('span', { className: 'mypg-resultTitle' }, MysqlGlyph({ name: 'table', size: 13 }), h('span', null, t('pg.result'))),
							h('span', { className: 'mypg-resultMeta' }, t('pg.rowCount', { n: resultRows.length }))),
						h(MysqlPgTable, { columns: resultColumns, rows: resultRows, emptyLabel: t('pg.noRows') }),
						result.truncated === true ? h('p', { className: 'mypg-truncated' }, t('pg.truncated')) : null)
					: null,
				!showTable && result !== null && result !== undefined && result.error === undefined
					? h('div', { className: 'mypg-messages' },
						h('div', { className: 'mypg-resultHead' }, h('span', { className: 'mypg-resultTitle' }, MysqlGlyph({ name: 'terminal', size: 13 }), h('span', null, t('pg.message')))),
						(Array.isArray(result.messages) ? result.messages : []).map((message, index) => h('p', { className: 'mypg-messageLine', key: 'm' + String(index) }, String(message))))
					: null,
				result === null && check === null
					? h('div', { className: 'mypg-placeholder' }, MysqlGlyph({ name: 'terminal', size: 24 }), h('p', null, t('pg.emptyResult')))
					: null)
		));
}
// #endregion
