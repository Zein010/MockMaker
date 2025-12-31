import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Box from '@mui/joy/Box';
import CircularProgress from '@mui/joy/CircularProgress';
import Chip from '@mui/joy/Chip';
import Divider from '@mui/joy/Divider';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const ResultsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({}); // Map of unique key -> boolean

    useEffect(() => {
        const fetchResult = async () => {
            try {
                // Fetch full result with answers
                // Route: GET /exams/results/:id
                const response = await api.get(`/exams/results/${id}`);
                setResult(response.data);
            } catch (error) {
                console.error('Failed to load results', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchResult();
        }
    }, [id]);

    const handleAutoReview = async () => {
        setActionLoading(prev => ({ ...prev, autoReview: true }));
        try {
            const response = await api.post(`/exams/${result.exam._id}/grade-text-batch`);
            alert(response.data.message);
            // Refresh Result
            const res = await api.get(`/exams/results/${id}`);
            setResult(res.data);
        } catch (error) {
            console.error('Failed to auto-grade', error);
            alert('Failed to trigger auto-grading');
        } finally {
            setActionLoading(prev => ({ ...prev, autoReview: false }));
        }
    };

    const handleManualGrade = async (ans, isCorrect) => {
        const key = `${ans.questionId}-${isCorrect ? 'correct' : 'incorrect'}`;
        setActionLoading(prev => ({ ...prev, [key]: true }));
        try {
            await api.put(`/exams/results/${result._id}/grade/${ans.questionId}`, {
                isCorrect,
                feedback: isCorrect ? 'Manually marked correct' : 'Manually marked incorrect'
            });
            // Refresh
            const res = await api.get(`/exams/results/${id}`);
            setResult(res.data);
        } catch (e) { 
            console.error(e); 
            alert('Failed to update grade'); 
        } finally {
            setActionLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    if (!result) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography>Result not found.</Typography></Box>;

    return (    
        <Box sx={{ width: '100%', mx: 'auto', pb: 5 }}>
            {/* Score Summary */}
            <Sheet variant="outlined" sx={{ p: 4, borderRadius: 'md', textAlign: 'center', mb: 4 }}>
                <Typography level="h2" color="success">Exam Completed!</Typography>
                <Typography level="title-lg" sx={{ mt: 1 }}>{result.exam?.title}</Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, my: 4 }}>
                    {/* Standard Score */}
                    <Box sx={{ textAlign: 'center' }}>
                         <Typography level="body-sm">Standard</Typography>
                         <CircularProgress 
                            determinate 
                            value={(result.score / result.totalQuestions) * 100} 
                            size="lg"
                            thickness={8}
                            color="primary"
                            sx={{ '--CircularProgress-size': '100px' }}
                        >
                            <Typography level="h4">{result.score} / {result.totalQuestions}</Typography>
                        </CircularProgress>
                    </Box>

                    {result.totalBonusQuestions > 0 && (
                        <>
                            <Typography level="h2" color="neutral">+</Typography>
                            {/* Bonus Score */}
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography level="body-sm">Bonus</Typography>
                                <CircularProgress 
                                    determinate 
                                    value={result.totalBonusQuestions > 0 ? (result.bonusScore / result.totalBonusQuestions) * 100 : 0} 
                                    size="lg"
                                    thickness={8}
                                    color="success"
                                    sx={{ '--CircularProgress-size': '100px' }}
                                >
                                    <Typography level="h4">{result.bonusScore} / {result.totalBonusQuestions}</Typography>
                                </CircularProgress>
                            </Box>
                            <Typography level="h2" color="neutral">=</Typography>
                        </>
                    )}

                    {/* Total Final Score */}
                     <Box sx={{ textAlign: 'center' }}>
                         <Typography level="body-sm">Final Grade</Typography>
                         <CircularProgress 
                            determinate 
                            value={((result.score + (result.bonusScore || 0)) / result.totalQuestions) * 100} 
                            size="lg"
                            thickness={10}
                            color={(result.score + (result.bonusScore || 0)) / result.totalQuestions >= 0.5 ? "success" : "danger"}
                            sx={{ '--CircularProgress-size': '120px' }}
                        >
                            <Typography level="h3">
                                {result.score + (result.bonusScore || 0)} / {result.totalQuestions}
                            </Typography>
                        </CircularProgress>
                    </Box>
                </Box>
                
                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button size="lg" onClick={() => navigate('/')}>
                        Back to Dashboard
                    </Button>
                    
                     {/* Auto-Review Button - Only for Creator */}
                     {user && user.id === result.exam.creator && (
                        <Button 
                            size="lg" 
                            color="primary"
                            startDecorator={<AutoAwesomeIcon />}
                            onClick={handleAutoReview}
                            loading={actionLoading.autoReview}
                        >
                            Auto-Review Text Answers
                        </Button>
                    )}
                </Box>
            </Sheet>

            {/* Detailed Review */}
            <Typography level="h3" sx={{ mb: 2 }}>Review Answers</Typography>
            
            {/* Main Questions Review */}
            {result.answers.filter(a => !a.isBonus).map((ans, index) => (
                <Sheet key={ans.questionId} variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 'md' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography level="title-lg">
                            {index + 1}. {ans.questionText}
                        </Typography>
                        {ans.isCorrect ? 
                            <Chip color="success" startDecorator={<CheckIcon />}>Correct</Chip> : 
                            <Chip color="danger" startDecorator={<CloseIcon />}>Incorrect</Chip>
                        }
                    </Box>

                    <List sx={{ '--ListItem-paddingY': '0.5rem' }}>
                        {ans.type !== 'Text' && ans.options.map((opt, i) => {
                            const isSelected = ans.selectedOptions.includes(opt);
                            const isCorrectAnswer = ans.correctAnswers.includes(opt);
                            
                            let color = 'neutral';
                            let variant = 'plain';

                            if (isCorrectAnswer) {
                                color = 'success'; // Show correct answer in green
                                variant = 'soft'; // Highlight
                            }
                            
                            if (isSelected) {
                                if (isCorrectAnswer) {
                                    // User selected correct -> Green & Stronger highlight
                                    variant = 'solid';
                                    color = 'success';
                                } else {
                                    // User selected wrong -> Red
                                    variant = 'solid';
                                    color = 'danger';
                                }
                            }

                            return (
                                <ListItem 
                                    key={i}
                                    variant={variant}
                                    color={color}
                                    sx={{ borderRadius: 'sm' }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                        <Typography 
                                            fontWeight={isSelected || isCorrectAnswer ? 'lg' : 'md'}
                                            sx={{ color: isSelected && !isCorrectAnswer ? 'white' : 'inherit' }}
                                        >
                                            {opt}
                                        </Typography>
                                        
                                        {/* Optional: Add indicators */}
                                        {isCorrectAnswer && !isSelected && <Chip size="sm" color="success" variant="outlined" sx={{ ml: 'auto' }}>Correct Answer</Chip>}
                                        {isSelected && !isCorrectAnswer && <Chip size="sm" color="danger" variant="solid" sx={{ ml: 'auto' }}>Your Answer</Chip>}
                                    </Box>
                                </ListItem>
                            );
                        })}
                        {ans.type === 'Text' && (
                             <Box>
                                <Typography level="body-md" fontWeight="lg" sx={{ mt: 1 }}>Your Answer:</Typography>
                                <Sheet variant="soft" color={ans.isCorrect ? 'success' : 'danger'} sx={{ p: 1, borderRadius: 'sm' }}>
                                    {ans.selectedOptions[0] || 'No answer'}
                                </Sheet>
                                
                                <Typography level="body-md" fontWeight="lg" sx={{ mt: 2 }}>Key Answer(s):</Typography>
                                <Sheet variant="soft" color="success" sx={{ p: 1, borderRadius: 'sm' }}>
                                    {ans.correctAnswers.join(', ')}
                                </Sheet>

                                {/* Grading Status & AI Feedback */}
                                <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'neutral.outlinedBorder', borderRadius: 'sm' }}>
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                                        <Typography level="body-sm" fontWeight="lg">Status:</Typography>
                                        <Chip 
                                            size="sm" 
                                            variant="outlined" 
                                            color={ans.gradingStatus === 'pending' ? 'warning' : 'primary'}
                                        >
                                            {ans.gradingStatus ? ans.gradingStatus.toUpperCase() : 'GRADED'}
                                        </Chip>
                                    </Box>
                                    
                                    {ans.aiFeedback && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography level="body-xs" fontWeight="lg">AI Feedback:</Typography>
                                            <Typography level="body-sm" color="neutral">{ans.aiFeedback}</Typography>
                                        </Box>
                                    )}

                                    {/* Manual Override Buttons (Only if user is Creator) */}
                                    {user && result.exam && user.id === result.exam.creator && (
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                        <Button 
                                            size="sm" 
                                            color="success" 
                                            onClick={() => handleManualGrade(ans, true)}
                                            loading={actionLoading[`${ans.questionId}-correct`]}
                                        >
                                            Mark Correct
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            color="danger" 
                                            onClick={() => handleManualGrade(ans, false)}
                                            loading={actionLoading[`${ans.questionId}-incorrect`]}
                                        >
                                            Mark Incorrect
                                        </Button>
                                    </Box>
                                    )}
                                </Box>
                             </Box>
                        )}
                    </List>
                </Sheet>
            ))}

            {/* Bonus Questions Review */}
            {result.answers.some(a => a.isBonus) && (
                <Box sx={{ mt: 5 }}>
                    <Typography level="h3" color="success" sx={{ mb: 2 }}>Bonus Questions Review</Typography>
                    {result.answers.filter(a => a.isBonus).map((ans, index) => (
                        <Sheet key={ans.questionId} variant="outlined" color="success" sx={{ p: 3, mb: 3, borderRadius: 'md', bgcolor: 'success.50' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography level="title-lg">
                                    Bonus {index + 1}. {ans.questionText}
                                </Typography>
                                {ans.isCorrect ? 
                                    <Chip color="success" startDecorator={<CheckIcon />}>Correct (+1)</Chip> : 
                                    <Chip color="neutral" startDecorator={<CloseIcon />}>No Points</Chip>
                                }
                            </Box>

                            <List sx={{ '--ListItem-paddingY': '0.5rem' }}>
                                {ans.type !== 'Text' && ans.options.map((opt, i) => {
                                    const isSelected = ans.selectedOptions.includes(opt);
                                    const isCorrectAnswer = ans.correctAnswers.includes(opt);
                                    
                                    let color = 'neutral';
                                    let variant = 'plain';

                                    if (isCorrectAnswer) {
                                        color = 'success';
                                        variant = 'soft';
                                    }
                                    
                                    if (isSelected) {
                                        if (isCorrectAnswer) {
                                            variant = 'solid';
                                            color = 'success';
                                        } else {
                                            variant = 'solid';
                                            color = 'danger';
                                        }
                                    }

                                    return (
                                        <ListItem 
                                            key={i}
                                            variant={variant}
                                            color={color}
                                            sx={{ borderRadius: 'sm' }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                                <Typography 
                                                    fontWeight={isSelected || isCorrectAnswer ? 'lg' : 'md'}
                                                    sx={{ color: isSelected && !isCorrectAnswer ? 'white' : 'inherit' }}
                                                >
                                                    {opt}
                                                </Typography>
                                                 {isCorrectAnswer && !isSelected && <Chip size="sm" color="success" variant="outlined" sx={{ ml: 'auto' }}>Correct Answer</Chip>}
                                                 {isSelected && !isCorrectAnswer && <Chip size="sm" color="danger" variant="solid" sx={{ ml: 'auto' }}>Your Answer</Chip>}
                                            </Box>
                                        </ListItem>
                                    );
                                })}
                                {ans.type === 'Text' && (
                                     <Box>
                                        <Typography level="body-md" fontWeight="lg" sx={{ mt: 1 }}>Your Answer:</Typography>
                                        <Sheet variant="soft" color={ans.isCorrect ? 'success' : 'danger'} sx={{ p: 1, borderRadius: 'sm' }}>
                                            {ans.selectedOptions[0] || 'No answer'}
                                        </Sheet>
                                        
                                        <Typography level="body-md" fontWeight="lg" sx={{ mt: 2 }}>Key Answer(s):</Typography>
                                        <Sheet variant="soft" color="success" sx={{ p: 1, borderRadius: 'sm' }}>
                                            {ans.correctAnswers.join(', ')}
                                        </Sheet>

                                        {/* Grading Status & AI Feedback */}
                                        <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'neutral.outlinedBorder', borderRadius: 'sm' }}>
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                                                <Typography level="body-sm" fontWeight="lg">Status:</Typography>
                                                <Chip 
                                                    size="sm" 
                                                    variant="outlined" 
                                                    color={ans.gradingStatus === 'pending' ? 'warning' : 'primary'}
                                                >
                                                    {ans.gradingStatus ? ans.gradingStatus.toUpperCase() : 'GRADED'}
                                                </Chip>
                                            </Box>
                                            
                                            {ans.aiFeedback && (
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography level="body-xs" fontWeight="lg">AI Feedback:</Typography>
                                                    <Typography level="body-sm" color="neutral">{ans.aiFeedback}</Typography>
                                                </Box>
                                            )}

                                            {/* Manual Override Buttons (Only if user is Creator) */}
                                            {user && result.exam && user.id === result.exam.creator && (
                                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                                <Button 
                                                    size="sm" 
                                                    color="success" 
                                                    onClick={() => handleManualGrade(ans, true)}
                                                    loading={actionLoading[`${ans.questionId}-correct`]}
                                                >
                                                    Mark Correct
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    color="danger" 
                                                    onClick={() => handleManualGrade(ans, false)}
                                                    loading={actionLoading[`${ans.questionId}-incorrect`]}
                                                >
                                                    Mark Incorrect
                                                </Button>
                                            </Box>
                                            )}
                                        </Box>
                                     </Box>
                                )}
                            </List>
                        </Sheet>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default ResultsPage;
