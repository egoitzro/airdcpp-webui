import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';

//@ts-ignore
import Reflux from 'reflux';
import { default as NotificationSystem, Notification as ReactNotification, System } from 'react-notification-system';
import { RateLimiter } from 'limiter';

import PrivateChatConstants from 'constants/PrivateChatConstants';
import ViewFileConstants from 'constants/ViewFileConstants';
import { default as QueueConstants } from 'constants/QueueConstants';
import { default as EventConstants } from 'constants/EventConstants';

import NotificationStore from 'stores/NotificationStore';
import NotificationActions from 'actions/NotificationActions';

import History from 'utils/History';

import LocalSettingStore from 'stores/LocalSettingStore';
import { LocalSettings } from 'constants/SettingConstants';

import PrivateChatSessionStore from 'stores/PrivateChatSessionStore';

import { Location } from 'history';

import * as API from 'types/api';

import Severity = API.SeverityEnum;
import { 
  SocketSubscriptionDecorator, SocketSubscriptionDecoratorChildProps
} from 'decorators/SocketSubscriptionDecorator';

import Logo from 'images/AirDCPlusPlus.png';


type NotificationLevel = 'error' | 'warning' | 'info' | 'success';

const getSeverityStr = (severity: Severity) => {
  switch (severity) {
    case Severity.NOTIFY: return 'Information';
    case Severity.INFO: return 'INFO';
    case Severity.ERROR: return 'ERROR';
    case Severity.WARNING: return 'WARNING';
    default: return '';
  }
};

interface AirNotification extends Omit<ReactNotification, 'body' | 'title'> {
  title: string;
  message?: string;
}

interface NotificationsProps {
  location: Location;
}

class Notifications extends React.Component<NotificationsProps & SocketSubscriptionDecoratorChildProps> {
  notifications: System | null;
  limiter = new RateLimiter(3, 3000, true);
  unsubscribe: () => void;

  static propTypes = {
    location: PropTypes.object.isRequired,
  };

  addNotification = (level: NotificationLevel, notification: AirNotification) => {
    (this.limiter as RateLimiter).removeTokens(1, (err, remainingTokens) => {
      // Don't spam too many notifications as that would freeze the UI
      // Always let the errors through as there shouldn't be too many of them
      if (remainingTokens < 0 && level !== 'error') {
        console.log('Notification ignored (rate limit reached)', notification);
        return;
      }

      if ('Notification' in window && Notification.permission === 'granted' && !document.hasFocus()) {
        this.showNativeNotification(level, notification);
        return;
      }
      
      // Embedded notification

      // Rate limiter uses timeouts internally so the ref may not exist anymore...
      if (!this.notifications) {
        return;
      }

      this.notifications.addNotification({
        ...notification,
        level,
        position: 'tl',
        autoDismiss: 5,
      });
    });
  }

  shouldComponentUpdate() {
    return false;
  }

  showNativeNotification(level: NotificationLevel, notificationInfo: AirNotification) {
    const options = {
      body: notificationInfo.message,
      icon: Logo,
      tag: notificationInfo.uid ? String(notificationInfo.uid) : undefined,
    };

    const n = new Notification(notificationInfo.title, options);
    n.onclick = () => {
      window.focus();
      if (!!notificationInfo.action && !!notificationInfo.action.callback) {
        notificationInfo.action.callback();
      }
    };

    setTimeout(n.close.bind(n), 5000);
  }

