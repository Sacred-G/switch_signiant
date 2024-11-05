import React from 'react';

export const SidebarItem = ({ icon, text, active = false }) => (
  <div
    className={`flex items-center px-6 py-3 cursor-pointer ${
      active ? 'bg-gray-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
    }`}
  >
    <span className="mr-3">{icon}</span>
    <span className="text-sm font-medium">{text}</span>
  </div>
);