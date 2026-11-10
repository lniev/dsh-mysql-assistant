// #region enterprise labs view
// Enterprise labs: scenario cards on the left, a detail column with business
// context, step-by-step operations (runnable SQL), deliverable, go-live
// checklist, pitfalls and related topics.

/** One SQL block inside a lab step. */
function MysqlLabStepSql(props) {
	const t = props.t;
	const sql = props.sql;
	const [copied, setCopied] = React.useState(false);
	const runnable = !/\bDELIMITER\b/i.test(sql);
	const copy = async () => {
		const ok = await mysqlCopyText(sql);
		if (ok) {
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1600);
		}
	};
	return h('div', { className: 'mylab-stepSql' },
		h('div', { className: 'mylab-stepSqlHead' },
			h('span', { className: 'mylab-stepSqlLabel' }, t('labs.stepSql')),
			h('div', { className: 'mylab-stepSqlTools' },
				h('button', { className: 'my-btn my-btnSmall my-btnGhost', type: 'button', onClick: copy },
					MysqlGlyph({ name: copied ? 'check' : 'copy', size: 11 }),
					h('span', null, copied ? t('common.copied') : t('common.copy'))),
				runnable
					? h('button', { className: 'my-btn my-btnSmall', type: 'button', onClick: () => props.onRunSql(sql, props.title) },
						MysqlGlyph({ name: 'play', size: 11 }),
						h('span', null, t('labs.runInPlayground')))
					: h('span', { className: 'my-chip my-chipSoft' }, t('common.clientOnly')))),
		h('pre', { className: 'mylab-code' }, h('code', null, mysqlHighlightSql(sql)))
	);
}

