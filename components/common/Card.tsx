import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${className}`}>
      {children}
    </div>
  );
};

export default Card;