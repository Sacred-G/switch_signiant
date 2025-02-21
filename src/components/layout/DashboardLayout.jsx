import PropTypes from 'prop-types';
import { 
  List, Home, Repeat, LogOut, Sun, Moon, Briefcase, Package, 
  BarChart, History, Search, Route, Database, Users, Network, 
  Settings
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SigniantAuth } from '../../services/auth';
import { useTheme } from '../ThemeProvider';

const SidebarItem = ({ icon, text, to, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  if (onClick) {
    return (
      <div
        onClick={onClick}
        className="flex items-center px-6 py-3 cursor-pointer text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <span className="mr-3">{icon}</span>
        <span className="text-sm font-medium">{text}</span>
      </div>
    );
  }

  return (
    <Link to={to}>
      <div
        className={`flex items-center px-6 py-3 cursor-pointer ${
          isActive 
            ? 'bg-gray-100 text-indigo-600 dark:bg-gray-800 dark:text-indigo-400' 
            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
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
  to: PropTypes.string,
  onClick: PropTypes.func,
};

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      // First perform the logout
      await SigniantAuth.logout();
      
      // Then navigate to login page
      // Wrap in setTimeout to ensure all cleanup is complete
      setTimeout(() => {
        navigate('/login');
      }, 0);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg dark:bg-gray-800">
        <div className="p-6 flex justify-between items-center">
          <div className="text-xl font-bold dark:text-white">Dashboard</div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon size={20} className="text-gray-600 dark:text-gray-300" />
            ) : (
              <Sun size={20} className="text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>
        <nav className="mt-6 flex flex-col justify-between h-[calc(100vh-100px)]">
          <div className="space-y-4">
            <div key="transfers-section">
              <div className="px-6 py-2 text-xs font-semibold text-gray-400 uppercase">
                Transfers
              </div>
              <SidebarItem key="transfers" to="/transfers" icon={<Repeat size={20} />} text="Create New Transfers" />
              <SidebarItem key="history" to="/transfers/history" icon={<History size={20} />} text="Transfer History" />
              <SidebarItem key="job-search" to="/job-search" icon={<Search size={20} />} text="Job Search" />
              <SidebarItem key="delivery-status" to="/delivery-status" icon={<Package size={20} />} text="Delivery Status" />
              <SidebarItem key="analytics" to="/analytics" icon={<BarChart size={20} />} text="Analytics" />
            </div>

            <div key="management-section">
              <div className="px-6 py-2 text-xs font-semibold text-gray-400 uppercase">
                Management
              </div>
              <SidebarItem key="routes" to="/routes" icon={<Route size={20} />} text="Routes" />
              <SidebarItem key="storage" to="/storage" icon={<Database size={20} />} text="Storage Profiles" />
              <SidebarItem key="users" to="/users" icon={<Users size={20} />} text="Users" />
              <SidebarItem key="endpoints" to="/endpoints" icon={<Network size={20} />} text="Endpoints" />
            </div>
          </div>
          <div className="mb-6">
            <SidebarItem 
              icon={<LogOut size={20} />} 
              text="Logout" 
              onClick={handleLogout}
            />
          </div>
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
