import { AlertTriangle } from "lucide-react";

interface PerformanceNewMessageProps {
  title: string;
  description: string;
}

const PerformanceNewMessage = ({ title, description }: PerformanceNewMessageProps) => (
  <section
    className="mx-auto flex min-h-72 w-full max-w-4xl flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 py-16 text-center shadow-sm"
    role="alert"
  >
    <AlertTriangle aria-hidden className="size-7 text-red-500" />
    <h1 className="mt-4 text-lg font-bold text-slate-900">{title}</h1>
    <p className="mt-2 text-sm text-slate-500">{description}</p>
  </section>
);

export default PerformanceNewMessage;
