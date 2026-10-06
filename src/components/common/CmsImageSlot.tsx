import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { getMediaSlotDefinition } from '../../data/mediaSlotRegistry';

export interface CmsImageSlotProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  slotKey: string;
  fallbackUrl?: string;
  isDecorative?: boolean;
  priority?: boolean;
  aspectRatio?: string;
  focalPoint?: string;
}

export const CmsImageSlot: React.FC<CmsImageSlotProps> = ({
  slotKey,
  fallbackUrl,
  isDecorative = false,
  priority = false,
  aspectRatio,
  focalPoint,
  alt,
  className = '',
  style,
  onError,
  ...rest
}) => {
  const { getSlotMediaUrl } = useData();
  const slotDef = getMediaSlotDefinition(slotKey);

  const resolvedUrl = getSlotMediaUrl(slotKey, fallbackUrl || slotDef?.defaultFallbackUrl);
  const fallback = fallbackUrl || slotDef?.defaultFallbackUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=80';

  const [hasError, setHasError] = useState(false);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    if (onError) {
      onError(e);
    }
  };

  const computedStyle: React.CSSProperties = {
    ...style,
    ...(focalPoint ? { objectPosition: focalPoint } : {}),
    ...(aspectRatio ? { aspectRatio } : {})
  };

  const currentSrc = hasError || !resolvedUrl ? fallback : resolvedUrl;

  return (
    <img
      src={currentSrc}
      alt={isDecorative ? '' : (alt || slotDef?.label || 'Dr. Bhushan Parmar Oncology')}
      aria-hidden={isDecorative ? 'true' : undefined}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      referrerPolicy="no-referrer"
      onError={handleError}
      style={computedStyle}
      className={className}
      {...rest}
    />
  );
};
