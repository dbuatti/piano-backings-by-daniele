import React from 'react';
import HolidayModeSettings from './HolidayModeSettings';
import NotificationRecipientsManager from '../NotificationRecipientsManager';
import DropboxMonitor from '../../pages/DropboxMonitor';
import IssueReportsTabContent from './IssueReportsTabContent';
import ServiceClosureSettings from './ServiceClosureSettings'; // Import new component

const SystemAndConfigTabContent: React.FC = () => {
  return (
    <div className="space-y-6">
      <ServiceClosureSettings />
      <HolidayModeSettings />
      <NotificationRecipientsManager />
      <DropboxMonitor />
      <IssueReportsTabContent />
    </div>
  );
};

export default SystemAndConfigTabContent;