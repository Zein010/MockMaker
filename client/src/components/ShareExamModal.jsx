import React, { useState, useEffect } from 'react';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import DialogTitle from '@mui/joy/DialogTitle';
import DialogContent from '@mui/joy/DialogContent';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import Stack from '@mui/joy/Stack';
import Radio from '@mui/joy/Radio';
import RadioGroup from '@mui/joy/RadioGroup';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import IconButton from '@mui/joy/IconButton';
import Typography from '@mui/joy/Typography';

import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import api from '../api/axios';

const ShareExamModal = ({ open, onClose, exam }) => {
    const [accessType, setAccessType] = useState('private');
    const [emailInput, setEmailInput] = useState('');
    const [allowedEmails, setAllowedEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (exam) {
            setAccessType(exam.accessType || 'private');
            setAllowedEmails(exam.allowedEmails || []);
        }
    }, [exam]);

    const handleAddEmail = () => {
        if (emailInput && !allowedEmails.includes(emailInput)) {
            setAllowedEmails([...allowedEmails, emailInput]);
            setEmailInput('');
        }
    };

    const handleRemoveEmail = (email) => {
        setAllowedEmails(allowedEmails.filter(e => e !== email));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put(`/exams/${exam._id}/share`, {
                accessType,
                allowedEmails
            });
            onClose();
        } catch (error) {
            console.error('Failed to update sharing settings', error);
            alert('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/exam/${exam._id}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal open={open} onClose={onClose}>
            <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
                <DialogTitle>Share Exam</DialogTitle>
                <DialogContent>Configure who can access this exam.</DialogContent>
                
                <Stack spacing={3}>
                    <FormControl>
                        <FormLabel>Access Type</FormLabel>
                        <RadioGroup 
                            value={accessType} 
                            onChange={(e) => setAccessType(e.target.value)}
                            orientation="horizontal"
                        >
                            <Radio value="private" label="Private (Invite Only)" />
                            <Radio value="public" label="Public (Anyone with link)" />
                        </RadioGroup>
                    </FormControl>

                    {accessType === 'private' && (
                        <Box>
                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <Input 
                                    placeholder="Add allowed email" 
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    sx={{ flex: 1 }}
                                />
                                <Button onClick={handleAddEmail} disabled={!emailInput}>Add</Button>
                            </Box>
                            
                            <Typography level="title-sm" sx={{ mb: 1 }}>Allowed Users:</Typography>
                            <List 
                                variant="outlined" 
                                sx={{ 
                                    borderRadius: 'sm', 
                                    maxHeight: 150, 
                                    overflow: 'auto',
                                    bgcolor: 'background.level1' 
                                }}
                            >
                                {allowedEmails.length === 0 ? (
                                    <ListItem><Typography level="body-xs">No emails added yet.</Typography></ListItem>
                                ) : (
                                    allowedEmails.map((email) => (
                                        <ListItem 
                                            key={email}
                                            endAction={
                                                <IconButton size="sm" color="danger" variant="plain" onClick={() => handleRemoveEmail(email)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            }
                                        >
                                            {email}
                                        </ListItem>
                                    ))
                                )}
                            </List>
                        </Box>
                    )}

                    <Box sx={{ p: 2, bgcolor: 'neutral.100', borderRadius: 'md', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography level="body-sm" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mr: 2 }}>
                            {`${window.location.origin}/exam/${exam?._id}`}
                        </Typography>
                        <Button 
                            size="sm" 
                            variant={copied ? "solid" : "outlined"} 
                            color={copied ? "success" : "neutral"}
                            startDecorator={<ContentCopyIcon />}
                            onClick={handleCopyLink}
                        >
                            {copied ? 'Copied!' : 'Copy Link'}
                        </Button>
                    </Box>

                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button variant="plain" color="neutral" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave} loading={loading}>Save Changes</Button>
                    </Stack>
                </Stack>
            </ModalDialog>
        </Modal>
    );
};

// Forgot implicit import for Box in condition
import Box from '@mui/joy/Box';

export default ShareExamModal;
