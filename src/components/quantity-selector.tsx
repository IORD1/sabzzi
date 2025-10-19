'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { haptics } from '@/lib/haptics';

interface QuantitySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: { value: number; unit: string }, type: QuantityType) => void;
  itemName: string;
  defaultQuantity?: { value: number; unit: string };
  defaultQuantityType?: QuantityType;
}

type QuantityType = 'weight' | 'money' | 'count';

const QUANTITY_PRESETS = {
  weight: [
    { label: '250g', value: 250, unit: 'g' },
    { label: '500g', value: 500, unit: 'g' },
    { label: '1kg', value: 1, unit: 'kg' },
    { label: '2kg', value: 2, unit: 'kg' },
    { label: '5kg', value: 5, unit: 'kg' },
  ],
  money: [
    { label: '₹10', value: 10, unit: '₹' },
    { label: '₹20', value: 20, unit: '₹' },
    { label: '₹50', value: 50, unit: '₹' },
    { label: '₹100', value: 100, unit: '₹' },
    { label: '₹200', value: 200, unit: '₹' },
  ],
  count: [
    { label: '1', value: 1, unit: 'items' },
    { label: '2', value: 2, unit: 'items' },
    { label: '3', value: 3, unit: 'items' },
    { label: '5', value: 5, unit: 'items' },
    { label: '10', value: 10, unit: 'items' },
  ],
};

export function QuantitySelector({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  defaultQuantity,
  defaultQuantityType,
}: QuantitySelectorProps) {
  const [quantityType, setQuantityType] = useState<QuantityType>(defaultQuantityType || 'count');
  const [customValue, setCustomValue] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<{
    value: number;
    unit: string;
  } | null>(defaultQuantity || null);

  const handleTypeChange = (type: QuantityType) => {
    haptics.buttonTap();
    setQuantityType(type);
    setSelectedPreset(null);
    setCustomValue('');
  };

  const handlePresetSelect = (preset: { value: number; unit: string }) => {
    haptics.buttonTap();
    setSelectedPreset(preset);
    setCustomValue('');
  };

  const handleConfirm = () => {
    let quantity = selectedPreset;

    if (customValue && !selectedPreset) {
      const value = parseFloat(customValue);
      if (!isNaN(value) && value > 0) {
        const unit =
          quantityType === 'weight' ? 'kg' : quantityType === 'money' ? '₹' : 'items';
        quantity = { value, unit };
      }
    }

    if (quantity) {
      haptics.success();
      onConfirm(quantity, quantityType);
      onClose();
    } else {
      haptics.error();
      alert('Please select or enter a quantity');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Quantity</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{itemName}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quantity Type Selector */}
          <div className="flex gap-2">
            <Button
              variant={quantityType === 'weight' ? 'default' : 'outline'}
              className="flex-1 h-11"
              onClick={() => handleTypeChange('weight')}
            >
              Weight
            </Button>
            <Button
              variant={quantityType === 'money' ? 'default' : 'outline'}
              className="flex-1 h-11"
              onClick={() => handleTypeChange('money')}
            >
              Money
            </Button>
            <Button
              variant={quantityType === 'count' ? 'default' : 'outline'}
              className="flex-1 h-11"
              onClick={() => handleTypeChange('count')}
            >
              Count
            </Button>
          </div>

          {/* Presets */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Select</label>
            <div className="grid grid-cols-3 gap-2">
              {QUANTITY_PRESETS[quantityType].map((preset) => (
                <Button
                  key={preset.label}
                  variant={
                    selectedPreset?.value === preset.value &&
                    selectedPreset?.unit === preset.unit
                      ? 'default'
                      : 'outline'
                  }
                  className="h-12"
                  onClick={() => handlePresetSelect(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Or Enter Custom Amount
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={
                  quantityType === 'weight'
                    ? 'kg'
                    : quantityType === 'money'
                    ? '₹'
                    : 'items'
                }
                value={customValue}
                onChange={(e) => {
                  setCustomValue(e.target.value);
                  setSelectedPreset(null);
                }}
                className="h-12"
                min="0"
                step={quantityType === 'weight' ? '0.1' : '1'}
              />
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            className="w-full h-12"
            onClick={handleConfirm}
            disabled={!selectedPreset && !customValue}
          >
            Add to List
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
