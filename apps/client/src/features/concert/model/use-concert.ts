import { useConcertStore } from "@entities/concert";

export const useConcert = () => {
  const concerts = useConcertStore((state) => state.concerts);
  const setConcerts = useConcertStore((state) => state.setConcerts);

  const handleNewConcert = (concert: string) => {
    setConcerts([...concerts, concert]);
  };

  const handleRemoveConcert = (concert: string) => {
    setConcerts(concerts.filter((c) => c !== concert));
  };

  return { concerts, handleNewConcert, handleRemoveConcert };
};
