import React from 'react';
import { X, CheckCircle, XCircle, Upload, Trash2 } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  onUpdateResume: () => void;
  onDeleteResume: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onUpdateResume,
  onDeleteResume,
}) => {
  if (!isOpen || !userProfile) return null;

  const lastUpdated = userProfile.last_updated
    ? new Date(userProfile.last_updated).toLocaleDateString()
    : 'Unknown';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Profile</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="text-sm text-gray-900 p-2 bg-gray-50 rounded-lg break-all">
              {userProfile.email || 'Not available'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resume Status</label>
            <div className="text-sm p-2 bg-gray-50 rounded-lg">
              {userProfile.has_resume ? (
                <>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 font-medium">Resume uploaded</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Last updated: {lastUpdated}</div>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-700 font-medium">No resume uploaded</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {userProfile.has_resume ? (
              <>
                <button
                  onClick={onUpdateResume}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Update Resume</span>
                </button>
                <button
                  onClick={onDeleteResume}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Resume</span>
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-600 text-center">
                Upload a resume to get started with job recommendations
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};