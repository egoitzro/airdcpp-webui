import React from 'react';
import createReactClass from 'create-react-class';
//@ts-ignore
import Reflux from 'reflux';
import invariant from 'invariant';
//@ts-ignore
import PureRenderMixin from 'react-addons-pure-render-mixin';

import Widget from 'routes/Home/components/Widget';
import WidgetDialog from 'routes/Home/components/WidgetDialog';

import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import WidgetStore from 'stores/WidgetStore';

import * as UI from 'types/ui';


import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import 'semantic-ui-css/components/card.min.css';

const ResponsiveReactGridLayout = WidthProvider(Responsive);


const WidgetLayout = createReactClass({
  displayName: 'WidgetLayout',
  mixins: [ PureRenderMixin, Reflux.connect(WidgetStore, 'layouts') ],

  getInitialState() {
    return {
      breakpoint: 'lg',
    };
  },

  // Convert a layout entry to a component
  mapWidget(layoutItem: Layout): React.ReactNode {
    const widgetInfo: UI.Widget = WidgetStore.getWidgetInfoById(layoutItem.i);
    invariant(widgetInfo, 'Widget info missing');
    if (!widgetInfo) {
      return null;
    }

    const settings = WidgetStore.getWidgetSettings(layoutItem.i, widgetInfo);
    return (
      <Widget
        key={ layoutItem.i }
        componentId={ layoutItem.i! }
        widgetInfo={ widgetInfo }
        settings={ settings }
        data-grid={ layoutItem }
      />
    );
  },

  onBreakpointChange(breakpoint: string, cols: number) {
    this.setState({
      breakpoint,
    });
  },

  render() {
    return (
      <>
        <ResponsiveReactGridLayout 
          className="ui cards layout"
          rowHeight={50} 
          width={1200}
          onLayoutChange={ WidgetStore.onLayoutChange }
          onBreakpointChange={ this.onBreakpointChange }

          breakpoints={ WidgetStore.breakpoints }
          cols={ WidgetStore.cols }

          draggableHandle=".react-grid-item .header-row .header"
          layouts={ this.state.layouts }
        >
          { this.state.layouts[this.state.breakpoint]
            .map(this.mapWidget)
            .filter((widget: any) => widget) }
        </ResponsiveReactGridLayout>
        <WidgetDialog/>
      </>
    );
  },
});

export default WidgetLayout;