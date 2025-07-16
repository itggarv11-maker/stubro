import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white/60 backdrop-blur-sm mt-8 border-t border-gray-200">
      <div className="container mx-auto px-4 py-4 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Studru AI by ITG SOFTWARE SOLUTIONS. All Rights Reserved.</p>
        <p className="mt-1">Empowering students with the power of AI.</p>
      </div>
    </footer>
  );
};

export default Footer;