const Action = require('./Action');

const actionsMap = {
    click: require('./ActionClick'),
    mouseClick: require('./ActionMouseClick'),
    mousedown: require('./ActionMouseDown'),
    mouseup: require('./ActionMouseUp'),
    changeElement: require('./ActionChangeElement'),
    wait: require('./ActionWaitElement'),
    waitForVisible: require('./ActionWaitForVisible'),
    waitForPattern: require('./ActionWaitForPattern'),
    waitForPage: require('./ActionWaitForPage'),
    waitForQuery: require('./ActionWaitForQuery'),
    pause: require('./ActionPause'),
    parse: require('./ActionParse'),
    type: require('./ActionType'),
    exist: require('./ActionExist'),
    exists: require('./ActionExist'),
    hasRedirect: require('./ActionHasRedirect'),
    back: require('./ActionBack'),
    provideRules: require('./ActionProvideRules'),
    snapshot: require('./ActionSnapshot'),
    open: require('./ActionOpen'),
    focus: require('./ActionFocus'),
    blur: require('./ActionBlur'),
    url: require('./ActionUrl'),

    condition: require('./ActionCondition'),
    or: require('./ActionOr'),
    not: require('./ActionNot'),
    cases: require('./ActionCases'),
};

const actionsFactory = {
    /**
     * @param {ActionOptions} options
     * @return {Action|null}
     */
    createAction(options) {
        const ActionConstructor = actionsMap[options.actionOptions.type];
        if (!ActionConstructor) {
            return null;
        }

        return new ActionConstructor(options);
    },

    /**
     * Adds custom action
     * @param {string} type
     * @param {Function} action
     */
    addAction(type, action) {
        if (typeof type !== 'string' || typeof action !== 'function') {
            throw new Error('addAction accept type as string and action if function which must return a promise');
        }

        if (actionsMap[type]) {
            throw new Error(`Action with type ${type} already registered`);
        }

        class CustomAction extends Action {
            perform() {
                action.call(this, this._options);
            }
        }

        actionsMap[type] = CustomAction;
    }
};

module.exports = actionsFactory;
