import Exam from '../models/Exam.js';

import Document from '../models/Documents.js';
import Question from '../models/Question.js';
import Result from '../models/Result.js';
import { uploadFileToGemini, waitForFileActive, generateQuestions, deleteFileFromGemini } from '../services/aiService.js';
import fs from 'fs';
import AILog from '../models/AILog.js';

export const createExam = async (req, res) => {
    try {
        const { title, numQuestions, documentId, questionConfig } = req.body;
        const file = req.file;
        
        // Parse config if it exists (it comes as a string from FormData)
        let parsedConfig = null;
        if (questionConfig) {
            try {
                parsedConfig = JSON.parse(questionConfig);
            } catch (e) {
                console.error("Failed to parse questionConfig", e);
            }
        }

        let docId = null;
        let filePath = null;
        let mimeType = null;
        let originalName = null;

        if (file) {
            // Case 1: New file upload
            const newDoc = new Document({
                originalName: file.originalname,
                mimeType: file.mimetype,
                path: file.path,
                size: file.size,
                creator: req.user.userId
            });
            await newDoc.save();
            docId = newDoc._id;
            filePath = file.path;
            mimeType = file.mimetype;
            originalName = file.originalname;
        } else if (documentId) {
            // Case 2: Reuse existing document
            const existingDoc = await Document.findById(documentId);
            if (!existingDoc) {
                return res.status(404).json({ message: 'Document not found' });
            }
            // Optional: Check ownership if documents are private
            if (existingDoc.creator && existingDoc.creator.toString() !== req.user.userId) {
                 return res.status(403).json({ message: 'Not authorized to use this document' });
            }
            
            docId = existingDoc._id;
            filePath = existingDoc.path;
            mimeType = existingDoc.mimeType;
            originalName = existingDoc.originalName;
        } else {
             return res.status(400).json({ message: 'No file or documentId provided' });
        }

        if (!title || !numQuestions) {
            return res.status(400).json({ message: 'Title and number of questions are required' });
        }

        const newExam = new Exam({
            title,
            creator: req.user.userId,
            documents: [docId],
            status: 'processing',
            timeLimit: req.body.timeLimit ? parseInt(req.body.timeLimit) : null
        });
        await newExam.save();
        
        // Re-upload to Gemini (or pass URI if cached, but we delete usually)
        const geminiFile = await uploadFileToGemini(filePath, mimeType, originalName);
        await waitForFileActive(geminiFile.name);

        const apiRequestDate = new Date();
        const generatedData = await generateQuestions(geminiFile.uri, parseInt(numQuestions), parsedConfig);
        const responseDate = new Date();
        const durationMs = responseDate - apiRequestDate;

        // Log to DB
        try {
            await AILog.create({
                documentId: newExam.documents[0], // Assuming single doc for now
                user: req.user.userId,
                prompt: `Generate ${numQuestions} questions (Config: ${JSON.stringify(parsedConfig)})`,
                response: generatedData,
                apiRequestDate,
                responseDate,
                durationMs
            });
        } catch (logError) {
            console.error("Failed to save AI Log:", logError);
            // Don't fail the request just because logging failed
        }

        console.log("AI Generated Data:", JSON.stringify(generatedData, null, 2));

        const normalizeQuestions = (qs, isBonus) => (qs || []).map(q => ({
            exam: newExam._id,
            type: q.type,
            variations: (q.variations || []).map(v => ({
                text: v.text || v.question || "Question text missing", // Fallback for common AI mishallucinations
                options: v.options || [],
                correctAnswers: v.correctAnswers || []
            })),
            isBonus
        }));

        const mainQuestions = normalizeQuestions(generatedData.questions, false);
        const bonusQuestions = normalizeQuestions(generatedData.bonusQuestions, true);

        const questionsToInsert = [...mainQuestions, ...bonusQuestions];
        
        // Final sanity check before insert
        questionsToInsert.forEach((q, i) => {
            if (!q.variations || q.variations.length === 0) {
                 console.warn(`Question ${i} has no variations`);
            }
            q.variations.forEach((v, vi) => {
                if (!v.text) console.error(`Question ${i} Variation ${vi} missing text:`, v);
            });
        });
        await Question.insertMany(questionsToInsert);

        newExam.status = 'ready';
        await newExam.save();

        await deleteFileFromGemini(geminiFile.name);
        
        res.status(201).json({ message: 'Exam created successfully', exam: newExam });

    } catch (error) {
        console.error('Create Exam Error:', error);
        res.status(500).json({ message: 'Failed to create exam', error: error.message });
    }
};

export const getExams = async (req, res) => {
    try {
        const exams = await Exam.find({ creator: req.user.userId }).sort({ createdAt: -1 });
        res.json(exams);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch exams' });
    }
};

