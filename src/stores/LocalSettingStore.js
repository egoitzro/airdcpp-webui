import Reflux from 'reflux';
import invariant from 'invariant';

import BrowserUtils from 'utils/BrowserUtils';
import { LocalSettings, FieldTypes } from 'constants/SettingConstants';


export const SettingDefinitions = [
	{
		key: LocalSettings.NOTIFY_PM_USER,
		type: FieldTypes.BOOLEAN,
		default_value: true,
		title: 'Private messages (users)',
	}, 
	{
		key: LocalSettings.NOTIFY_PM_BOT,
		type: FieldTypes.BOOLEAN,
		default_value: false,
		title: 'Private messages (bots)',
	}, 
	{
		key: LocalSettings.NOTIFY_BUNDLE_STATUS,
		type: FieldTypes.BOOLEAN,
		default_value: true,
		title: 'Bundle status changes',
	}, 
	{
		key: LocalSettings.NOTIFY_EVENTS_INFO,
		type: FieldTypes.BOOLEAN,
		default_value: false,
		title: 'Info events',
	}, 
	{
		key: LocalSettings.NOTIFY_EVENTS_WARNING,
		type: FieldTypes.BOOLEAN,
		default_value: true,
		title: 'Warning events',
	}, 
	{
		key: LocalSettings.NOTIFY_EVENTS_ERROR,
		type: FieldTypes.BOOLEAN,
		default_value: true,
		title: 'Error events',
	}, 
	{
		key: LocalSettings.UNREAD_LABEL_DELAY,
		type: FieldTypes.NUMBER,
		default_value: 0,
		title: 'Delay for marking chat sessions as read (seconds)',
	}, 
	{
		key: LocalSettings.BACKGROUND_IMAGE_URL,
		type: FieldTypes.STRING,
		default_value: null,
		optional: true,
		title: 'Custom background image URL',
	}
];


// Settings are saved in local storage only after the default value has been modified
// Default value from the respective definition is returned otherwise
const LocalSettingStore = Reflux.createStore({
	init: function () {
		this.settings = BrowserUtils.loadLocalProperty('local_settings', {});
	},

	getDefinition(key) {
		const def = SettingDefinitions.find(def => def.key === key);
		invariant(def, 'Invalid local setting key ' + key + ' supplied');
		return def;
	},

	// Return setting item infos (see API help for settings/items/info for details) 
	getDefinitions(keys) {
		return keys.map(this.getDefinition);
	},

	// Get the current value by key (or default value if no value has been set)
	getValue(key) {
		if (this.settings.hasOwnProperty(key)) {
			return this.settings[key];
		}
		
		return this.getDefinition(key).default_value;
	},

	getValues() {
		return SettingDefinitions.reduce((reduced, { key }) => {
			reduced[key] = this.getValue(key);
			return reduced;
		}, {});
	},

	// Append values for the provided key -> value object 
	setValues(items) {
		this.settings = Object.assign({}, this.settings, items);
		BrowserUtils.saveLocalProperty('local_settings', this.settings);
		this.trigger(this.getValues());
	},
});

export default LocalSettingStore;