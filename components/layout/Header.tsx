import React from 'react';
import * as ReactRouterDom from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LightBulbIcon } from '../icons/LightBulbIcon';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import { ArrowLeftOnRectangleIcon } from '../icons/ArrowLeftOnRectangleIcon';
import { DocumentDuplicateIcon } from '../icons/DocumentDuplicateIcon';

const { NavLink, Link } = ReactRouterDom;

const Header: React.FC = () => {
  const { currentUser, logout, loading } = useAuth();
  const navigate = ReactRouterDom.useNavigate();

  const linkClass = "text-gray-600 hover:text-orange-600 transition-colors duration-300 px-3 py-2 rounded-md font-medium text-sm md:text-base flex items-center gap-1.5";
  const activeLinkClass = "text-orange-600 bg-orange-100";

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
      // Optionally show an error message to the user
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <NavLink to="/" className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-lg">
                <LightBulbIcon className="h-7 w-7 text-white" />
            </div>
            <div>
                <span className="text-xl font-bold text-orange-600">Studru AI</span>
                <div className="text-xs text-gray-500 -mt-1">
                    Made by Garv | ITG SOFTWARE SOLUTIONS
                </div>
            </div>
        </NavLink>
        <div className="flex items-center space-x-1 md:space-x-2">
          {loading ? (
            <Spinner className="w-5 h-5"/>
          ) : currentUser ? (
            <>
              <NavLink to="/app" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : ''}`}>
                Get Help
              </NavLink>
               <NavLink to="/question-paper" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : ''}`}>
                <DocumentDuplicateIcon className="w-4 h-4"/>
                Question Paper
              </NavLink>
              <NavLink to="/contact" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : ''}`}>
                Contact
              </NavLink>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : ''}`}>
                Home
              </NavLink>
              <NavLink to="/contact" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : ''}`}>
                Contact
              </NavLink>
              <Link to="/login">
                <Button variant='outline' size="sm" className="hidden md:flex">Login</Button>
              </Link>
              <Link to="/signup">
                <Button variant='primary' size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
