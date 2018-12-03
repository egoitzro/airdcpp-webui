import PropTypes from 'prop-types';
import React from 'react';
import { Route, RouteComponentProps } from 'react-router-dom';
import invariant from 'invariant';

import History from 'utils/History';
import Loader from 'components/semantic/Loader';

import TopMenuLayout from './TopMenuLayout';
import SideMenuLayout from './SideMenuLayout';

import '../sessions.css';

import { ActionMenu } from 'components/menu';
import SessionNewButton from './SessionNewButton';
import SessionMenuItem from './SessionMenuItem';

import Icon, { IconType } from 'components/semantic/Icon';
import Message from 'components/semantic/Message';

import LoginStore from 'stores/LoginStore';
import { loadLocalProperty, saveLocalProperty, useMobileLayout } from 'utils/BrowserUtils';

import IconConstants from 'constants/IconConstants';
import MenuItemLink from 'components/semantic/MenuItemLink';

import * as API from 'types/api';
import * as UI from 'types/ui';



export type SessionBaseType = UI.SessionItemBase;

const findItem = <SessionT extends SessionBaseType>(items: SessionT[], id: API.IdType | null): SessionT | undefined => {
  return items.find(item => item.id === id);
};

export interface SessionLayoutProps<
  SessionT extends SessionBaseType = SessionBaseType,
  ActionT extends object = {}
> extends UI.SessionInfoGetter<SessionT>, Omit<RouteComponentProps, 'match'> {
    // Unique ID of the section (used for storing and loading the previously open tab)
    baseUrl: string;

    // Array of the items to list
    items: SessionT[];

    // Session actions (should contain 'removeSession')
    actions: UI.ActionListType<SessionT> & UI.SessionActions<SessionT, ActionT>;

    // Session actions to show in the action menu
    actionIds?: string[];

    // Item ID that is currently active (if any)
    activeId: API.IdType | null;

    // Label for button that opens a new session
    newCaption?: React.ReactNode;

    // Label for button that opens a new session
    newDescription?: React.ReactNode;

    // Label for button that opens a new session
    newIcon?: IconType;

    // Set to false if the side menu should never be shown (the session will use all width that is available)
    disableSideMenu?: boolean;

    // AccessConstant defining whether the user has edit permission 
    editAccess: API.AccessEnum;

    sessionItemLayout: React.ComponentType<SessionChildProps<SessionT>>;

    newLayout?: React.ComponentType;

    unreadInfoStore: any;
}

