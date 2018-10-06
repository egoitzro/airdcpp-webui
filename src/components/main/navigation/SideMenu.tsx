'use strict';

import PropTypes from 'prop-types';
import React from 'react';

import History from 'utils/History';

import IconPanel from 'components/main/navigation/IconPanel';
import { matchPath } from 'react-router-dom';
import { secondaryRoutes, parseMenuItems, RouteItemClickHandler, HOME_URL } from 'routes/Routes';
import { Location } from 'history';


interface SideMenuProps {
  location: Location;
  previousLocation?: Location;
}

class SideMenu extends React.Component<SideMenuProps> {
  static contextTypes = {
    router: PropTypes.object.isRequired
  };

  onClick: RouteItemClickHandler = (url, evt) => {
    evt.preventDefault();

    const { location, previousLocation } = this.props;
    const isActive = matchPath(location.pathname, {
      path: url,
    });

    if (isActive) {
      if (!!previousLocation) {
        History.replace({
          pathname: previousLocation.pathname,
          state: previousLocation.state,
        });
      } else {
        History.replace(HOME_URL);
      }
    } else {
      History.push(url);
    }
  }

  render() {
    const menuItems = parseMenuItems(secondaryRoutes, this.onClick);
    return (
      <div id="side-menu">
        { menuItems.length > 0 && (
          <div className="content navigation">
            <div className="ui labeled icon vertical small inverted menu">
              { menuItems }
            </div>
          </div>
        ) }
        <div className="ui divider"/>
        <IconPanel/>
      </div>
    );
  }
}

export default SideMenu;
