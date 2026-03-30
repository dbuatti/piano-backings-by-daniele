import React from 'react';
import HolidayModeSettings from './HolidayModeSettings';
import ServiceClosureSettings from './ServiceClosureSettings';
import NotificationRecipientsManager from '../NotificationRecipientsManager';
import DataImporter from '../../pages/DataImporter';

const OperationsTabContent: React.FC = () => {
  return (
    <div className="w-full space-y-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ServiceClosureSettings />
        <HolidayModeSettings />
      </div>
      <NotificationRecipientsManager />
      <DataImporter />
    </div>
  );
};

export default OperationsTabContent;