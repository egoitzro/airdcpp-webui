//import PropTypes from 'prop-types';
import React from 'react';

import DataProviderDecorator, { DataProviderDecoratorChildProps } from 'decorators/DataProviderDecorator';
import SocketService from 'services/SocketService';

import { FilterMethod } from 'constants/TableConstants';


interface FilterType {
  id: number;
}

export interface TableFilterDecoratorProps {
  viewUrl: string;
}

export interface TableFilterDecoratorDataProps {
  filter: FilterType
}

export interface TableFilterDecoratorChildProps {
  onFilterUpdated: (value: string | number, method?: FilterMethod) => void;
}

export default function <PropsT>(Component: React.ComponentType<PropsT & TableFilterDecoratorChildProps>, propertyName = 'any') {
  class TableFilterDecorator extends React.PureComponent<PropsT & TableFilterDecoratorProps & DataProviderDecoratorChildProps & TableFilterDecoratorDataProps> {
    //static propTypes = {
    //  viewUrl: PropTypes.string.isRequired,
    //  filter: PropTypes.object.isRequired,
    //};

    onFilterUpdated = (pattern: string, method: FilterMethod = FilterMethod.PARTIAL) => {
      const data = {
        pattern,
        method,
        property: propertyName,
      };

      const { viewUrl, filter } = this.props;
      SocketService.put(viewUrl + '/filter/' + filter.id, data)
        .catch((error: APISocket.Error) => console.error('Failed to add table filter'));
    };

    render() {
      return (
        <Component 
          { ...this.props } 
          onFilterUpdated={ this.onFilterUpdated }
        />
      );
    }
  }

  return DataProviderDecorator<PropsT & TableFilterDecoratorProps, TableFilterDecoratorDataProps>(TableFilterDecorator, {
    urls: {
      filter: ({ viewUrl }, socket) => socket.post(viewUrl + '/filter'),
    },
    loaderText: null,
  });
}