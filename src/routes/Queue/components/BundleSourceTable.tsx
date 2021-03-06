import React from 'react';

import DataProviderDecorator, { DataProviderDecoratorChildProps } from 'decorators/DataProviderDecorator';

import QueueBundleActions from 'actions/QueueBundleActions';
import QueueConstants from 'constants/QueueConstants';

import IconConstants from 'constants/IconConstants';
import Message from 'components/semantic/Message';

import { formatSize, formatSpeed } from 'utils/ValueFormat';

import { ActionMenu, UserMenu } from 'components/menu';
import { UserFileActions } from 'actions/UserActions';

import * as API from 'types/api';


interface SourceProps {
  bundle: API.QueueBundle;
  source: API.QueueBundleSource;
}

const Source: React.FC<SourceProps> = ({ source, bundle }) => (
  <tr>
    <td className="user dropdown">
      <UserMenu 
        userIcon={ true }
        user={ source.user }
        ids={ UserFileActions }
        contextElement=".source.modal"
      >
        <ActionMenu 
          actions={ QueueBundleActions } 
          ids={ [ 'removeBundleSource' ]} 
          itemData={ {
            source,
            bundle,
          } }
        />
      </UserMenu>
    </td>
    <td className="hubs">
      { source.user.hub_names }
    </td>
    <td className="speed">
      { source.last_speed > 0 && formatSpeed(source.last_speed) }
    </td>
    <td className="files">
      { source.files }
    </td>
    <td className="size">
      { formatSize(source.size) }
    </td>
  </tr>
);

const userSort = (a: API.QueueBundleSource, b: API.QueueBundleSource) => a.user.nicks.localeCompare(b.user.nicks);


interface BundleSourceTableProps {
  bundle?: API.QueueBundle; // REQUIRED, CLONED
}

interface BundleSourceTableDataProps extends DataProviderDecoratorChildProps {
  sources: API.QueueBundleSource[];
}

const BundleSourceTable: React.FC<BundleSourceTableProps & BundleSourceTableDataProps> = (
  { sources, bundle, dataError }
) => {
  if (dataError) {
    return (
      <Message 
        title="Failed to load source listing"
        icon={ IconConstants.ERROR }
        description={ dataError.message }
      />
    );
  }

  return (
    <div className="sources">
      <h2>Sources</h2>
      <table className="ui striped table">
        <thead>
          <tr>
            <th>User</th>
            <th>Hubs</th>
            <th>Last known speed</th>
            <th>Files</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody>
          { sources.sort(userSort).map(source => (
            <Source 
              key={ source.user.cid }
              source={ source }
              bundle={ bundle! }
            />
          )) }
        </tbody>
      </table>
    </div>
  );
};

export default DataProviderDecorator<BundleSourceTableProps, BundleSourceTableDataProps>(BundleSourceTable, {
  urls: {
    sources: ({ bundle }, socket) => socket.get(`${QueueConstants.BUNDLES_URL}/${bundle!.id}/sources`),
  },
  onSocketConnected: (addSocketListener, { refetchData, props }) => {
    addSocketListener(QueueConstants.MODULE_URL, QueueConstants.BUNDLE_SOURCES, (data: API.QueueBundle) => {
      // Avoid flickering when there are many bundles running
      if (data.id === props.bundle!.id) {
        refetchData();
      }
    });
  },
  renderOnError: true,
});