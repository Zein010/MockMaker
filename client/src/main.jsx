import { BrowserRouter } from "react-router-dom";
import ReactDOM from 'react-dom/client';
import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import App from './App';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <CssVarsProvider>
        <CssBaseline />
        <App />
      </CssVarsProvider>
    </AuthProvider>
  </BrowserRouter>
);