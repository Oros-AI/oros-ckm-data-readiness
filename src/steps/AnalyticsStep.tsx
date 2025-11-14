import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AnalyticsSummary } from '../types/wizard';

interface AnalyticsStepProps {
  analyticsSummary: AnalyticsSummary | null;
}

export function AnalyticsStep({ analyticsSummary }: AnalyticsStepProps) {
  const sexChartRef = useRef<HTMLDivElement>(null);
  const ageChartRef = useRef<HTMLDivElement>(null);
  const diagnosisChartRef = useRef<HTMLDivElement>(null);
  const riskChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!analyticsSummary) return;

    // Clear previous charts
    d3.select(sexChartRef.current).selectAll('*').remove();
    d3.select(ageChartRef.current).selectAll('*').remove();
    d3.select(diagnosisChartRef.current).selectAll('*').remove();
    d3.select(riskChartRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = 350 - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    // Sex Distribution Pie Chart
    if (sexChartRef.current) {
      const sexData = Object.entries(analyticsSummary.sexDistribution).map(([key, value]) => ({
        label: key,
        value,
      }));

      const svg = d3.select(sexChartRef.current)
        .append('svg')
        .attr('width', 350)
        .attr('height', 250);

      const g = svg.append('g')
        .attr('transform', `translate(175, 125)`);

      const color = d3.scaleOrdinal(['#3b82f6', '#ec4899', '#8b5cf6']);

      const pie = d3.pie<{ label: string; value: number }>()
        .value(datum => datum.value);

      const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
        .innerRadius(0)
        .outerRadius(80);

      g.selectAll('path')
        .data(pie(sexData))
        .join('path')
        .attr('d', arc)
        .attr('fill', (_d, i) => color(i.toString()))
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

      g.selectAll('text')
        .data(pie(sexData))
        .join('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(d => `${d.data.label}: ${d.data.value}`);
    }

    // Age Histogram
    if (ageChartRef.current) {
      const svg = d3.select(ageChartRef.current)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      const x = d3.scaleBand()
        .domain(analyticsSummary.ageHistogram.map(d => d.range))
        .range([0, width])
        .padding(0.1);

      const y = d3.scaleLinear()
        .domain([0, d3.max(analyticsSummary.ageHistogram, d => d.count) || 0])
        .range([height, 0]);

      g.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x));

      g.append('g')
        .call(d3.axisLeft(y));

      g.selectAll('rect')
        .data(analyticsSummary.ageHistogram)
        .join('rect')
        .attr('x', d => x(d.range) || 0)
        .attr('y', d => y(d.count))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.count))
        .attr('fill', '#3b82f6');
    }

    // Diagnosis Distribution
    if (diagnosisChartRef.current && analyticsSummary.diagnosisDistribution.length > 0) {
      const svg = d3.select(diagnosisChartRef.current)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      const x = d3.scaleLinear()
        .domain([0, d3.max(analyticsSummary.diagnosisDistribution, d => d.count) || 0])
        .range([0, width]);

      const y = d3.scaleBand()
        .domain(analyticsSummary.diagnosisDistribution.map(d => d.diagnosis))
        .range([0, height])
        .padding(0.1);

      g.append('g')
        .call(d3.axisLeft(y));

      g.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x));

      g.selectAll('rect')
        .data(analyticsSummary.diagnosisDistribution)
        .join('rect')
        .attr('x', 0)
        .attr('y', d => y(d.diagnosis) || 0)
        .attr('width', d => x(d.count))
        .attr('height', y.bandwidth())
        .attr('fill', '#10b981');
    }

    // Diabetes Risk Distribution
    if (riskChartRef.current) {
      const svg = d3.select(riskChartRef.current)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      const x = d3.scaleBand()
        .domain(analyticsSummary.diabetesRiskDistribution.map(d => d.range))
        .range([0, width])
        .padding(0.1);

      const y = d3.scaleLinear()
        .domain([0, d3.max(analyticsSummary.diabetesRiskDistribution, d => d.count) || 0])
        .range([height, 0]);

      g.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x));

      g.append('g')
        .call(d3.axisLeft(y));

      g.selectAll('rect')
        .data(analyticsSummary.diabetesRiskDistribution)
        .join('rect')
        .attr('x', d => x(d.range) || 0)
        .attr('y', d => y(d.count))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.count))
        .attr('fill', '#f59e0b');
    }
  }, [analyticsSummary]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 7: Analytics</h2>
        <p className="text-gray-600 mb-6">
          Visualize patient data insights with interactive charts and distributions.
        </p>

        {analyticsSummary ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sex Distribution</h3>
                <div ref={sexChartRef} className="flex justify-center" />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Distribution</h3>
                <div ref={ageChartRef} />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Diagnoses</h3>
                <div ref={diagnosisChartRef} />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Diabetes Risk Distribution</h3>
                <div ref={riskChartRef} />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Analytics Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
                <div>
                  <p className="font-medium">Total Patients</p>
                  <p className="text-2xl font-bold">
                    {Object.values(analyticsSummary.sexDistribution).reduce((a, b) => a + b, 0)}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Unique Diagnoses</p>
                  <p className="text-2xl font-bold">
                    {analyticsSummary.diagnosisDistribution.length}
                  </p>
                </div>
                <div>
                  <p className="font-medium">High Risk Patients</p>
                  <p className="text-2xl font-bold">
                    {analyticsSummary.diabetesRiskDistribution
                      .filter(d => d.range.startsWith('0.6') || d.range.startsWith('0.8'))
                      .reduce((sum, d) => sum + d.count, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No analytics data available. Please run the analytics step.
          </div>
        )}
      </div>
    </div>
  );
}
