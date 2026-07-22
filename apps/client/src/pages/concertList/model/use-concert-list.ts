import { useConcert } from "../../../features/concert/model/use-concert";

export const useConcertList = () => {
  const { concerts, handleNewConcert, handleRemoveConcert } = useConcert();

  return { concerts, handleNewConcert, handleRemoveConcert };
};
