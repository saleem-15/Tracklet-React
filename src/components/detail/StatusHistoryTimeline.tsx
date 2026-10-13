import React from 'react';
import { ApplicationStatus, StatusHistoryEntry } from '../../types';
import { MilestoneSpineTimeline } from './timeline/MilestoneSpineTimeline';

export interface StatusHistoryTimelineProps {
  history?: StatusHistoryEntry[];
  currentStatus: ApplicationStatus;
  createdAt?: string;
  stageUpdatedAt?: string;
  onUpdateEntry?: (id: string, updates: { toStatus?: ApplicationStatus; timestamp?: string; note?: string }) => void;
  onDeleteEntry?: (id: string) => void;
  onRollbackStatus?: (newStatus: ApplicationStatus) => void;
  isInteractive?: boolean;
}

/**
 * StatusHistoryTimeline (Canonical Implementation)
 * Powered by Design A (Milestone Spine):
 * - Clean milestone headlines with uniform spine dot geometry
 * - Pure typography for metadata: 📅 Date · ⏱️ X days in stage with tabular-nums
 * - Quiet collapsible notes
 * - 100% Inline editing and deletion with automatic status rollback
 */
export const StatusHistoryTimeline: React.FC<StatusHistoryTimelineProps> = (props) => {
  return <MilestoneSpineTimeline {...props} />;
};
