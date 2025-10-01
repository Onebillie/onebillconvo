import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect directly to dashboard since no auth is required
    navigate('/dashboard');
  }, [navigate]);

  return null;
};

export default Auth;