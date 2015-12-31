import Reflux from 'reflux';

import StorageMixin from 'mixins/StorageMixin';

import LoginActions from 'actions/LoginActions';
import SocketActions from 'actions/SocketActions';

import AccessConstants from 'constants/AccessConstants';


export default Reflux.createStore({
	listenables: LoginActions,
	mixins: [ StorageMixin ],
	init: function () {
		this._permissions = this.loadProperty('permissions');
		this._token = this.loadProperty('auth_token');
		this._user = this.loadProperty('web_user');
		this._systemInfo = this.loadProperty('system_info');
		this._awayIdleTime = this.loadProperty('away_idle_time');

		this._lastError = null;
		this._socketAuthenticated = false;

		this.listenTo(SocketActions.state.disconnected, this.onSocketDisconnected);
		this.getInitialState = this.getState;
	},

	onLogin(res) {
		this.reset();
	},

	getState() {
		return {
			lastError: this._lastError,
			token: this._token,
			user: this._user,
			socketAuthenticated: this._socketAuthenticated,
			userLoggedIn: this._user !== null,
			awayIdleTime: this._awayIdleTime,
		};
	},

	onLoginCompleted(res) {
		this._permissions = res.permissions;
		this._token = res.token;
		this._user = res.user;
		this._systemInfo = res.system;
		this._awayIdleTime = res.away_idle_time;

		this._lastError = null;
		this._socketAuthenticated = true;

		this.saveProperty('permissions', res.permissions);
		this.saveProperty('auth_token', res.token);
		this.saveProperty('web_user', res.user);
		this.saveProperty('system_info', this._systemInfo);
		this.saveProperty('away_idle_time', this._awayIdleTime);

		this.trigger(this.getState());
	},

	// Invalid password etc.
	onLoginFailed(error) {
		this._lastError = error.message ? error.message : error;
		this.trigger(this.getState());
	},

	// Ready for use
	onConnectCompleted() {
		this._socketAuthenticated = true;
		this.trigger(this.getState());
	},

	// Can't connect to the server or session not valid
	onConnectFailed(error) {
		if (error.code == 400) {
			this.reset();
			this._lastError = 'Session lost';
		} else { 
			this._lastError = error.message ? error.message : error;
		}

		this.trigger(this.getState());
	},

	hasAccess(access) {
		return this._permissions.indexOf(access) !== -1 || this._permissions.indexOf(AccessConstants.ADMIN) !== -1;
	},

	onSocketDisconnected(socket, error, code) {
		this._socketAuthenticated = false;
		if (this._user) {
			if (error === '') {
				this._lastError = 'Connection closed';
			} else {
				this._lastError = error;
			}
		}

		this.trigger(this.getState());
	},

	onLogoutCompleted() {
		this.reset();
		this.trigger(this.getState());
	},

	reset() {
		this._lastError = null;
		this._token = null;
		this._user = null;
		this._socketAuthenticated = false;

		sessionStorage.removeItem('auth_token');
		sessionStorage.removeItem('web_user');
	},

	get user() {
		return this._user;
	},

	get token() {
		return this._token;
	},

	get lastError() {
		return this._lastError;
	},

	get socketAuthenticated() {
		return this._socketAuthenticated;
	},

	get isLoggedIn() {
		return !!this._user;
	},

	get systemInfo() {
		return this._systemInfo;
	},
});
