import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MeasurementCard } from "@/features/health/components/MeasurementCard";
import { MeasurementGroup } from "@/features/health/components/MeasurementGroup";
import { InlineHealthStats } from "@/features/health/components/InlineHealthStats";
import { HealthDocumentCard } from "@/features/health/components/HealthDocumentCard";
import { HealthSpeedDial } from "@/features/health/components/HealthSpeedDial";
import { FloatingAIChatButton } from "@/features/health/components/FloatingAIChatButton";
import { ItemCardSkeleton } from "@/features/bookmarks/components/ItemCardSkeleton";
import { NavigationHeader } from "@/shared/components/NavigationHeader";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Activity, Plus, FileText } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { HEALTH_TABLES } from "@/features/health/constants";
import type { HealthMeasurement, HealthDocument, MeasurementType } from "@/features/health/types";
import type { User } from "@/features/bookmarks/types";
import { extractNumericValue, calculateTrend } from "@/features/health/utils/health-utils";
import { format, parseISO, isToday, isYesterday, startOfDay } from "date-fns";

// Lazy load modal components
const AddMeasurementModal = lazy(() => import("@/features/health/components/AddMeasurementModal").then(({ AddMeasurementModal }) => ({ default: AddMeasurementModal })));
const MeasurementDetailModal = lazy(() => import("@/features/health/components/MeasurementDetailModal").then(({ MeasurementDetailModal }) => ({ default: MeasurementDetailModal })));
const AddHealthDocumentModal = lazy(() => import("@/features/health/components/AddHealthDocumentModal").then(({ AddHealthDocumentModal }) => ({ default: AddHealthDocumentModal })));
const HealthDocumentDetailModal = lazy(() => import("@/features/health/components/HealthDocumentDetailModal").then(({ HealthDocumentDetailModal }) => ({ default: HealthDocumentDetailModal })));

