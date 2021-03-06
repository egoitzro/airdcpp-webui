'use strict';
import React from 'react';

import RedrawDecorator from 'decorators/RedrawDecorator';
import { formatRelativeTime } from 'utils/ValueFormat';
import { FooterItem, SessionFooter } from 'routes/Sidebar/components/SessionFooter';
import { useMobileLayout } from 'utils/BrowserUtils';

import * as API from 'types/api';


interface FileFooterProps {
  item: API.ViewFile;
}

const FileFooter: React.FC<FileFooterProps> = ({ item }) => {
  if (useMobileLayout()) {
    return null;
  }

  const downloadState = item.download_state;
  return (
    <SessionFooter>
      <FooterItem 
        label={ downloadState ? 'Downloaded' : 'Opened' } 
        text={ formatRelativeTime(downloadState ? downloadState.time_finished : item.time_opened) }
      />
    </SessionFooter>
  );
};

export default RedrawDecorator(FileFooter);