export const getExamById = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        
        // Access Control Logic
        const userId = req.user.userId;
        const userEmail = req.user.email;
        
        const isCreator = exam.creator.toString() === userId;
        
        if (!isCreator) {
             if (exam.accessType === 'private') {
                 // Check if email is in allowed list
                 if (!exam.allowedEmails || !exam.allowedEmails.includes(userEmail)) {
                     return res.status(403).json({ message: 'Access denied: This exam is private.' });
                 }
             }
             // If public, allow access
        }

        const questions = await Question.find({ exam: exam._id });
        
        const examData = questions.map(q => {
            const randomVarIndex = Math.floor(Math.random() * q.variations.length);
            const variation = q.variations[randomVarIndex];
            
            return {
                _id: q._id,
                type: q.type,
                text: variation.text,
                options: variation.options,
                isBonus: q.isBonus || false
            };
        });

        // Check for existing result/attempt
        const existingResult = await Result.findOne({ exam: exam._id, user: req.user.userId });
        let userStatus = 'new'; // 'new', 'in-progress', 'completed'
        let startTime = null;

        if (existingResult) {
            userStatus = existingResult.status;
            startTime = existingResult.startTime;
        }

        res.json({ 
            exam, 
            questions: examData,
            userStatus,
            startTime,
            timeLimit: exam.timeLimit
        });
    } catch (error) {
        console.error('Get Exam Error', error);
        res.status(500).json({ message: 'Failed to fetch exam' });
    }
};

export const submitExam = async (req, res) => {
    try {
        const { id } = req.params;
        const { answers } = req.body; 
        
        const exam = await Exam.findById(id);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        const questions = await Question.find({ exam: id });
        
        let score = 0;
        let bonusScore = 0;
        const gradedAnswers = [];
        
        const totalQuestions = questions.filter(q => !q.isBonus).length;
        const totalBonusQuestions = questions.filter(q => q.isBonus).length;

        for (const ans of answers) {
            const question = questions.find(q => q._id.toString() === ans.questionId);
            if (!question) continue;

            let isCorrect = false;
            
            for (const v of question.variations) {
                const correct = v.correctAnswers.sort().join(',');
                const selected = ans.selectedOptions.sort().join(',');
                if (correct === selected) {
                    isCorrect = true;
                    break;
                }
            }
            
            if (isCorrect) {
                if (question.isBonus) {
                    bonusScore++;
                } else {
                    score++;
                }
            }
            
            gradedAnswers.push({
                questionId: question._id,
                selectedOptions: ans.selectedOptions,
                isCorrect
            });
        }

        const result = new Result({
            user: req.user.userId,
            exam: id,
            score,
            totalQuestions,
            bonusScore,
            totalBonusQuestions,
            answers: gradedAnswers
        });
        
        await result.save();
        
        res.json({ 
            message: 'Exam submitted', 
            score, 
            total: totalQuestions, 
            bonusScore,
            totalBonusQuestions,
            resultId: result._id 
        });

    } catch (error) {
        console.error('Submit Error', error);
        res.status(500).json({ message: 'Failed to submit exam' });
    }
};

export const getExamResult = async (req, res) => {
    try {
        const result = await Result.findById(req.params.id)
            .populate('exam', 'title creator')
            .lean(); // Convert to plain JS object to modify

        if (!result) return res.status(404).json({ message: 'Result not found' });
        
        if (result.user.toString() !== req.user.userId && result.exam.creator.toString() !== req.user.userId) {
             return res.status(403).json({ message: 'Not authorized to view this result' });
        }

        // Retrieve Question details to populate the answers
        // We need the text, options, AND correct answers for review
        const questionIds = result.answers.map(a => a.questionId);
        const questions = await Question.find({ _id: { $in: questionIds } });

        const enrichedAnswers = result.answers.map(ans => {
            const question = questions.find(q => q._id.toString() === ans.questionId.toString());
            
            // Try to find the variation that matches the user's selected options
            // This ensures we display the version of the question the user actually saw/answered.
            let variation = null;
            if (question && question.variations) {
                 if (ans.selectedOptions && ans.selectedOptions.length > 0) {
                     variation = question.variations.find(v => 
                        ans.selectedOptions.every(selected => v.options.includes(selected))
                     );
                 }
                 // Fallback to first variation if no match found (e.g. no answer selected)
                 if (!variation) variation = question.variations[0];
            }

            return {
                ...ans,
                questionText: variation ? variation.text : 'Question deleted',
                options: variation ? variation.options : [],
                correctAnswers: variation ? variation.correctAnswers : [],
                type: question ? question.type : 'Unknown',
                isBonus: question ? question.isBonus : false
            };
        });

        res.json({ ...result, answers: enrichedAnswers });

    } catch (error) {
        console.error('Get Result Error', error);
        res.status(500).json({ message: 'Failed to fetch result' });
    }
};

