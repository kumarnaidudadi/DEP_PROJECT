'use client';

import React from 'react';
import { WorkflowStep } from '@/types';

interface Props {
  steps: WorkflowStep[];
  currentStatus?: string;
  isApproved?: boolean;
  isRejected?: boolean;
}

export default function WorkflowProgress({
  steps,
  currentStatus,
  isApproved = false,
  isRejected = false,
}: Props) {
  const curIdx = currentStatus
    ? steps.findIndex((s) => s.step_name === currentStatus)
    : -1;

  const isDone = isApproved || isRejected;

  // ─── State helpers ─────────────────────────────────────────────
  const getStepState = (i: number, stepName: string) => {
    if (!currentStatus) return 'default';
    if (isApproved) return 'completed';
    if (i < curIdx) return 'completed';
    if (stepName === currentStatus) return 'current';
    return 'upcoming';
  };

  const stepStyles = {
    completed:
      'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md',
    current:
      'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg ring-4 ring-blue-200',
    upcoming: 'bg-gray-200 text-gray-400',
    default:
      'bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-sm',
  };

  const lineStyles = {
    active: 'bg-green-500',
    inactive: 'bg-gray-200',
  };

  // ─── Component ─────────────────────────────────────────────────
  return (
    <div className="w-full overflow-x-auto py-8">
      <div className="flex items-center w-max mx-auto px-2">
        {steps.map((step, i) => {
          const state = getStepState(i, step.step_name);

          return (
            <div key={step.id ?? `${step.step_order}-${step.step_name}`} className="flex items-center">
              {/* Step */}
              <div className="group relative flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-200 hover:scale-110 ${stepStyles[state]}`}
                >
                  {state === 'completed' ? '✓' : i + 1}
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                  transition-all duration-200
                  bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap shadow-lg">
                  {step.step_name.replace(/_/g, ' ')}
                </div>
              </div>

              {/* Connector */}
              {i < steps.length - 1 && (
                <div
                  className={`w-12 h-[2px] mx-1 rounded-full transition-all duration-300 ${
                    state === 'completed'
                      ? lineStyles.active
                      : lineStyles.inactive
                  }`}
                />
              )}
            </div>
          );
        })}

        {/* Final Node */}
        {currentStatus && (
          <>
            <div
              className={`w-12 h-[2px] mx-1 rounded-full ${
                isDone
                  ? isApproved
                    ? 'bg-green-500'
                    : 'bg-red-500'
                  : 'bg-gray-200'
              }`}
            />

            <div className="group relative flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-200 hover:scale-110
                  ${
                    isApproved
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md'
                      : isRejected
                      ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md'
                      : 'bg-gray-200 text-gray-400'
                  }`}
              >
                {isApproved ? '✓' : isRejected ? '✕' : '⋯'}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 
                opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                transition-all duration-200
                bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap shadow-lg">
                {isApproved
                  ? 'Approved'
                  : isRejected
                  ? 'Rejected'
                  : 'Pending'}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
