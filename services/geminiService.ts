import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { QuizQuestion, Subject, ClassLevel, WrittenFeedback, QuestionPaper, GradedPaper, PaperQuestion } from "../types";

const API_KEY = process.env.API_KEY;

// Initialize ai, but it could be null if API_KEY is missing
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// A helper function to check if the AI service is available before making a call.
const checkAiService = () => {
    if (!ai) {
        // This error will be caught by the UI and displayed to the user.
        throw new Error("Gemini AI service is not configured. The API_KEY is missing.");
    }
};

const withTimeout = <T>(promise: Promise<T>, ms: number, context: string): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`The request for '${context}' timed out after ${ms / 1000} seconds. The server might be busy, please try again.`));
      }, ms);
  
      promise.then(
        (res) => {
          clearTimeout(timeoutId);
          resolve(res);
        },
        (err) => {
          clearTimeout(timeoutId);
          reject(err);
        }
      );
    });
};


const quizSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["mcq", "written"] },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of 4 possible answers for 'mcq' type questions."
          },
          correctAnswer: {
            type: Type.STRING,
            description: "The correct answer from the options array for 'mcq' type questions."
          },
          explanation: {
            type: Type.STRING,
            description: "A brief explanation for the correct answer."
          }
        },
        required: ["question", "type", "explanation"]
      }
    }
  },
  required: ["questions"]
};

const writtenFeedbackSchema = {
    type: Type.OBJECT,
    properties: {
        whatIsCorrect: { type: Type.STRING, description: "Feedback on what the user's answer got right." },
        whatIsMissing: { type: Type.STRING, description: "Feedback on what was missing from the user's answer." },
        whatIsIncorrect: { type: Type.STRING, description: "Feedback on what was incorrect in the user's answer." }
    },
    required: ["whatIsCorrect", "whatIsMissing", "whatIsIncorrect"]
};


export const generateQuiz = async (subject: Subject, classLevel: ClassLevel, text: string, questionCount: number = 5): Promise<QuizQuestion[]> => {
  checkAiService();
  const prompt = `You are an expert quiz creator for a ${classLevel} student. Based on the following ${subject} text, generate a quiz with exactly ${questionCount} questions. The quiz should be a mix of multiple-choice (mcq) and written-response (written) questions. For each question, provide a detailed explanation for the correct answer.

---TEXT---
${text}
---END TEXT---`;

  try {
    const apiCall = ai!.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
      },
    });

    const response = await withTimeout(apiCall, 60000, 'quiz generation');
    const jsonText = response.text;
    const data = JSON.parse(jsonText);
    return data.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
    if (error instanceof Error) throw error;
    throw new Error("Failed to generate quiz. The content might be too short or the API key may be invalid.");
  }
};

export const evaluateWrittenAnswer = async (sourceText: string, question: string, userAnswer: string): Promise<WrittenFeedback> => {
    checkAiService();
    const prompt = `You are an expert teacher evaluating a student's answer.
    Based on the provided context and question, analyze the user's answer.
    Provide constructive feedback detailing what was correct, what was missing, and what was incorrect.
    Be encouraging and focus on helping the student learn.

    ---CONTEXT---
    ${sourceText}
    ---END CONTEXT---

    ---QUESTION---
    ${question}
    ---END QUESTION---

    ---USER'S ANSWER---
    ${userAnswer}
    ---END USER'S ANSWER---`;

    try {
        const apiCall = ai!.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: writtenFeedbackSchema,
            },
        });
        const response = await withTimeout(apiCall, 45000, 'answer evaluation');
        const jsonText = response.text;
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error evaluating answer:", error);
        if (error instanceof Error) throw error;
        throw new Error("Failed to evaluate the answer. Please try again.");
    }
};

export const generateSummary = async (subject: Subject, classLevel: ClassLevel, text: string): Promise<string> => {
  checkAiService();
  const prompt = `You are an expert educator. Summarize the following ${subject} text for a ${classLevel} student. The summary should be easy to revise, highlighting the key points, definitions, and concepts. Use bullet points and markdown for clarity.

---TEXT---
${text}
---END TEXT---`;

  try {
    const apiCall = ai!.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const response = await withTimeout(apiCall, 60000, 'summary generation');
    return response.text;
  } catch (error) {
    console.error("Error generating summary:", error);
    if (error instanceof Error) throw error;
    throw new Error("Failed to generate summary. Please try again.");
  }
};

