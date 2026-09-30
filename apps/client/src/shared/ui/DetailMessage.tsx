interface DetailMessageProps {
  title: string;
  description: string;
}

const DetailMessage = ({ title, description }: DetailMessageProps) => (
  <section className="mx-auto flex min-h-80 max-w-screen-sm flex-col items-center justify-center text-center">
    <h1 className="text-xl font-bold text-gray-900">{title}</h1>
    <p className="mt-2 text-sm text-gray-500">{description}</p>
  </section>
);

export default DetailMessage;
