import { create } from "zustand";

interface ConcertState {
  concerts: string[];
  setConcerts: (concerts: string[]) => void;
}

export const useConcertStore = create<ConcertState>((set) => ({
  concerts: [],
  setConcerts: (concerts) => set({ concerts }),
}));
