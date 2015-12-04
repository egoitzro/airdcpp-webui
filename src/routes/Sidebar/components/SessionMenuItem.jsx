import React from 'react';

import { Link } from 'react-router';
import History from 'utils/History';

const SessionMenuItem = React.createClass({
	propTypes: {
		/**
		 * Location object
		 */
		location: React.PropTypes.object.isRequired,

		/**
		 * Item URL
		 */
		url: React.PropTypes.string.isRequired,
	},

	contextTypes: {
		history: React.PropTypes.object.isRequired
	},

	onClick: function (evt) {
		evt.preventDefault();

		History.pushSidebar(this.props.location, this.props.url);
	},

	render: function () {
		const { item } = this.props;
		return (
			<Link to={this.props.url} className="item session-item" onClick={this.onClick} activeClassName="active">
				<div className="left-content">
					<div className={ 'ui session-status empty circular left mini label ' + this.props.statusGetter(item) }/>
					{ this.props.nameGetter(item) }
				</div>
				{ this.props.labelGetter(item) }
			</Link>
		);
	}
});

export default SessionMenuItem;