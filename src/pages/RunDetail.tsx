import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PipelineRun } from '../types/pipeline';
import { pipelineApi } from '../services/pipelineApi';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { StepCard } from '../components/StepCard';

export function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadRun = async () => {
      try {
        const data = await pipelineApi.getRun(id);
        setRun(data);
      } catch (error) {
        console.error('Failed to load run:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRun();

    const unsubscribe = pipelineApi.subscribeToRun(id, (updatedRun) => {
      setRun(updatedRun);
    });

    return () => unsubscribe();
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Run not found</h2>
        <p className="mt-2 text-gray-600">
          The pipeline run you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block text-primary-600 hover:text-primary-500"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {run.patientName}
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Patient ID: {run.patientId} • Run ID: {run.id}
            </p>
          </div>
          <StatusBadge status={run.status} size="lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              File Name
            </dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {run.fileName}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Created At
            </dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {formatDate(run.createdAt)}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Current Step
            </dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {run.currentStep} / {run.steps.length}
            </dd>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Overall Progress
        </h2>
        <ProgressBar current={run.currentStep} total={run.steps.length} />
      </div>

      {run.piqiScores && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            PIQI Domain Scores
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(run.piqiScores).map(([domain, score]) => (
              <div
                key={domain}
                className="border border-gray-200 rounded-lg p-4 text-center"
              >
                <div className="text-3xl font-bold text-primary-600">
                  {score}
                </div>
                <div className="text-sm text-gray-600 mt-1 capitalize">
                  {domain}
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        score >= 80
                          ? 'bg-green-500'
                          : score >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {run.enrichedData && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Enriched Data
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Body Mass Index (BMI)
              </h3>
              <div className="text-4xl font-bold text-primary-600">
                {run.enrichedData.bmi?.toFixed(1)}
              </div>
            </div>
            {run.enrichedData.riskScores && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Risk Scores
                </h3>
                <div className="space-y-2">
                  {Object.entries(run.enrichedData.riskScores).map(
                    ([risk, score]) => (
                      <div key={risk} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">
                          {risk}
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                          {score}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Pipeline Steps
        </h2>
        <div className="space-y-4">
          {run.steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              isActive={index === run.currentStep - 1 && run.status === 'running'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
