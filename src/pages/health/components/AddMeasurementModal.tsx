/**
 * AddMeasurementModal - Modal for adding health measurements
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { useMeasurements } from '../hooks';
import type { MeasurementType } from '../types';

interface AddMeasurementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MEASUREMENT_TYPES: { value: MeasurementType; label: string; hasCompound?: boolean }[] = [
  { value: 'weight', label: 'Weight' },
  { value: 'blood_pressure', label: 'Blood Pressure', hasCompound: true },
  { value: 'heart_rate', label: 'Heart Rate' },
  { value: 'blood_glucose', label: 'Blood Glucose' },
  { value: 'steps', label: 'Steps' },
  { value: 'sleep_hours', label: 'Sleep Hours' },
  { value: 'water_intake', label: 'Water Intake' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'oxygen_saturation', label: 'Oxygen Saturation' },
];

export const AddMeasurementModal = ({ open, onOpenChange }: AddMeasurementModalProps) => {
  const { createMeasurement, isCreating } = useMeasurements();
  const [measurementType, setMeasurementType] = useState<MeasurementType>('weight');
  const [value, setValue] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [unit, setUnit] = useState('kg');
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');

  const selectedType = MEASUREMENT_TYPES.find(t => t.value === measurementType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let measurementValue: any;
    
    if (selectedType?.hasCompound) {
      // Blood pressure has systolic and diastolic
      measurementValue = {
        systolic: parseInt(systolic),
        diastolic: parseInt(diastolic),
      };
    } else {
      measurementValue = {
        value: parseFloat(value),
        unit,
      };
    }

    createMeasurement({
      measurement_type: measurementType,
      value: measurementValue,
      unit: selectedType?.hasCompound ? 'mmHg' : unit,
      measured_at: new Date(measuredAt).toISOString(),
      notes: notes || undefined,
      tags: [],
    });

    // Reset form
    setValue('');
    setSystolic('');
    setDiastolic('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white/90 backdrop-blur-xl border-white/20">
        <DialogHeader>
          <DialogTitle>Add Measurement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="measurement-type">Measurement Type</Label>
            <Select value={measurementType} onValueChange={(v) => setMeasurementType(v as MeasurementType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEASUREMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedType?.hasCompound ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="systolic">Systolic</Label>
                <Input
                  id="systolic"
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  placeholder="120"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diastolic">Diastolic</Label>
                <Input
                  id="diastolic"
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  placeholder="80"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-1">
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.1"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="70"
                  required
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="kg"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="measured-at">Date & Time</Label>
            <Input
              id="measured-at"
              type="datetime-local"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Adding...' : 'Add Measurement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
