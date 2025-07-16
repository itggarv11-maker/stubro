import React, { useState } from 'react';
import * as ReactRouterDom from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/common/Spinner';

const { Link } = ReactRouterDom;

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = ReactRouterDom.useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/app');
    } catch (err: any) {
      if (err.message.includes("Firebase is not configured")) {
        setError(err.message);
      } else {
        setError('Failed to log in. Please check your email and password.');
      }
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome Back!</h1>
          <p className="mt-2 text-gray-600">Log in to continue your learning journey.</p>
        </div>
        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-center mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
          </div>
          <div className="text-center">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : 'Log In'}
            </Button>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-orange-600 hover:text-orange-500">
            Sign Up
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default LoginPage;
