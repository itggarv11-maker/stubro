import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Subject, QuizQuestion, ChatMessage, ClassLevel } from '../types';
import { SUBJECTS, CLASS_LEVELS } from '../constants';
import * as geminiService from '../services/geminiService';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import Card from '../components/common/Card';
import { Chat } from '@google/genai';
import QuizComponent from '../components/app/QuizComponent';
import { UploadIcon } from '../components/icons/UploadIcon';
import { YouTubeIcon } from '../components/icons/YouTubeIcon';
import { ClipboardIcon } from '../components/icons/ClipboardIcon';
import { SearchIcon } from '../components/icons/SearchIcon';
import * as pdfjs from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Required for pdf.js to work
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;


type ActiveTab = 'chat' | 'quiz' | 'summary';
type ContentSource = 'paste' | 'file' | 'youtube' | 'search';

const AppPage: React.FC = () => {
    // Setup State
    const [step, setStep] = useState(1);
    const [classLevel, setClassLevel] = useState<ClassLevel>('Class 10');
    const [subject, setSubject] = useState<Subject | null>(null);
    const [contentSource, setContentSource] = useState<ContentSource>('paste');
    const [pastedText, setPastedText] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [fileName, setFileName] = useState('');
    const [chapterInfo, setChapterInfo] = useState('');
    const [chapterDetails, setChapterDetails] = useState('');
    
    // Core App State
    const [extractedText, setExtractedText] = useState<string>('');
    const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState('Processing...');
    const [error, setError] = useState<string | null>(null);

    // AI Content State
    const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [userMessage, setUserMessage] = useState('');
    const [quizQuestionCount, setQuizQuestionCount] = useState<number>(5);


    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const handleSourceChange = (newSource: ContentSource) => {
        setContentSource(newSource);
        setError(null);
        // Clear dynamic data to prevent showing stale content from another source
        setExtractedText('');
        setFileName('');
        setChapterInfo('');
        setChapterDetails('');
        // We keep youtubeUrl and pastedText to preserve user input across tabs.
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setExtractedText(''); // Clear previous text
        setIsLoading(true);
        setFileName(file.name);
        setLoadingMessage('Reading file...');

        try {
            let text = '';
            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjs.getDocument(arrayBuffer).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map((item: any) => item.str).join(' ');
                }
            } else if (file.type.includes('wordprocessingml')) { // .docx
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                text = result.value;
            } else { // .txt and others
                text = await file.text();
            }
            setExtractedText(text);
        } catch (err) {
            setError('Failed to process file. It might be corrupted or in an unsupported format.');
            setFileName('');
            setExtractedText('');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleYoutubeFetch = async () => {
        if(!youtubeUrl) {
            setError("Please enter a YouTube URL.");
            return;
        }
        setError(null);
        setExtractedText('');
        setIsLoading(true);
        setLoadingMessage('Fetching transcript...');

        try {
            new URL(youtubeUrl); // Basic URL validation
            const text = await geminiService.fetchYouTubeTranscript(youtubeUrl);
            setExtractedText(text);
        } catch (err) {
            let message = 'An unknown error occurred while fetching the transcript.';
            if (err instanceof TypeError) {
                message = "Invalid YouTube URL provided.";
            } else if (err instanceof Error) {
                message = err.message;
            }
            setError(message);
            setExtractedText('');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChapterSearch = async () => {
        if (!chapterInfo || !subject) {
            setError("Please select a subject and enter a chapter name.");
            return;
        }
        setError(null);
        setExtractedText('');
        setIsLoading(true);
        setLoadingMessage('Finding chapter...');

        try {
            const text = await geminiService.fetchChapterContent(classLevel, subject, chapterInfo, chapterDetails);
            if (!text || text.trim().length < 50) {
                 throw new Error("Could not find sufficient content for this chapter. Please try being more specific.");
            }
            setExtractedText(text);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred while finding the chapter.');
            setExtractedText('');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartSession = () => {
        let currentText = '';
        if (contentSource === 'paste') {
            currentText = pastedText;
        } else {
            currentText = extractedText;
        }

        if (!subject || currentText.trim().length < 100) {
            setError("Please select a subject and provide sufficient content (at least 100 characters).");
            return;
        }
        
        setError(null);
        setQuiz(null);
        setSummary(null);
        setChatHistory([]);
        setActiveTab('chat');
        setExtractedText(currentText); // Finalize the text
        
        setIsLoading(true);
        setLoadingMessage('Initializing AI session...');
        try {
            const session = geminiService.createChatSession(subject, classLevel, currentText);
            setChatSession(session);
            setChatHistory([{ role: 'model', text: `Hi there! I'm ready to help you with ${subject} for ${classLevel}. Ask me anything about your notes.` }]);
            setStep(2);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to initialize AI session.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleStartOver = () => {
        setStep(1);
        setQuiz(null); // Clear quiz when starting over
    }

    const handleTabClick = async (tab: ActiveTab) => {
        setActiveTab(tab);
        if (!subject) return;

        if (tab === 'summary' && !summary) {
            setIsLoading(true);
            setLoadingMessage('Creating your summary...');
            setError(null);
            try {
                const generatedSummary = await geminiService.generateSummary(subject, classLevel, extractedText);
                setSummary(generatedSummary);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleGenerateQuiz = async () => {
        if (!subject) return;
        setIsLoading(true);
        setLoadingMessage('Generating your quiz...');
        setError(null);
        try {
            const generatedQuiz = await geminiService.generateQuiz(subject, classLevel, extractedText, quizQuestionCount);
            setQuiz(generatedQuiz);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userMessage.trim() || !chatSession || isLoading) return;

        const newUserMessage: ChatMessage = { role: 'user', text: userMessage };
        setChatHistory(prev => [...prev, newUserMessage]);
        setUserMessage('');
        setIsLoading(true);
        setError(null);
        
        try {
            const stream = await geminiService.sendMessageStream(chatSession, userMessage);
            let modelResponse = '';
            setChatHistory(prev => [...prev, { role: 'model', text: '' }]);
            
            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1].text = modelResponse;
                    return newHistory;
                });
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setChatHistory(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
        }
    };

    const renderSetup = () => (
        <Card className="!p-4 md:!p-8">
            <div className="space-y-8">
                {/* Step 1: Class & Subject */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-lg font-semibold text-gray-700 block mb-3">1. Select Your Class</label>
                        <select
                            value={classLevel}
                            onChange={(e) => setClassLevel(e.target.value as ClassLevel)}
                            className="w-full p-3 bg-white border-2 border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 transition"
                        >
                            {CLASS_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-lg font-semibold text-gray-700 block mb-3">2. Select a Subject</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {SUBJECTS.map(({ name, icon }) => (
                                <button
                                    key={name}
                                    onClick={() => setSubject(name)}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 text-sm transform hover:-translate-y-0.5 ${subject === name ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white hover:bg-orange-50 hover:border-orange-300'}`}
                                >
                                    {icon}
                                    <span className="font-medium">{name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Step 2: Content */}
                <div>
                    <label className="text-lg font-semibold text-gray-700 block mb-3">3. Provide Your Content</label>
                    <div className="flex space-x-1 rounded-t-lg bg-gray-200 p-1 w-full md:w-auto">
                        {(['paste', 'file', 'youtube', 'search'] as ContentSource[]).map(source => (
                            <button
                                key={source}
                                onClick={() => handleSourceChange(source)}
                                className={`flex items-center gap-2 w-full justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${contentSource === source ? 'bg-white text-orange-600 shadow' : 'text-gray-600 hover:bg-white/50'}`}
                            >
                                {source === 'paste' && <ClipboardIcon className="w-5 h-5" />}
                                {source === 'file' && <UploadIcon className="w-5 h-5" />}
                                {source === 'youtube' && <YouTubeIcon className="w-5 h-5" />}
                                {source === 'search' && <SearchIcon className="w-5 h-5" />}
                                <span className="capitalize">{source}</span>
                            </button>
                        ))}
                    </div>
                    <div className="bg-white p-4 rounded-b-lg border-x border-b border-gray-200">
                        {contentSource === 'paste' &&
                            <textarea
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                placeholder="Paste your notes, a chapter, or any text here..."
                                className="w-full h-40 p-3 border-2 bg-white rounded-lg focus:ring-orange-500 focus:border-orange-500 transition"
                            />
                        }
                        {contentSource === 'file' &&
                            <div className="w-full h-40 p-3 border-2 bg-white rounded-lg flex flex-col items-center justify-center border-dashed border-gray-300">
                                <UploadIcon className="w-10 h-10 text-gray-400 mb-2"/>
                                <input id="file-upload" type="file" onChange={handleFileChange} accept=".pdf,.txt,.docx" className="hidden"/>
                                <label htmlFor="file-upload" className="text-orange-600 font-semibold cursor-pointer hover:underline">
                                    {fileName || "Choose a PDF, DOCX, or TXT file"}
                                </label>
                                <p className="text-xs text-gray-500 mt-1">{fileName ? `(File ready to be processed)` : `(Your file will be processed in the browser)`}</p>
                            </div>
                        }
                        {contentSource === 'youtube' &&
                            <div className="w-full h-40 p-3 bg-white rounded-lg flex flex-col justify-center gap-3">
                                <input
                                    type="url"
                                    value={youtubeUrl}
                                    onChange={e => setYoutubeUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full p-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 transition"
                                />
                                <Button onClick={handleYoutubeFetch} disabled={isLoading} variant="secondary">
                                    {isLoading && loadingMessage.includes('Fetching') ? <Spinner /> : 'Fetch Transcript'}
                                </Button>
                                {extractedText && !isLoading && <p className="text-sm text-green-600 text-center font-semibold">Transcript loaded successfully!</p>}
                            </div>
                        }
                        {contentSource === 'search' &&
                            <div className="w-full h-40 p-3 bg-white rounded-lg flex flex-col justify-center gap-3">
                                <input
                                    type="text"
                                    value={chapterInfo}
                                    onChange={e => setChapterInfo(e.target.value)}
                                    placeholder="Chapter name or number (e.g., 'Cell' or 'Ch 1')"
                                    className="w-full p-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 transition"
                                />
                                <input
                                    type="text"
                                    value={chapterDetails}
                                    onChange={e => setChapterDetails(e.target.value)}
                                    placeholder="Optional details (e.g., NCERT, CBSE, author)"
                                    className="w-full p-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 transition"
                                />
                                 <Button onClick={handleChapterSearch} disabled={isLoading || !chapterInfo} variant="secondary">
                                     {isLoading && loadingMessage.includes('Finding') ? <Spinner /> : 'Find Chapter Content'}
                                 </Button>
                                {extractedText && !isLoading && <p className="text-sm text-green-600 text-center font-semibold">Chapter content loaded successfully!</p>}
                            </div>
                        }
                    </div>
                </div>
                
                {error && <p className="text-red-500 text-center font-medium py-2">{error}</p>}
                
                <div className="text-center pt-4">
                    <Button onClick={handleStartSession} disabled={isLoading || !subject} size="lg">
                        {isLoading ? <><Spinner/> {loadingMessage}</> : 'Start Learning Session'}
                    </Button>
                </div>
            </div>
        </Card>
    );

    const renderLearningSession = () => (
         <Card className="!p-4 md:!p-8">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-orange-600">Learning Session</h2>
                    <p className="text-gray-500">{subject} for {classLevel}</p>
                </div>
                <Button onClick={handleStartOver} variant="outline">Start Over</Button>
            </div>

            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button onClick={() => handleTabClick('chat')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'chat' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Chat / Q&A</button>
                <button onClick={() => handleTabClick('quiz')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'quiz' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Generate Quiz</button>
                <button onClick={() => handleTabClick('summary')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'summary' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Summarize Notes</button>
              </nav>
            </div>

            <div className="mt-6 min-h-[500px]">
              {error && <p className="text-red-500 text-center font-medium">{error}</p>}
              
              {!error && (
                <>
                  {activeTab === 'chat' && (
                    <>
                    {isLoading && <div className="flex flex-col justify-center items-center py-10 gap-4"><Spinner className="w-12 h-12"/><p className="text-gray-600">{loadingMessage}</p></div>}
                    <div className="flex flex-col h-[500px] bg-gray-50 rounded-lg border border-gray-200">
                      <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                        {chatHistory.map((msg, index) => (
                          <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">AI</span>}
                            <div className={`max-w-xl p-3 rounded-lg shadow-sm ${msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-white'}`}>
                                <p className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }}/>
                            </div>
                            {msg.role === 'user' && <span className="flex-shrink-0 w-8 h-8 bg-amber-400 text-white rounded-full flex items-center justify-center font-bold text-sm">You</span>}
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleSendMessage} className="p-4 border-t bg-white rounded-b-lg flex gap-2">
                        <input
                          type="text"
                          value={userMessage}
                          onChange={(e) => setUserMessage(e.target.value)}
                          placeholder="Ask a question about your notes..."
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                        />
                        <Button type="submit" disabled={isLoading || !userMessage.trim()}>Send</Button>
                      </form>
                    </div>
                    </>
                  )}

                  {activeTab === 'quiz' && (
                    isLoading ? (
                      <div className="flex flex-col justify-center items-center py-10 gap-4"><Spinner className="w-12 h-12"/><p className="text-gray-600">{loadingMessage}</p></div>
                    ) : quiz ? (
                      <QuizComponent questions={quiz} sourceText={extractedText} />
                    ) : (
                      <Card className="max-w-md mx-auto text-center">
                        <h3 className="text-xl font-bold mb-4">Customize Your Quiz</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="question-count" className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
                                <input
                                    type="number"
                                    id="question-count"
                                    value={quizQuestionCount}
                                    onChange={(e) => setQuizQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
                                    min="1"
                                    max="20"
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                />
                            </div>
                            <Button onClick={handleGenerateQuiz}>Generate Quiz</Button>
                        </div>
                      </Card>
                    )
                  )}

                  {activeTab === 'summary' && (
                    isLoading ? <div className="flex flex-col justify-center items-center py-10 gap-4"><Spinner className="w-12 h-12"/><p className="text-gray-600">{loadingMessage}</p></div> :
                    summary && (
                      <Card>
                        <h3 className="text-xl font-bold mb-4">Summary of Your Notes</h3>
                        <div className="prose prose-orange max-w-none" dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br />') }}></div>
                      </Card>
                    )
                  )}
                </>
              )}
            </div>
        </Card>
    );

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Your AI Study Buddy</h1>
                <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
                    {step === 1 
                        ? "Select your class and subject, then provide your study material to get started."
                        : "Your session is ready. Use the tabs below to interact with your content."
                    }
                </p>
            </div>
            {step === 1 ? renderSetup() : renderLearningSession()}
        </div>
    );
};

export default AppPage;