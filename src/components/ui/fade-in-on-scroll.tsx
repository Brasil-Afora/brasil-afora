import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface FadeInOnScrollProps {
  children: ReactNode;
}

const FadeInOnScroll = ({ children }: FadeInOnScrollProps) => {
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setHasLoaded(true);
  }, []);

  return (
    <div
      className={`transform transition-all duration-1000 ease-in-out ${
        hasLoaded ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
    >
      {children}
    </div>
  );
};

export default FadeInOnScroll;
