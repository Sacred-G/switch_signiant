import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getAllRoutes, createRoute } from '../services/managementService';

const RoutesPage = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const data = await getAllRoutes();
      console.log('Route data:', data);
      setRoutes(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Routes</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Route
        </Button>
      </div>

      {loading ? (
        <div key="loading" className="text-center">Loading routes...</div>
      ) : error ? (
        <div key="error" className="text-red-500 text-center">{error}</div>
      ) : routes.length === 0 ? (
        <div key="empty" className="text-center text-gray-500">No routes found</div>
      ) : (
        <div key="grid" className="grid gap-4">
          {routes.map((route) => (
            <div
              key={route.routeId}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{route.type}</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p key={`${route.routeId}-source`}>Source: {route.endpoints[0]?.name || 'Unknown'}</p>
                    <p key={`${route.routeId}-destination`}>Destination: {route.endpoints[1]?.name || 'Unknown'}</p>
                    <p key={`${route.routeId}-created`}>Created: {new Date(route.createdOn).toLocaleString()}</p>
                    <p key={`${route.routeId}-createdBy`}>Created By: {route.createdBy}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoutesPage;
