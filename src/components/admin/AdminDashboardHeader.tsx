import React from 'react';

interface AdminDashboardHeaderProps {
  title: string;
  description: string;
}

const AdminDashboardHeader: React.FC<AdminDashboardHeaderProps> = ({ title, description }) => {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-[#1C0357]">{title}</h1>
      <p className="text-lg text-[#1C0357]/90">{description}</p>
    </div>
  );
};

export default AdminDashboardHeader;