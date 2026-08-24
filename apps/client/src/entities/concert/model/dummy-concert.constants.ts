/**
 * 실제 API 연동 전까지 사용하는 임시 더미 데이터입니다.
 * API 연동 후 제거해야 합니다.
 */
import type { components } from "@tikkle/api-types";

import { toDate } from "@shared/lib/date.utils";

type ConcertDetailResponse = components["schemas"]["ConcertDetailResponse"];

export const DUMMY_CONCERTS: ConcertDetailResponse[] = [
  {
    concert: {
      id: 1,
      title: "2026 Summer Festival",
      genre: "FESTIVAL",
      placeName: "올림픽공원 KSPO DOME",
      posterUrl: "https://picsum.photos/seed/concert1/400/600",
      description: "2026년 여름을 뜨겁게 달굴 최고의 페스티벌! 다양한 아티스트들의 공연과 함께 즐거운 시간을 보내세요.",
      createdAt: "2026-06-01T10:00:00",
    },
    performances: [
      {
        id: 1,
        concertId: 1,
        startsAt: "2026-08-20T19:00:00",
        bookingOpensAt: "2026-07-20T10:00:00",
        createdAt: "2026-06-01T10:00:00",
      },
    ],
  },
  {
    concert: {
      id: 2,
      title: "찰리 푸스 내한공연",
      genre: "INTERNATIONAL_ARTIST",
      placeName: "고양종합운동장",
      posterUrl: "https://picsum.photos/seed/concert2/400/600",
      description: "찰리 푸스의 감미로운 목소리와 함께하는 특별한 밤! 놓치지 마세요.",
      createdAt: "2026-07-01T10:00:00",
    },
    performances: [
      {
        id: 2,
        concertId: 2,
        startsAt: "2026-09-15T19:00:00",
        bookingOpensAt: "2026-07-15T10:00:00",
        createdAt: "2026-07-01T10:00:00",
      },
    ],
  },
  {
    concert: {
      id: 3,
      title: "IU Concert Tour 2026",
      genre: "BALLAD",
      placeName: "서울 잠실종합운동장",
      posterUrl: "https://picsum.photos/seed/concert3/400/600",
      description: "아이유의 감성적인 무대와 함께하는 특별한 밤! 팬들과 함께하는 소중한 시간을 놓치지 마세요.",
      createdAt: "2026-08-01T10:00:00",
    },
    performances: [
      {
        id: 3,
        concertId: 3,
        startsAt: "2026-10-10T18:00:00",
        bookingOpensAt: "2026-09-01T10:00:00",
        createdAt: "2026-08-01T10:00:00",
      },
    ],
  },
  {
    concert: {
      id: 4,
      title: "NCT DREAM 10TH ANNIVERSARY",
      genre: "RAP_HIPHOP",
      placeName: "인스파이어 아레나",
      posterUrl: "https://picsum.photos/seed/concert4/400/600",
      description: "NCT DREAM의 10주년 기념 콘서트! 팬들과 함께하는 특별한 순간을 놓치지 마세요.",
      createdAt: "2026-05-20T10:00:00",
    },
    performances: [
      {
        id: 4,
        concertId: 4,
        startsAt: "2026-07-20T19:00:00",
        bookingOpensAt: "2026-06-20T10:00:00",
        createdAt: "2026-05-20T10:00:00",
      },
    ],
  },
  {
    concert: {
      id: 5,
      title: "DAY6 SPECIAL CONCERT",
      genre: "ROCK_METAL",
      placeName: "고척스카이돔",
      posterUrl: "https://picsum.photos/seed/concert5/400/600",
      description: "DAY6의 특별한 콘서트! 감성적인 음악과 함께하는 소중한 시간을 놓치지 마세요.",
      createdAt: "2026-08-05T10:00:00",
    },
    performances: [],
  },
  {
    concert: {
      id: 6,
      title: "Jason Mraz 아시아 투어 2026",
      genre: "INTERNATIONAL_ARTIST",
      placeName: "블루스퀘어 마스터카드홀",
      posterUrl: null,
      description: "Jason Mraz의 감미로운 목소리와 함께하는 아시아 투어! 특별한 밤을 놓치지 마세요.",
      createdAt: "2026-07-10T10:00:00",
    },
    performances: [
      {
        id: 5,
        concertId: 6,
        startsAt: "2026-08-30T19:00:00",
        bookingOpensAt: "2026-07-30T10:00:00",
        createdAt: "2026-07-10T10:00:00",
      },
    ],
  },
  {
    concert: {
      id: 7,
      title: "그랜드 민트 페스티벌 2026",
      genre: "FESTIVAL",
      placeName: "올림픽공원 88잔디마당",
      posterUrl: "https://picsum.photos/seed/concert7/400/600",
      description: "2026년 최고의 음악 페스티벌! 다양한 아티스트들의 공연과 함께 즐거운 시간을 보내세요.",
      createdAt: "2026-07-01T10:00:00",
    },
    performances: [
      {
        id: 6,
        concertId: 7,
        startsAt: "2026-10-17T18:00:00",
        bookingOpensAt: "2026-08-01T10:00:00",
        createdAt: "2026-07-01T10:00:00",
      },
      {
        id: 7,
        concertId: 7,
        startsAt: "2026-10-18T18:00:00",
        bookingOpensAt: "2026-08-01T10:00:00",
        createdAt: "2026-07-01T10:00:00",
      },
      {
        id: 8,
        concertId: 7,
        startsAt: "2026-10-19T18:00:00",
        bookingOpensAt: "2026-08-01T10:00:00",
        createdAt: "2026-07-01T10:00:00",
      },
    ],
  },
  {
    concert: {
      id: 8,
      title: "IVE WORLD TOUR",
      genre: "RAP_HIPHOP",
      placeName: "인천문학경기장",
      posterUrl: "https://picsum.photos/seed/concert8/400/600",
      description: "IVE의 월드 투어! 팬들과 함께하는 특별한 순간을 놓치지 마세요.",
      createdAt: "2026-05-01T10:00:00",
    },
    performances: [
      {
        id: 9,
        concertId: 8,
        startsAt: "2026-08-01T18:00:00",
        bookingOpensAt: "2026-06-01T10:00:00",
        createdAt: "2026-05-01T10:00:00",
      },
      {
        id: 10,
        concertId: 8,
        startsAt: "2026-08-25T18:00:00",
        bookingOpensAt: "2026-06-01T10:00:00",
        createdAt: "2026-05-01T10:00:00",
      },
    ],
  },
  {
    concert: {
      id: 9,
      title: "Coldplay Live in Seoul",
      genre: "INTERNATIONAL_ARTIST",
      placeName: "서울월드컵경기장",
      posterUrl: "https://picsum.photos/seed/concert9/400/600",
      description: "Coldplay의 라이브 공연! 감동적인 무대와 함께하는 특별한 밤을 놓치지 마세요.",
      createdAt: "2026-06-01T10:00:00",
    },
    performances: [
      {
        id: 11,
        concertId: 9,
        startsAt: "2026-09-20T19:00:00",
        bookingOpensAt: "2026-07-01T10:00:00",
        createdAt: "2026-06-01T10:00:00",
      },
      {
        id: 12,
        concertId: 9,
        startsAt: "2026-09-21T19:00:00",
        bookingOpensAt: "2026-07-01T10:00:00",
        createdAt: "2026-06-01T10:00:00",
      },
    ],
  },
  {
    concert: {
      id: 10,
      title: "AKMU SPECIAL CONCERT",
      genre: "INDIE",
      placeName: "세종문화회관 대극장",
      posterUrl: "https://picsum.photos/seed/concert10/400/600",
      description: "AKMU의 특별한 콘서트! 감성적인 음악과 함께하는 소중한 시간을 놓치지 마세요.",
      createdAt: "2026-08-01T10:00:00",
    },
    performances: [
      {
        id: 13,
        concertId: 10,
        startsAt: "2026-12-20T18:00:00",
        bookingOpensAt: "2026-11-01T10:00:00",
        createdAt: "2026-08-01T10:00:00",
      },
      {
        id: 14,
        concertId: 10,
        startsAt: "2026-12-21T18:00:00",
        bookingOpensAt: "2026-11-01T10:00:00",
        createdAt: "2026-08-01T10:00:00",
      },
    ],
  },
  {
    concert: {
      id: 11,
      title: "2026 대한민국 인디 뮤직 페스티벌 스페셜 라이브 콘서트",
      genre: "INDIE",
      placeName: "서울특별시 송파구 올림픽공원 야외특설공연장",
      posterUrl: "https://picsum.photos/seed/concert11/400/600",
      description: "2026 대한민국 인디 뮤직 페스티벌 스페셜 라이브 콘서트! 다양한 인디 아티스트들의 공연과 함께 즐거운 시간을 보내세요.",
      createdAt: "2026-06-01T10:00:00",
    },
    performances: [
      {
        id: 15,
        concertId: 11,
        startsAt: "2026-09-05T17:00:00",
        bookingOpensAt: "2026-07-01T10:00:00",
        createdAt: "2026-06-01T10:00:00",
      },
    ],
  },
  {
    concert: {
      id: 12,
      title: "잔나비 전국투어",
      genre: "ROCK_METAL",
      placeName: "부산 벡스코 오디토리움",
      posterUrl: "https://picsum.photos/seed/concert12/400/600",
      description: "잔나비의 전국투어 콘서트! 감성적인 음악과 함께하는 소중한 시간을 놓치지 마세요.",
      createdAt: "2026-07-01T10:00:00",
    },
    performances: [
      {
        id: 16,
        concertId: 12,
        startsAt: "2026-09-12T18:00:00",
        bookingOpensAt: "2026-07-12T10:00:00",
        createdAt: "2026-07-01T10:00:00",
      },
    ],
  },
  {
    concert: {
      id: 13,
      title: "BTS WORLD TOUR",
      genre: "RAP_HIPHOP",
      placeName: "서울 잠실종합운동장",
      posterUrl: "https://picsum.photos/seed/concert13/400/600",
      description: "BTS의 월드 투어! 팬들과 함께하는 특별한 순간을 놓치지 마세요.",
      createdAt: "2026-08-01T10:00:00",
    },
    performances: [
      {
        id: 17,
        concertId: 13,
        startsAt: "2000-01-01",
        bookingOpensAt: "1999-12-01",
        createdAt: "1999-11-01",
      },
      {
        id: 18,
        concertId: 13,
        startsAt: "2099-01-01",
        bookingOpensAt: "2098-12-01",
        createdAt: "2026-01-01",
      },
    ],
  },
  {
    concert: {
      id: 14,
      title: "2026 Summer Festival",
      genre: "FESTIVAL",
      placeName: "올림픽공원 KSPO DOME",
      posterUrl: "https://picsum.photos/seed/concert14/400/600",
      description: "2026년 여름을 뜨겁게 달굴 최고의 페스티벌! 다양한 아티스트들의 공연과 함께 즐거운 시간을 보내세요.",
      createdAt: "2026-06-01T10:00:00",
    },
    performances: [
      {
        id: 19,
        concertId: 14,
        startsAt: "2026-08-20T19:00:00",
        bookingOpensAt: null,
        createdAt: "2026-06-01T10:00:00",
      },
    ],
  },
  {
    concert: {
      id: 15,
      title: "서울 재즈 나이트 2026",
      genre: "JAZZ_SOUL",
      placeName: "세종문화회관 M씨어터",
      posterUrl: "https://picsum.photos/seed/concert15/400/600",
      description: "서울 재즈 나이트 2026! 감미로운 재즈 음악과 함께하는 특별한 밤을 놓치지 마세요.",
      createdAt: "2026-08-10T10:00:00",
    },
    performances: [
      {
        id: 20,
        concertId: 15,
        startsAt: "2026-10-03T19:00:00",
        bookingOpensAt: "2026-08-20T10:00:00",
        createdAt: "2026-08-10T10:00:00",
      },
    ],
  },
  {
    concert: {
      id: 16,
      title: "2026 전국 트로트 대축제",
      genre: "TROT",
      placeName: "잠실실내체육관",
      posterUrl: "https://picsum.photos/seed/concert16/400/600",
      description: "2026 전국 트로트 대축제! 다양한 트로트 가수들의 공연과 함께 즐거운 시간을 보내세요.",
      createdAt: "2026-08-10T10:00:00",
    },
    performances: [
      {
        id: 21,
        concertId: 16,
        startsAt: "2026-11-14T18:00:00",
        bookingOpensAt: "2026-09-01T10:00:00",
        createdAt: "2026-08-10T10:00:00",
      },
    ],
  },
];

export const UPCOMING_CONCERTS = DUMMY_CONCERTS.filter(({ performances }) => {
  const now = new Date();
  const futurePerformances = performances.filter(({ startsAt }) => toDate(startsAt) >= now);
  return futurePerformances.length > 0 && futurePerformances.every(({ bookingOpensAt }) => bookingOpensAt && toDate(bookingOpensAt) > now);
});

export const DAILY_RANKINGS = DUMMY_CONCERTS.slice(0, 5);

export const HOT_CONCERTS = DUMMY_CONCERTS.slice(2, 8);
