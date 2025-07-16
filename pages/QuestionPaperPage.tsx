import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { QuestionPaper, GradedPaper, PaperQuestion } from '../types';
import * as geminiService from '../services/geminiService';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Spinner from '../components/common/Spinner';
import { UploadIcon } from '../components/icons/UploadIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { CameraIcon } from '../components/icons/CameraIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { XCircleIcon } from '../components/icons/XCircleIcon';


const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });


const QuestionPaperPage: React.FC = () => {
    const [step, setStep] = useState<'input' | 'generated' | 'grading' | 'results'>('input');
    const [sourceText, setSourceText] = useState('');

    const [numQuestions, setNumQuestions] = useState(10);
    const [questionTypes, setQuestionTypes] = useState('A mix of MCQs and short answer questions');
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
    const [totalMarks, setTotalMarks] = useState(50);
    
    const [questionPaper, setQuestionPaper] = useState<QuestionPaper | null>(null);
    const [gradedPaper, setGradedPaper] = useState<GradedPaper | null>(null);
    const [answerSheetFile, setAnswerSheetFile] = useState<File | null>(null);
    const [answerSheetPreview, setAnswerSheetPreview] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    const paperRef = useRef<HTMLDivElement>(null);

    const handleGeneratePaper = async () => {
        if (sourceText.trim().length < 200) {
            setError("Please provide at least 200 characters of source text to generate a quality paper.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setLoadingMessage("Generating your question paper... This may take a moment.");
        try {
            const paper = await geminiService.generateQuestionPaper(sourceText, numQuestions, questionTypes, difficulty, totalMarks);
            setQuestionPaper(paper);
            setStep('generated');
        } catch (e) {
            setError(e instanceof Error ? e.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownloadPdf = () => {
        if (!paperRef.current) return;
        setLoadingMessage("Preparing PDF...");
        setIsLoading(true);
        html2canvas(paperRef.current, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const widthInPdf = pdfWidth - 20; // with margin
            const heightInPdf = widthInPdf / ratio;

            if (heightInPdf > pdfHeight - 20) {
              // content is too long, will need multipage logic (simplified for now)
              const pageHeight = pdfHeight - 20;
              let heightLeft = canvasHeight;
              let position = 10;
              pdf.addImage(imgData, 'PNG', 10, position, widthInPdf, heightInPdf);
              // basic split, a more robust solution would be needed for very long content
            } else {
               pdf.addImage(imgData, 'PNG', 10, 10, widthInPdf, heightInPdf);
            }
            
            pdf.save('question-paper.pdf');
            setIsLoading(false);
        });
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAnswerSheetFile(file);
            setAnswerSheetPreview(URL.createObjectURL(file));
        }
    };

    const handleGradeSheet = async () => {
        if (!answerSheetFile || !questionPaper) return;
        setError(null);
        setIsLoading(true);
        setLoadingMessage("AI is grading the answer sheet... This is complex and may take up to a minute.");

        try {
            const base64Image = await fileToBase64(answerSheetFile);
            const imagePart = {
                inlineData: {
                    mimeType: answerSheetFile.type,
                    data: base64Image
                }
            };

            const paperTextForGrading = `
                Title: ${questionPaper.title}
                Total Marks: ${questionPaper.totalMarks}
                Instructions: ${questionPaper.instructions}
                Questions:
                ${questionPaper.questions.map((q, i) => `
                    Q${i+1} (${q.marks} marks): ${q.question}
                    ${q.questionType === 'mcq' ? `Options: ${q.options?.join(', ')}` : ''}
                    Model Answer: ${q.answer}
                `).join('\n')}
            `;

            const result = await geminiService.gradeAnswerSheet(paperTextForGrading, imagePart);
            setGradedPaper(result);
            setStep('results');

        } catch (e) {
            setError(e instanceof Error ? e.message : "An unknown error occurred during grading.");
        } finally {
            setIsLoading(false);
        }
    }
    
    const renderInputStep = () => (
        <Card className="max-w-4xl mx-auto">
             <h2 className="text-2xl font-bold text-gray-800 text-center">Create a Custom Question Paper</h2>
             <p className="text-center text-gray-500 mb-8">Input your study material and set your preferences.</p>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Left Side: Customization */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Paper Settings</h3>
                    <div>
                        <label htmlFor="numQuestions" className="block text-sm font-medium text-gray-700">Number of Questions</label>
                        <input type="number" id="numQuestions" value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value))} className="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"/>
                    </div>
                     <div>
                        <label htmlFor="totalMarks" className="block text-sm font-medium text-gray-700">Total Marks</label>
                        <input type="number" id="totalMarks" value={totalMarks} onChange={e => setTotalMarks(parseInt(e.target.value))} className="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"/>
                    </div>
                    <div>
                        <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">Difficulty</label>
                        <select id="difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500">
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="questionTypes" className="block text-sm font-medium text-gray-700">Question Types (Describe)</label>
                        <input type="text" id="questionTypes" value={questionTypes} onChange={e => setQuestionTypes(e.target.value)} className="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"/>
                    </div>
                </div>

                {/* Right Side: Text Input */}
                <div>
                    <h3 className="font-semibold text-lg border-b pb-2">Source Material</h3>
                    <textarea 
                        value={sourceText}
                        onChange={e => setSourceText(e.target.value)}
                        placeholder="Paste the chapter, notes, or any study material here..."
                        className="w-full h-64 mt-2 p-3 border-2 bg-white rounded-lg focus:ring-orange-500 focus:border-orange-500 transition"
                    />
                </div>
            </div>
             {error && <p className="text-red-500 text-center font-medium py-2 mt-4">{error}</p>}
            <div className="text-center mt-8">
                <Button onClick={handleGeneratePaper} size="lg" disabled={isLoading}>
                    {isLoading ? <><Spinner/> {loadingMessage}</> : 'Generate Paper'}
                </Button>
            </div>
        </Card>
    );
    
    const renderGeneratedPaper = () => questionPaper && (
        <Card className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Your Generated Question Paper</h2>
                <div className="flex gap-2">
                     <Button onClick={handleDownloadPdf} variant="secondary" size="sm" disabled={isLoading}>
                        {isLoading ? <Spinner/> : <><DownloadIcon className="w-4 h-4"/> Download PDF</>}
                     </Button>
                     <Button onClick={() => setStep('input')} variant="outline" size="sm">Start Over</Button>
                </div>
            </div>

            <div ref={paperRef} className="p-8 bg-white border rounded-lg">
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold">{questionPaper.title}</h3>
                    <p className="text-sm font-semibold">Total Marks: {questionPaper.totalMarks}</p>
                </div>
                <div className="mb-6">
                    <h4 className="font-bold">Instructions:</h4>
                    <p className="text-sm whitespace-pre-wrap">{questionPaper.instructions}</p>
                </div>
                <div className="space-y-4">
                    {questionPaper.questions.map((q, index) => (
                        <div key={index} className="pb-2">
                            <div className="flex justify-between items-baseline">
                                <p className="font-semibold">{index + 1}. {q.question}</p>
                                <p className="text-sm font-bold">[{q.marks}]</p>
                            </div>
                            {q.questionType === 'mcq' && q.options && (
                                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                    {q.options.map((opt, i) => <p key={i}>({String.fromCharCode(97 + i)}) {opt}</p>)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

             <div className="mt-8">
                <h2 className="text-xl font-bold text-center mb-4">Ready to Grade?</h2>
                <Card className="bg-amber-50 border-amber-200 border">
                    <p className="text-center text-amber-800 font-medium">Solve the paper, take a clear picture of your answers, and upload it here.</p>
                    <div className="mt-4 flex flex-col items-center justify-center gap-4">
                        <div className="w-full max-w-md p-4 border-2 bg-white rounded-lg flex flex-col items-center justify-center border-dashed border-gray-300">
                             <input id="answer-upload" type="file" onChange={handleFileChange} accept="image/*" className="hidden"/>
                             <label htmlFor="answer-upload" className="text-orange-600 font-semibold cursor-pointer hover:underline flex items-center gap-2">
                                <CameraIcon className="w-5 h-5"/>
                                {answerSheetFile ? answerSheetFile.name : "Upload Photo of Answer Sheet"}
                             </label>
                        </div>
                        {answerSheetPreview && <img src={answerSheetPreview} alt="Answer sheet preview" className="max-h-48 rounded-lg border shadow-sm"/>}
                        <Button onClick={handleGradeSheet} disabled={!answerSheetFile || isLoading}>
                            {isLoading ? <><Spinner/> {loadingMessage}</> : 'Grade My Paper with AI'}
                        </Button>
                    </div>
                </Card>
            </div>
            {error && <p className="text-red-500 text-center font-medium py-2 mt-4">{error}</p>}
        </Card>
    );

    const renderResults = () => gradedPaper && (
        <Card className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Grading Results</h2>
                <Button onClick={() => setStep('input')} variant="outline">Start New Paper</Button>
            </div>

            <Card className="bg-orange-50 border-orange-200 text-center mb-6">
                <h3 className="text-lg font-semibold">Overall Score</h3>
                <p className="text-4xl font-bold my-2 text-orange-600">
                    {gradedPaper.totalMarksAwarded} / {questionPaper?.totalMarks}
                </p>
                <h4 className="font-semibold mt-4">AI Feedback:</h4>
                <p className="text-sm text-gray-700">{gradedPaper.overallFeedback}</p>
            </Card>

            <h3 className="text-xl font-bold mb-4">Detailed Breakdown</h3>
            <div className="space-y-4">
                {gradedPaper.gradedQuestions.map((gq) => {
                    const originalQuestion = questionPaper?.questions[gq.questionNumber - 1];
                    return (
                    <Card key={gq.questionNumber} className="!shadow-md">
                        <div className="flex justify-between items-start">
                             <p className="font-semibold text-gray-800">{gq.questionNumber}. {originalQuestion?.question}</p>
                             <p className="font-bold text-lg text-orange-500 whitespace-nowrap ml-4">
                                {gq.marksAwarded}/{originalQuestion?.marks}
                             </p>
                        </div>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                           <h5 className="font-semibold text-sm flex items-center gap-1.5"><CheckCircleIcon className="w-5 h-5 text-green-500"/> AI Feedback</h5>
                           <p className="text-sm text-gray-600 mt-1">{gq.feedback}</p>
                        </div>
                         <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                           <h5 className="font-semibold text-sm text-amber-800">Model Answer</h5>
                           <p className="text-sm text-amber-900 mt-1">{originalQuestion?.answer}</p>
                        </div>
                    </Card>
                )})}
            </div>
        </Card>
    );

    const renderCurrentStep = () => {
        switch(step) {
            case 'input': return renderInputStep();
            case 'generated': return renderGeneratedPaper();
            case 'results': return renderResults();
            default: return renderInputStep();
        }
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                 <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Question Paper Generator</h1>
                 <p className="mt-2 text-gray-600 max-w-3xl mx-auto">
                    Create, download, and get AI-powered grading for custom exam papers from your study material.
                 </p>
            </div>
            {renderCurrentStep()}
        </div>
    );
};

export default QuestionPaperPage;