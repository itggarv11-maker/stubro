import React, { useState } from 'react';
import { QuizQuestion, WrittenFeedback } from '../../types';
import * as geminiService from '../../services/geminiService';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import Card from '../common/Card';
import { SpeakerWaveIcon } from '../icons/SpeakerWaveIcon';
import { LightBulbIcon } from '../icons/LightBulbIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import { PencilSquareIcon } from '../icons/PencilSquareIcon';

interface QuizComponentProps {
    questions: QuizQuestion[];
    sourceText: string;
}

const QuizComponent: React.FC<QuizComponentProps> = ({ questions, sourceText }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [writtenAnswer, setWrittenAnswer] = useState('');
    const [feedback, setFeedback] = useState<WrittenFeedback | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [answeredQuestions, setAnsweredQuestions] = useState<QuizQuestion[]>([]);

    const currentQuestion = questions[currentQuestionIndex];
    const isMCQ = currentQuestion.type === 'mcq';

    const handleSpeak = (textToSpeak: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Sorry, your browser doesn't support text-to-speech.");
        }
    };

    const handleCheckAnswer = async () => {
        let updatedQuestion: QuizQuestion;
        if (isMCQ) {
            if (!selectedOption) return;
            const isAnswerCorrect = selectedOption === currentQuestion.correctAnswer;
            updatedQuestion = { ...currentQuestion, userAnswer: selectedOption, isCorrect: isAnswerCorrect };
            setAnsweredQuestions(prev => [...prev, updatedQuestion]);
            setShowResult(true);
        } else { // Written question
            if (!writtenAnswer.trim()) return;
            setIsLoading(true);
            updatedQuestion = { ...currentQuestion, userAnswer: writtenAnswer, isCorrect: undefined };
            try {
                const evalFeedback = await geminiService.evaluateWrittenAnswer(sourceText, currentQuestion.question, writtenAnswer);
                setFeedback(evalFeedback);
            } catch (error) {
                console.error(error);
                setFeedback({ whatIsCorrect: 'Could not get feedback.', whatIsMissing: '', whatIsIncorrect: '' });
            } finally {
                setIsLoading(false);
                setAnsweredQuestions(prev => [...prev, updatedQuestion]);
                setShowResult(true);
            }
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            resetStateForNextQuestion();
        } else {
            setIsFinished(true);
        }
    };
    
    const resetStateForNextQuestion = () => {
        setSelectedOption(null);
        setWrittenAnswer('');
        setFeedback(null);
        setShowResult(false);
        setIsLoading(false);
    }
    
    const resetQuiz = () => {
        setCurrentQuestionIndex(0);
        resetStateForNextQuestion();
        setAnsweredQuestions([]);
        setIsFinished(false);
    }

    if (isFinished) {
        const correctAnswersCount = answeredQuestions.filter(q => q.type === 'mcq' && q.isCorrect).length;
        const mcqQuestionsCount = questions.filter(q => q.type === 'mcq').length;
    
        return (
            <Card className="text-left !p-4 md:!p-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-orange-600">Quiz Complete!</h2>
                    <p className="mt-2 text-gray-600">
                        You scored <span className="font-bold">{correctAnswersCount} out of {mcqQuestionsCount}</span> on the multiple-choice questions.
                    </p>
                    <p className="text-sm text-gray-500">Review your answers below.</p>
                </div>
                
                <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {questions.map((q, index) => {
                        const answeredQ = answeredQuestions[index];
                        const isCorrectMCQ = q.type === 'mcq' && answeredQ?.isCorrect === true;
                        
                        let borderColor = 'border-gray-300';
                        if (answeredQ) {
                            if (q.type === 'mcq') {
                                borderColor = isCorrectMCQ ? 'border-green-400' : 'border-red-400';
                            } else {
                                borderColor = 'border-blue-300';
                            }
                        }

                        return (
                            <Card key={index} className={`!shadow-md !p-4 border-2 ${borderColor}`}>
                                <p className="font-semibold">{index + 1}. {q.question}</p>
                                {q.type === 'mcq' && answeredQ && (
                                    <div className="mt-2 text-sm space-y-1">
                                        <p className={`p-2 rounded-md ${isCorrectMCQ ? 'bg-green-50' : 'bg-red-50'}`}>
                                            Your answer: <span className="font-bold">{answeredQ.userAnswer}</span>
                                            {isCorrectMCQ ? 
                                                <CheckCircleIcon className="inline w-4 h-4 ml-2 text-green-600" /> :
                                                <XCircleIcon className="inline w-4 h-4 ml-2 text-red-600" />
                                            }
                                        </p>
                                        {!isCorrectMCQ && <p className="p-2 rounded-md bg-green-50">Correct answer: <span className="font-bold">{q.correctAnswer}</span></p>}
                                    </div>
                                )}
                                 {q.type === 'written' && answeredQ && (
                                    <div className="mt-2 text-sm space-y-1">
                                        <p className="font-bold">Your answer:</p>
                                        <p className="text-sm p-2 bg-gray-50 rounded border">{answeredQ.userAnswer}</p>
                                    </div>
                                )}
                                <div className="mt-2 text-xs p-2 bg-amber-50 rounded border border-amber-200">
                                    <strong>Explanation:</strong> {q.explanation}
                                </div>
                            </Card>
                        )
                    })}
                </div>
    
                <div className="mt-6 text-center">
                    <Button onClick={resetQuiz}>Take Quiz Again</Button>
                </div>
            </Card>
        );
    }

    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
        <div className="space-y-4">
            {/* Progress Bar */}
            <div>
                <div className="flex justify-between mb-1">
                    <span className="text-base font-medium text-orange-700">Progress</span>
                    <span className="text-sm font-medium text-orange-700">{currentQuestionIndex + 1} of {questions.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-orange-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <Card className="!shadow-none border border-gray-200">
                <div className="flex justify-between items-start">
                    <p className="font-semibold text-lg mb-4">{currentQuestionIndex + 1}. {currentQuestion.question}</p>
                    <button onClick={() => handleSpeak(currentQuestion.question)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><SpeakerWaveIcon className="w-5 h-5"/></button>
                </div>
                
                {/* Answer Area */}
                <div className="space-y-3">
                    {isMCQ && currentQuestion.options?.map((option, j) => (
                        <button
                            key={j}
                            onClick={() => setSelectedOption(option)}
                            disabled={showResult}
                            className={`w-full p-3 rounded-lg text-left border-2 transition-all ${
                                selectedOption === option ? 'border-orange-500 bg-orange-100 ring-2 ring-orange-300' : 'border-gray-200 bg-white hover:bg-gray-50'
                            } ${showResult && option === currentQuestion.correctAnswer ? '!bg-green-100 !border-green-500' : ''} ${showResult && selectedOption === option && option !== currentQuestion.correctAnswer ? '!bg-red-100 !border-red-500' : ''}`}
                        >
                            {option}
                        </button>
                    ))}
                    {!isMCQ && (
                         <textarea
                            value={writtenAnswer}
                            onChange={(e) => setWrittenAnswer(e.target.value)}
                            disabled={showResult}
                            placeholder="Type your answer here..."
                            rows={5}
                            className="w-full p-3 border-2 bg-white rounded-lg focus:ring-orange-500 focus:border-orange-500 transition"
                        />
                    )}
                </div>

                {/* Action/Feedback Area */}
                <div className="mt-4">
                    {!showResult ? (
                        <div className="text-right">
                            <Button onClick={handleCheckAnswer} variant="secondary" disabled={isLoading || (isMCQ && !selectedOption) || (!isMCQ && !writtenAnswer.trim())}>
                                {isLoading ? <Spinner/> : 'Check Answer'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Explanation Card */}
                            <Card className="bg-amber-50 border-amber-200 border">
                                <h4 className="font-bold text-amber-700 flex items-center gap-2"><LightBulbIcon className="w-5 h-5"/> Explanation</h4>
                                <p className="mt-2 text-sm text-amber-800">{currentQuestion.explanation}</p>
                            </Card>

                            {/* Written Feedback Card */}
                            {!isMCQ && feedback && (
                                <Card className="bg-gray-50 border-gray-200 border">
                                    <h4 className="font-bold text-gray-700 flex items-center gap-2"><PencilSquareIcon className="w-5 h-5"/> Your Feedback</h4>
                                    <div className="mt-2 space-y-2 text-sm text-gray-800">
                                       <div className="flex gap-2"><CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" /> <p><strong>What's Correct:</strong> {feedback.whatIsCorrect}</p></div>
                                       <div className="flex gap-2"><XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" /> <p><strong>What's Missing/Incorrect:</strong> {feedback.whatIsMissing} {feedback.whatIsIncorrect}</p></div>
                                    </div>
                                </Card>
                            )}

                            <div className="text-right">
                                <Button onClick={handleNextQuestion}>
                                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

export default QuizComponent;