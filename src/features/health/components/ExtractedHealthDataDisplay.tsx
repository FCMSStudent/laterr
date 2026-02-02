import { Badge } from "@/shared/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui";
import { Separator } from "@/shared/components/ui";
import { 
  Beaker, 
  Pill, 
  Stethoscope, 
  Heart, 
  ClipboardList, 
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface LabValue {
  name: string;
  value: number | string;
  unit: string;
  reference_range?: string;
  status?: 'normal' | 'high' | 'low' | 'critical';
}

interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
}

interface Diagnosis {
  name: string;
  icd_code?: string;
  date?: string;
}

interface ExtractedHealthData {
  lab_values?: LabValue[];
  medications?: Medication[];
  diagnoses?: Diagnosis[];
  vitals?: Record<string, string | number>;
  recommendations?: string[];
  follow_up_date?: string;
  provider_notes?: string;
}

interface ExtractedHealthDataDisplayProps {
  data: ExtractedHealthData;
  compact?: boolean;
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  
  const config = {
    normal: { icon: CheckCircle, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    high: { icon: TrendingUp, className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    low: { icon: TrendingDown, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    critical: { icon: AlertTriangle, className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  }[status] || { icon: CheckCircle, className: 'bg-muted text-muted-foreground' };

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('text-xs', config.className)}>
      <Icon className="h-3 w-3 mr-1" />
      {status}
    </Badge>
  );
}

export function ExtractedHealthDataDisplay({ data, compact = false }: ExtractedHealthDataDisplayProps) {
  const hasLabValues = data.lab_values && data.lab_values.length > 0;
  const hasMedications = data.medications && data.medications.length > 0;
  const hasDiagnoses = data.diagnoses && data.diagnoses.length > 0;
  const hasVitals = data.vitals && Object.keys(data.vitals).length > 0;
  const hasRecommendations = data.recommendations && data.recommendations.length > 0;
  const hasFollowUp = !!data.follow_up_date;
  const hasProviderNotes = !!data.provider_notes;

  const hasAnyData = hasLabValues || hasMedications || hasDiagnoses || hasVitals || hasRecommendations || hasFollowUp || hasProviderNotes;

  if (!hasAnyData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No structured health data extracted yet.</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {hasLabValues && (
          <div className="flex flex-wrap gap-2">
            {data.lab_values!.slice(0, 5).map((lab, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {lab.name}: {lab.value} {lab.unit}
              </Badge>
            ))}
            {data.lab_values!.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{data.lab_values!.length - 5} more
              </Badge>
            )}
          </div>
        )}
        {hasDiagnoses && (
          <div className="flex flex-wrap gap-2">
            {data.diagnoses!.map((d, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {d.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lab Values */}
      {hasLabValues && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Beaker className="h-4 w-4 text-primary" />
              Lab Values
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.lab_values!.map((lab, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <span className="font-medium text-sm">{lab.name}</span>
                    {lab.reference_range && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (ref: {lab.reference_range})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">
                      {lab.value} {lab.unit}
                    </span>
                    <StatusBadge status={lab.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vitals */}
      {hasVitals && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Vital Signs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(data.vitals!).map(([key, value]) => (
                <div key={key} className="p-2 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="font-medium text-sm">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnoses */}
      {hasDiagnoses && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Diagnoses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.diagnoses!.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="font-medium text-sm">{d.name}</span>
                  <div className="flex items-center gap-2">
                    {d.icd_code && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {d.icd_code}
                      </Badge>
                    )}
                    {d.date && (
                      <span className="text-xs text-muted-foreground">{d.date}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medications */}
      {hasMedications && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              Medications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.medications!.map((med, i) => (
                <div key={i} className="py-1.5 border-b last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{med.name}</span>
                    {med.dosage && (
                      <Badge variant="secondary" className="text-xs">
                        {med.dosage}
                      </Badge>
                    )}
                  </div>
                  {(med.frequency || med.instructions) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {[med.frequency, med.instructions].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {hasRecommendations && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {data.recommendations!.map((rec, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Follow-up & Notes */}
      {(hasFollowUp || hasProviderNotes) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Additional Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasFollowUp && (
              <div>
                <p className="text-xs text-muted-foreground">Follow-up Date</p>
                <p className="font-medium text-sm">{data.follow_up_date}</p>
              </div>
            )}
            {hasProviderNotes && (
              <div>
                <p className="text-xs text-muted-foreground">Provider Notes</p>
                <p className="text-sm">{data.provider_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
