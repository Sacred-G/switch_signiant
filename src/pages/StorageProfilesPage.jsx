import React, { useState, useEffect } from 'react';
import { Plus, Database } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Loader2 } from 'lucide-react';
import { getStorageProfiles, createStorageProfile } from '../services/managementService';

const StorageProfilesPage = () => {
  const [storageProfiles, setStorageProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await getStorageProfiles();
      setStorageProfiles(data);
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
        <h1 className="text-2xl font-bold">Storage Profiles</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Profile
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-red-500 dark:text-red-400">
          {error}
        </div>
      ) : storageProfiles.length === 0 ? (
        <div className="text-center text-gray-500">No storage profiles found</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {storageProfiles.map((profile) => (
            <div
              key={profile.storageProfileId}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{profile.name}</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>Type: {profile.storageProfileType}</p>
                    {profile.config && (
                      <>
                        <p>Bucket: {profile.config.bucket}</p>
                        <p>Region: {profile.config.region}</p>
                        <p>Path: {profile.config.path}</p>
                      </>
                    )}
                    <p>URL: {profile.url}</p>
                    <p>Created: {new Date(profile.createdOn).toLocaleString()}</p>
                    <p>Created By: {profile.createdBy}</p>
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

export default StorageProfilesPage;