const Health = () => {
  const [activeTab, setActiveTab] = useState("measurements");
  const [showAddMeasurementModal, setShowAddMeasurementModal] = useState(false);
  const [showMeasurementDetailModal, setShowMeasurementDetailModal] = useState(false);
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [showDocumentDetailModal, setShowDocumentDetailModal] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<HealthMeasurement | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<HealthDocument | null>(null);
  const [measurements, setMeasurements] = useState<HealthMeasurement[]>([]);
  const [documents, setDocuments] = useState<HealthDocument[]>([]);
  const [filteredMeasurements, setFilteredMeasurements] = useState<HealthMeasurement[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<HealthDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const isMobile = useIsMobile();

  // Group measurements by date
  const groupedMeasurements = filteredMeasurements.reduce((groups, measurement) => {
    const date = startOfDay(parseISO(measurement.measured_at)).toISOString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(measurement);
    return groups;
  }, {} as Record<string, HealthMeasurement[]>);

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  // Stats
  const [stats, setStats] = useState({
    latestWeight: null as number | null,
    latestBP: null as { systolic: number; diastolic: number } | null,
    latestGlucose: null as number | null,
    activeGoals: 0,
    upcomingMeds: 0,
  });

  const fetchMeasurements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from(HEALTH_TABLES.MEASUREMENTS)
        .select('*')
        .order('measured_at', { ascending: false });

      if (error) throw error;
      const measurementsData = (data ?? []) as HealthMeasurement[];
      setMeasurements(measurementsData);
      setFilteredMeasurements(measurementsData);

      const latestWeight = measurementsData.find(m => m.measurement_type === 'weight');
      const latestBP = measurementsData.find(m => m.measurement_type === 'blood_pressure');
      const latestGlucose = measurementsData.find(m => m.measurement_type === 'glucose');

      setStats(prev => ({
        ...prev,
        latestWeight: latestWeight ? extractNumericValue(latestWeight.value) : null,
        latestBP: latestBP?.value && 'systolic' in latestBP.value 
          ? { systolic: latestBP.value.systolic as number, diastolic: latestBP.value.diastolic as number } 
          : null,
        latestGlucose: latestGlucose ? extractNumericValue(latestGlucose.value) : null,
      }));
    } catch (error) {
      console.error('Error fetching measurements:', error);
      toast({ title: "Error", description: "Failed to load measurements", variant: "destructive" });
    }
  }, [toast]);

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from(HEALTH_TABLES.DOCUMENTS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data ?? []) as HealthDocument[]);
      setFilteredDocuments((data ?? []) as HealthDocument[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({ title: "Error", description: "Failed to load documents", variant: "destructive" });
    }
  }, [toast]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMeasurements(), fetchDocuments()]);
    setLoading(false);
  }, [fetchMeasurements, fetchDocuments]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate('/auth');
      } else {
        setUser(session.user);
        fetchAll();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate('/auth');
      else setUser(session.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [navigate, fetchAll]);

  useEffect(() => {
    if (!debouncedSearchQuery) {
      setFilteredMeasurements(measurements);
      return;
    }
    const query = debouncedSearchQuery.toLowerCase();
    setFilteredMeasurements(measurements.filter(m => 
      m.measurement_type.toLowerCase().includes(query) ||
      m.notes?.toLowerCase().includes(query) ||
      m.tags?.some(t => t.toLowerCase().includes(query))
    ));
  }, [debouncedSearchQuery, measurements]);

  useEffect(() => {
    if (!debouncedSearchQuery) {
      setFilteredDocuments(documents);
      return;
    }
    const query = debouncedSearchQuery.toLowerCase();
    setFilteredDocuments(documents.filter(d => 
      d.title.toLowerCase().includes(query) ||
      d.document_type.toLowerCase().includes(query) ||
      d.provider_name?.toLowerCase().includes(query) ||
      d.summary?.toLowerCase().includes(query) ||
      d.tags?.some(t => t.toLowerCase().includes(query))
    ));
  }, [debouncedSearchQuery, documents]);

  const handleDeleteMeasurement = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from(HEALTH_TABLES.MEASUREMENTS).delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Measurement deleted" });
      fetchMeasurements();
    } catch (error) {
      console.error('Error deleting measurement:', error);
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  }, [toast, fetchMeasurements]);

  const handleDeleteDocument = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from(HEALTH_TABLES.DOCUMENTS).delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Document deleted" });
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  }, [toast, fetchDocuments]);

  const getMeasurementTrend = (type: MeasurementType) => {
    const typeMeasurements = measurements.filter(m => m.measurement_type === type);
    return calculateTrend(typeMeasurements);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <NavigationHeader 
            title="Health"
            onAddClick={() => activeTab === "measurements" ? setShowAddMeasurementModal(true) : setShowAddDocumentModal(true)}
            addLabel={activeTab === "measurements" ? "Log" : "Add"}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Inline Stats Summary - Collapsible */}
        <InlineHealthStats measurements={measurements} />

        {/* Tabs - Only Measurements and Documents */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 bg-muted rounded-xl">
            <TabsTrigger value="measurements" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Measurements</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
          </TabsList>

          {/* Measurements Tab - Date-grouped */}
          <TabsContent value="measurements">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {Array.from({ length: 8 }).map((_, i) => <ItemCardSkeleton key={i} />)}
              </div>
            ) : filteredMeasurements.length === 0 ? (
              <div className="text-center py-32 space-y-5">
                <Activity className="h-16 w-16 mx-auto text-muted-foreground/60" />
                <h2 className="text-2xl font-bold text-foreground tracking-tight">No measurements yet</h2>
                <p className="text-muted-foreground text-base max-w-md mx-auto">
                  Start tracking your health by logging your first measurement
                </p>
                <Button onClick={() => setShowAddMeasurementModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Log Measurement
                </Button>
              </div>
            ) : (
              <div className="pb-12">
                {Object.entries(groupedMeasurements)
                  .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                  .map(([date, measurements]) => (
                    <MeasurementGroup
                      key={date}
                      date={getDateLabel(date)}
                      measurements={measurements}
                      onMeasurementClick={(measurement) => {
                        setSelectedMeasurement(measurement);
                        setShowMeasurementDetailModal(true);
                      }}
                    />
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {Array.from({ length: 8 }).map((_, i) => <ItemCardSkeleton key={i} />)}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-32 space-y-5">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/60" />
                <h2 className="text-2xl font-bold text-foreground tracking-tight">No documents yet</h2>
                <p className="text-muted-foreground text-base max-w-md mx-auto">
                  Upload your health records and documents for safekeeping
                </p>
                <Button onClick={() => setShowAddDocumentModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {filteredDocuments.map(document => (
                  <HealthDocumentCard
                    key={document.id}
                    document={document}
                    onClick={() => {
                      setSelectedDocument(document);
                      setShowDocumentDetailModal(true);
                    }}
                    onDelete={handleDeleteDocument}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Health Speed Dial FAB - Replace single FAB */}
      {isMobile && (
        <HealthSpeedDial
          onAddMeasurement={() => setShowAddMeasurementModal(true)}
          onAddDocument={() => setShowAddDocumentModal(true)}
        />
      )}

      {/* Floating AI Chat Button */}
      <FloatingAIChatButton />

      <Suspense fallback={null}>
        <AddMeasurementModal
          open={showAddMeasurementModal}
          onOpenChange={setShowAddMeasurementModal}
          onMeasurementAdded={fetchMeasurements}
        />

        {selectedMeasurement && (
          <MeasurementDetailModal
            open={showMeasurementDetailModal}
            onOpenChange={setShowMeasurementDetailModal}
            measurement={selectedMeasurement}
            allMeasurements={measurements.filter(m => m.measurement_type === selectedMeasurement.measurement_type)}
            onUpdate={fetchMeasurements}
            onDelete={handleDeleteMeasurement}
          />
        )}

        <AddHealthDocumentModal
          open={showAddDocumentModal}
          onOpenChange={setShowAddDocumentModal}
          onDocumentAdded={fetchDocuments}
        />

        {selectedDocument && (
          <HealthDocumentDetailModal
            open={showDocumentDetailModal}
            onOpenChange={setShowDocumentDetailModal}
            document={selectedDocument}
            onUpdate={fetchDocuments}
            onDelete={handleDeleteDocument}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Health;