export const getExamSubmissions = async (req, res) => {
    try {
        const { id } = req.params;
        const exam = await Exam.findById(id);
        
        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        
        // Check ownership
        if (exam.creator.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to view submissions for this exam' });
        }

        const results = await Result.find({ exam: id })
            .populate('user', 'name email')
            .sort({ completedAt: -1 });

        res.json(results);
    } catch (error) {
        console.error('Get Submissions Error', error);
        res.status(500).json({ message: 'Failed to fetch submissions' });
    }
};

export const deleteExam = async (req, res) => {
    try {
        const { id } = req.params;
        const exam = await Exam.findById(id);

        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        if (exam.creator.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this exam' });
        }

        // Delete associated data
        await Question.deleteMany({ exam: id });
        await Result.deleteMany({ exam: id });
        
        // Technically we should delete the Document reference too, but might be shared?
        // For now, let's keep Document or delete if exclusive. 
        // The Document model is simple metadata. We'll leave it as is or delete if we want cleanup.
        // Let's just delete the exam and questions/results.
        
        await Exam.findByIdAndDelete(id);

        res.json({ message: 'Exam deleted successfully' });

    } catch (error) {
        console.error('Delete Exam Error', error);
        res.status(500).json({ message: 'Failed to delete exam' });
    }
};

export const getAllUserSubmissions = async (req, res) => {
    try {
        // Find all exams created by this user
        const exams = await Exam.find({ creator: req.user.userId }).select('_id');
        const examIds = exams.map(e => e._id);
        
        // Find all results for these exams
        const results = await Result.find({ exam: { $in: examIds } })
            .populate('exam', 'title')
            .populate('user', 'name email')
            .sort({ completedAt: -1 });

        res.json(results);
    } catch (error) {
        console.error('Get All Submissions Error', error);
        res.status(500).json({ message: 'Failed to fetch all submissions' });
    }
};

export const updateExamSharing = async (req, res) => {
    try {
        const { id } = req.params;
        const { accessType, allowedEmails } = req.body;
        const userId = req.user.userId;

        const exam = await Exam.findById(id);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        if (exam.creator.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized to update this exam' });
        }

        if (accessType) exam.accessType = accessType;
        if (allowedEmails) exam.allowedEmails = allowedEmails;

        await exam.save();
        res.json({ message: 'Exam sharing settings updated', exam });

    } catch (error) {
         console.error('Update Sharing Error', error);
        res.status(500).json({ message: 'Failed to update sharing settings' });
    }
};

export const startExam = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const exam = await Exam.findById(id);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        // Check if result already exists
        let result = await Result.findOne({ exam: id, user: userId });
        if (result) {
            // If already completed, cannot restart
            if (result.status === 'completed') {
                return res.status(400).json({ message: 'Exam already completed' });
            }
            // If in-progress, return existing start time (don't reset it)
            return res.json({ 
                message: 'Exam continues', 
                startTime: result.startTime, 
                timeLimit: exam.timeLimit 
            });
        }

        // Start new attempt
        result = new Result({
            user: userId,
            exam: id,
            status: 'in-progress',
            startTime: new Date(),
            score: 0,
            totalQuestions: 0
        });
        await result.save();

        res.json({ 
            message: 'Exam started', 
            startTime: result.startTime, 
            timeLimit: exam.timeLimit 
        });

    } catch (error) {
        console.error('Start Exam Error', error);
        res.status(500).json({ message: 'Failed to start exam' });
    }
};

export const resetAttempt = async (req, res) => {
    try {
        const { id } = req.params; // Result ID
        const result = await Result.findById(id).populate('exam');
        
        if (!result) return res.status(404).json({ message: 'Result not found' });

        // Only exam creator can reset
        if (result.exam.creator.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to reset this attempt' });
        }

        await Result.findByIdAndDelete(id);
        res.json({ message: 'Attempt reset successfully' });

    } catch (error) {
        console.error('Reset Attempt Error', error);
        res.status(500).json({ message: 'Failed to reset attempt' });
    }
};

import { gradeTextAnswersBatch } from '../services/aiService.js';

