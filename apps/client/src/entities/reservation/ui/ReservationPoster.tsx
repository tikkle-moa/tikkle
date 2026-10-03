import { Music2 } from "lucide-react";

interface Props {
  concertTitle: string;
  posterUrl: string | null;
}

const ReservationPoster = ({ concertTitle, posterUrl }: Props) => (
  <div className="relative flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-violet-50 text-violet-300">
    <Music2 aria-hidden="true" size={24} />
    {posterUrl && (
      <img
        alt={`${concertTitle} 포스터`}
        className="absolute inset-0 h-full w-full object-cover"
        src={posterUrl}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    )}
  </div>
);

export default ReservationPoster;
