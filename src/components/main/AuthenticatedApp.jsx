'use strict';
import React from 'react';
import Reflux from 'reflux';
import invariant from 'invariant';

import LoginActions from 'actions/LoginActions';
import LoginStore from 'stores/LoginStore';
import AccessConstants from 'constants/AccessConstants';

import Notifications from './Notifications';
import BrowserUtils from 'utils/BrowserUtils';

import MobileLayout from './MobileLayout';
import MainLayout from './MainLayout';

import { History, RouteContext } from 'react-router';
import SocketConnectStatus from './SocketConnectStatus';
import SetContainerSize from 'mixins/SetContainerSize';

import ModalHandlerDecorator from 'decorators/ModalHandlerDecorator';

import HubActions from 'actions/HubActions';
import PrivateChatActions from 'actions/PrivateChatActions';
import FilelistActions from 'actions/FilelistActions';
import ViewFileActions from 'actions/ViewFileActions';
import LogActions from 'actions/LogActions';

import OverlayConstants from 'constants/OverlayConstants';


const showSideBar = (props) => {
	return props.location.state &&
		props.location.state[OverlayConstants.SIDEBAR_ID];
};

const AuthenticatedApp = React.createClass({
	mixins: [ Reflux.connect(LoginStore), History, RouteContext, SetContainerSize ],
	changeAwayState(away) {
		this.away = away;
		LoginActions.setAway(away);
	},

	resetActivityTimer() {
		invariant(this.state.awayIdleTime, 'Away idle period not set');
		if (!this.state.awayIdleTime || this.state.awayIdleTime === 0) {
			return;
		}

		if (this.away) {
			this.changeAwayState(false);
		}

		clearTimeout(this.activityTimeout);
		this.activityTimeout = setTimeout(() => this.changeAwayState(true), this.state.awayIdleTime*60*1000);
		//this.activityTimeout = setTimeout(() => this.changeAwayState(true), 3000);
	},

	onSocketAuthenticated() {
		this.addActivityHandlers();

		if (LoginStore.hasAccess(AccessConstants.PRIVATE_CHAT_VIEW)) {
			PrivateChatActions.fetchSessions();
		}

		if (LoginStore.hasAccess(AccessConstants.HUBS_VIEW)) {
			HubActions.fetchSessions();
		}

		if (LoginStore.hasAccess(AccessConstants.FILELISTS_VIEW)) {
			FilelistActions.fetchSessions();
		}

		if (LoginStore.hasAccess(AccessConstants.VIEW_FILE_VIEW)) {
			ViewFileActions.fetchSessions();
		}

		if (LoginStore.hasAccess(AccessConstants.EVENTS)) {
			LogActions.fetchInfo();
		}
	},

	componentWillMount() {
		if (this.state.socketAuthenticated) {
			this.onSocketAuthenticated();
		}

		if (showSideBar(this.props)) {
			this.previousChildren = <div/>;
		}
	},

	componentWillReceiveProps(nextProps) {
		if (showSideBar(nextProps)) {
			if (!this.previousChildren) {
				this.previousChildren = this.props.children;
			}
		} else {
			this.previousChildren = null;
		}
	},

	removeActivityHandlers() {
		document.onmousemove = null;
		document.onkeypress = null;

		clearTimeout(this.activityTimeout);
	},

	addActivityHandlers() {
		document.onmousemove = this.resetActivityTimer;
		document.onkeypress = this.resetActivityTimer;

		this.resetActivityTimer();
	},

	componentWillUpdate(nextProps, nextState) {
		if (nextState.userLoggedIn && this.state.socketAuthenticated && !nextState.socketAuthenticated) {
			// Reconnect (but not too fast)
			console.log('Socket closed, attempting to reconnect in 2 seconds');
			setTimeout(() => LoginActions.connect(this.state.token), 2000);

			this.removeActivityHandlers();
		} else if (this.state.userLoggedIn && !nextState.userLoggedIn) {
			// Go to the login page as we don't have a valid session anymore
			// Return to this page if the session was lost (instead of having logged out) 
			//this.history.replace({
			//	state: LoginStore.lastError !== null ? { nextPath: this.props.location.pathname } : null, 
			//	pathname: '/login',
			//});

			this.history.replaceState(
				LoginStore.lastError !== null ? { nextPath: this.props.location.pathname } : null, 
				'/login'
			);

			this.away = false;

			this.removeActivityHandlers();
		} else if (!this.state.socketAuthenticated && nextState.socketAuthenticated) {
			this.onSocketAuthenticated();
		}
	},

	render() {
		invariant(this.props.children, 'AuthenticatedApp should always have children');
		if (!this.state.socketAuthenticated) {
			// Dim the screen until the server can be reached (we can't do anything without the socket)
			return <SocketConnectStatus active={true} lastError={this.state.lastError}/>;
		}


		let sidebar = null;
		if (showSideBar(this.props)) {
			sidebar = React.cloneElement(this.props.children, { 
				overlayId: OverlayConstants.SIDEBAR_ID,
				overlayContext: '.sidebar-context',
			});
		}

		const LayoutElement = BrowserUtils.useMobileLayout() ? MobileLayout : MainLayout;
		return (
			<div id="authenticated-app">
				<Notifications location={ this.props.location }/>
				<LayoutElement className="pushable main-layout" sidebar={ sidebar } { ...this.props }>
					{ this.previousChildren ? this.previousChildren : this.props.children }
				</LayoutElement>
			</div>
		);
	}
});

export default ModalHandlerDecorator(AuthenticatedApp);
