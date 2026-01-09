import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { HEALTH_TABLES, MEASUREMENT_TYPES } from "@/constants/health";
import type { MeasurementType } from "@/types/health";
import { format, subDays } from "date-fns";

const measurementSchema = z.object({
  measurement_type: z.string().min(1, 'Measurement type is required'),
  value: z.number().positive('Value must be positive'),
  systolic: z.number().optional(),
  diastolic: z.number().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  measured_at: z.string(),
});

interface AddMeasurementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMeasurementAdded: () => void;
}

export const AddMeasurementModal = ({
  open,
  onOpenChange,
  onMeasurementAdded,
}: AddMeasurementModalProps) => {
  const [loading, setLoading] = useState(false);
  const [measurementType, setMeasurementType] = useState<MeasurementType | "">("");
  const [value, setValue] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [measuredAt, setMeasuredAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const selectedTypeInfo = measurementType ? MEASUREMENT_TYPES[measurementType] : null;
  const isBloodPressure = measurementType === 'blood_pressure';

  const resetForm = () => {
    setMeasurementType("");
    setValue("");
    setSystolic("");
    setDiastolic("");
    setMeasuredAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setNotes("");
    setTags([]);
    setTagInput("");
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleQuickTime = (type: 'now' | 'yesterday') => {
    if (type === 'now') {
      setMeasuredAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    } else {
      setMeasuredAt(format(subDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
    }
  };

  const handleSubmit = async () => {
    if (!measurementType) {
      toast.error("Please select a measurement type");
      return;
    }

    // Validate based on type
    if (isBloodPressure) {
      if (!systolic || !diastolic) {
        toast.error("Please enter both systolic and diastolic values");
        return;
      }
    } else {
      if (!value) {
        toast.error("Please enter a value");
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Prepare value object
      const valueObj = isBloodPressure
        ? { systolic: parseFloat(systolic), diastolic: parseFloat(diastolic) }
        : { value: parseFloat(value) };

      const { error } = await supabase.from(HEALTH_TABLES.MEASUREMENTS).insert({
        user_id: user.id,
        measurement_type: measurementType,
        value: valueObj,
        unit: selectedTypeInfo?.unit || null,
        measured_at: new Date(measuredAt).toISOString(),
        notes: notes || null,
        tags: tags.length > 0 ? tags : null,
      });

      if (error) throw error;

      toast.success("Measurement logged! 📊");
      resetForm();
      onOpenChange(false);
      onMeasurementAdded();
    } catch (error) {
      console.error('Error adding measurement:', error);
      toast.error("Failed to log measurement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md !bg-background border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-foreground">
            Log Measurement
          </DialogTitle>
          <DialogDescription>
            Record a new health measurement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Measurement Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Measurement Type *</Label>
            <Select value={measurementType} onValueChange={(v) => setMeasurementType(v as MeasurementType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MEASUREMENT_TYPES).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value Input - Different for Blood Pressure */}
          {isBloodPressure ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="systolic">Systolic *</Label>
                <Input
                  id="systolic"
                  type="number"
                  placeholder="120"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diastolic">Diastolic *</Label>
                <Input
                  id="diastolic"
                  type="number"
                  placeholder="80"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="value">
                Value * {selectedTypeInfo && `(${selectedTypeInfo.unit})`}
              </Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                placeholder="Enter value..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          )}

          {/* Date/Time */}
          <div className="space-y-2">
            <Label htmlFor="measuredAt">Date & Time *</Label>
            <div className="flex gap-2">
              <Input
                id="measuredAt"
                type="datetime-local"
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickTime('now')}
              >
                <Clock className="w-3 h-3 mr-1" />
                Log Now
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickTime('yesterday')}
              >
                <Calendar className="w-3 h-3 mr-1" />
                Yesterday
              </Button>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Submit */}
          <LoadingButton
            onClick={handleSubmit}
            loading={loading}
            disabled={!measurementType}
            className="w-full"
          >
            Log Measurement
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};
