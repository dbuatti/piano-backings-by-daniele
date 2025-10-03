import React from 'react';
import DataImporter from '../../pages/DataImporter';
import RequestOwnershipTabContent from './RequestOwnershipTabContent';

const UsersAndDataTabContent: React.FC = () => {
  return (
    <div className="space-y-6">
      <RequestOwnershipTabContent />
      <DataImporter />
    </div>
  );
};

export default UsersAndDataTabContent;