export interface SessionMainLayoutProps<SessionT extends SessionBaseType, ActionT extends object = {}> extends 
  Pick<SessionLayoutProps<SessionT>, 'unreadInfoStore'> {

  newButton: React.ReactElement<any> | null;
  listActionMenuGetter: () => React.ReactNode;
  sessionMenuItems: React.ReactNode[];
  closeAction: UI.SessionActions<SessionT, ActionT>['removeSession'];
  activeItem: SessionT | null;

  itemHeaderTitle: React.ReactNode;
  itemHeaderDescription: React.ReactNode;
  itemHeaderIcon: IconType;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

interface State<SessionT extends SessionBaseType> {
  activeItem: SessionT | null;
}

export type SessionChildProps<SessionT extends SessionBaseType, ActionT extends object = {}> = 
  Pick<SessionLayoutProps<SessionT, ActionT>, 'actions' | 'location'> & 
  { session: SessionT; };

class SessionLayout<SessionT extends SessionBaseType, ActionT extends object> 
  extends React.Component<SessionLayoutProps<SessionT, ActionT>, State<SessionT>> {

  static displayName = 'SessionLayout';

  static propTypes = {
    // Unique ID of the section (used for storing and loading the previously open tab)
    baseUrl: PropTypes.string.isRequired,

    // Location object
    location: PropTypes.object.isRequired,

    // Array of the items to list
    items: PropTypes.array.isRequired,

    // If no function is supplied, the item name will be used
    itemHeaderTitleGetter: PropTypes.func,

    // Function receiving an item object that returns the description (subheader) of the item
    itemHeaderDescriptionGetter: PropTypes.func.isRequired,

    // Function receiving an item object that returns icon for a item
    itemHeaderIconGetter: PropTypes.func.isRequired,

    // Store containing information about unread items
    unreadInfoStore: PropTypes.object,

    // Function receiving an item object that returns the display name
    itemNameGetter: PropTypes.func.isRequired,

    // Function receiving the circular color label in front of the item
    itemStatusGetter: PropTypes.func,

    // Session actions (should contain 'removeSession')
    actions: PropTypes.object.isRequired,

    // Session actions to show in the action menu
    actionIds: PropTypes.array,

    // Item ID that is currently active (if any)
    activeId: PropTypes.any,

    // Label for button that opens a new session
    newCaption: PropTypes.any,

    // Label for button that opens a new session
    newDescription: PropTypes.any,

    // Label for button that opens a new session
    newIcon: PropTypes.any,

    // Set to false if the side menu should never be shown (the session will use all width that is available)
    disableSideMenu: PropTypes.bool,

    // AccessConstant defining whether the user has edit permission 
    editAccess: PropTypes.string.isRequired,

    sessionItemLayout: PropTypes.any.isRequired,

    newLayout: PropTypes.func,
  };

  state: State<SessionT> = {
    activeItem: null
  };

  // HELPERS
  getSessionUrl = (id: API.IdType) => {
    invariant(!!id, 'Trying to get session URL without a session');
    return `/${this.props.baseUrl}/session/${id}`;
  }

  getNewUrl = () => {
    return `/${this.props.baseUrl}/new`;
  }

  getStorageKey = (props: SessionLayoutProps<SessionT>) => {
    return `${props.baseUrl}_last_active`;
  }

  pushSession = (id: API.IdType) => {
    History.push(this.getSessionUrl(id));
  }

  replaceSession = (id: API.IdType) => {
    History.replace(this.getSessionUrl(id));
  }

  pushNew = () => {
    History.push(this.getNewUrl());
  }

  hasEditAccess = () => {
    return LoginStore.hasAccess(this.props.editAccess);
  }

  // LIFECYCLE/REACT
  UNSAFE_componentWillReceiveProps(nextProps: SessionLayoutProps<SessionT>) {
    if (nextProps.location.pathname === this.getNewUrl()) {
      // Don't redirect to it if the "new session" layout is open
      if (this.state.activeItem) {
        this.setState({ activeItem: null });
      }
      return;
    }

    if (this.checkActiveItem(nextProps)) {
      // We got an item
      return;
    }

    // The old tab was closed or we didn't have any session before


    let newItemPos = 0;
    const oldItem = findItem(this.props.items, this.props.activeId);
    if (oldItem) {
      // Find the old position and use the item in that position (if possible)
      newItemPos = this.props.items.indexOf(oldItem);
      if (newItemPos === this.props.items.length - 1) {
        // The last item was removed
        newItemPos = newItemPos - 1;
      }
    }

    this.replaceSession(nextProps.items[newItemPos].id);
  }

  // Common logic for selecting the item to display (after mounting or session updates)
  // Returns true active item selection was handled
  // Returns false if the active item couldn't be selected but there are valid items to choose from by the caller
  checkActiveItem = (props: SessionLayoutProps<SessionT>) => {
    // Did we just create this session?
    const routerLocation = props.location;
    const pending = routerLocation.state && routerLocation.state.pending;

    // Update the active item
    const activeItem = findItem(props.items, props.activeId);
    if (activeItem) {
      if (pending) {
        // Disable pending state
        History.replace({
          //path: routerLocation.pathname,
          state: {
            pending: false,
          }
        });

        return true;
      }

      this.setState({ activeItem: activeItem });
      saveLocalProperty(this.getStorageKey(props), props.activeId);
      return true;
    } else if (pending) {
      // We'll just display a loading indicator in 'render', no item needed
      return true;
    } else if (/*routerLocation.action === 'POP' ||*/ props.items.length === 0) {
      // Browsing from history and item removed (or all items removed)... go to "new session" page
      History.replace(this.getNewUrl());
      this.setState({ activeItem: null });
      return true;
    }

    return false;
  }

  onKeyDown = (event: React.KeyboardEvent) => {
    const { keyCode, altKey } = event;

    if (altKey && (keyCode === 38 || keyCode === 40)) {
      // Arrow up/down
      event.preventDefault();

      const { items, activeId } = this.props;
      const item = findItem(items, activeId);
      if (!item) {
        return;
      }

      const currentIndex = items.indexOf(item);
      if (currentIndex === -1) {
        return;
      }

      const newSession = items[keyCode === 38 ? currentIndex - 1 : currentIndex + 1];
      if (newSession) {
        this.pushSession(newSession.id);
      }
    } else if (altKey && keyCode === 45) {
      // Insert
      event.preventDefault();

      History.replace(this.getNewUrl());
    } else if (altKey && keyCode === 46) {
      // Delete
      event.preventDefault();

      const { items, activeId, actions } = this.props;
      const item = findItem(items, activeId);
      if (!!item) {
        actions.removeSession(item);
      }
    }
  }

  componentDidMount() {
    // Opening an item directly? Or no items?
    if (this.checkActiveItem(this.props)) {
      return;
    }

    // See if we have something stored
    let lastId = loadLocalProperty<API.IdType>(this.getStorageKey(this.props));
    if (lastId && findItem(this.props.items, lastId)) {
      // Previous session exists
      this.replaceSession(lastId);
    } else if (this.props.items.length > 0) {
      // Load the first session
      this.replaceSession(this.props.items[0].id);
    }
  }

  // COMPONENT GETTERS
  getItemStatus = (sessionItem: SessionT) => {
    const { itemStatusGetter, itemHeaderIconGetter } = this.props;
    if (itemStatusGetter) {
      return <div className={ 'ui session-status empty circular left mini label ' + itemStatusGetter(sessionItem) }/>;
    }

    return <Icon icon={ itemHeaderIconGetter(sessionItem) }/>;
  }

  getSessionMenuItem = (sessionItem: SessionT) => {
    return (
      <SessionMenuItem 
        key={ sessionItem.id } 
        url={ this.getSessionUrl(sessionItem.id) }
        name={ this.props.itemNameGetter(sessionItem) }
        unreadInfoStore={ this.props.unreadInfoStore }
        status={ this.getItemStatus(sessionItem) }
        sessionItem={ sessionItem }
        pushSession={ this.pushSession }
      />
    );
  }

  getItemHeaderTitle = () => {
    const { actions, actionIds, itemNameGetter, itemHeaderTitleGetter } = this.props;

    const { activeItem } = this.state;
    if (!activeItem) {
      return <div>{ this.props.newCaption }</div>;
    }

    let ids;
    if (actionIds) {
      ids = [ ...actionIds, 'divider', 'removeSession' ];
    }

    const actionMenu = (
      <ActionMenu 
        caption={ itemNameGetter(activeItem) }
        actions={ actions }
        itemData={ activeItem }
        ids={ ids }
      />
    );

    // Use the header getter only if there is a getter that returns a valid value
    if (itemHeaderTitleGetter) {
      const header = itemHeaderTitleGetter(activeItem, this.props.location, actionMenu);
      if (header) {
        return header;
      }
    }

    return actionMenu;
  }

  getItemHeaderDescription = () => {
    const { activeItem } = this.state;
    const { itemHeaderDescriptionGetter, newDescription } = this.props;
    if (!activeItem) {
      return newDescription;
    }

    return itemHeaderDescriptionGetter(activeItem);
  }

  getItemHeaderIcon = () => {
    const { activeItem } = this.state;
    const { itemHeaderIconGetter, newIcon } = this.props;
    return <Icon icon={ activeItem ? itemHeaderIconGetter(activeItem) : newIcon }/>;
  }

  getNewButton = () => {
    if (!this.hasEditAccess() || !this.props.newCaption) {
      return null;
    }

    return (
      <SessionNewButton 
        key="new-button" 
        title={ this.props.newCaption } 
        url={ this.getNewUrl() } 
        pushNew={ this.pushNew }
      />
    );
  }

  handleCloseAll = () => {
    const { actions, items } = this.props;
    items.forEach(session => actions.removeSession(session));
  }

  getListActionMenu = () => {
    const { items } = this.props;
    if (!this.hasEditAccess() || items.length === 0) {
      return null;
    }

    return (
      <MenuItemLink 
        key="close"
        onClick={ this.handleCloseAll }
        icon={ IconConstants.REMOVE }
      >
        Close all
      </MenuItemLink>
    );
  }

  render() {
    const { 
      disableSideMenu, /*width,*/ items, unreadInfoStore, location,
      actions, newLayout, sessionItemLayout: SessionItemLayout, activeId 
    } = this.props;
    
    if (!this.hasEditAccess() && items.length === 0) {
      // Nothing to show
      return (
        <Message 
          title="No items to show" 
          description="You aren't allowed to open new sessions"
        />
      );
    }

    const { activeItem } = this.state;
    const useTopMenu = disableSideMenu || useMobileLayout() /*|| width < 700*/;

    const Component = useTopMenu ? TopMenuLayout : SideMenuLayout;
    return (
      <Component 
        itemHeaderTitle={ this.getItemHeaderTitle() }
        itemHeaderDescription={ this.getItemHeaderDescription() }
        itemHeaderIcon={ this.getItemHeaderIcon() }

        activeItem={ activeItem }
        unreadInfoStore={ unreadInfoStore }
        closeAction={ actions.removeSession }
        newButton={ this.getNewButton() }
        sessionMenuItems={ items.map(this.getSessionMenuItem) }
        listActionMenuGetter={ this.getListActionMenu }
        onKeyDown={ this.onKeyDown }
      >
        <Route
          path={ this.getSessionUrl(':id') }
          render={ props => {
            if (!activeItem) {
              const { state } = this.props.location;
              if (!!state && state.pending) {
                // The session was just created
                return <Loader text="Waiting for server response"/>;
              } else if (activeId || items.length !== 0) {
                // Redirecting to a new page
                return <Loader text="Loading session"/>;
              }

              console.error('SessionLayout route: active session missing');
              return;
            }

            // We have a session
            return (
              <SessionItemLayout
                session={ activeItem }
                actions={ actions }
                location={ location }
              />
            );
          } }
        />
        <Route
          path={ this.getNewUrl() }
          component={ newLayout }
        />
      </Component>
    );
  }
}

export default SessionLayout;
