import React, { useState, useEffect } from 'react';
import { Network, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { 
  getAllEndpoints, 
  getEndpointDetails, 
  updateEndpoint,
  generateEndpointShareCode 
} from '../services/managementService';

const EndpointsPage = () => {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);

  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = async () => {
    try {
      setLoading(true);
      const data = await getAllEndpoints();
      setEndpoints(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (!status || !status.state) return 'text-gray-500';
    return status.state === 'OK' ? 'text-green-500' : 'text-red-500';
  };

  const handleGenerateShareCode = async (endpointId) => {
    try {
      const shareCode = await generateEndpointShareCode(endpointId);
      // Update the endpoint in the list with the new share code
      setEndpoints(endpoints.map(endpoint => 
        endpoint.id === endpointId 
          ? { ...endpoint, shareCode: shareCode.code }
          : endpoint
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleViewDetails = async (endpointId) => {
    try {
      const details = await getEndpointDetails(endpointId);
      setSelectedEndpoint(details);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Endpoints</h1>
        <Button onClick={loadEndpoints}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center">Loading endpoints...</div>
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : endpoints.length === 0 ? (
        <div className="text-center text-gray-500">No endpoints found</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{endpoint.name}</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>Status: <span className={`font-medium ${getStatusColor(endpoint.status)}`}>
                      {endpoint.status?.state || 'Unknown'}
                    </span></p>
                    <p>Type: {endpoint.type}</p>
                    {endpoint.version && <p>Version: {endpoint.version}</p>}
                    {endpoint.lastSeen && (
                      <p>Last Seen: {new Date(endpoint.lastSeen).toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
              {endpoint.shareCode && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Share Code</p>
                  <code className="text-sm text-indigo-600 dark:text-indigo-400">
                    {endpoint.shareCode}
                  </code>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedEndpoint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-xl font-bold mb-4">Endpoint Details</h2>
            <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-96">
              {JSON.stringify(selectedEndpoint, null, 2)}
            </pre>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setSelectedEndpoint(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EndpointsPage;
