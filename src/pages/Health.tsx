import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MeasurementCard } from "@/components/MeasurementCard";
import { HealthDocumentCard } from "@/components/HealthDocumentCard";
import { ItemCardSkeleton } from "@/components/ItemCardSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, LogOut, Plus, Heart, FileText, Target, Pill, 
  Scale, Droplet, TrendingUp, TrendingDown, Minus, Calendar,
  ArrowLeft, Home
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { HEALTH_TABLES, MEASUREMENT_TYPES } from "@/constants/health";
import type { HealthMeasurement, HealthDocument, MeasurementType } from "@/types/health";
import type { User } from "@/types";
import { formatHealthValue, extractNumericValue, calculateTrend } from "@/lib/health-utils";
import { formatDistanceToNow } from "date-fns";

// Lazy load modal components
const AddMeasurementModal = lazy(() => import("@/components/AddMeasurementModal").then(({ AddMeasurementModal }) => ({ default: AddMeasurementModal })));
const MeasurementDetailModal = lazy(() => import("@/components/MeasurementDetailModal").then(({ MeasurementDetailModal }) => ({ default: MeasurementDetailModal })));
const AddHealthDocumentModal = lazy(() => import("@/components/AddHealthDocumentModal").then(({ AddHealthDocumentModal }) => ({ default: AddHealthDocumentModal })));
const HealthDocumentDetailModal = lazy(() => import("@/components/HealthDocumentDetailModal").then(({ HealthDocumentDetailModal }) => ({ default: HealthDocumentDetailModal })));

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

      // Update stats
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

  // Filter measurements
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

  // Filter documents
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getMeasurementTrend = (type: MeasurementType) => {
    const typeMeasurements = measurements.filter(m => m.measurement_type === type);
    return calculateTrend(typeMeasurements);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <header className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px]"
              aria-label="Go back"
              disabled={window.history.length <= 1}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px]"
              aria-label="Go to dashboard"
            >
              <Home className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl text-foreground mb-1 tracking-tight font-sans font-semibold">
                Health Hub
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium">
                Track your wellness journey
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
            {/* Desktop Add Button */}
            {!isMobile && (
              <Button
                onClick={() => activeTab === "measurements" ? setShowAddMeasurementModal(true) : setShowAddDocumentModal(true)}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl premium-transition hover:scale-[1.03] font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                {activeTab === "measurements" ? "Log Measurement" : "Add Document"}
              </Button>
            )}
            <Button 
              onClick={handleSignOut} 
              variant="ghost" 
              size={isMobile ? "icon" : "sm"}
              className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px]"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              {!isMobile && <span className="ml-2">Sign Out</span>}
            </Button>
          </nav>
        </header>

        {/* Stats Bar */}
        <div className="glass-card rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 md:gap-4 md:justify-around">
            {stats.latestWeight && (
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Scale className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Weight</p>
                  <p className="text-sm md:text-lg font-semibold">{stats.latestWeight} kg</p>
                </div>
                {getMeasurementTrend('weight') === 'increasing' && <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />}
                {getMeasurementTrend('weight') === 'decreasing' && <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-green-500" />}
                {getMeasurementTrend('weight') === 'stable' && <Minus className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />}
              </div>
            )}
            {stats.latestBP && (
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-red-500/10">
                  <Heart className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Blood Pressure</p>
                  <p className="text-sm md:text-lg font-semibold">{stats.latestBP.systolic}/{stats.latestBP.diastolic} mmHg</p>
                </div>
              </div>
            )}
            {stats.latestGlucose && (
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Droplet className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Glucose</p>
                  <p className="text-sm md:text-lg font-semibold">{stats.latestGlucose} mg/dL</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <Target className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Goals</p>
                <p className="text-sm md:text-lg font-semibold">{stats.activeGoals}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <Pill className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Medications</p>
                <p className="text-sm md:text-lg font-semibold">{stats.upcomingMeds} today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-muted rounded-xl">
            <TabsTrigger value="measurements" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Measurements</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Goals</span>
            </TabsTrigger>
            <TabsTrigger value="medications" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Pill className="h-4 w-4" />
              <span className="hidden sm:inline">Medications</span>
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="max-w-2xl mx-auto my-4">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Measurements Tab */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {filteredMeasurements.map(measurement => (
                  <MeasurementCard
                    key={measurement.id}
                    measurement={measurement}
                    trend={getMeasurementTrend(measurement.measurement_type as MeasurementType)}
                    onClick={() => {
                      setSelectedMeasurement(measurement);
                      setShowMeasurementDetailModal(true);
                    }}
                    onDelete={handleDeleteMeasurement}
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
                  Upload your health documents for easy access and insights
                </p>
                <Button onClick={() => setShowAddDocumentModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {filteredDocuments.map(doc => (
                  <HealthDocumentCard
                    key={doc.id}
                    document={doc}
                    onClick={() => {
                      setSelectedDocument(doc);
                      setShowDocumentDetailModal(true);
                    }}
                    onDelete={handleDeleteDocument}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Goals Tab - Placeholder */}
          <TabsContent value="goals">
            <div className="text-center py-32 space-y-5">
              <Target className="h-16 w-16 mx-auto text-muted-foreground/60" />
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Coming Soon</h2>
              <p className="text-muted-foreground text-base max-w-md mx-auto">
                Health goals tracking will be available soon
              </p>
            </div>
          </TabsContent>

          {/* Medications Tab - Placeholder */}
          <TabsContent value="medications">
            <div className="text-center py-32 space-y-5">
              <Pill className="h-16 w-16 mx-auto text-muted-foreground/60" />
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Coming Soon</h2>
              <p className="text-muted-foreground text-base max-w-md mx-auto">
                Medication tracking will be available soon
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Button (FAB) for mobile */}
      {isMobile && (
        <Button
          onClick={() => activeTab === "measurements" ? setShowAddMeasurementModal(true) : setShowAddDocumentModal(true)}
          className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-2xl hover:shadow-xl premium-transition hover:scale-110 p-0"
          aria-label={activeTab === "measurements" ? "Log measurement" : "Add document"}
        >
          <Plus className="w-6 h-6" aria-hidden="true" />
        </Button>
      )}

      {/* Modals */}
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
