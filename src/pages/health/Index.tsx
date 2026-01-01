/**
 * Health Hub - Main dashboard for health tracking
 */

import { useState } from 'react';
import { Plus, Activity, FileText, Target, Lightbulb } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { AddMeasurementModal } from './components/AddMeasurementModal';
import { MeasurementCard } from './components/MeasurementCard';
import { MeasurementChart } from './components/MeasurementChart';
import { useMeasurements, useHealthInsights, useMeasurementTrends } from './hooks';

const HealthIndex = () => {
  const [addMeasurementOpen, setAddMeasurementOpen] = useState(false);
  const [selectedMeasurementType, setSelectedMeasurementType] = useState('weight');
  
  const { measurements, isLoading: measurementsLoading, deleteMeasurement } = useMeasurements({ daysBack: 30 });
  const { insights, isLoading: insightsLoading, generateInsights, isGenerating } = useHealthInsights();
  const { chartData, statistics } = useMeasurementTrends({ 
    measurementType: selectedMeasurementType,
    daysBack: 30 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Health Hub
          </h1>
          <p className="text-muted-foreground">
            Track your health metrics, documents, goals, and get AI-powered insights
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardHeader className="pb-2">
              <CardDescription>Total Measurements</CardDescription>
              <CardTitle className="text-3xl">{measurements.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardHeader className="pb-2">
              <CardDescription>Active Insights</CardDescription>
              <CardTitle className="text-3xl">{insights.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardHeader className="pb-2">
              <CardDescription>This Month</CardDescription>
              <CardTitle className="text-3xl">{statistics.count}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardHeader className="pb-2">
              <CardDescription>Trend</CardDescription>
              <CardTitle className="text-xl capitalize">{statistics.trend.replace('_', ' ')}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="measurements" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm border-white/20">
            <TabsTrigger value="measurements" className="gap-2">
              <Activity className="w-4 h-4" />
              Measurements
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-2">
              <Target className="w-4 h-4" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          {/* Measurements Tab */}
          <TabsContent value="measurements" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Your Measurements</h2>
              <Button onClick={() => setAddMeasurementOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Measurement
              </Button>
            </div>

            {/* Measurement Type Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {['weight', 'blood_pressure', 'heart_rate', 'blood_glucose', 'steps', 'sleep_hours'].map((type) => (
                <Button
                  key={type}
                  variant={selectedMeasurementType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMeasurementType(type)}
                  className="whitespace-nowrap"
                >
                  {type.replace('_', ' ')}
                </Button>
              ))}
            </div>

            {/* Chart */}
            <MeasurementChart 
              data={chartData}
              title={`${selectedMeasurementType.replace('_', ' ')} Trend`}
              color="#8b5cf6"
            />

            {/* Recent Measurements */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Recent Entries</h3>
              {measurementsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : measurements.length === 0 ? (
                <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No measurements yet. Click "Add Measurement" to get started!
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {measurements.slice(0, 10).map((measurement) => (
                    <MeasurementCard
                      key={measurement.id}
                      measurement={measurement}
                      onDelete={() => deleteMeasurement(measurement.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Health Documents</h2>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Upload Document
              </Button>
            </div>
            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardContent className="py-12 text-center text-muted-foreground">
                Document upload coming soon! This will allow you to upload and analyze medical documents with AI.
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Health Goals</h2>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Goal
              </Button>
            </div>
            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardContent className="py-12 text-center text-muted-foreground">
                Goal tracking coming soon! Set and track your health goals here.
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">AI Health Insights</h2>
              <Button 
                onClick={() => generateInsights(true)} 
                disabled={isGenerating}
                className="gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                {isGenerating ? 'Generating...' : 'Generate Insights'}
              </Button>
            </div>
            
            {insightsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading insights...</div>
            ) : insights.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="py-12 text-center">
                  <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    No insights yet. Add some measurements and click "Generate Insights" to get personalized health recommendations!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {insights.map((insight) => (
                  <Card key={insight.id} className="bg-white/80 backdrop-blur-sm border-white/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded capitalize">
                              {insight.insight_type}
                            </span>
                            {insight.confidence_score && (
                              <span className="text-xs text-muted-foreground" aria-label={`Confidence: ${Math.round(insight.confidence_score * 100)} percent`}>
                                {Math.round(insight.confidence_score * 100)}% confidence
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-semibold">{insight.title}</h3>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">{insight.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <AddMeasurementModal 
          open={addMeasurementOpen}
          onOpenChange={setAddMeasurementOpen}
        />
      </div>
    </div>
  );
};

export default HealthIndex;