/** Detail column of one lab. */
function MysqlLabDetail(props) {
	const t = props.t;
	const scenario = props.scenario;
	const pages = props.pages === undefined || props.pages === null ? {} : props.pages;
	const onOpenPage = props.onOpenPage;
	const onRunSql = props.onRunSql;
	const onAskAi = typeof props.onAskAi === 'function' ? props.onAskAi : function () {};
	const bodyRef = React.useRef(null);
	const titleOf = (id) => {
		const page = pages[id];
		if (page === undefined) return id;
		return page.titleZh === undefined || page.titleZh === '' ? page.title : page.titleZh;
	};
	React.useEffect(() => {
		if (bodyRef.current !== null) {
			try {
				bodyRef.current.scrollTo({ top: 0 });
			} catch (_error) {
				bodyRef.current.scrollTop = 0;
			}
		}
	}, [scenario.id]);

	const steps = Array.isArray(scenario.steps) ? scenario.steps : [];
	const checklist = Array.isArray(scenario.checklist) ? scenario.checklist : [];
	const pitfalls = Array.isArray(scenario.pitfalls) ? scenario.pitfalls : [];
	const pageIds = Array.isArray(scenario.pageIds) ? scenario.pageIds : [];
	const tags = Array.isArray(scenario.tags) ? scenario.tags : [];

	return h('aside', { className: 'mylab-detail', 'aria-label': scenario.titleZh },
		h('header', { className: 'mylab-detailHead' },
			h('div', { className: 'mylab-titleRow' },
				h('h2', { className: 'mylab-title' }, scenario.titleZh),
				typeof scenario.level === 'string' ? h('span', { className: 'mylab-level' }, scenario.level) : null
			),
			h('div', { className: 'mylab-metaRow' },
				typeof scenario.hours === 'number' ? h('span', { className: 'my-chip my-chipSoft' }, t('labs.hours', { n: scenario.hours })) : null,
				tags.map((tag) => h('span', { key: 'tag-' + tag, className: 'my-chip' }, tag))),
			h('div', { className: 'mylab-actions' },
				h('button', { className: 'my-btn my-btnSmall my-btnWarm', type: 'button', onClick: () => onAskAi(scenario) },
					MysqlGlyph({ name: 'spark', size: 11 }), h('span', null, t('labs.askAi'))))
		),
		h('div', { className: 'mylab-detailBody my-scroll', ref: bodyRef },
			typeof scenario.background === 'string' && scenario.background !== ''
				? h('section', { className: 'mylab-block' },
					h('h3', { className: 'mylab-blockTitle' }, MysqlGlyph({ name: 'info', size: 13 }), h('span', null, t('labs.background'))),
					h('p', { className: 'mylab-paragraph' }, scenario.background))
				: null,
			typeof scenario.goal === 'string' && scenario.goal !== ''
				? h('section', { className: 'mylab-goalCard' },
					h('h3', { className: 'mylab-blockTitle' }, MysqlGlyph({ name: 'target', size: 13 }), h('span', null, t('labs.goal'))),
					h('p', { className: 'mylab-paragraph' }, scenario.goal))
				: null,
			h('section', { className: 'mylab-block' },
				h('h3', { className: 'mylab-blockTitle' }, MysqlGlyph({ name: 'layers', size: 13 }), h('span', null, t('labs.steps'))),
				h('ol', { className: 'mylab-steps' }, steps.map((step, index) => h('li', { className: 'mylab-step', key: 'step' + String(index) },
					h('div', { className: 'mylab-stepHead' },
						h('span', { className: 'mylab-stepIndex' }, String(index + 1)),
						h('h4', { className: 'mylab-stepTitle' }, String(step.title === undefined ? '' : step.title))),
					typeof step.detail === 'string' && step.detail !== '' ? h('p', { className: 'mylab-stepDetail' }, step.detail) : null,
					typeof step.sql === 'string' && step.sql.trim() !== ''
						? h(MysqlLabStepSql, { t, sql: step.sql, title: scenario.titleZh, onRunSql })
						: null)))),
			typeof scenario.deliverable === 'string' && scenario.deliverable !== ''
				? h('section', { className: 'mylab-block' },
					h('h3', { className: 'mylab-blockTitle' }, MysqlGlyph({ name: 'file', size: 13 }), h('span', null, t('labs.deliverable'))),
					h('p', { className: 'mylab-paragraph' }, scenario.deliverable))
				: null,
			checklist.length > 0
				? h('section', { className: 'mylab-block' },
					h('h3', { className: 'mylab-blockTitle' }, MysqlGlyph({ name: 'check', size: 13 }), h('span', null, t('labs.checklist'))),
					h('ul', { className: 'mylab-checks' }, checklist.map((entry, index) => h('li', { key: 'c' + String(index) },
						MysqlGlyph({ name: 'check', size: 12 }), h('span', null, String(entry))))))
				: null,
			pitfalls.length > 0
				? h('section', { className: 'mylab-block' },
					h('h3', { className: 'mylab-blockTitle' }, MysqlGlyph({ name: 'alert', size: 13 }), h('span', null, t('labs.pitfalls'))),
					h('ul', { className: 'mylab-pitfalls' }, pitfalls.map((entry, index) => h('li', { key: 'p' + String(index) },
						h('span', { className: 'mylab-pitfallMark' }, '!'), h('span', null, String(entry))))))
				: null,
			pageIds.length > 0
				? h('section', { className: 'mylab-block' },
					h('h3', { className: 'mylab-blockTitle' }, MysqlGlyph({ name: 'book', size: 13 }), h('span', null, t('labs.pages'))),
					h('div', { className: 'my-pillRow' }, pageIds.map((id) => h('button', {
						key: id,
						className: 'my-topicChip',
						type: 'button',
						onClick: () => onOpenPage(id)
					}, MysqlGlyph({ name: 'arrowRight', size: 10 }), h('span', null, titleOf(id))))))
				: null
		)
	);
}