export const fetchChapterContent = async (classLevel: ClassLevel, subject: Subject, chapterInfo: string, details: string): Promise<string> => {
    checkAiService();
    const prompt = `You are a helpful research assistant. Find and provide a detailed educational summary for a student.
    - Class: ${classLevel}
    - Subject: ${subject}
    - Chapter: "${chapterInfo}"
    - Additional Details: "${details || 'Standard curriculum, e.g., NCERT for India'}"
    
    Using Google Search, find comprehensive information about this chapter and present it as a well-structured text that the student can use for studying. The text should be detailed enough to generate a quiz from. Do not just list links, provide the full content.`;
    
    try {
        const apiCall = ai!.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const response = await withTimeout(apiCall, 90000, 'chapter search');
        const text = response.text;
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        const sources = groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean);

        let sourceList = '';
        if (sources && sources.length > 0) {
            const uniqueSources = Array.from(new Map(sources.map((s: any) => [s.uri, s])).values());
            sourceList = "\n\n---\n\n**Sources:**\n";
            uniqueSources.forEach((source: {uri: string, title: string}) => {
                sourceList += `- [${source.title || source.uri}](${source.uri})\n`;
            });
        }

        return text + sourceList;
    } catch (error) {
        console.error("Error fetching chapter content:", error);
        if (error instanceof Error) throw error;
        throw new Error("Failed to find content for the chapter. Please try refining your search.");
    }
};

export const fetchYouTubeTranscript = async (youtubeUrl: string): Promise<string> => {
    checkAiService();
    const prompt = `Please act as a YouTube transcript expert. Your task is to provide a complete and accurate transcript for the video at this URL: ${youtubeUrl}.

If a direct, word-for-word transcript is available through subtitles or other means, please provide that.

If a direct transcript is not accessible, you MUST create a highly detailed, comprehensive summary of the video's content. This summary should capture all key points, spoken information, explanations, and concepts as if you were transcribing it live. The goal is to produce a text that is thorough enough for a student to study from, as if they had read the transcript itself.

The final output should be only the plain text of the transcript or the detailed summary. Do not add any extra commentary, introductions, or apologies.`;

    try {
        const apiCall = ai!.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        const response = await withTimeout(apiCall, 90000, 'YouTube transcript fetch');
        if (!response.text || response.text.trim().length < 50) {
            throw new Error("The AI could not generate a transcript or a sufficiently detailed summary for this video. It might be private, age-restricted, or have transcription disabled.");
        }
        return response.text;
    } catch (error) {
        console.error("Error fetching YouTube transcript:", error);
        if(error instanceof Error){
            throw error;
        }
        throw new Error("Failed to get transcript. The video might be private, unavailable, or the URL could be incorrect.");
    }
};

export const createChatSession = (subject: Subject, classLevel: ClassLevel, text: string): Chat => {
  checkAiService();
  const systemInstruction = `You are Studru AI, an expert tutor for a ${classLevel} student studying ${subject}. The user has provided the following study material. Your role is to answer their questions and help them understand the content better. Keep your answers clear, concise, and easy to understand. Be friendly and encouraging.

---STUDY MATERIAL---
${text}
---END STUDY MATERIAL---`;
  
  const chat = ai!.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
    }
  });
  return chat;
};

export const sendMessageStream = async (chat: Chat, message: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
  checkAiService();
  try {
    // Note: Timeout is not applied to streaming as it requires a more complex implementation.
    // The main app loading issue is addressed elsewhere.
    return await chat.sendMessageStream({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    throw new Error("Failed to get a response from the AI. Please try again.");
  }
};

const questionPaperSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A suitable title for the question paper." },
        totalMarks: { type: Type.NUMBER, description: "The total marks for the paper, matching the user's request." },
        instructions: { type: Type.STRING, description: "General instructions for the student taking the test." },
        questions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    questionType: { type: Type.STRING, enum: ["mcq", "short_answer", "long_answer"] },
                    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 4 options for MCQ questions." },
                    answer: { type: Type.STRING, description: "The correct and detailed model answer for the question. For MCQs, this should be the correct option's text." },
                    marks: { type: Type.NUMBER }
                },
                required: ["question", "questionType", "answer", "marks"]
            }
        }
    },
    required: ["title", "totalMarks", "instructions", "questions"]
};

