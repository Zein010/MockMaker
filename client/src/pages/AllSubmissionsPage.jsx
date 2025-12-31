import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import Table from '@mui/joy/Table';
import Button from '@mui/joy/Button';
import Box from '@mui/joy/Box';
import CircularProgress from '@mui/joy/CircularProgress';
import Chip from '@mui/joy/Chip';
import api from '../api/axios';

import VisibilityIcon from '@mui/icons-material/Visibility';

const AllSubmissionsPage = () => {
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const response = await api.get('/exams/all-submissions');
                setSubmissions(response.data);
            } catch (error) {
                console.error('Failed to fetch submissions', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, []);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ width: '100%', mx: 'auto' }}>
            <Typography level="h2" sx={{ mb: 3 }}>All Student Submissions</Typography>

            <Sheet
                variant="outlined"
                sx={{
                    borderRadius: 'md',
                    boxShadow: 'sm',
                    overflow: 'auto',
                }}
            >
                <Table stickyHeader hoverRow>
                    <thead>
                        <tr>
                            <th>Exam Name</th>
                            <th>Student</th>
                            <th>Score</th>
                            <th>Date</th>
                            <th style={{ width: 100 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {submissions.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>No submissions found.</td>
                            </tr>
                        ) : (
                            submissions.map((sub) => (
                                <tr key={sub._id}>
                                    <td>{sub.exam?.title || 'Unknown Exam'}</td>
                                    <td>
                                        <Typography level="title-sm">{sub.user?.name || 'Anonymous'}</Typography>
                                        <Typography level="body-xs">{sub.user?.email}</Typography>
                                    </td>
                                    <td>
                                        <Chip 
                                            color={sub.score / sub.totalQuestions >= 0.5 ? 'success' : 'danger'} 
                                            variant="soft"
                                            size="sm"
                                        >
                                            {sub.score} / {sub.totalQuestions}
                                        </Chip>
                                    </td>
                                    <td>{new Date(sub.completedAt).toLocaleDateString()} {new Date(sub.completedAt).toLocaleTimeString()}</td>
                                    <td>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                                            <Button 
                                                size="sm" 
                                                variant="plain" 
                                                startDecorator={<VisibilityIcon />}
                                                onClick={() => navigate(`/results/${sub._id}`)}
                                            >
                                                View
                                            </Button>
                                            
                                            {/* Check if any text answer is pending grading */}
                                            {sub.answers && sub.answers.some(a => a.gradingStatus === 'pending') && (
                                                <Chip size="sm" color="warning" variant="outlined">
                                                    Pending Review
                                                </Chip>
                                            )}
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

export default AllSubmissionsPage;
