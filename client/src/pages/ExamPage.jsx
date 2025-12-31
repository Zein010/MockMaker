import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Box from '@mui/joy/Box';
import Radio from '@mui/joy/Radio';
import RadioGroup from '@mui/joy/RadioGroup';
import Checkbox from '@mui/joy/Checkbox';
import Textarea from '@mui/joy/Textarea';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import LinearProgress from '@mui/joy/LinearProgress';

import api from '../api/axios';

const ExamPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({}); // { questionId: selectedValue | [values] }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Timer & Status State
    const [examStarted, setExamStarted] = useState(false);
    const [timeLimit, setTimeLimit] = useState(null); // in minutes
    const [timeLeft, setTimeLeft] = useState(null); // in seconds
    const [status, setStatus] = useState('new'); // new, in-progress, completed

    useEffect(() => {
        const fetchExam = async () => {
            try {
                const response = await api.get(`/exams/${id}`);
                const { exam, questions, userStatus, startTime, timeLimit } = response.data;
                
                setExam(exam);
                setQuestions(questions);
                setStatus(userStatus);
                setTimeLimit(timeLimit);

                if (userStatus === 'completed') {
                    // Redirect or show completed state
                    // For now, let's just let the UI handle "already taken" message or redirect
                    // Maybe redirect to results if we have resultId? The backend doesn't return resultId here yet
                    // easier to just show a "View Results" button if completed.
                } else if (userStatus === 'in-progress' && startTime && timeLimit) {
                    setExamStarted(true);
                    const start = new Date(startTime).getTime();
                    const now = new Date().getTime();
                    const elapsedSeconds = Math.floor((now - start) / 1000);
                    const limitSeconds = timeLimit * 60;
                    const remaining = limitSeconds - elapsedSeconds;
                    
                    if (remaining > 0) {
                        setTimeLeft(remaining);
                    } else {
                        setTimeLeft(0);
                        // Ideally submit immediately if time is up
                    }
                }
            } catch (error) {
                console.error('Failed to load exam', error);
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [id]);

    // Timer Logic
    useEffect(() => {
        if (!examStarted || timeLeft === null) return;

        if (timeLeft <= 0) {
            handleSubmit();
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [examStarted, timeLeft]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleStartExam = async () => {
        try {
            const response = await api.post(`/exams/${id}/start`);
            setExamStarted(true);
            if (response.data.timeLimit) {
                // Initialize timer if fresh start
                setTimeLimit(response.data.timeLimit);
                setTimeLeft(response.data.timeLimit * 60);
            }
        } catch (error) {
            console.error('Failed to start exam', error);
            alert('Failed to start exam. Please try again.');
        }
    };

    const handleAnswerChange = (questionId, value, type) => {
        if (type === 'MultiChoice') {
            setAnswers(prev => {
                const current = prev[questionId] || [];
                if (current.includes(value)) {
                    return { ...prev, [questionId]: current.filter(v => v !== value) };
                } else {
                    return { ...prev, [questionId]: [...current, value] };
                }
            });
        } else {
            // Radio or Text
            setAnswers(prev => ({ ...prev, [questionId]: value }));
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Transform answers for backend if needed
            // Backend expects: [{ questionId, selectedOptions: [String] }]
            const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
                questionId: qId,
                selectedOptions: Array.isArray(val) ? val : [val]
            }));

            const response = await api.post(`/exams/${id}/submit`, { answers: formattedAnswers });
            navigate(`/results/${response.data.resultId}`, { 
                state: { score: response.data.score, total: response.data.total } 
            });
        } catch (error) {
            console.error('Failed to submit exam', error);
            alert('Submission failed!');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LinearProgress />;
    if (!exam) return <Typography>Exam not found</Typography>;

    if (status === 'completed') {
        return (
             <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
                <Typography level="h2">Exam Completed</Typography>
                <Typography sx={{ mb: 2 }}>You have already finished this exam.</Typography>
                <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
                {/* Could add a "View Results" button if we fetch the result ID or change routing */}
            </Box>
        );
    }

    if (!examStarted) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10, maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
                <Typography level="h2" sx={{ mb: 2 }}>{exam.title}</Typography>
                <Typography level="body-lg" sx={{ mb: 4 }}>
                    Ready to take your exam? 
                    {timeLimit ? ` You have ${timeLimit} minutes to complete it.` : ' There is no time limit.'}
                </Typography>
                <Button size="lg" onClick={handleStartExam}>Start Exam</Button>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', mx: 'auto', pb: 5 }}>
            {/* Sticky Header with Timer */}
            <Sheet 
                variant="soft" 
                color={timeLeft !== null && timeLeft < 60 ? 'danger' : 'neutral'}
                sx={{ 
                    position: 'sticky', 
                    top: 0, 
                    zIndex: 100, 
                    p: 2, 
                    mb: 4, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    boxShadow: 'sm',
                    borderRadius: '0 0 md md'
                }}
            >
                <Typography level="h4">{exam.title}</Typography>
                {timeLeft !== null && (
                    <Typography level="h3" fontFamily="monospace">
                        {formatTime(timeLeft)}
                    </Typography>
                )}
            </Sheet>

            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography level="body-md">Answer all questions below</Typography>
            </Box>

            {questions.filter(q => !q.isBonus).map((q, index) => (
                <Sheet 
                    key={q._id}
                    variant="outlined" 
                    sx={{ p: 3, mb: 3, borderRadius: 'md' }}
                >
                    <Typography level="title-lg" sx={{ mb: 2 }}>
                        {index + 1}. {q.text}
                    </Typography>

                    {q.type === 'Radio' && (
                        <FormControl>
                            <RadioGroup 
                                name={q._id}
                                value={answers[q._id] || ''}
                                onChange={(e) => handleAnswerChange(q._id, e.target.value, 'Radio')}
                            >
                                {q.options.map((opt, i) => (
                                    <Radio key={i} value={opt} label={opt} sx={{ mb: 1 }} />
                                ))}
                            </RadioGroup>
                        </FormControl>
                    )}

                    {q.type === 'MultiChoice' && (
                        <FormControl>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {q.options.map((opt, i) => (
                                    <Checkbox 
                                        key={i} 
                                        label={opt} 
                                        checked={(answers[q._id] || []).includes(opt)}
                                        onChange={() => handleAnswerChange(q._id, opt, 'MultiChoice')}
                                    />
                                ))}
                            </Box>
                        </FormControl>
                    )}

                    {q.type === 'Text' && (
                        <FormControl>
                            <Textarea 
                                minRows={3}
                                placeholder="Type your answer here..."
                                value={answers[q._id] || ''}
                                onChange={(e) => handleAnswerChange(q._id, e.target.value, 'Text')}
                            />
                        </FormControl>
                    )}
                </Sheet>
            ))}

            {questions.some(q => q.isBonus) && (
                <Box sx={{ my: 4, py: 2, borderTop: '2px dashed', borderColor: 'neutral.300' }}>
                    <Typography level="h3" color="success" sx={{ mb: 2, textAlign: 'center' }}>
                        🌟 Bonus Section 🌟
                    </Typography>
                    <Typography level="body-sm" sx={{ mb: 3, textAlign: 'center' }}>
                        These questions are optional but can boost your score!
                    </Typography>

                    {questions.filter(q => q.isBonus).map((q, index) => (
                        <Sheet 
                            key={q._id}
                            variant="outlined" 
                            color="success"
                            sx={{ p: 3, mb: 3, borderRadius: 'md', borderColor: 'success.300', bgcolor: 'success.50' }}
                        >
                            <Typography level="title-lg" sx={{ mb: 2 }}>
                                Bonus {index + 1}. {q.text}
                            </Typography>

                            {q.type === 'Radio' && (
                                <FormControl>
                                    <RadioGroup 
                                        name={q._id}
                                        value={answers[q._id] || ''}
                                        onChange={(e) => handleAnswerChange(q._id, e.target.value, 'Radio')}
                                    >
                                        {q.options.map((opt, i) => (
                                            <Radio key={i} value={opt} label={opt} sx={{ mb: 1 }} />
                                        ))}
                                    </RadioGroup>
                                </FormControl>
                            )}

                            {q.type === 'MultiChoice' && (
                                <FormControl>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {q.options.map((opt, i) => (
                                            <Checkbox 
                                                key={i} 
                                                label={opt} 
                                                checked={(answers[q._id] || []).includes(opt)}
                                                onChange={() => handleAnswerChange(q._id, opt, 'MultiChoice')}
                                            />
                                        ))}
                                    </Box>
                                </FormControl>
                            )}

                            {q.type === 'Text' && (
                                <FormControl>
                                    <Textarea 
                                        minRows={3}
                                        placeholder="Type your bonus answer here..."
                                        value={answers[q._id] || ''}
                                        onChange={(e) => handleAnswerChange(q._id, e.target.value, 'Text')}
                                    />
                                </FormControl>
                            )}
                        </Sheet>
                    ))}
                </Box>
            )}

            <Button 
                size="lg" 
                fullWidth 
                onClick={handleSubmit} 
                loading={submitting}
            >
                Submit Exam
            </Button>
        </Box>
    );
};

export default ExamPage;
