import React from 'react';
import { Outlet } from 'react-router-dom';
import Box from '@mui/joy/Box';
import Sidebar from './Sidebar';

const Layout = () => {
    return (
        <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
            <Sidebar />
            <Box
                component="main"
                className="MainContent"
                sx={{
                    flex: 1,
                    ml: '250px', // width of Sidebar
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    height: '100dvh',
                    gap: 1,
                    overflow: 'auto',
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
};

export default Layout;
