import { useEffect, useRef } from "react";

interface UseResizeTextareaProps {
  value: string | null;
}

export const useResizeTextarea = ({ value }: UseResizeTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [value]);

  return {
    textareaRef,
    resizeTextarea,
  };
};
