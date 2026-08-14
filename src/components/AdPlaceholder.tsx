import React from 'react';
import { AdSlot } from './AdSlot.js';

interface AdPlaceholderProps {
  slotId?: string;
  format?: 'leaderboard' | 'rectangle' | 'banner' | 'in-feed';
  className?: string;
  adsenseClientId?: string;
}

export const AdPlaceholder: React.FC<AdPlaceholderProps> = (props) => {
  return <AdSlot {...props} />;
};

export { AdSlot };
