import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import invariant from 'invariant';

import SocketService from 'services/SocketService';
import SocketSubscriptionMixin from 'mixins/SocketSubscriptionMixin';

import Loader from 'components/semantic/Loader';
import NotificationActions from 'actions/NotificationActions';


export interface DataProviderDecoratorProps<PropsT extends object> {
  //urls: ((props: PropsT) => object) | object;
  urls: {
    [key: string]: ((props: PropsT, socket: any) => Promise<any>) | string
  }
  onSocketConnected?: (handler: any, data: {
    refetchData: () => void;
    mergeData: (data: Partial<PropsT>) => void;
    props: PropsT;
  }) => void;
  dataConverters?: {
    [key: string]: (data: any, props: PropsT) => any
  };
  loaderText?: React.ReactNode;
  renderOnError?: boolean;
}

export interface DataProviderDecoratorChildProps {
  refetchData: (keys: string[]) => void;
  dataError: any;
}

interface State<DataT> {
  data: DataT | null;
  error: string | null;
}

// A decorator that will provide a set of data fetched from the API as props
export default function <PropsT extends object, DataT extends object>(
  Component: React.ComponentType<PropsT & DataProviderDecoratorChildProps & DataT>, 
  settings: DataProviderDecoratorProps<PropsT>
) {
  const DataProviderDecorator = createReactClass<PropsT, State<DataT>>({
    displayName: 'DataProviderDecorator',
    mixins: [ SocketSubscriptionMixin() ],

    propTypes: {

      /**
			 * Key-value map of prop names and API urls
			 * Value may also be a function which receives the props and SocketService as argument and performs the data fetch
			 */
      urls: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.func,
      ]), // REQUIRED

      /**
			 * Called when the socket is connected
			 * 
			 * onSocketConnected(addSocketListener, {
			 *   refetchData(),
			 *   mergeData(newData),
			 *   props,
			 * })
			 */
      onSocketConnected: PropTypes.func,

      /**
			 * Key-value map of prop names and functions 
			 * Converter functions receives the fetched data as parameter
			 */
      dataConverters: PropTypes.object,

      /**
			 * Text to show while loading data (use null to disable spinner)
			 */
      loaderText: PropTypes.node,

      /**
			 * Should the decorated components handle data fetching failures?
			 */
      renderOnError: PropTypes.bool,
    },

    /*getDefaultProps(): DataProviderDecoratorProps {
      return {
        urls: settings.urls,
        onSocketConnected: settings.onSocketConnected,
        loaderText: settings.loaderText || 'Loading data...',
        dataConverters: settings.dataConverters,
        renderOnError: settings.renderOnError,
      };
    },*/

    getInitialState() {
      return {
        data: null,
        error: null,
      };
    },

    componentDidMount() {
      this.mounted = true;
      this.fetchData();
    },

    componentWillUnmount() {
      this.mounted = false;
    },

    onSocketConnected(addSocketListener: () => void) {
      if (settings.onSocketConnected) {
        settings.onSocketConnected(addSocketListener, {
          refetchData: this.refetchData,
          mergeData: this.mergeData,
          props: this.props,
        });
      }
    },

    // Merge data object into existing data
    mergeData(data: any) {
      this.setState({
        data: Object.assign({}, this.state.data, data)
      });
    },

    refetchData(keys?: string[]) {
      invariant(!keys || (Array.isArray(keys) && keys.every(key => !!settings.urls[key])), 'Invalid keys supplied to refetchData');
      this.fetchData(keys);
    },

    fetchData(keys?: string[]) {
      const { urls } = settings;
      if (!keys) {
        keys = Object.keys(urls);
      }

      const promises = keys.map(key => {
        let url = urls[key];
        if (typeof url === 'function') {
          return url(this.props, SocketService);
        }

        return SocketService.get(url);
      });

      Promise.all(promises)
        .then(this.onDataFetched.bind(this, keys), this.onDataFetchFailed);
    },

    // Convert the data array to key-value props
    reduceData(keys: string[], reducedData: any, data: any, index: number) {
      const { dataConverters } = settings;
      const url = keys[index];
      reducedData[url] = dataConverters && dataConverters[url] ? dataConverters[url](data, this.props) : data;
      return reducedData;
    },

    onDataFetched(keys: string[], values: any) {
      if (!this.mounted) {
        return;
      }

      const data = values.reduce(this.reduceData.bind(this, keys), {});

      this.mergeData(data);
    },

    onDataFetchFailed(error: APISocket.Error | Response) {
      if (error instanceof Response) {
        // HTTP error
        error = {
          code: error.status,
          message: error.statusText,
        };
      } else {
        // API error
        NotificationActions.apiError('Failed to fetch data', error);
      }

      /*if (error.code && error.message) {
        // API error
        NotificationActions.apiError('Failed to fetch data', error);
      } else {

      }*/

      this.setState({
        error,
      });
    },

    render() {
			const { loaderText, renderOnError } = settings;
      const { data, error } = this.state as State<DataT>;

      if (!data && !error) {
        return !!loaderText && <Loader text={ loaderText }/>;
      }

      if (error && !renderOnError) {
        return null;
      }

      return (
        <Component
          refetchData={ this.refetchData }
          dataError={ error }
          { ...this.props }
          { ...data }
        />
      );
    },
  });

  return DataProviderDecorator;
}