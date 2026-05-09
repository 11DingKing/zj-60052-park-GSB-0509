import { get, post, del } from "./request";

export interface Reservation {
  id: string;
  userId: string;
  spotId: string;
  startTime: string;
  endTime: string;
  plateNumber?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  spot?: any;
}

export const reservationsApi = {
  create: (data: {
    spotId: string;
    startTime: string;
    endTime: string;
    plateNumber?: string;
  }) => {
    return post<Reservation>({
      url: "/reservations",
      data,
    });
  },

  getMine: () => {
    return get<Reservation[]>({
      url: "/reservations/mine",
    });
  },

  cancel: (id: string) => {
    return del({
      url: `/reservations/${id}`,
    });
  },
};
