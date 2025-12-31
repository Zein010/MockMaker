import React, { useState } from 'react';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import DialogTitle from '@mui/joy/DialogTitle';
import DialogContent from '@mui/joy/DialogContent';
import Stack from '@mui/joy/Stack';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import SvgIcon from '@mui/joy/SvgIcon';
import Typography from '@mui/joy/Typography';
import Checkbox from '@mui/joy/Checkbox';
import Box from '@mui/joy/Box';
import { styled } from '@mui/joy/styles';
import api from '../api/axios';

const VisuallyHiddenInput = styled('input')`
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  bottom: 0;
  left: 0;
  white-space: nowrap;
  width: 1px;
`;

const CreateExamModal = ({ open, onClose, onExamCreated, initialDocumentId = null, initialTitle = '' }) => {
    const [title, setTitle] = useState(initialTitle);
    const [numQuestions, setNumQuestions] = useState(5);
    const [timeLimit, setTimeLimit] = useState(''); // Empty string = unlimited
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [config, setConfig] = useState({
        difficulty: 'Medium',
        manualCounts: false,
        Radio: { enabled: true, count: 0 },
        MultiChoice: { enabled: false, count: 0 },
        Text: { enabled: false, count: 0 },
        bonus: {
            enabled: false,
            count: 1,
            difficulty: 'Hard',
            source: 'file' // 'file', 'inference', 'external'
        }
    });

    // Reset state when modal opens/closes or props change
    React.useEffect(() => {
        if (open) {
            setTitle(initialTitle);
            setFile(null);
            setError('');
            setShowAdvanced(false);
            setNumQuestions(5);
            setConfig({
                difficulty: 'Medium',
                manualCounts: false,
                Radio: { enabled: true, count: 0 },
                MultiChoice: { enabled: false, count: 0 },
                Text: { enabled: false, count: 0 },
                bonus: {
                    enabled: false,
                    count: 1,
                    difficulty: 'Hard',
                    source: 'file'
                }
            });
        }
    }, [open, initialTitle]);

    const handleFileChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
        }
    };

    const handleConfigChange = (type, field, value) => {
        // Handle top-level config changes (difficulty, manualCounts)
        if (type === 'root') {
             setConfig(prev => ({ ...prev, [field]: value }));
             return;
        }

        // Handle nested config changes (Question Types)
        setConfig(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: value
            }
        }));
    };
    
    const totalAdvancedQuestions = React.useMemo(() => {
        let total = 0;
        if (config.Radio.enabled) total += config.Radio.count;
        if (config.MultiChoice.enabled) total += config.MultiChoice.count;
        if (config.Text.enabled) total += config.Text.count;
        return total;
    }, [config]);

    // Sync numQuestions with advanced total
    React.useEffect(() => {
        if (showAdvanced && config.manualCounts) {
            setNumQuestions(totalAdvancedQuestions);
        }
    }, [totalAdvancedQuestions, showAdvanced, config.manualCounts]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        if (!file && !initialDocumentId) {
            setError('Please upload a file (PDF).');
            return;
        }
        
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('numQuestions', numQuestions);
        if (timeLimit) formData.append('timeLimit', timeLimit);
        
        if (file) {
            formData.append('file', file);
        } else if (initialDocumentId) {
            formData.append('documentId', initialDocumentId);
        }

        if (showAdvanced) {
            const finalConfig = {
                difficulty: config.difficulty,
                manualCounts: config.manualCounts,
                distribution: {},
                bonus: config.bonus.enabled ? config.bonus : null
            };
            
            if (config.manualCounts) {
                if (config.Radio.enabled && config.Radio.count > 0) finalConfig.distribution.Radio = config.Radio.count;
                if (config.MultiChoice.enabled && config.MultiChoice.count > 0) finalConfig.distribution.MultiChoice = config.MultiChoice.count;
                if (config.Text.enabled && config.Text.count > 0) finalConfig.distribution.Text = config.Text.count;
            }
            
            formData.append('questionConfig', JSON.stringify(finalConfig));
        }

        try {
            await api.post('/exams', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onExamCreated(); 
            onClose();
            // Reset
            setTitle(''); 
            setTitle(''); 
            setNumQuestions(5);
            setTimeLimit('');
            setFile(null);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to create exam');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={() => !loading && onClose()}>
            <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
                <DialogTitle>{initialDocumentId ? 'Create Exam from Existing PDF' : 'Create New Exam'}</DialogTitle>
                <DialogContent>
                    {initialDocumentId ? 'Create a new exam using the file from the previous exam.' : 'Upload a document to generate questions.'}
                </DialogContent>
                <form onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                        {error && <Typography color="danger">{error}</Typography>}
                        
                        <FormControl required>
                            <FormLabel>Exam Title</FormLabel>
                            <Input 
                                autoFocus 
                                required 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. History Final"
                            />
                        </FormControl>

                        <FormControl required>
                            <FormLabel>Number of Questions</FormLabel>
                            <Input 
                                type="number" 
                                required 
                                value={numQuestions} 
                                onChange={(e) => setNumQuestions(e.target.value)}
                                slotProps={{
                                    input: { min: 1, max: 20 }
                                }}
                                disabled={showAdvanced && config.manualCounts} // Disable global count only if manualCounts is active
                            />
                        </FormControl>

                        <FormControl>
                            <Checkbox 
                                label="Advanced Options" 
                                checked={showAdvanced} 
                                onChange={(e) => setShowAdvanced(e.target.checked)} 
                            />
                        </FormControl>

                        {showAdvanced && (
                            <Stack spacing={2} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 'md' }}>
                                
                                <FormControl>
                                    <FormLabel>Difficulty</FormLabel>
                                    <select 
                                        value={config.difficulty} 
                                        onChange={(e) => handleConfigChange('root', 'difficulty', e.target.value)}
                                        style={{ padding: '8px', borderRadius: '6px', borderColor: '#ccc' }}
                                    >
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </FormControl>

                                <FormControl>
                                    <Checkbox 
                                        label="Static Question Numbers" 
                                        checked={config.manualCounts}
                                        onChange={(e) => handleConfigChange('root', 'manualCounts', e.target.checked)}
                                    />
                                    <Typography level="body-xs">Enable to manually set the number of questions for each type.</Typography>
                                </FormControl>

                                {config.manualCounts && (
                                    <>
                                        <Typography level="body-sm" sx={{ mt: 1 }}>Specify counts for each type:</Typography>
                                        
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Checkbox 
                                                label="Single Choice" 
                                                checked={config.Radio.enabled}
                                                onChange={(e) => handleConfigChange('Radio', 'enabled', e.target.checked)}
                                            />
                                            <Input 
                                                type="number" 
                                                disabled={!config.Radio.enabled}
                                                value={config.Radio.count}
                                                onChange={(e) => handleConfigChange('Radio', 'count', parseInt(e.target.value) || 0)}
                                                sx={{ width: 80 }}
                                                size="sm"
                                            />
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Checkbox 
                                                label="Multiple Choice" 
                                                checked={config.MultiChoice.enabled}
                                                onChange={(e) => handleConfigChange('MultiChoice', 'enabled', e.target.checked)}
                                            />
                                            <Input 
                                                type="number" 
                                                disabled={!config.MultiChoice.enabled}
                                                value={config.MultiChoice.count}
                                                onChange={(e) => handleConfigChange('MultiChoice', 'count', parseInt(e.target.value) || 0)}
                                                sx={{ width: 80 }}
                                                size="sm"
                                            />
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Checkbox 
                                                label="Text Answer" 
                                                checked={config.Text.enabled}
                                                onChange={(e) => handleConfigChange('Text', 'enabled', e.target.checked)}
                                            />
                                            <Input 
                                                type="number" 
                                                disabled={!config.Text.enabled}
                                                value={config.Text.count}
                                                onChange={(e) => handleConfigChange('Text', 'count', parseInt(e.target.value) || 0)}
                                                sx={{ width: 80 }}
                                                size="sm"
                                            />
                                        </Box>
                                        <Typography level="body-xs" color={totalAdvancedQuestions !== parseInt(numQuestions) ? 'warning' : 'neutral'}>
                                            Total Selected: {totalAdvancedQuestions}
                                        </Typography>
                                    </>
                                )}

                                <Box sx={{ py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Checkbox 
                                        label="Include Bonus Questions?" 
                                        checked={config.bonus.enabled}
                                        onChange={(e) => handleConfigChange('bonus', 'enabled', e.target.checked)}
                                        sx={{ mb: 1 }}
                                    />
                                    
                                    {config.bonus.enabled && (
                                        <Stack spacing={2} sx={{ pl: 3, pt: 1 }}>
                                            <FormControl>
                                                <FormLabel>Number of Bonus Questions</FormLabel>
                                                <Input 
                                                    type="number" 
                                                    value={config.bonus.count}
                                                    onChange={(e) => handleConfigChange('bonus', 'count', parseInt(e.target.value) || 1)}
                                                    slotProps={{ input: { min: 1, max: 5 } }}
                                                />
                                            </FormControl>

                                            <FormControl>
                                                <FormLabel>Bonus Difficulty</FormLabel>
                                                <select 
                                                    value={config.bonus.difficulty} 
                                                    onChange={(e) => handleConfigChange('bonus', 'difficulty', e.target.value)}
                                                    style={{ padding: '8px', borderRadius: '6px', borderColor: '#ccc' }}
                                                >
                                                    <option value="Easy">Easy</option>
                                                    <option value="Medium">Medium</option>
                                                    <option value="Hard">Hard</option>
                                                </select>
                                            </FormControl>

                                            <FormControl>
                                                <FormLabel>Source Topic</FormLabel>
                                                <select 
                                                    value={config.bonus.source} 
                                                    onChange={(e) => handleConfigChange('bonus', 'source', e.target.value)}
                                                    style={{ padding: '8px', borderRadius: '6px', borderColor: '#ccc' }}
                                                >
                                                    <option value="file">Directly from File (In-depth)</option>
                                                    <option value="inference">Inferred/Related Concepts (Not explicit in file)</option>
                                                    <option value="external">Out of Topic (General Knowledge/Research)</option>
                                                </select>
                                                <Typography level="body-xs" sx={{ mt: 0.5 }}>
                                                    {config.bonus.source === 'file' && "Questions based strictly on document details."}
                                                    {config.bonus.source === 'inference' && "Questions requiring deduction or connecting concepts."}
                                                    {config.bonus.source === 'external' && "Questions related to the topic but not found in the text."}
                                                </Typography>
                                            </FormControl>
                                        </Stack>
                                    )}
                                </Box>
                            </Stack>
                        )}



                        <FormControl>
                             <FormLabel>Time Limit (Minutes)</FormLabel>
                             <Input 
                                 type="number" 
                                 value={timeLimit} 
                                 onChange={(e) => setTimeLimit(e.target.value)}
                                 placeholder="Optional: Leave empty for no limit"
                                 slotProps={{ input: { min: 1 } }}
                             />
                             <Typography level="body-xs">If set, the exam will auto-submit when time runs out.</Typography>
                        </FormControl>

                        {!initialDocumentId && (
                            <FormControl>
                                <FormLabel>Upload Document (PDF)</FormLabel>
                                <Button
                                    component="label"
                                    role={undefined}
                                    tabIndex={-1}
                                    variant="outlined"
                                    color="neutral"
                                    startDecorator={
                                        <SvgIcon>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                                                />
                                            </svg>
                                        </SvgIcon>
                                    }
                                >
                                    {file ? file.name : 'Upload a file'}
                                    <VisuallyHiddenInput type="file" onChange={handleFileChange} accept=".pdf" />
                                </Button>
                            </FormControl>
                        )}

                        <Button type="submit" loading={loading} disabled={loading}>
                            {loading ? 'Generating...' : 'Create Exam'}
                        </Button>
                    </Stack>
                </form>
            </ModalDialog>
        </Modal>
    );
};

export default CreateExamModal;
