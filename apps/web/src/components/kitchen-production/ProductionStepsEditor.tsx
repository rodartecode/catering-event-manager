'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { trpc } from '@/lib/trpc';
import { PrepTypeBadge } from './PrepTypeBadge';
import { StationTypeBadge } from './StationTypeBadge';

const prepTypes = [
  'marinate',
  'bake',
  'grill',
  'plate',
  'chop',
  'mix',
  'chill',
  'fry',
  'assemble',
  'garnish',
] as const;

const stationTypes = [
  'oven',
  'grill',
  'prep_counter',
  'cold_storage',
  'stovetop',
  'fryer',
  'mixer',
] as const;

type ProductionStep = {
  name: string;
  prepType: string;
  stationType: string;
  durationMinutes: number;
  offsetMinutes: number;
};

interface ProductionStepsEditorProps {
  menuItemId: number;
  menuItemName: string;
  initialSteps: ProductionStep[] | null;
}

export function ProductionStepsEditor({
  menuItemId,
  menuItemName,
  initialSteps,
}: ProductionStepsEditorProps) {
  const [steps, setSteps] = useState<ProductionStep[]>(initialSteps ?? []);
  const [isAdding, setIsAdding] = useState(false);
  const [newStep, setNewStep] = useState<ProductionStep>({
    name: '',
    prepType: 'chop',
    stationType: 'prep_counter',
    durationMinutes: 30,
    offsetMinutes: -240,
  });

  const utils = trpc.useUtils();

  const updateMutation = trpc.menu.updateProductionSteps.useMutation({
    onSuccess: () => {
      utils.menu.getItemById.invalidate({ id: menuItemId });
      toast.success('Production steps saved');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addStep = () => {
    if (!newStep.name.trim()) {
      toast.error('Step name is required');
      return;
    }
    const updated = [...steps, { ...newStep, name: newStep.name.trim() }];
    setSteps(updated);
    setNewStep({
      name: '',
      prepType: 'chop',
      stationType: 'prep_counter',
      durationMinutes: 30,
      offsetMinutes: -240,
    });
    setIsAdding(false);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const save = () => {
    updateMutation.mutate({
      menuItemId,
      productionSteps: steps.length > 0 ? steps : null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Production Steps for {menuItemName}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add Step
          </button>
          <button
            type="button"
            onClick={save}
            disabled={updateMutation.isPending}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {steps.length === 0 && !isAdding && (
        <p className="text-sm text-gray-500 italic">
          No production steps defined. Add steps to enable auto-generation.
        </p>
      )}

      {/* Step List */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-400 w-6">{index + 1}.</span>
              <span className="font-medium text-gray-900">{step.name}</span>
              <PrepTypeBadge type={step.prepType} />
              <StationTypeBadge type={step.stationType} />
              <span className="text-xs text-gray-500">{step.durationMinutes}min</span>
              <span className="text-xs text-gray-500">
                {Math.abs(step.offsetMinutes / 60)}h before
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeStep(index)}
              className="text-red-500 hover:text-red-700 text-sm"
              aria-label={`Remove step ${step.name}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Add Step Form */}
      {isAdding && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div>
            <label htmlFor="stepName" className="block text-sm font-medium text-gray-700 mb-1">
              Step Name
            </label>
            <input
              id="stepName"
              type="text"
              value={newStep.name}
              onChange={(e) => setNewStep({ ...newStep, name: e.target.value })}
              placeholder="e.g., Marinate chicken"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="stepPrepType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Prep Type
              </label>
              <select
                id="stepPrepType"
                value={newStep.prepType}
                onChange={(e) => setNewStep({ ...newStep, prepType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {prepTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="stepStationType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Station Type
              </label>
              <select
                id="stepStationType"
                value={newStep.stationType}
                onChange={(e) => setNewStep({ ...newStep, stationType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {stationTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="stepDuration"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Duration (min)
              </label>
              <input
                id="stepDuration"
                type="number"
                min="1"
                value={newStep.durationMinutes}
                onChange={(e) =>
                  setNewStep({ ...newStep, durationMinutes: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="stepOffset" className="block text-sm font-medium text-gray-700 mb-1">
                Hours before event
              </label>
              <input
                id="stepOffset"
                type="number"
                min="0"
                step="0.5"
                value={Math.abs(newStep.offsetMinutes) / 60}
                onChange={(e) =>
                  setNewStep({
                    ...newStep,
                    offsetMinutes: -Math.round(parseFloat(e.target.value || '0') * 60),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addStep}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
