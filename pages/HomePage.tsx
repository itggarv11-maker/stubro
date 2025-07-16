import React from 'react';
import * as ReactRouterDom from 'react-router-dom';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { BookOpenIcon } from '../components/icons/BookOpenIcon';
import { LightBulbIcon } from '../components/icons/LightBulbIcon';
import { DocumentTextIcon } from '../components/icons/DocumentTextIcon';

const { Link } = ReactRouterDom;

const HomePage: React.FC = () => {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative text-center py-16 overflow-hidden rounded-xl shadow-lg bg-amber-50">
        <div className="absolute top-0 left-0 w-full h-full z-0 bg-gradient-to-br from-orange-200/30 via-amber-100/30 to-amber-50/30" />
        <div className="relative z-10 p-4">
            <h1 className="text-4xl md:text-6xl font-extrabold text-orange-600">
              Supercharge Your Studies
            </h1>
            <p className="mt-4 text-lg md:text-xl text-gray-800 max-w-3xl mx-auto font-medium">
              From confusing chapters to instant quizzes, Studru AI is your personal tutor. Paste text, upload files, or use YouTube videos to get summaries, Q&A, and practice tests in seconds.
            </p>
            <div className="mt-8">
              <Link to="/app">
                <Button size="lg" className="text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transform transition-all duration-300">
                    Get Started for Free
                </Button>
              </Link>
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Everything You Need to Succeed</h2>
          <p className="mt-2 text-gray-600">All powered by cutting-edge AI, tailored for you.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center">
            <div className="mx-auto bg-orange-100 text-orange-600 rounded-full h-16 w-16 flex items-center justify-center">
              <DocumentTextIcon className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">Instant Summaries</h3>
            <p className="mt-2 text-gray-500">
              Turn long chapters from texts, PDFs, or videos into key points for quick revision.
            </p>
          </Card>
          <Card className="text-center">
            <div className="mx-auto bg-amber-100 text-amber-600 rounded-full h-16 w-16 flex items-center justify-center">
              <LightBulbIcon className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">Advanced Quizzes</h3>
            <p className="mt-2 text-gray-500">
              Generate mixed-type quizzes and get detailed feedback on your written answers.
            </p>
          </Card>
          <Card className="text-center">
            <div className="mx-auto bg-green-100 text-green-600 rounded-full h-16 w-16 flex items-center justify-center">
              <BookOpenIcon className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">Solve Doubts 24/7</h3>
            <p className="mt-2 text-gray-500">
              Ask any question about your study material and get clear, simple answers instantly.
            </p>
          </Card>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-12 bg-white rounded-xl shadow-md">
        <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Get Help in 3 Simple Steps</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 text-center px-8">
            <div className="flex flex-col items-center">
                <div className="text-5xl font-bold text-orange-200">1</div>
                <h3 className="text-xl font-semibold mt-2">Select Class & Subject</h3>
                <p className="text-gray-500 mt-1">Personalize the AI for your academic level.</p>
            </div>
            <div className="flex flex-col items-center">
                <div className="text-5xl font-bold text-orange-200">2</div>
                <h3 className="text-xl font-semibold mt-2">Provide Content</h3>
                <p className="text-gray-500 mt-1">Paste text, upload a file (PDF, DOCX), or use a YouTube link.</p>
            </div>
            <div className="flex flex-col items-center">
                <div className="text-5xl font-bold text-orange-200">3</div>
                <h3 className="text-xl font-semibold mt-2">Learn Smarter</h3>
                <p className="text-gray-500 mt-1">Chat, get quizzes with feedback, and summarize with AI help.</p>
            </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
