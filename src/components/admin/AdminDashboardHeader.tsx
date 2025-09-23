import React from 'react';

interface AdminDashboardHeaderProps {
  title: string;
  description: string;
  adminEmail?: string; // New optional prop
}

const AdminDashboardHeader: React.FC<AdminDashboardHeaderProps> = ({ title, description, adminEmail }) => {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-[#1C0357]">{title}</h1>
      <p className="text-lg text-[#1C0357]/90">{description}</p>
      {adminEmail && (
        <p className="text-sm text-gray-600 mt-2 flex items-center">
          Logged in as: <span className="font-medium ml-1 text-[#1C0357]">{adminEmail}</span>
        </p>
      )}
    </div>
  );
};

export default AdminDashboardHeader;