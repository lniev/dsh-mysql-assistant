// #region registration
// Activation of the browser half: register the central `main` panel and its
// sidebar entry under one shared id (the sidebar row selects the `main` cell by
// this exact id).

/** Dictionary namespace owned by this plugin. */
const MYSQL_NS = 'mysqlAssistant';

/** Central panel id shared by the `main` entry and the sidebar entry. */
const MYSQL_PANEL_ID = 'mysql-assistant';

/** Client services the panel reads. */
const inject = ['slots', 'locale', 'remote', 'remote.session', 'uiWorkspace'];

/** Sidebar list mark; the sidebar renders the label and accessible name itself. */
function MysqlSidebarIcon(props) {
	return MysqlPanelIcon({ size: props !== null && props !== undefined && typeof props.size === 'number' ? props.size : 16 });
}

/**
 * Register the plugin UI.
 * @param ctx - Client root context.
 */
function apply(ctx) {
	mysqlClientContext = ctx;
	ctx.effect(() => ctx.locale.register(MYSQL_NS, { zh: MYSQL_ZH_BASE, en: MYSQL_EN_BASE }), 'mysql-assistant: dictionaries');
	const t = ctx.locale.bind(MYSQL_NS);
	ctx.slots.inject('main', () => ctx.slots.register({
		name: 'main',
		key: MYSQL_PANEL_ID,
		locale: MYSQL_NS
	}, MysqlAssistantPanel));
	ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
		name: 'sidebar.panellist',
		id: MYSQL_PANEL_ID,
		order: 8,
		label: () => t('title'),
		locale: MYSQL_NS
	}, MysqlSidebarIcon));
}
// #endregion
