import React from 'react';
import DropboxMonitor from '../../pages/DropboxMonitor';
import RequestOwnershipTabContent from './RequestOwnershipTabContent';
import DevelopmentAndTestingTabContent from './DevelopmentAndTestingTabContent';

const SystemTabContent: React.FC = () => {
  return (
    <div className="w-full space-y-8 py-6">
      <DropboxMonitor />
      <RequestOwnershipTabContent />
      <div className="border-t pt-8">
        <h3 className="text-xl font-bold text-[#1C0357] mb-4">Developer Tools & Testing</h3>
        <DevelopmentAndTestingTabContent />
      </div>
    </div>
  );
};

export default SystemTabContent;