/** One lab card in the list. */
function MysqlLabCard(props) {
	const t = props.t;
	const scenario = props.scenario;
	const selected = props.selected;
	const onSelect = props.onSelect;
	const tags = Array.isArray(scenario.tags) ? scenario.tags : [];
	return h('button', {
		className: 'mylab-card',
		type: 'button',
		'data-selected': selected ? 'true' : 'false',
		onClick: () => onSelect(scenario)
	},
		h('div', { className: 'mylab-cardTop' },
			h('h3', { className: 'mylab-cardTitle' }, scenario.titleZh),
			typeof scenario.level === 'string' ? h('span', { className: 'mylab-level' }, scenario.level) : null
		),
		h('p', { className: 'mylab-cardGoal' }, mysqlClipText(String(scenario.goal === undefined ? '' : scenario.goal), 110)),
		h('div', { className: 'mylab-cardFoot' },
			typeof scenario.hours === 'number' ? h('span', { className: 'my-chip my-chipSoft' }, t('labs.hours', { n: scenario.hours })) : null,
			tags.slice(0, 3).map((tag) => h('span', { key: 'tag-' + tag, className: 'my-chip' }, tag)))
	);
}

/** The enterprise labs view. */
function MysqlLabsView(props) {
	const t = props.t;
	const kb = props.kb;
	const labs = kb === null || kb === undefined ? null : kb.labs;
	const pages = kb === null || kb === undefined || kb.pages === undefined ? {} : kb.pages;
	const onOpenPage = typeof props.onOpenPage === 'function' ? props.onOpenPage : function () {};
	const onRunSql = typeof props.onRunSql === 'function' ? props.onRunSql : function () {};
	const onAskAi = typeof props.onAskAi === 'function' ? props.onAskAi : function () {};
	const [selectedId, setSelectedId] = React.useState(null);

	if (labs === null || labs === undefined || !Array.isArray(labs.scenarios) || labs.scenarios.length === 0) {
		return h('div', { className: 'mylab-view' },
			h('style', { key: 'labs-styles' }, MYSQL_CSS_LABS),
			h('div', { className: 'my-empty' }, MysqlGlyph({ name: 'layers', size: 26 }), h('p', null, t('labs.empty')))
		);
	}

	const scenarios = labs.scenarios;
	const selected = selectedId === null
		? scenarios[0]
		: scenarios.find((scenario) => scenario.id === selectedId) || scenarios[0];

	return h('div', { className: 'mylab-view' },
		h('style', { key: 'labs-styles' }, MYSQL_CSS_LABS),
		h('div', { className: 'mylab-main my-scroll' },
			h('header', { className: 'mylab-head' },
				h('div', { className: 'mylab-headText' },
					h('span', { className: 'my-eyebrow' }, t('labs.eyebrow')),
					h('h2', { className: 'my-sectionTitle' }, labs.titleZh === undefined ? t('labs.title') : labs.titleZh),
					h('p', { className: 'my-sectionIntro' }, labs.intro === undefined ? t('labs.introFallback') : labs.intro)
				),
				h('div', { className: 'mylab-stats' },
					h('span', { className: 'my-chip my-chipBrand' }, t('labs.scenarios', { n: scenarios.length })))
			),
			h('p', { className: 'mylab-hint' }, MysqlGlyph({ name: 'compass', size: 12 }), h('span', null, t('labs.detailHint'))),
			h('div', { className: 'mylab-grid' }, scenarios.map((scenario) => h(MysqlLabCard, {
				key: scenario.id,
				t,
				scenario,
				selected: selected !== null && selected.id === scenario.id,
				onSelect: (entry) => setSelectedId(entry.id)
			})))
		),
		selected === null
			? h('aside', { className: 'mylab-detail mylab-detailEmpty' },
				h('div', { className: 'my-empty' }, MysqlGlyph({ name: 'layers', size: 26 }), h('p', null, t('labs.selectLab'))))
			: h(MysqlLabDetail, {
				t,
				scenario: selected,
				pages,
				onOpenPage,
				onRunSql,
				onAskAi
			})
	);
}
// #endregion