export const gradeTextBatch = async (req, res) => {
    try {
        const { id } = req.params; // Exam ID
        const exam = await Exam.findById(id);
        
        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        if (exam.creator.toString() !== req.user.userId) return res.status(403).json({ message: 'Not authorized' });

        const results = await Result.find({ exam: id }).populate('answers.questionId');
        
        const itemsToGrade = [];
        const indexMap = []; // To track resultId and answerIndex

        for (const result of results) {
            result.answers.forEach((ans, idx) => {
                // Check if it's a text question and pending
                if (ans.questionId && ans.questionId.type === 'Text' && ans.gradingStatus === 'pending') {
                    // Find correct answer logic (variations)
                    // We check against all variations to see "expected" context. Use first variation as reference.
                    const reference = ans.questionId.variations[0]; 
                    
                    itemsToGrade.push({
                        validationId: `${result._id}_${idx}`,
                        questionText: reference.text,
                        expectedAnswerGuidelines: reference.correctAnswers.join(' OR '), // Text Qs usually have keywords
                        userAnswer: ans.selectedOptions[0] || ""
                    });
                    
                    indexMap.push({ resultId: result._id, answerIndex: idx, validationId: `${result._id}_${idx}` });
                }
            });
        }

        if (itemsToGrade.length === 0) {
            return res.json({ message: 'No pending text answers to grade' });
        }

        const gradedItems = await gradeTextAnswersBatch(itemsToGrade);
        
        // Bulk write would be better, but loop update is simpler for now
        let updateCount = 0;
        
        for (const graded of gradedItems) {
            const map = indexMap.find(m => m.validationId === graded.validationId);
            if (!map) continue;

            const result = results.find(r => r._id.equals(map.resultId));
            if (result) {
                const answer = result.answers[map.answerIndex];
                answer.isCorrect = graded.isCorrect;
                answer.aiFeedback = graded.feedback;
                answer.gradingStatus = 'ai-graded';
                updateCount++;
                
                // Recalculate Score
                // This is a naive recalculation, assumes simple point system
                let newScore = 0;
                let newBonusScore = 0;
                
                result.answers.forEach(a => {
                    if (a.isCorrect) {
                        if (a.questionId.isBonus) newBonusScore++;
                        else newScore++;
                    }
                });
                result.score = newScore;
                result.bonusScore = newBonusScore;
                
                await result.save();
            }
        }

        res.json({ message: `Batch grading complete. Processed ${updateCount} answers.` });

    } catch (error) {
        console.error('Batch Grade Error', error);
        res.status(500).json({ message: 'Failed to grade batch' });
    }
};

export const manualGrade = async (req, res) => {
    try {
        const { resultId, questionId } = req.params;
        const { isCorrect, feedback } = req.body;
        
        const result = await Result.findById(resultId).populate('answers.questionId');
        if (!result) return res.status(404).json({ message: 'Result not found' });
        
        // Check Auth (Exam creator)
        const exam = await Exam.findById(result.exam);
        if (exam.creator.toString() !== req.user.userId) return res.status(403).json({ message: 'Not authorized' });

        const answer = result.answers.find(a => a.questionId._id.toString() === questionId);
        if (!answer) return res.status(404).json({ message: 'Answer not found' });

        answer.gradingStatus = 'manual-graded';
        if (feedback) answer.aiFeedback = feedback; // Reuse feedback field for manual notes if needed

        // Recalculate
        let newScore = 0;
        let newBonusScore = 0;
        
        result.answers.forEach(a => {
            if (a.isCorrect) {
                 if (a.questionId.isBonus) newBonusScore++;
                 else newScore++;
            }
        });
        result.score = newScore;
        result.bonusScore = newBonusScore;
        
        await result.save();
        res.json({ message: 'Grade updated' });

    } catch (error) {
        console.error('Manual Grade Error', error);
        res.status(500).json({ message: 'Failed to update grade' });
    }
};

// Get all questions for an exam (Creator Only) - Returns full details including variations
export const getQuestionsForReview = async (req, res) => {
    try {
        const { id } = req.params;
        const exam = await Exam.findById(id);
        
        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        if (exam.creator.toString() !== req.user.userId) return res.status(403).json({ message: 'Not authorized' });

        const questions = await Question.find({ exam: id });
        res.json(questions);
    } catch (error) {
        console.error('Get Questions Error', error);
        res.status(500).json({ message: 'Failed to fetch questions' });
    }
};

// Update a specific question (Creator Only)
export const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params; // Question ID
        const updates = req.body;
        
        const question = await Question.findById(id).populate('exam');
        if (!question) return res.status(404).json({ message: 'Question not found' });
        
        // Auth Check
        if (question.exam.creator.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Identify what can be updated.
        // We expect "variations" array, or specific fields. 
        // For simplicity, we allow updating the entire variations array or type.
        
        if (updates.variations) question.variations = updates.variations;
        if (updates.type) question.type = updates.type;
        // Add other fields if needed

        await question.save();
        res.json({ message: 'Question updated successfully', question });

    } catch (error) {
        console.error('Update Question Error', error);
        res.status(500).json({ message: 'Failed to update question' });
    }
};
