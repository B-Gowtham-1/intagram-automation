export interface LyricLine {
  id: number;
  time: number; // in seconds from start of audio
  duration: number; // duration of line in seconds
  tamil: string;
  thanglish: string;
}

export const MANU_SONG_CONFIG = {
  title: "Naan Un",
  artists: "A.R. Rahman • Arijit Singh • Chinmayi Sripada",
  movie: "24",
  audioSrc: "/audio/naan_un.mp3",
  // Vocals start exactly at 30.35s. We start at 29.5s for seamless breath entry.
  startTime: 29.5,
  // 1 minute duration window (from 29.5s to 89.5s)
  duration: 60,
  endTime: 89.5,
};

export const MANU_LYRICS: LyricLine[] = [
  {
    id: 1,
    time: 30.35,
    duration: 5.0,
    tamil: "நான் உன் அழகினிலே",
    thanglish: "Naan un azhaginile",
  },
  {
    id: 2,
    time: 35.35,
    duration: 5.15,
    tamil: "தெய்வம் உணருகிறேன்",
    thanglish: "Dheivam unarugiren",
  },
  {
    id: 3,
    time: 40.50,
    duration: 6.16,
    tamil: "உந்தன் அருகினிலே",
    thanglish: "Undhan aruginile",
  },
  {
    id: 4,
    time: 46.66,
    duration: 4.01,
    tamil: "என்னை உணருகிறேன்",
    thanglish: "Ennai unarugiren",
  },
  {
    id: 5,
    time: 50.67,
    duration: 5.64,
    tamil: "உன் முகம் தாண்டி மனம் சென்று உன்னை பார்த்ததால்",
    thanglish: "Un mugam thaandi manam sendru unnai paarthadhaal",
  },
  {
    id: 6,
    time: 56.31,
    duration: 5.37,
    tamil: "உன் இதயத்தின் நிறம் பார்த்ததால்",
    thanglish: "Un idhayathin niram paarthadhaal",
  },
  {
    id: 7,
    time: 61.68,
    duration: 4.97,
    tamil: "நான் உன் அழகினிலே",
    thanglish: "Naan un azhaginile",
  },
  {
    id: 8,
    time: 66.65,
    duration: 4.96,
    tamil: "தெய்வம் உணருகிறேன்",
    thanglish: "Dheivam unarugiren",
  },
  {
    id: 9,
    time: 71.61,
    duration: 5.23,
    tamil: "உந்தன் அருகினிலே",
    thanglish: "Undhan aruginile",
  },
  {
    id: 10,
    time: 76.84,
    duration: 6.36,
    tamil: "என்னை உணருகிறேன்",
    thanglish: "Ennai unarugiren",
  },
];
