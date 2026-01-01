# Health Hub Module

A comprehensive health tracking module for the Spaces application that enables users to monitor health measurements, store medical documents with AI analysis, set goals, and receive personalized AI-powered insights.

## Features

### 📊 Health Measurements
- Track various health metrics (weight, blood pressure, heart rate, blood glucose, steps, sleep, water intake)
- Support for custom measurement types
- Time-series data visualization with trend analysis
- Historical data tracking with notes and tags
- Multiple data sources (manual entry, Apple Health, Google Fit, etc.)

### 📄 Health Documents
- Upload and store medical documents (PDFs, images, DOCX)
- AI-powered extraction of:
  - Test results with values and reference ranges
  - Medications with dosages
  - Diagnoses and conditions
  - Provider information
  - Visit dates
- Semantic search using vector embeddings
- Secure storage with row-level security

### 🎯 Health Goals
- Set and track health goals (weight loss/gain, daily steps, water intake, exercise, sleep)
- Progress monitoring with percentages
- Milestone tracking
- Motivational support

### 💡 AI Health Insights
- Automated trend analysis
- Anomaly detection
- Personalized recommendations
- Weekly health summaries
- Confidence scoring

## Database Schema

### Tables

#### health_measurements
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- measurement_type: TEXT
- value: JSONB (flexible structure)
- unit: TEXT
- measured_at: TIMESTAMP
- source: TEXT (manual, apple_health, google_fit, etc.)
- notes: TEXT
- tags: TEXT[]
- created_at: TIMESTAMP
```

#### health_documents
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- title: TEXT
- document_type: TEXT (lab_result, prescription, imaging, etc.)
- file_url: TEXT
- file_type: TEXT
- provider_name: TEXT
- visit_date: DATE
- summary: TEXT (AI-generated)
- extracted_data: JSONB (structured medical data)
- embedding: VECTOR(1536) (for semantic search)
- tags: TEXT[]
- created_at, updated_at: TIMESTAMP
```

#### health_goals
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- goal_type: TEXT
- target_value: JSONB
- current_value: JSONB
- start_date: DATE
- target_date: DATE
- status: TEXT (active, completed, abandoned)
- motivation: TEXT
- milestones: JSONB
- created_at, updated_at: TIMESTAMP
```

#### health_insights
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- insight_type: TEXT (trend, anomaly, recommendation, summary)
- title: TEXT
- content: TEXT
- confidence_score: DECIMAL
- related_measurements: UUID[]
- related_documents: UUID[]
- generated_at: TIMESTAMP
- dismissed: BOOLEAN
```

### Database Functions

- `find_similar_health_documents()` - Vector similarity search for documents
- `get_measurement_trends()` - Statistical trend analysis for measurements
- `calculate_goal_progress()` - Calculate goal completion percentages
- `aggregate_health_summary()` - Generate holistic health overview

## Edge Functions

### analyze-health-document
Analyzes uploaded health documents using AI to extract structured medical information.

**Endpoint**: `/functions/v1/analyze-health-document`

**Request**:
```json
{
  "fileUrl": "https://...",
  "fileType": "application/pdf",
  "fileName": "lab-results.pdf"
}
```

**Response**:
```json
{
  "documentType": "lab_result",
  "extractedData": {
    "test_results": [...],
    "medications": [...],
    "diagnoses": [...]
  },
  "providerName": "City Hospital",
  "visitDate": "2024-01-15",
  "summary": "Lab results showing...",
  "embedding": [...]
}
```

### generate-health-insights
Generates personalized health insights based on user's measurements, goals, and documents.

**Endpoint**: `/functions/v1/generate-health-insights`

**Request**:
```json
{
  "userId": "uuid",
  "forceRegenerate": false
}
```

**Response**:
```json
{
  "insights": [...],
  "count": 5
}
```

## React Hooks

### useMeasurements
```typescript
const {
  measurements,
  isLoading,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
} = useMeasurements({ measurementType: 'weight', daysBack: 30 });
```

### useHealthDocuments
```typescript
const {
  documents,
  uploadDocument,
  searchDocuments,
  deleteDocument,
} = useHealthDocuments({ documentType: 'lab_result' });
```

### useHealthGoals
```typescript
const {
  goals,
  createGoal,
  updateGoal,
  completeGoal,
  abandonGoal,
} = useHealthGoals({ status: 'active' });
```

### useHealthInsights
```typescript
const {
  insights,
  generateInsights,
  dismissInsight,
  isGenerating,
} = useHealthInsights();
```

### useMeasurementTrends
```typescript
const {
  chartData,
  statistics,
} = useMeasurementTrends({
  measurementType: 'weight',
  daysBack: 30,
});
```

## Components

### AddMeasurementModal
Modal for adding new health measurements with dynamic form fields based on measurement type.

### MeasurementCard
Display individual measurements with trend indicators and actions.

### MeasurementChart
Recharts-based visualization of measurement trends over time.

### Health Dashboard
Main tabbed interface with sections for Measurements, Documents, Goals, and Insights.

## Usage Example

```typescript
import { useState } from 'react';
import { useMeasurements, useMeasurementTrends } from '@/pages/health/hooks';
import { MeasurementChart, AddMeasurementModal } from '@/pages/health/components';

function MyHealthDashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const { measurements } = useMeasurements({ daysBack: 30 });
  const { chartData } = useMeasurementTrends({
    measurementType: 'weight',
    daysBack: 30,
  });

  return (
    <div>
      <MeasurementChart data={chartData} title="Weight Trend" />
      <button onClick={() => setModalOpen(true)}>Add Measurement</button>
      <AddMeasurementModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
```

## Security

- All tables protected with Row Level Security (RLS)
- Users can only access their own data
- Health documents stored in secure private storage bucket
- AI-generated insights use authenticated API calls
- No sensitive data exposed in client-side code

## Migration

To set up the Health Hub module, run the migration:

```bash
supabase migration up
```

This will create all necessary tables, functions, and storage buckets.

## Future Enhancements

- [ ] External health data sync (Apple Health, Google Fit, Fitbit)
- [ ] Advanced goal tracking with rewards/gamification
- [ ] Health report generation (PDF export)
- [ ] Doctor/caregiver sharing capabilities
- [ ] Medication reminders
- [ ] Appointment scheduling integration
- [ ] Wearable device integration
- [ ] Advanced analytics and correlations between metrics

## Contributing

Follow the established patterns from the subscriptions module:
- Use TanStack Query for state management
- Implement proper TypeScript typing
- Follow glassmorphism design aesthetic
- Ensure mobile responsiveness
- Add proper error handling and loading states
- Write accessible components with ARIA labels

## License

Part of the Laterr/Spaces application.
