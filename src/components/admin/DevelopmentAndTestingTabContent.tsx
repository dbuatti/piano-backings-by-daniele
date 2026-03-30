import React from 'react';
import TestEmail from '../../pages/TestEmail';
import TestEmailNotification from '../../pages/TestEmailNotification';
import TestDropboxFunction from '../../pages/TestDropboxFunction';
import TestDropboxCredentials from '../../pages/TestDropboxCredentials';
import TestBackings from '../../pages/TestBackings';
import FormDebugger from './FormDebugger';

const DevelopmentAndTestingTabContent: React.FC = () => {
  return (
    <div className="space-y-6">
      <FormDebugger />
      <TestEmail />
      <TestEmailNotification />
      <TestDropboxFunction />
      <TestDropboxCredentials />
      <TestBackings />
    </div>
  );
};

export default DevelopmentAndTestingTabContent;