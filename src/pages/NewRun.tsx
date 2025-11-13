import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pipelineApi } from '../services/pipelineApi';

export function NewRun() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    file: null as File | null,
  });
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file || !formData.patientId || !formData.patientName) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const run = await pipelineApi.createRun({
        patientId: formData.patientId,
        patientName: formData.patientName,
        file: formData.file,
      });
      navigate(`/runs/${run.id}`);
    } catch (error) {
      console.error('Failed to create run:', error);
      alert('Failed to create pipeline run');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (file: File | null) => {
    setFormData({ ...formData, file });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">New Pipeline Run</h1>
        <p className="mt-2 text-sm text-gray-700">
          Upload a CCD file to start processing through the healthcare data pipeline
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="patientId"
                className="block text-sm font-medium text-gray-700"
              >
                Patient ID
              </label>
              <input
                type="text"
                id="patientId"
                required
                value={formData.patientId}
                onChange={(e) =>
                  setFormData({ ...formData, patientId: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="PT-001"
              />
            </div>

            <div>
              <label
                htmlFor="patientName"
                className="block text-sm font-medium text-gray-700"
              >
                Patient Name
              </label>
              <input
                type="text"
                id="patientName"
                required
                value={formData.patientName}
                onChange={(e) =>
                  setFormData({ ...formData, patientName: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CCD File
              </label>
              <div
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                  dragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 bg-white'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {formData.file ? (
                    <div className="text-sm text-gray-600">
                      <p className="font-medium text-primary-600">
                        {formData.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(formData.file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".xml,.ccd"
                          onChange={(e) =>
                            handleFileChange(
                              e.target.files ? e.target.files[0] : null
                            )
                          }
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    CCD XML files only
                  </p>
                </div>
              </div>
              {formData.file && (
                <button
                  type="button"
                  onClick={() => handleFileChange(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-500"
                >
                  Remove file
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-x-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.file}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Start Pipeline'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
