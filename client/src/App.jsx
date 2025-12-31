import { Routes, Route, Navigate } from "react-router-dom";
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ExamPage from './pages/ExamPage';
import ResultsPage from './pages/ResultsPage';
import ExamSubmissionsPage from './pages/ExamSubmissionsPage';
import AllSubmissionsPage from './pages/AllSubmissionsPage.jsx';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

import ExamReviewPage from './pages/ExamReviewPage';

const App = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route element={<PrivateRoute />}>
                <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/exam/:id" element={<ExamPage />} />
                    <Route path="/exam/:id/review" element={<ExamReviewPage />} />
                    <Route path="/exam/:id/submissions" element={<ExamSubmissionsPage />} />
                    <Route path="/results/:id" element={<ResultsPage />} />
                    <Route path="/submissions" element={<AllSubmissionsPage />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default App;