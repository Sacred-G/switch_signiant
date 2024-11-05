import PropTypes from 'prop-types';
import { List, Home, Repeat } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const SidebarItem = ({ icon, text, to }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link to={to}>
      <div
        className={`flex items-center px-6 py-3 cursor-pointer ${
          isActive ? 'bg-gray-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <span className="mr-3">{icon}</span>
        <span className="text-sm font-medium">{text}</span>
      </div>
    </Link>
  );
};

SidebarItem.propTypes = {
  icon: PropTypes.node.isRequired,
  text: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
};

const DashboardLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <div className="text-xl font-bold">Dashboard</div>
        </div>
        <nav className="mt-6">
          <SidebarItem to="/" icon={<Repeat size={20} />} text="Transfers" />
          <SidebarItem to="/jobs" icon={<List size={20} />} text="Jobs" />
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};

DashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DashboardLayout;
