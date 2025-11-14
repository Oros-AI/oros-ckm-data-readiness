# Healthcare Data Pipeline Wizard

A single-page React application that provides a visual, interactive wizard for processing healthcare data through a 7-step pipeline workflow.

## Features

### 7-Step Pipeline Workflow

1. **Ingestion**: Upload and parse CSV files with patient data
2. **Translation**: Convert CSV rows into structured JSON objects
3. **Normalization**: Map medical codes to standard terminologies (ICD-10, RxNorm, LOINC, SNOMED-CT)
4. **Data Quality Scoring**: Compute PIQI-like quality scores per domain
5. **Persistence**: Simulate writing data to DuckDB database
6. **Enrichment**: Calculate BMI and diabetes risk scores
7. **Analytics**: Visualize data with interactive D3 charts

### UI Layout

- **Top Bar (15% viewport)**: Train-track pipeline visualization with clickable, color-coded step circles
  - Grey = Pending
  - Blue = Running
  - Green = Success
  - Red = Error
- **Middle Section (80% viewport)**: Dynamic workspace showing step-specific content, data previews, and controls
- **Bottom Bar (5% viewport)**: Persistent status bar showing current step and state

### Key Capabilities

- Real CSV file upload and parsing (client-side using PapaParse)
- Step-by-step execution with "Run Step" button
- Batch execution with "Run All" button
- State management for all 7 steps
- Error handling with clear messages and suggested fixes
- Interactive data visualizations using D3.js
- Mock backend simulation with artificial delays

## Tech Stack

- **React** + **TypeScript**
- **Vite** (build tool)
- **TailwindCSS** (styling)
- **PapaParse** (CSV parsing)
- **D3.js** (data visualization)

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Using the Application

1. **Start with Ingestion**: Click on the first step (Ingestion) and upload the sample CSV file (`sample-patient-data.csv`)
2. **Run Individual Steps**: Click "Run Step" to execute the current step
3. **Run All Steps**: Click "Run All Steps" to execute the entire pipeline sequentially
4. **Navigate Steps**: Click on any step circle in the top bar to view its content
5. **View Results**: Each step shows previews of input/output data, status indicators, and relevant metrics

## Sample Data

A sample CSV file (`sample-patient-data.csv`) is included with 20 mock patient records containing:
- Patient demographics (ID, Name, Age, Sex, Height, Weight)
- Diagnoses (Diabetes, Hypertension, Asthma, Depression, Obesity)
- Medications (Metformin, Lisinopril, Albuterol, Sertraline, Atorvastatin)
- Lab tests (HbA1c, Glucose, Cholesterol, HDL, LDL)
- Procedures (Blood Draw, X-Ray, MRI, CT Scan, EKG)

## Project Structure

```
src/
├── components/          # Layout components
│   ├── TopPipelineBar.tsx
│   ├── StepWorkspace.tsx
│   └── BottomStatusBar.tsx
├── steps/              # Step-specific components
│   ├── IngestionStep.tsx
│   ├── TranslationStep.tsx
│   ├── NormalizationStep.tsx
│   ├── DataQualityScoringStep.tsx
│   ├── PersistenceStep.tsx
│   ├── EnrichmentStep.tsx
│   └── AnalyticsStep.tsx
├── services/           # Business logic
│   └── pipelineService.ts
├── state/              # State management
│   └── wizardState.ts
├── types/              # TypeScript types
│   └── wizard.ts
└── App.tsx             # Main application
```

## Notes

- This is a **single-page application** - no routing, all content orchestrated in one main layout
- All data processing happens **client-side** (no backend required)
- Pipeline steps simulate backend operations with artificial delays for realistic UX
- The persistence step mocks database operations (no actual DuckDB connection)
