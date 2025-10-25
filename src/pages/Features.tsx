import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Features = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to landing page since all features are now shown there
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
};

export default Features;
