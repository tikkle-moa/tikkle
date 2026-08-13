import type { ReactNode } from "react";

interface ButtonWrapperProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

const ButtonWrapper = ({ children, className, onClick }: ButtonWrapperProps) => {
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {children}
      </button>
    );
  }

  return <div className={className}>{children}</div>;
};

export default ButtonWrapper;
