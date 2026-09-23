/**
 * Hero photographs: one pool of university photos, shared by both themes
 * (owner, 2026-09-22). The same photo appears on the navy ground and on the
 * paper plate; what changes is the grade, not the picture. The `day/` and
 * `night/` folders describe the light in the photo, not the theme it belongs
 * to.
 *
 * Every file comes from Wikimedia Commons; `public/home/SOURCES.md` records
 * the original, its license and what was changed. Each photo's credit is shown
 * on the photo itself while it is on screen.
 *
 * `position` is the object-position focal point (x% y%): x keeps the subject
 * in the desktop crop, y in the short phone banner. On the navy ground the
 * photo dissolves in from the left, so subjects sit center-right.
 *
 * `toneDark` / `toneLight` override that theme's default grade (globals.css)
 * for one photo: daylight photos are pulled down on the navy ground, and the
 * darkest photos are lifted on the paper plate. See DESIGN.md's Low-Key Night
 * Rule for the level they aim at. The order below alternates bright and dark
 * photos and keeps each university apart.
 */

export interface HeroPhoto {
  author: string;
  license: string;
  /** Absent for public-domain works. */
  licenseUrl?: string;
  place: string;
  position: string;
  sourceUrl: string;
  src: string;
  /** CSS filter for the dark theme; defaults to the grade in globals.css. */
  toneDark?: string;
  /** CSS filter for the light theme; defaults to the grade in globals.css. */
  toneLight?: string;
}

const BY_2 = "https://creativecommons.org/licenses/by/2.0/";
const BY_4 = "https://creativecommons.org/licenses/by/4.0/";
const BY_SA_2 = "https://creativecommons.org/licenses/by-sa/2.0/";
const BY_SA_3 = "https://creativecommons.org/licenses/by-sa/3.0/";
const BY_SA_4 = "https://creativecommons.org/licenses/by-sa/4.0/";
const COMMONS = "https://commons.wikimedia.org/wiki/File:";

