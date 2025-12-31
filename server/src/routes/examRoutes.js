import express from 'express';
import multer from 'multer';
import { 
    createExam, 
    getExams, 
    getExamById, 
    submitExam, 
    updateExamSharing, 
    getExamResult,
    getExamSubmissions,
    deleteExam,
    getAllUserSubmissions,
    startExam,
    resetAttempt,
    gradeTextBatch,
    manualGrade,
    getQuestionsForReview,
    updateQuestion
} from '../controllers/examController.js';
import { authenticateToken } from '../middleware/authMiddleware.js'; // Assuming you have this or similar

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Temp storage

// Middleware to ensure user is logged in
// You need to ensure you have an auth middleware. 
// If not, I'll need to create one or use what you have. 
// Based on previous context, you have JWT auth. I'll assume 'authenticateToken' is available or I will create it.

router.post('/', authenticateToken, upload.single('file'), createExam);
router.get('/', authenticateToken, getExams);
router.get('/all-submissions', authenticateToken, getAllUserSubmissions);
router.put('/:id/share', authenticateToken, updateExamSharing);
router.get('/results/:id', authenticateToken, getExamResult);
router.get('/:id/submissions', authenticateToken, getExamSubmissions);
router.get('/:id', authenticateToken, getExamById);
router.post('/:id/submit', authenticateToken, submitExam); 
router.post('/:id/start', authenticateToken, startExam);
router.delete('/results/:id', authenticateToken, resetAttempt);
router.delete('/:id', authenticateToken, deleteExam);
router.post('/:id/grade-text-batch', authenticateToken, gradeTextBatch);
router.put('/results/:resultId/grade/:questionId', authenticateToken, manualGrade);

// Review & Edit Routes
router.get('/:id/questions', authenticateToken, getQuestionsForReview);
router.put('/questions/:id', authenticateToken, updateQuestion);

export default router;
