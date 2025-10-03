import React, { useState, useRef } from 'react';
import { X, Upload, Loader } from 'lucide-react';

interface UpdateResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}

export const UpdateResumeModal: React.FC<UpdateResumeModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF or DOCX file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    setIsUploading(true);
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 30;
      });
    }, 200);

    try {
      await onUpload(file);
      setProgress(100);
      setTimeout(() => {
        onClose();
        setIsUploading(false);
        setProgress(0);
      }, 500);
    } catch (error) {
      alert('Error updating resume. Please try again.');
    } finally {
      clearInterval(interval);
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

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
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Update Resume</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {!isUploading ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center hover:border-primary-400 transition-colors cursor-pointer"
            >
              <div className="space-y-2">
                <div className="mx-auto w-6 h-6 sm:w-8 sm:h-8 text-gray-400">
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <p className="text-sm font-medium text-gray-700">Upload new resume</p>
                <p className="text-xs text-gray-500">PDF or DOCX files only</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Loader className="w-5 h-5 loading-spinner text-primary-600" />
              <div className="flex-1">
                <div className="text-sm text-gray-700">Updating resume...</div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};