
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
