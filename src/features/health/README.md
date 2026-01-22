# Health Feature

Health tracking and document management system with AI-powered insights.

## Overview

The health feature allows users to:
- Track health measurements (weight, blood pressure, glucose, etc.)
- Upload and manage health documents
- Get AI-powered health insights and recommendations
- Chat with AI about health data
- Visualize health trends with charts
- Extract data from health documents automatically

## Structure

```
health/
├── components/      # UI components for health tracking
├── hooks/           # Custom hooks for health logic
└── utils/           # Utility functions
```

## Components

### Document Management
- **AddHealthDocumentModal.tsx** - Upload health documents
- **HealthDocumentCard.tsx** - Display health document cards
- **HealthDocumentDetailModal.tsx** - View document details
- **ExtractedHealthDataDisplay.tsx** - Show extracted data from documents

### Measurements
- **AddMeasurementModal.tsx** - Add new health measurements
- **MeasurementCard.tsx** - Display measurement cards
- **MeasurementDetailModal.tsx** - View measurement details
- **MeasurementGroup.tsx** - Group related measurements

### Analytics & Insights
- **HealthChartPanel.tsx** - Visualize health data with charts
- **HealthChatPanel.tsx** - AI chat interface for health questions
- **RecommendationsPanel.tsx** - AI-generated health recommendations

### UI Components
- **FloatingAIChatButton.tsx** - Floating chat button
- **HealthSpeedDial.tsx** - Quick action menu
- **EmbeddingBackfillDialog.tsx** - Backfill embeddings for search

## Hooks

Custom React hooks for health-specific logic:
- State management for measurements
- Document upload and processing
- AI chat interactions
- Chart data formatting

## Utils

Utility functions for:
- Health data calculations
- Unit conversions
- Data validation
- Chart data transformation

## Data Models

### Health Measurement
```typescript
interface HealthMeasurement {
  id: string;
  user_id: string;
  type: 'weight' | 'blood_pressure' | 'glucose' | 'heart_rate' | 'temperature';
  value: number;
  unit: string;
  notes?: string;
  measured_at: string;
  created_at: string;
}
```

### Health Document
```typescript
interface HealthDocument {
  id: string;
  user_id: string;
  title: string;
  document_type: 'lab_result' | 'prescription' | 'report' | 'scan' | 'other';
  file_url: string;
  extracted_data?: any;
  document_date: string;
  created_at: string;
}
```

## Features

### 1. Measurement Tracking
Track various health metrics over time with automatic trend analysis.

### 2. Document Management
Upload and organize health documents with AI-powered data extraction.

### 3. AI Chat
Ask questions about your health data and get personalized insights.

### 4. Visualizations
Interactive charts showing health trends and patterns.

### 5. Recommendations
AI-generated recommendations based on your health data.

## Usage Example

```tsx
import { 
  HealthChartPanel, 
  AddMeasurementModal,
  HealthChatPanel 
} from '@/features/health/components';

function HealthDashboard() {
  return (
    <div className="space-y-6">
      <HealthChartPanel measurements={measurements} />
      <AddMeasurementModal />
      <HealthChatPanel />
    </div>
  );
}
```

## Integration

- Uses Supabase for data storage
- Integrates with OpenAI for:
  - Document data extraction
  - Health insights generation
  - Chat functionality
- Chart.js/Recharts for visualizations
- File uploads to S3
