import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import UserActions from 'actions/UserActions';
import FileUtils from 'utils/FileUtils';

import UserIcon from 'components/icon/UserIcon';
import { ActionMenuDecoratorChildProps, ActionMenuDecoratorProps } from 'decorators/menu/ActionMenuDecorator';


export interface UserMenuItemData {
  user: any;
  directory: any;
}

export interface UserMenuDecoratorProps extends ActionMenuDecoratorChildProps {
  user: any;
  directory: string;
  userIcon: string;
  text?: React.ReactNode;
  className?: string;
}

type UserMenuDecoratorChildProps = ActionMenuDecoratorProps;

export default function (Component: React.ComponentType<UserMenuDecoratorChildProps>) {
  class UserMenu extends React.PureComponent<UserMenuDecoratorProps> {
    static defaultProps = {
      directory: '/',
    };
  
    static propTypes = {
      /**
       * Filelist directory to use for browsing the list
       */
      directory: PropTypes.string,
  
      /**
       * Hinted user
       */
      user: PropTypes.shape({
        cid: PropTypes.string,
        hub_url: PropTypes.string
      }).isRequired,
  
      /**
       * No icon is added by default
       * Set the 'simple' to use a single color icon for all users
       */
      userIcon: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.string,
      ]),
  
      /**
       * Optional custom caption to use
       */
      text : PropTypes.node,
    };

    itemData: UserMenuItemData;

    constructor(props: UserMenuDecoratorProps) {
      super(props);

      this.itemData = {} as UserMenuItemData;
      Object.defineProperty(this.itemData, 'user', {
        get: () => {
          return this.props.user;
        }
      });
      Object.defineProperty(this.itemData, 'directory', {
        get: () => {
          return FileUtils.getFilePath(this.props.directory);
        }
      });
    }

    itemDataGetter = () => {
      return this.itemData;
    }

    render() {
      const { text, userIcon, user, className, ...other } = this.props;

      let nicks = text;
      if (!nicks) {
        nicks = user.nicks ? user.nicks : user.nick;
      }

      let caption = nicks;
      if (userIcon) {
        caption = (
          <div className={ classNames('icon-caption', userIcon) }>
            { userIcon === 'simple' ? <i className="blue user icon"/> : <UserIcon size="large" flags={ user.flags }/> }
            { nicks }
          </div>
        );
      }

      return (
        <Component 
          { ...other }
          className={ classNames('user-menu', className) }
          caption={ caption }
          actions={ UserActions } 
          itemData={ this.itemDataGetter }
        />
      );
    }
  };

  return UserMenu;
}