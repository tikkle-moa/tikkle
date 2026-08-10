import { SEAT_STYLE_MAP, type SeatStatus } from "@entities/seat";

interface SeatBoxProps {
  status: SeatStatus;
}

const SeatBox = ({ status }: SeatBoxProps) => {
  return <div className={`h-7 w-7 rounded-md border transition sm:h-8 sm:w-8 ${SEAT_STYLE_MAP[status].style}`} />;
};

export default SeatBox;