  componentDidMount() {
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    this.onSocketConnected();
    this.unsubscribe = NotificationStore.listen(this.addNotification);
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  render() {
    return ReactDOM.createPortal(
      (
        <NotificationSystem 
          ref={ (c: any) => this.notifications = c }
        />
      ),
      document.getElementById('notifications-node')!
    );
  }

  onSocketConnected() {
    const { addSocketListener } = this.props;

    // tslint:disable-next-line:max-line-length
    addSocketListener(PrivateChatConstants.MODULE_URL, PrivateChatConstants.MESSAGE, this.onPrivateMessage, undefined, API.AccessEnum.PRIVATE_CHAT_VIEW);

    // tslint:disable-next-line:max-line-length
    addSocketListener(QueueConstants.MODULE_URL, QueueConstants.BUNDLE_ADDED, this.onBundleStatus, undefined, API.AccessEnum.QUEUE_VIEW);
    // tslint:disable-next-line:max-line-length
    addSocketListener(QueueConstants.MODULE_URL, QueueConstants.BUNDLE_STATUS, this.onBundleStatus, undefined, API.AccessEnum.QUEUE_VIEW);

    // tslint:disable-next-line:max-line-length
    addSocketListener(EventConstants.MODULE_URL, EventConstants.MESSAGE, this.onLogMessage, undefined, API.AccessEnum.EVENTS_VIEW);
    // tslint:disable-next-line:max-line-length
    addSocketListener(ViewFileConstants.MODULE_URL, ViewFileConstants.FILE_DOWNLOADED, this.onViewFileDownloaded, undefined, API.AccessEnum.VIEW_FILE_VIEW);
  }

  onLogMessage(message: API.StatusMessage) {
    const { text, id, severity } = message;

    const notification: AirNotification = {
      title: getSeverityStr(severity),
      message: text,
      uid: id,
      action: severity === Severity.NOTIFY ? undefined : {
        label: 'View events',
        callback: () => { 
          History.push('/events'); 
        }
      }
    };

    if (severity === Severity.NOTIFY) {
      NotificationActions.info(notification);
    } else if (severity === Severity.INFO && LocalSettingStore.getValue(LocalSettings.NOTIFY_EVENTS_INFO)) {
      NotificationActions.info(notification);
    } else if (severity === Severity.WARNING && LocalSettingStore.getValue(LocalSettings.NOTIFY_EVENTS_WARNING)) {
      NotificationActions.warning(notification);
    } else if (severity === Severity.ERROR && LocalSettingStore.getValue(LocalSettings.NOTIFY_EVENTS_ERROR)) {
      NotificationActions.error(notification);
    }
  }

  onViewFileDownloaded(file: API.ViewFile) {
    if (!file.content_ready) {
      return;
    }

    NotificationActions.info({
      title: file.name,
      message: 'File has finished downloading',
      uid: file.id,
      action: {
        label: 'View file',
        callback: () => {
          History.push(`/files/session/${file.id}`);
        }
      }
    } as AirNotification);
  }

  onPrivateMessage(message: API.ChatMessage) {
    const cid = message.reply_to!.cid;
    if (message.is_read || (PrivateChatSessionStore.getActiveSessionId() === cid && document.hasFocus())) {
      return;
    }

    if (message.reply_to!.flags.indexOf('bot') > -1) {
      if (!LocalSettingStore.getValue(LocalSettings.NOTIFY_PM_BOT)) {
        return;
      }
    } else if (!LocalSettingStore.getValue(LocalSettings.NOTIFY_PM_USER)) {
      return;
    }

    NotificationActions.info({
      title: message.from.nick,
      message: message.text,
      uid: cid,
      action: {
        label: 'View message',
        callback: () => { 
          History.push(`/messages/session/${cid}`); 
        }
      }
    } as AirNotification);
  }

  onBundleStatus(bundle: API.QueueBundle) {
    if (!LocalSettingStore.getValue(LocalSettings.NOTIFY_BUNDLE_STATUS)) {
      return;
    }

    let text;
    let level;
    switch (bundle.status.id) {
      case API.QueueBundleStatusEnum.QUEUED: {
        text = 'Bundle was added in queue';
        level = 'info';
        break;
      }
      case API.QueueBundleStatusEnum.DOWNLOAD_ERROR: {
        text = 'Download error: ' + bundle.status.str;
        level = 'error';
        break;
      }
      case API.QueueBundleStatusEnum.COMPLETION_VALIDATION_RUNNING: {
        text = 'Validating downloaded bundle';
        level = 'info';
        break;
      }
      case API.QueueBundleStatusEnum.COMPLETION_VALIDATION_ERROR: {
        const { hook_name, str } = bundle.status.hook_error;
        text = `Bundle content validation failed: ${str} (${hook_name})`;
        level = 'error';
        break;
      }
      case API.QueueBundleStatusEnum.COMPLETED: {
        text = 'Bundle was completed successfully';
        level = 'info';
        break;
      }
      case API.QueueBundleStatusEnum.SHARED: {
        text = 'Bundle was added in share';
        level = 'info';
        break;
      }
      default:
    }

    if (level) {
      NotificationActions.info({
        title: bundle.name,
        message: text,
        uid: bundle.id,
        action: {
          label: 'View queue',
          callback: () => { 
            History.push('/queue'); 
          }
        }
      } as AirNotification);
    }
  }
}

export default SocketSubscriptionDecorator(Notifications);
