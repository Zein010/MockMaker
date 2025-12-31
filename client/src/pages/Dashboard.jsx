import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Box from '@mui/joy/Box';
import Table from '@mui/joy/Table';
import IconButton from '@mui/joy/IconButton';
import Chip from '@mui/joy/Chip';

import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete'; // If we add delete later
import ShareIcon from '@mui/icons-material/Share';

import api from '../api/axios';

import CreateExamModal from '../components/CreateExamModal';
import ShareExamModal from '../components/ShareExamModal';

const Dashboard = () => {
    // const { user } = useAuth(); // Unused
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [regenDocId, setRegenDocId] = useState(null);

    const [regenTitle, setRegenTitle] = useState('');
    const [openShareModal, setOpenShareModal] = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const response = await api.get('/exams');
            setExams(response.data);
        } catch (error) {
            console.error('Failed to fetch exams', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = (exam) => {
        setSelectedExam(exam);
        setOpenShareModal(true);
    };

    const handleDelete = async (examId) => {
        if (!window.confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return;

        try {
            await api.delete(`/exams/${examId}`);
            fetchExams(); 
        } catch (error) {
            console.error('Failed to delete exam', error);
            alert('Failed to delete exam');
        }
    };
    
    const handleRegenerate = (exam) => {
        if (exam.documents && exam.documents.length > 0) {
            setRegenDocId(exam.documents[0]); // Reuse first doc
            setRegenTitle(`${exam.title} (V2)`);
            setOpenCreateModal(true);
        } else {
            alert('Cannot regenerate: Document not found.');
        }
    };

    const handleCloseModal = () => {
        setOpenCreateModal(false);
        setRegenDocId(null);
        setRegenTitle('');
    };

    useEffect(() => {
        fetchExams();
    }, []);

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography level="h2">My Mock Exams</Typography>
                <Button 
                    startDecorator={<AddIcon />} 
                    onClick={() => setOpenCreateModal(true)}
                >
                    Create New Exam
                </Button>
            </Box>

            <Sheet
                variant="outlined"
                sx={{
                    borderRadius: 'md',
                    boxShadow: 'sm',
                    overflow: 'auto',
                    minHeight: 300
                }} 
            >
                <Table stickyHeader hoverRow>
                    <thead>
                        <tr>
                            <th style={{ width: '35%' }}>Title</th>
                            <th>Status</th>
                            <th>Created At</th>
                            <th style={{ width: '30%' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {exams.length === 0 && !loading && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                                    No exams found. Create one to get started!
                                </td>
                            </tr>
                        )}
                         {loading && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                                    Loading...
                                </td>
                            </tr>
                        )}
                        {exams.map((exam) => (
                            <tr key={exam._id}>
                                <td>{exam.title}</td>
                                <td>
                                    <Chip 
                                        color={exam.status === 'ready' ? 'success' : exam.status === 'failed' ? 'danger' : 'neutral'}
                                        size="sm"
                                        variant="soft"
                                    >
                                        {exam.status}
                                    </Chip>
                                </td>
                                <td>{new Date(exam.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Button 
                                            size="sm" 
                                            variant="soft" 
                                            color="primary"
                                            startDecorator={<PlayArrowIcon />}
                                            disabled={exam.status !== 'ready'}
                                            onClick={() => navigate(`/exam/${exam._id}`)}
                                        >
                                            Take
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="soft" 
                                            color="neutral"
                                            onClick={() => navigate(`/exam/${exam._id}/submissions`)}
                                        >
                                            Submissions
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="soft" 
                                            color="warning"
                                            onClick={() => navigate(`/exam/${exam._id}/review`)}
                                        >
                                            Edit / Review
                                        </Button>
                                        <IconButton 
                                            size="sm" 
                                            variant="plain" 
                                            color="primary"
                                            title="Share"
                                            onClick={() => handleShare(exam)}
                                        >
                                            <ShareIcon />
                                        </IconButton>
                                        
                                        {/* Reuse File Button */}
                                         <Button
                                            size="sm"
                                            variant="outlined"
                                            color="neutral"
                                            onClick={() => handleRegenerate(exam)}
                                            disabled={exam.status === 'failed'}
                                        >
                                            Reuse PDF
                                        </Button>

                                        <IconButton 
                                            size="sm" 
                                            variant="plain" 
                                            color="danger"
                                            title="Delete"
                                            onClick={() => handleDelete(exam._id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Sheet>

            <CreateExamModal 
                open={openCreateModal} 
                onClose={handleCloseModal} 
                onExamCreated={fetchExams}
                initialDocumentId={regenDocId}
                initialTitle={regenTitle}
            />

            <ShareExamModal 
                open={openShareModal} 
                onClose={() => setOpenShareModal(false)} 
                exam={selectedExam}
            />
        </Box>
    );
};

export default Dashboard;
