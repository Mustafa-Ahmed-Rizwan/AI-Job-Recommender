import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { apiService } from '../../utils/api';

interface JobSearchProps {
  onSearch: (query: string, location: string, numJobs: number) => void;
}

export const JobSearch: React.FC<JobSearchProps> = ({ onSearch }) => {
  const [jobQuery, setJobQuery] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [city, setCity] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [numJobs, setNumJobs] = useState(20);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    loadCities(country);
  }, [country]);

  const loadCities = async (selectedCountry: string) => {
    setLoadingCities(true);
    try {
      const result = await apiService.getCities(selectedCountry);
      setCities(result.cities);
      setCity('');
    } catch (error) {
      console.error('Error loading cities:', error);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobQuery.trim()) {
      alert('Please enter a job title or keywords.');
      return;
    }
    const location = city ? `${city}, ${country}` : country;
    onSearch(jobQuery, location, numJobs);
  };

  return (
    <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6 mb-6 sm:mb-8">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label htmlFor="job-query" className="block text-sm font-medium text-gray-700 mb-2">
              Job Title / Keywords
            </label>
            <input
              type="text"
              id="job-query"
              value={jobQuery}
              onChange={(e) => setJobQuery(e.target.value)}
              placeholder="e.g., Software Engineer, Data Scientist, Product Manager"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <div className="space-y-2">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
              >
                <option value="Pakistan">Pakistan</option>
                <option value="India">India</option>
                <option value="USA">USA</option>
              </select>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loadingCities}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base disabled:bg-gray-100"
              >
                <option value="">Select City (Optional)</option>
                {cities.map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <label htmlFor="num-jobs" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Number of jobs:
            </label>
            <select
              id="num-jobs"
              value={numJobs}
              onChange={(e) => setNumJobs(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="50">50</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            <Search className="w-4 h-4" />
            <span>Search Jobs</span>
          </button>
        </div>
      </form>
    </div>
  );
};