import type { ReactNode } from "react";

interface ButtonWrapperProps {
  children: ReactNode;
  className?: string;
  buttonClassName?: string;
  onClick?: () => void;
}

const ButtonWrapper = ({ children, className, buttonClassName, onClick }: ButtonWrapperProps) => {
  if (onClick) {
    return (
      <button type="button" className={buttonClassName} onClick={onClick}>
        {children}
      </button>
    );
  }

  return <div className={className}>{children}</div>;
};

export default ButtonWrapper;
