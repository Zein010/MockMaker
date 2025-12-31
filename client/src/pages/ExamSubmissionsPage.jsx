import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import Table from '@mui/joy/Table';
import Button from '@mui/joy/Button';
import Box from '@mui/joy/Box';
import CircularProgress from '@mui/joy/CircularProgress';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import api from '../api/axios';

const ExamSubmissionsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const response = await api.get(`/exams/${id}/submissions`);
                setSubmissions(response.data);
            } catch (error) {
                console.error('Failed to load submissions', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
        fetchSubmissions();
    }, [id]);

    const handleReset = async (resultId) => {
        if (!window.confirm('Are you sure you want to reset this attempt? The student will be able to retake the exam, but this result will be permanently deleted.')) {
            return;
        }
        try {
            await api.delete(`/exams/results/${resultId}`);
            setSubmissions(prev => prev.filter(s => s._id !== resultId));
        } catch (error) {
            console.error('Failed to reset attempt', error);
            alert('Failed to reset attempt');
        }
    };





    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ width: '100%', mx: 'auto', pb: 5 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography level="h2">Exam Submissions</Typography>
                <Button variant="plain" onClick={() => navigate('/')}>Back to Dashboard</Button>
            </Box>

            <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
                <Table stickyHeader hoverRow>
                   <thead>
                       <tr>
                           <th>Student</th>
                           <th>Email</th>
                           <th>Score</th>
                           <th>Date</th>
                           <th>Actions</th>
                       </tr>
                   </thead>
                   <tbody>
                       {submissions.length === 0 ? (
                           <tr>
                               <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                   No submissions yet.
                               </td>
                           </tr>
                       ) : (
                           submissions.map((sub) => (
                               <tr key={sub._id}>
                                   <td>{sub.user?.name || 'Unknown'}</td>
                                   <td>{sub.user?.email || '-'}</td>
                                   <td>
                                       <Typography 
                                            color={sub.score / sub.totalQuestions >= 0.5 ? 'success' : 'danger'}
                                            fontWeight="lg"
                                       >
                                           {sub.score} / {sub.totalQuestions}
                                       </Typography>
                                   </td>
                                   <td>{new Date(sub.completedAt).toLocaleString()}</td>
                                    <td>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button 
                                                size="sm" 
                                                variant="soft"
                                                startDecorator={<VisibilityIcon />}
                                                onClick={() => navigate(`/results/${sub._id}`)}
                                            >
                                                View
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="soft"
                                                color="danger"
                                                startDecorator={<RestartAltIcon />}
                                                onClick={() => handleReset(sub._id)}
                                            >
                                                Reset
                                            </Button>
                                        </Box>
                                    </td>
                               </tr>
                           ))
                       )}
                   </tbody>
                </Table>
            </Sheet>
        </Box>
    );
};

export default ExamSubmissionsPage;
