import React, { useState } from 'react';

interface PlayerAvatarProps {
  src?: string;
  name: string;
  className?: string;
  alt?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  src,
  name,
  className = 'w-8 h-8 rounded-lg border border-slate-200 object-cover shrink-0',
  alt = '',
}) => {
  const [failed, setFailed] = useState(false);
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || '🏏';

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setFailed(true)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-indigo-50 text-indigo-600 text-xs font-bold ${className}`}
    >
      {initial}
    </div>
  );
};
