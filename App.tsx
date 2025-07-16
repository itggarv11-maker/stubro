import React from 'react';
import * as ReactRouterDom from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import AppPage from './pages/AppPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import QuestionPaperPage from './pages/QuestionPaperPage';

const { HashRouter, Route, Routes } = ReactRouterDom;

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/app" element={
                <ProtectedRoute>
                  <AppPage />
                </ProtectedRoute>
              } />
              <Route path="/question-paper" element={
                <ProtectedRoute>
                  <QuestionPaperPage />
                </ProtectedRoute>
              } />
              <Route path="/contact" element={<ContactPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
