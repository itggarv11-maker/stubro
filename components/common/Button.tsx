import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseClasses = 'rounded-lg font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3 text-base',
  };

  const variantClasses = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5',
    secondary: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5',
    outline: 'bg-transparent border-2 border-orange-500 text-orange-600 font-bold hover:bg-orange-100 focus-visible:ring-orange-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5',
    ghost: 'bg-transparent text-orange-600 hover:bg-orange-100 focus-visible:ring-orange-200 shadow-none hover:shadow-none'
  };

  return (
    <button className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;