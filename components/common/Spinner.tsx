import React from 'react';

const Spinner: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => {
  return (
    <div
      className={`animate-spin rounded-full border-4 border-t-transparent border-orange-500 ${className}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;