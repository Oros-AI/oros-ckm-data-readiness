# Healthcare Pipeline UI

A full-featured click-through prototype for a modular healthcare data pipeline UI built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- **Pipeline Dashboard**: View all pipeline runs with real-time status updates
- **New Run Creation**: Upload CCD files and create new pipeline runs
- **Run Detail View**: Monitor individual pipeline runs with step-by-step progress
- **7-Step Pipeline Process**:
  1. Ingestion (CCD upload)
  2. Translation (CCD → FHIR)
  3. Normalization (ICD-10, LOINC, RxNorm, units)
  4. Data Quality Scoring (PIQI per domain)
  5. Persistence
  6. Enrichment (BMI, risk scores)
  7. Analytics

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Routing

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # App layout with navigation
│   ├── StatusBadge.tsx # Status indicator
│   ├── ProgressBar.tsx # Progress visualization
│   └── StepCard.tsx    # Pipeline step card
├── pages/              # Route pages
│   ├── Dashboard.tsx   # Main dashboard (/)
│   ├── NewRun.tsx      # Create new run (/new-run)
│   └── RunDetail.tsx   # Run details (/runs/:id)
├── services/           # API services
│   └── pipelineApi.ts  # Mock pipeline API
├── types/              # TypeScript types
│   └── pipeline.ts     # Pipeline-related types
├── App.tsx             # Root app component
├── main.tsx            # App entry point
└── index.css           # Global styles
```

## Features in Detail

### Mock API

The application uses a fully functional mock API (`pipelineApi.ts`) that:
- Simulates pipeline execution with realistic timing
- Generates random PIQI domain scores (demographics, vitals, labs, etc.)
- Calculates enriched data (BMI, risk scores)
- Supports real-time updates via subscription pattern
- Includes sample data for demonstration

### Type Safety

Full TypeScript coverage with comprehensive type definitions:
- `PipelineRun` - Complete pipeline run data
- `PipelineStep` - Individual step information
- `PIQIDomainScores` - Data quality scores per domain
- `StepStatus` & `RunStatus` - Status enums

### UI Components

- **StatusBadge**: Color-coded status indicators with animations
- **ProgressBar**: Visual progress tracking
- **StepCard**: Detailed step information with collapsible details
- **Layout**: Consistent navigation and page structure

## Demo Data

The application includes two pre-populated sample runs to demonstrate the completed pipeline state:
- John Doe (PT-001) - Completed run with PIQI scores
- Jane Smith (PT-002) - Completed run with enrichment data

## Usage

1. **View Dashboard**: See all pipeline runs at a glance
2. **Create New Run**: Click "New Run", fill in patient details, and upload a CCD file
3. **Monitor Progress**: Click on any run to see real-time step-by-step progress
4. **View Results**: See PIQI scores and enriched data once the pipeline completes

## Notes

- This is a front-end prototype with mocked backend functionality
- File uploads are simulated (files are not actually processed)
- Pipeline execution timing is randomized for realistic demonstration
- All data is stored in-memory and will reset on page refresh
