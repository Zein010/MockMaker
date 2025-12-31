import React from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContextBase';
import Sheet from '@mui/joy/Sheet';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import Typography from '@mui/joy/Typography';
import IconButton from '@mui/joy/IconButton';
import Avatar from '@mui/joy/Avatar';
import Box from '@mui/joy/Box';
import Divider from '@mui/joy/Divider';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import ListAltIcon from '@mui/icons-material/ListAlt';

const Sidebar = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <Sheet
            className="Sidebar"
            sx={{
                position: 'fixed',
                transform: 'none',
                transition: 'transform 0.4s, width 0.4s',
                zIndex: 1000,
                height: '100dvh',
                width: '250px',
                p: 2,
                gap: 2,
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <IconButton variant="soft" color="primary" size="sm">
                    <DashboardIcon />
                </IconButton>
                <Typography level="title-lg">MockMaker</Typography>
            </Box>

            <Divider />

            <List
                size="sm"
                sx={{
                    gap: 1,
                    '--ListItem-radius': (theme) => theme.vars.radius.sm,
                }}
            >
                <ListItem>
                    <ListItemButton
                        component={RouterLink}
                        to="/"
                        selected={location.pathname === '/'}
                    >
                        <ListItemDecorator>
                            <DashboardIcon />
                        </ListItemDecorator>
                        <ListItemContent>Dashboard</ListItemContent>
                    </ListItemButton>
                </ListItem>
                <ListItem>
                    <ListItemButton
                        component={RouterLink}
                        to="/submissions"
                        selected={location.pathname === '/submissions'}
                    >
                        <ListItemDecorator>
                            <ListAltIcon />
                        </ListItemDecorator>
                        <ListItemContent>All Submissions</ListItemContent>
                    </ListItemButton>
                </ListItem>
            </List>

            <List
                size="sm"
                sx={{
                    mt: 'auto',
                    flexGrow: 0,
                    '--ListItem-radius': (theme) => theme.vars.radius.sm,
                    '--List-gap': '8px',
                    mb: 2,
                }}
            >
                <ListItem>
                    <ListItemButton onClick={handleLogout}>
                        <ListItemDecorator>
                            <LogoutIcon />
                        </ListItemDecorator>
                        <ListItemContent>Logout</ListItemContent>
                    </ListItemButton>
                </ListItem>
            </List>
            
            <Divider />
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Avatar size="sm" src={user?.avatar} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography level="title-sm">{user?.name || 'User'}</Typography>
                    <Typography level="body-xs">{user?.email}</Typography>
                </Box>
            </Box>
        </Sheet>
    );
};

export default Sidebar;