export const HERO_PHOTOS: HeroPhoto[] = [
  {
    src: "/home/edinburgh-evening-skyline.jpg",
    place: "Edimburgo (Escócia)",
    author: "Magnus Hagdorn",
    license: "CC BY-SA 2.0",
    licenseUrl: BY_SA_2,
    sourceUrl: `${COMMONS}Edinburgh_Evening_Skyline.jpg`,
    position: "52% 44%",
    // The dusk grade this photo was tuned with.
    toneDark: "brightness(0.8) hue-rotate(-14deg) saturate(1.15)",
  },
  {
    src: "/home/hero/day/harvard-yard.jpg",
    place: "Harvard Yard, Cambridge (EUA)",
    author: "Marco Almbauer",
    license: "domínio público",
    sourceUrl: `${COMMONS}Harvard_Yard_im_Sommer.jpg`,
    position: "50% 58%",
    toneLight: "brightness(1.12) saturate(1.05)",
  },
  {
    src: "/home/hero/night/washington-suzzallo.jpg",
    place: "Biblioteca Suzzallo, University of Washington (EUA)",
    author: "Guywelch2000",
    license: "CC BY 4.0",
    licenseUrl: BY_4,
    sourceUrl: `${COMMONS}Suzzallo_Reading_Room_University_of_Washington_restoration_Seattle_Washington_2026.jpg`,
    position: "50% 50%",
    toneLight: "brightness(1.3) saturate(1.05)",
  },
  {
    src: "/home/hero/day/sao-paulo-museu-do-ipiranga.jpg",
    place: "Museu Paulista da USP, São Paulo",
    author: "Mike Peel",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Museu_do_Ipiranga_2018_001.jpg`,
    position: "50% 40%",
    // Daylight in the dark theme: pulled from 82 to the set's level.
    toneDark: "brightness(0.72) saturate(1.08)",
  },
  {
    src: "/home/hero/night/rio-real-gabinete.jpg",
    place: "Real Gabinete Português de Leitura, Rio de Janeiro",
    author: "Donatas Dabravolskas",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Real_Gabinete_Portugu%C3%AAs_de_Leitura_01.jpg`,
    position: "45% 40%",
    toneLight: "brightness(1.12) saturate(1.05)",
  },
  {
    src: "/home/hero/day/cambridge-kings-college.jpg",
    place: "King's College, Cambridge (Reino Unido)",
    author: "LegesRomanorum",
    license: "CC BY-SA 3.0",
    licenseUrl: BY_SA_3,
    sourceUrl: `${COMMONS}King%27s_College_Cambridge_from_the_Backs.jpg`,
    position: "40% 55%",
    // Daylight in the dark theme: pulled from 79 to the set's level.
    toneDark: "brightness(0.74) saturate(1.08)",
  },
  {
    src: "/home/hero/night/stanford-hoover-tower.jpg",
    place: "Hoover Tower, Stanford (EUA)",
    author: "Suiren2022",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Hoover_Tower_sunset.jpg`,
    position: "55% 45%",
    // Daylight in the dark theme: pulled from 118 to the set's level.
    toneDark: "brightness(0.50) saturate(1.08)",
  },
  {
    src: "/home/hero/day/toronto-university-college.jpg",
    place: "University College, Toronto (Canadá)",
    author: "GoginkLobabi",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Toronto_University_College_1.jpg`,
    position: "55% 62%",
    // Daylight in the dark theme: pulled from 112 to the set's level.
    toneDark: "brightness(0.53) saturate(1.08)",
  },
  {
    src: "/home/hero/night/columbia-campus.jpg",
    place: "Columbia University, Nova York (EUA)",
    author: "Ctrl build",
    license: "CC BY-SA 3.0",
    licenseUrl: BY_SA_3,
    sourceUrl: `${COMMONS}ColumbiaCampusSunset.JPG`,
    position: "55% 45%",
  },
  {
    src: "/home/hero/day/coimbra-paco-das-escolas.jpg",
    place: "Universidade de Coimbra (Portugal)",
    author: "Diego Delso",
    license: "CC BY-SA 3.0",
    licenseUrl: BY_SA_3,
    sourceUrl: `${COMMONS}Universidad_de_Co%C3%ADmbra,_Portugal,_2012-05-10,_DD_16.JPG`,
    position: "45% 42%",
    // Daylight in the dark theme: pulled from 123 to the set's level.
    toneDark: "brightness(0.48) saturate(1.08)",
  },
  {
    src: "/home/hero/night/heidelberg-alte-universitaet.jpg",
    place: "Alte Universität, Heidelberg (Alemanha)",
    author: "NpunktGpunkt",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}2025_Alte_Universit%C3%A4t_Heidelberg.jpg`,
    position: "50% 50%",
  },
  {
    src: "/home/hero/night/vancouver-ubc-cherry-blossoms.jpg",
    place: "University of British Columbia, Vancouver (Canadá)",
    author: "Xicotencatl",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Cherry_Blossoms_UBC_02.JPG`,
    position: "50% 55%",
    // Daylight in the dark theme: pulled from 88 to the set's level.
    toneDark: "brightness(0.67) saturate(1.08)",
  },
  {
    src: "/home/hero/night/mit-great-dome.jpg",
    place: "Great Dome, MIT (EUA)",
    author: "Fcb981, edição de Thermos",
    license: "CC BY-SA 3.0",
    licenseUrl: BY_SA_3,
    sourceUrl: `${COMMONS}MIT_Dome_night1_Edit.jpg`,
    position: "15% 50%",
  },
  {
    src: "/home/hero/day/princeton-nassau-hall.jpg",
    place: "Nassau Hall, Princeton (EUA)",
    author: "ajay_suresh",
    license: "CC BY 4.0",
    licenseUrl: BY_4,
    sourceUrl: `${COMMONS}Nassau_Hall_-_Princeton_University_(55144981395).jpg`,
    position: "52% 55%",
    // Daylight in the dark theme: pulled from 109 to the set's level.
    toneDark: "brightness(0.54) saturate(1.08)",
  },
  {
    src: "/home/hero/night/oxford-radcliffe-camera.jpg",
    place: "Radcliffe Camera, Oxford (Reino Unido)",
    author: "chensiyuan",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}1_radcliffe_camera_night_2012.jpg`,
    position: "38% 55%",
    toneLight: "brightness(1.3) saturate(1.05)",
  },
  {
    src: "/home/hero/day/rio-ufrj-palacio-universitario.jpg",
    place: "Palácio Universitário da UFRJ, Rio de Janeiro",
    author: "Vstrabelli",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Pal%C3%A1cio_Universit%C3%A1rio_UFRJ.jpg`,
    position: "45% 58%",
    // Daylight in the dark theme: pulled from 80 to the set's level.
    toneDark: "brightness(0.74) saturate(1.08)",
  },
  {
    src: "/home/hero/night/dublin-trinity-long-room.jpg",
    place: "Long Room, Trinity College Dublin (Irlanda)",
    author: "Diliff",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Long_Room_Interior,_Trinity_College_Dublin,_Ireland_-_Diliff.jpg`,
    position: "50% 45%",
    toneLight: "brightness(1.12) saturate(1.05)",
  },
  {
    src: "/home/hero/night/yale-old-campus.jpg",
    place: "Old Campus, Yale (EUA)",
    author: "Francisco Anzola",
    license: "CC BY 2.0",
    licenseUrl: BY_2,
    sourceUrl: `${COMMONS}Yale_Old_Campus_(4139296788).jpg`,
    position: "50% 55%",
  },
  {
    src: "/home/hero/night/harvard-pforzheimer.jpg",
    place: "Pforzheimer House, Harvard (EUA)",
    author: "Rizka",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Sunset_at_Pforzheimer_House,_Harvard_Campus,_Cambridge,_Massachusetts.JPG`,
    position: "50% 45%",
    // Daylight in the dark theme: pulled from 74 to the set's level.
    toneDark: "brightness(0.80) saturate(1.08)",
  },
  {
    src: "/home/hero/day/stanford-main-quad.jpg",
    place: "Stanford, Califórnia (EUA)",
    author: "Frank Schulenburg",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Stanford_University_campus_in_2016.jpg`,
    position: "32% 55%",
    // Daylight in the dark theme: pulled from 112 to the set's level.
    toneDark: "brightness(0.53) saturate(1.08)",
  },
  {
    src: "/home/hero/night/coimbra-paco-das-escolas.jpg",
    place: "Universidade de Coimbra (Portugal)",
    author: "Nato Manzolli",
    license: "CC BY-SA 4.0",
    licenseUrl: BY_SA_4,
    sourceUrl: `${COMMONS}Sunset_in_the_University.jpg`,
    position: "50% 55%",
    // Daylight in the dark theme: pulled from 135 to the set's level.
    toneDark: "brightness(0.44) saturate(1.08)",
  },
  {
    src: "/home/hero/day/oxford-radcliffe-camera.jpg",
    place: "Radcliffe Camera, Oxford (Reino Unido)",
    author: "Julian Herzog",
    license: "CC BY 4.0",
    licenseUrl: BY_4,
    sourceUrl: `${COMMONS}Radcliffe_Camera_Oxford_2018_02.jpg`,
    position: "50% 50%",
    // Daylight in the dark theme: pulled from 92 to the set's level.
    toneDark: "brightness(0.64) saturate(1.08)",
  },
  {
    src: "/home/hero/night/curitiba-ufpr.jpg",
    place: "Prédio Histórico da UFPR, Curitiba",
    author: "Mateusmatsuda",
    license: "CC BY 4.0",
    licenseUrl: BY_4,
    sourceUrl: `${COMMONS}Pr%C3%A9dio_Hist%C3%B3rico_da_UFPR,_Curitiba_-_PR,_Brasil_(1).jpg`,
    position: "50% 52%",
    // Daylight in the dark theme: pulled from 109 to the set's level.
    toneDark: "brightness(0.54) saturate(1.08)",
  },
  {
    src: "/home/hero/day/mit-killian-court.jpg",
    place: "Killian Court, MIT (EUA)",
    author: "Madcoverboy",
    license: "CC BY-SA 3.0",
    licenseUrl: BY_SA_3,
    sourceUrl: `${COMMONS}MIT_Killian_Court.jpg`,
    position: "50% 60%",
    // Daylight in the dark theme: pulled from 93 to the set's level.
    toneDark: "brightness(0.64) saturate(1.08)",
  },
];

/** How long each photo holds before the next one fades in. */
export const HERO_PHOTO_HOLD_MS = 8000;

/**
 * Where the rotation starts. The page revalidates hourly, so keying the start
 * to the hour gives returning visitors a different first photo without a
 * client-side swap after hydration.
 */
export const heroPhotoStartIndex = (count: number, now = Date.now()): number =>
  Math.floor(now / 3_600_000) % count;
