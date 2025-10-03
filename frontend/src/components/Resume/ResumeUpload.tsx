import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface ResumeUploadProps {
  onFileSelect: (file: File) => void;
}

export const ResumeUpload: React.FC<ResumeUploadProps> = ({ onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFile = (file: File) => {
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

    onFileSelect(file);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
          Upload Your Resume
        </h2>
        <p className="text-base sm:text-lg text-gray-600">
          Get AI-powered job recommendations and skill gap analysis
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-4 sm:p-8">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 sm:p-12 text-center hover:border-primary-400 transition-colors cursor-pointer"
        >
          <div className="space-y-3 sm:space-y-4">
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 text-gray-400">
              <Upload className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-medium text-gray-900">
                Drop your resume here, or <span className="text-primary-600">browse</span>
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Support for PDF and DOCX files up to 10MB
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};