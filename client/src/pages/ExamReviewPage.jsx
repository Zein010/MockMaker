import React, { useEffect, useState, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Box from '@mui/joy/Box';
import CircularProgress from '@mui/joy/CircularProgress';
import Input from '@mui/joy/Input';
import Textarea from '@mui/joy/Textarea';
import Checkbox from '@mui/joy/Checkbox';
import Radio from '@mui/joy/Radio';
import IconButton from '@mui/joy/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';

import api from '../api/axios';

// Memoized Question Component to prevent re-renders of the entire list on typing
const QuestionEditor = memo(({ q, qIndex, onSave, loading }) => {
    // Local state for the question to speed up typing? 
    // No, if we want to save complexity let's just use the props but make sure parent doesn't re-render everything unless needed.
    // Actually, to truly isolate, we should probably keep local state and only push up on save?
    // But the user wants to "Edit" then "Save". 
    // Let's stick to lifting state up but use memo so OTHER questions don't re-render.
    // Wait, if parent state updates, 'q' prop changes for this one, but not others?
    // Yes, provided the array reference for other objects hasn't changed.
    // But immutability usually replaces the array. 
    // Standard React optimization: If we update one item, we replace the array. All <QuestionEditor> get new props if we pass (q) unless we are careful.
    // Actually, usually only the changed object reference changes. The others might stay same if we slice correctly.
    
    // However, simplest fix for "slow" is just splitting it out.
    // And definitely adding IDs.
    
    const [question, setQuestion] = useState(q);
    
    // Sync with parent if needed (e.g. if we had a reset). But here we initialize once.
    // Actually, if we want to save per question, local state is perfect. 
    // We only call the API with local state. We don't even need to update parent state if we don't care about global "Save All".
    // The current UI has "Save" per question. So Local State is BEST for performance.
    
    // Handle changes locally
    const handleVariationChange = (vIndex, field, value) => {
        const updated = { ...question };
        updated.variations = [...question.variations];
        updated.variations[vIndex] = { ...updated.variations[vIndex], [field]: value };
        setQuestion(updated);
    };

    const handleOptionChange = (vIndex, optIndex, value) => {
        const updated = { ...question };
        updated.variations = [...question.variations];
        const newOptions = [...updated.variations[vIndex].options];
        newOptions[optIndex] = value;
        updated.variations[vIndex].options = newOptions;
        setQuestion(updated);
    };

    const addOption = (vIndex) => {
        const updated = { ...question };
        updated.variations = [...question.variations];
        updated.variations[vIndex].options = [...updated.variations[vIndex].options, 'New Option'];
        setQuestion(updated);
    };

    const removeOption = (vIndex, optIndex) => {
        const updated = { ...question };
        updated.variations = [...question.variations];
        
        const optToRemove = updated.variations[vIndex].options[optIndex];
        const newOptions = updated.variations[vIndex].options.filter((_, i) => i !== optIndex);
        updated.variations[vIndex].options = newOptions;

        // Correctness sync
        const correctIdx = updated.variations[vIndex].correctAnswers.indexOf(optToRemove);
        if (correctIdx > -1) {
             const newCorrect = [...updated.variations[vIndex].correctAnswers];
             newCorrect.splice(correctIdx, 1);
             updated.variations[vIndex].correctAnswers = newCorrect;
        }
        setQuestion(updated);
    };

    const toggleCorrectness = (vIndex, optionText, type) => {
        const updated = { ...question };
        updated.variations = [...question.variations];
        let correctAnswers = [...updated.variations[vIndex].correctAnswers];

        if (type === 'Radio') {
            correctAnswers = [optionText];
        } else {
             if (correctAnswers.includes(optionText)) {
                correctAnswers = correctAnswers.filter(a => a !== optionText);
            } else {
                correctAnswers.push(optionText);
            }
        }
        updated.variations[vIndex].correctAnswers = correctAnswers;
        setQuestion(updated);
    };

    const handleTextCriteriaChange = (vIndex, ansIndex, value) => {
        const updated = { ...question };
        updated.variations = [...question.variations];
        const newCorrect = [...updated.variations[vIndex].correctAnswers];
        newCorrect[ansIndex] = value;
        updated.variations[vIndex].correctAnswers = newCorrect;
        setQuestion(updated);
    };

    const addTextCriteria = (vIndex) => {
        const updated = { ...question };
        updated.variations = [...question.variations];
        updated.variations[vIndex].correctAnswers = [...updated.variations[vIndex].correctAnswers, 'New Criteria'];
        setQuestion(updated);
    };

    const removeTextCriteria = (vIndex, ansIndex) => {
         const updated = { ...question };
         updated.variations = [...question.variations];
         const newCorrect = updated.variations[vIndex].correctAnswers.filter((_, i) => i !== ansIndex);
         updated.variations[vIndex].correctAnswers = newCorrect;
         setQuestion(updated);
    };

    return (
        <Sheet variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 'md' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography level="h4">Question {qIndex + 1} ({question.type})</Typography>
                <Button 
                    startDecorator={<SaveIcon />} 
                    onClick={() => onSave(question)}
                    loading={loading}
                    id={`save-btn-${question._id}`}
                >
                    Save
                </Button>
            </Box>

            {question.variations.map((v, vIndex) => (
                <Box key={vIndex} sx={{ mb: 3, pl: 2, borderLeft: '2px solid', borderColor: 'neutral.300' }}>
                    <Typography level="title-sm" sx={{ mb: 1 }}>Variation {vIndex + 1}</Typography>
                    
                    <Box sx={{ mb: 2 }}>
                        <Typography level="body-xs" sx={{ mb: 0.5 }}>Question Text</Typography>
                        <Textarea 
                            minRows={2}
                            value={v.text}
                            onChange={(e) => handleVariationChange(vIndex, 'text', e.target.value)}
                            name={`q${question._id}_v${vIndex}_text`}
                            id={`q${question._id}_v${vIndex}_text`}
                        />
                    </Box>

                    {/* Options Editing */}
                    {(question.type === 'Radio' || question.type === 'MultiChoice') && (
                        <Box>
                            <Typography level="body-xs" sx={{ mb: 1 }}>Options</Typography>
                            {v.options.map((opt, optIndex) => (
                                <Box key={optIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    {question.type === 'Radio' ? (
                                        <Radio 
                                            checked={v.correctAnswers.includes(opt)}
                                            onChange={() => toggleCorrectness(vIndex, opt, 'Radio')}
                                            value={opt}
                                            name={`q${question._id}_v${vIndex}_correctness`}
                                            id={`q${question._id}_v${vIndex}_opt${optIndex}_radio`}
                                        />
                                    ) : (
                                        <Checkbox 
                                            checked={v.correctAnswers.includes(opt)}
                                            onChange={() => toggleCorrectness(vIndex, opt, 'MultiChoice')}
                                            name={`q${question._id}_v${vIndex}_correctness_${optIndex}`}
                                            id={`q${question._id}_v${vIndex}_opt${optIndex}_check`}
                                        />
                                    )}
                                    
                                    <Input 
                                        fullWidth
                                        value={opt}
                                        onChange={(e) => handleOptionChange(vIndex, optIndex, e.target.value)}
                                        name={`q${question._id}_v${vIndex}_opt${optIndex}`}
                                        id={`q${question._id}_v${vIndex}_opt${optIndex}`}
                                    />
                                    
                                    <IconButton size="sm" color="danger" onClick={() => removeOption(vIndex, optIndex)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>
                            ))}
                            <Button size="sm" variant="soft" startDecorator={<AddIcon />} onClick={() => addOption(vIndex)}>
                                Add Option
                            </Button>
                        </Box>
                    )}

                        {/* Text Question */}
                        {question.type === 'Text' && (
                        <Box>
                                <Typography level="body-xs" sx={{ mb: 0.5 }}>Expected Answer / Keywords</Typography>
                                {v.correctAnswers.map((ans, ansIndex) => (
                                    <Box key={ansIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                    <Input 
                                        fullWidth
                                        value={ans}
                                        onChange={(e) => handleTextCriteriaChange(vIndex, ansIndex, e.target.value)}
                                        name={`q${question._id}_v${vIndex}_criteria${ansIndex}`}
                                        id={`q${question._id}_v${vIndex}_criteria${ansIndex}`}
                                    />
                                    <IconButton size="sm" color="danger" onClick={() => removeTextCriteria(vIndex, ansIndex)}>
                                        <DeleteIcon />
                                    </IconButton>
                                    </Box>
                                ))}
                                <Button size="sm" variant="soft" startDecorator={<AddIcon />} onClick={() => addTextCriteria(vIndex)}>
                                Add Criteria
                                </Button>
                        </Box>
                        )}
                </Box>
            ))}
        </Sheet>
    );
});

const ExamReviewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingMap, setSavingMap] = useState({});

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const response = await api.get(`/exams/${id}/questions`);
                setQuestions(response.data);
            } catch (error) {
                console.error('Failed to load questions', error);
                alert('Failed to load questions.');
                navigate('/');
            } finally {
                setLoading(false);
            }
        };
        fetchQuestions();
    }, [id, navigate]);

    const handleSave = async (updatedQuestion) => {
        setSavingMap(prev => ({ ...prev, [updatedQuestion._id]: true }));
        try {
            await api.put(`/exams/questions/${updatedQuestion._id}`, {
                variations: updatedQuestion.variations,
                type: updatedQuestion.type
            });
            alert('Question updated successfully');
        } catch (error) {
            console.error('Failed to update question', error);
            alert('Failed to save changes');
        } finally {
            setSavingMap(prev => ({ ...prev, [updatedQuestion._id]: false }));
        }
    };

    if (loading) return <CircularProgress />;

    return (
        <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', pb: 5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography level="h2">Review & Edit Exam</Typography>
                <Button variant="plain" onClick={() => navigate('/')}>Back to Dashboard</Button>
            </Box>

            {questions.map((q, qIndex) => (
                <QuestionEditor 
                    key={q._id} 
                    q={q} 
                    qIndex={qIndex} 
                    onSave={handleSave} 
                    loading={savingMap[q._id] || false}
                />
            ))}
        </Box>
    );
};

export default ExamReviewPage;
