/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { LumiseProductDesigner } from './LumiseProductDesigner';

interface PodCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onAddToCartCustomized: (customizedItem: any) => void;
}

export const PodCustomizerModal: React.FC<PodCustomizerModalProps> = (props) => {
  return <LumiseProductDesigner {...props} />;
};

export { LumiseProductDesigner };
