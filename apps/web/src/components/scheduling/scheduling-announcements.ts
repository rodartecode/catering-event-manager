import type { Announcements } from '@dnd-kit/core';

/** Screen reader announcements for drag-and-drop scheduling operations. */
export const schedulingAnnouncements: Announcements = {
  onDragStart({ active }) {
    const entry = active.data.current?.entry;
    if (entry) {
      return `Picked up ${entry.eventName ?? 'schedule entry'}. Use arrow keys to move, Enter to drop, Escape to cancel.`;
    }
    return 'Picked up schedule entry.';
  },
  onDragEnd({ active, over }) {
    const entry = active.data.current?.entry;
    if (over && entry) {
      return `Dropped ${entry.eventName ?? 'schedule entry'}.`;
    }
    return 'Drag cancelled.';
  },
  onDragCancel() {
    return 'Drag cancelled.';
  },
  onDragOver({ active, over }) {
    const entry = active.data.current?.entry;
    if (over && entry) {
      return `Over drop zone for ${over.data.current?.resourceId ? 'resource' : 'area'}.`;
    }
    return '';
  },
};