export const generateQuestionPaper = async (
    text: string,
    numQuestions: number,
    questionTypes: string, // e.g., "A mix of MCQs and short answers"
    difficulty: string, // e.g., "easy", "medium", "hard"
    totalMarks: number
): Promise<QuestionPaper> => {
    checkAiService();
    const prompt = `You are an expert educational content creator specializing in creating exam papers. Based on the provided text, generate a question paper with the following specifications:

-   **Source Text**: Provided below.
-   **Number of Questions**: ${numQuestions}
-   **Question Types**: ${questionTypes}
-   **Difficulty Level**: ${difficulty}
-   **Total Marks**: ${totalMarks} (Distribute the marks logically among the questions).
-   **Instructions**: Create clear and standard instructions for the student.
-   **Content**: Ensure all questions are strictly derived from the provided source text. For each question, provide a detailed, correct "model" answer.

---SOURCE TEXT---
${text}
---END SOURCE TEXT---`;

    try {
        const apiCall = ai!.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: questionPaperSchema
            },
        });
        const response = await withTimeout(apiCall, 120000, 'question paper generation');
        const jsonText = response.text;
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating question paper:", error);
        if (error instanceof Error) throw error;
        throw new Error("Failed to generate question paper. The content might be too short or the request too complex.");
    }
};

const gradingSchema = {
    type: Type.OBJECT,
    properties: {
        totalMarksAwarded: { type: Type.NUMBER, description: "The sum of marks awarded for all questions." },
        overallFeedback: { type: Type.STRING, description: "A summary of the student's performance, highlighting strengths and areas for improvement." },
        gradedQuestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    questionNumber: { type: Type.NUMBER, description: "The question number (1-based index)." },
                    marksAwarded: { type: Type.NUMBER, description: "Marks awarded for this specific question." },
                    feedback: { type: Type.STRING, description: "Specific, constructive feedback on the student's answer, explaining why marks were awarded or deducted based on the model answer." }
                },
                required: ["questionNumber", "marksAwarded", "feedback"]
            }
        }
    },
    required: ["totalMarksAwarded", "overallFeedback", "gradedQuestions"]
};

export const gradeAnswerSheet = async (
    questionPaperText: string,
    answerSheetImage: { inlineData: { mimeType: string; data: string } }
): Promise<GradedPaper> => {
    checkAiService();
    const prompt = [
        {
            text: `You are an expert AI examiner. Your task is to grade a student's handwritten answer sheet based on a given question paper.
            
            First, carefully analyze the provided question paper to understand the questions, model answers, and mark allocation.
            
            Next, analyze the image of the handwritten answer sheet. Read the student's answers for each question.
            
            Compare the student's answers to the model answers from the question paper. Award marks for each question based on correctness, completeness, and key points covered. Be fair and consistent.
            
            Finally, provide detailed feedback for each question, explaining what the student did well and where they can improve. Also, provide an overall summary of their performance.
            
            Here is the Question Paper content:
            ---QUESTION PAPER---
            ${questionPaperText}
            ---END QUESTION PAPER---
            
            Now, grade the attached answer sheet image.`
        },
        answerSheetImage
    ];

    try {
        const apiCall = ai!.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: prompt },
            config: {
                responseMimeType: "application/json",
                responseSchema: gradingSchema
            }
        });
        const response = await withTimeout(apiCall, 180000, 'answer sheet grading');
        const jsonText = response.text;
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error grading answer sheet:", error);
        if (error instanceof Error) throw error;
        throw new Error("Failed to grade the answer sheet. The image might be unclear or the content could not be processed.");
    }
};