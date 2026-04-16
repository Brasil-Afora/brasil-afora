"use client";

import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
} from "geojson";
import type { Layer, PathOptions } from "leaflet";
import { memo, useState } from "react";
import { GeoJSON, MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./WorldMap.css";
import worldCountriesData from "@/utils/countries.geo.json";

interface InterchangeEntry {
  intercambios: unknown[];
  nome: string;
}

interface WorldMapProps {
  exchangeData: Record<string, InterchangeEntry>;
  onMarkerClick: (data: InterchangeEntry) => void;
  selectedCountryCode?: string | null;
}

type WorldCountryFeature = Feature<Geometry, GeoJsonProperties> & {
  id?: string | number;
};

const worldGeoJsonData = worldCountriesData as unknown as FeatureCollection<
  Geometry,
  GeoJsonProperties
>;

const SELECTED_COUNTRY_STYLE: PathOptions = {
  fillColor: "#f59e0b",
  fillOpacity: 0.78,
  color: "#fef3c7",
  weight: 2.2,
};

const OPPORTUNITY_COUNTRY_STYLE: PathOptions = {
  fillColor: "#facc15",
  fillOpacity: 0.45,
  color: "#f59e0b",
  weight: 1.1,
};

const OPPORTUNITY_COUNTRY_HOVERED_STYLE: PathOptions = {
  fillColor: "#f59e0b",
  fillOpacity: 0.65,
  color: "#fde68a",
  weight: 1.6,
};

const DEFAULT_COUNTRY_STYLE: PathOptions = {
  fillColor: "#1e293b",
  fillOpacity: 0.8,
  color: "#475569",
  weight: 1,
};

const DEFAULT_COUNTRY_HOVERED_STYLE: PathOptions = {
  fillColor: "#334155",
  fillOpacity: 0.9,
  color: "#94a3b8",
  weight: 1.25,
};

const isCountrySelected = (
  countryCode: string,
  selectedCountryCode: string | null
): boolean => {
  return countryCode !== "" && selectedCountryCode === countryCode;
};

const isCountryHovered = (
  countryCode: string,
  hoveredCountryCode: string | null
): boolean => {
  return countryCode !== "" && hoveredCountryCode === countryCode;
};

const getNonSelectedCountryStyle = (
  hasOpportunity: boolean,
  isHovered: boolean
): PathOptions => {
  if (hasOpportunity) {
    return isHovered
      ? OPPORTUNITY_COUNTRY_HOVERED_STYLE
      : OPPORTUNITY_COUNTRY_STYLE;
  }

  return isHovered ? DEFAULT_COUNTRY_HOVERED_STYLE : DEFAULT_COUNTRY_STYLE;
};

const countryNamesPtBr: Record<string, string> = {
  Afghanistan: "Afeganistão",
  Albania: "Albânia",
  Algeria: "Argélia",
  Angola: "Angola",
  Antarctica: "Antártida",
  Argentina: "Argentina",
  Armenia: "Armênia",
  Australia: "Austrália",
  Austria: "Áustria",
  Azerbaijan: "Azerbaijão",
  Bahrain: "Bahrein",
  Bangladesh: "Bangladesh",
  Belarus: "Bielorrússia",
  Belgium: "Bélgica",
  Belize: "Belize",
  Benin: "Benin",
  Bermuda: "Bermudas",
  Bhutan: "Butão",
  Bolivia: "Bolívia",
  "Bosnia and Herzegovina": "Bósnia e Herzegovina",
  Botswana: "Botswana",
  Brazil: "Brasil",
  Brunei: "Brunei",
  Bulgaria: "Bulgária",
  "Burkina Faso": "Burkina Faso",
  Burundi: "Burundi",
  Cambodia: "Camboja",
  Cameroon: "Camarões",
  Canada: "Canadá",
  "Cape Verde": "Cabo Verde",
  "Central African Republic": "República Centro-Africana",
  Chad: "Chade",
  Chile: "Chile",
  China: "China",
  Colombia: "Colômbia",
  "Costa Rica": "Costa Rica",
  Croatia: "Croácia",
  Cuba: "Cuba",
  Cyprus: "Chipre",
  "Czech Republic": "República Tcheca",
  Czechia: "República Tcheca",
  "Democratic Republic of the Congo": "República Democrática do Congo",
  Denmark: "Dinamarca",
  Djibouti: "Djibuti",
  "Dominican Republic": "República Dominicana",
  Dominican: "República Dominicana",
  "East Timor": "Timor-Leste",
  Ecuador: "Equador",
  Egypt: "Egito",
  "El Salvador": "El Salvador",
  England: "Inglaterra",
  "Equatorial Guinea": "Guiné Equatorial",
  Eritrea: "Eritreia",
  Estonia: "Estônia",
  Ethiopia: "Etiópia",
  "Falkland Islands": "Ilhas Malvinas",
  Fiji: "Fiji",
  Finland: "Finlândia",
  France: "França",
  "French Guiana": "Guiana Francesa",
  "French Southern and Antarctic Lands":
    "Terras Austrais e Antárticas Francesas",
  Gabon: "Gabão",
  Gambia: "Gâmbia",
  Georgia: "Geórgia",
  Germany: "Alemanha",
  Ghana: "Gana",
  Greece: "Grécia",
  Greenland: "Groenlândia",
  Guatemala: "Guatemala",
  Guinea: "Guiné",
  "Guinea Bissau": "Guiné-Bissau",
  Guyana: "Guiana",
  Haiti: "Haiti",
  Honduras: "Honduras",
  "Hong Kong": "Hong Kong",
  Hungary: "Hungria",
  Iceland: "Islândia",
  India: "Índia",
  Indonesia: "Indonésia",
  Iran: "Irã",
  Iraq: "Iraque",
  Ireland: "Irlanda",
  Israel: "Israel",
  Italy: "Itália",
  "Ivory Coast": "Costa do Marfim",
  Jamaica: "Jamaica",
  Japan: "Japão",
  Jordan: "Jordânia",
  Kazakhstan: "Cazaquistão",
  Kenya: "Quênia",
  Kosovo: "Kosovo",
  Kuwait: "Kuwait",
  Kyrgyzstan: "Quirguistão",
  Laos: "Laos",
  Latvia: "Letônia",
  Lebanon: "Líbano",
  Lesotho: "Lesoto",
  Liberia: "Libéria",
  Libya: "Líbia",
  Lithuania: "Lituânia",
  Luxembourg: "Luxemburgo",
  Macedonia: "Macedônia do Norte",
  Madagascar: "Madagascar",
  Malawi: "Malaui",
  Malaysia: "Malásia",
  Mali: "Mali",
  Malta: "Malta",
  Mauritania: "Mauritânia",
  Mexico: "México",
  Moldova: "Moldávia",
  Monaco: "Mônaco",
  Mongolia: "Mongólia",
  Montenegro: "Montenegro",
  Morocco: "Marrocos",
  Mozambique: "Moçambique",
  Myanmar: "Mianmar",
  Namibia: "Namíbia",
  Nepal: "Nepal",
  Netherlands: "Países Baixos",
  "New Caledonia": "Nova Caledônia",
  "New Zealand": "Nova Zelândia",
  Nicaragua: "Nicarágua",
  Niger: "Níger",
  Nigeria: "Nigéria",
  "North Korea": "Coreia do Norte",
  "Northern Cyprus": "Chipre do Norte",
  Norway: "Noruega",
  Oman: "Omã",
  Pakistan: "Paquistão",
  Panama: "Panamá",
  "Papua New Guinea": "Papua-Nova Guiné",
  Paraguay: "Paraguai",
  Peru: "Peru",
  Philippines: "Filipinas",
  Poland: "Polônia",
  Portugal: "Portugal",
  "Puerto Rico": "Porto Rico",
  Qatar: "Catar",
  "Republic of Serbia": "Sérvia",
  "Republic of the Congo": "República do Congo",
  Romania: "Romênia",
  Russia: "Rússia",
  Rwanda: "Ruanda",
  "San Marino": "San Marino",
  "Saudi Arabia": "Arábia Saudita",
  Senegal: "Senegal",
  Serbia: "Sérvia",
  Seychelles: "Seychelles",
  "Sierra Leone": "Serra Leoa",
  Singapore: "Singapura",
  Slovakia: "Eslováquia",
  Slovenia: "Eslovênia",
  "Solomon Islands": "Ilhas Salomão",
  Somalia: "Somália",
  Somaliland: "Somalilândia",
  "South Africa": "África do Sul",
  "South Korea": "Coreia do Sul",
  "South Sudan": "Sudão do Sul",
  Spain: "Espanha",
  "Sri Lanka": "Sri Lanka",
  Sudan: "Sudão",
  Suriname: "Suriname",
  Swaziland: "Essuatíni",
  Sweden: "Suécia",
  Switzerland: "Suíça",
  Syria: "Síria",
  Taiwan: "Taiwan",
  Tajikistan: "Tajiquistão",
  Tanzania: "Tanzânia",
  "The Bahamas": "Bahamas",
  Thailand: "Tailândia",
  Togo: "Togo",
  "Trinidad and Tobago": "Trinidad e Tobago",
  Tunisia: "Tunísia",
  Turkey: "Turquia",
  Turkmenistan: "Turcomenistão",
  Uganda: "Uganda",
  Ukraine: "Ucrânia",
  "United Arab Emirates": "Emirados Árabes Unidos",
  "United Kingdom": "Reino Unido",
  "United Republic of Tanzania": "Tanzânia",
  "United States of America": "Estados Unidos",
  "United States": "Estados Unidos",
  Uruguay: "Uruguai",
  Uzbekistan: "Uzbequistão",
  Vanuatu: "Vanuatu",
  Venezuela: "Venezuela",
  Vietnam: "Vietnã",
  "West Bank": "Cisjordânia",
  "Western Sahara": "Saara Ocidental",
  Yemen: "Iêmen",
  Zambia: "Zâmbia",
  Zimbabwe: "Zimbábue",
};

const WorldMap = ({
  exchangeData,
  onMarkerClick,
  selectedCountryCode = null,
}: WorldMapProps) => {
  const geoJsonLayerKey = Object.keys(exchangeData).sort().join("|");

  const [hoveredCountryCode, setHoveredCountryCode] = useState<string | null>(
    null
  );

  const getCountryCode = (feature?: WorldCountryFeature): string => {
    if (!feature?.id) {
      return "";
    }

    return String(feature.id);
  };

  const getCountryName = (feature?: WorldCountryFeature): string => {
    const countryCode = getCountryCode(feature);
    const countryFromData = exchangeData[countryCode]?.nome;
    if (countryFromData) {
      return countryFromData;
    }

    const rawName = feature?.properties?.name;
    if (typeof rawName !== "string") {
      return "Pais";
    }

    return countryNamesPtBr[rawName] ?? rawName;
  };

  const getCountryStyle = (feature?: WorldCountryFeature): PathOptions => {
    const countryCode = getCountryCode(feature);
    const hasOpportunity = Boolean(exchangeData[countryCode]);
    const hovered = isCountryHovered(countryCode, hoveredCountryCode);

    if (isCountrySelected(countryCode, selectedCountryCode)) {
      return SELECTED_COUNTRY_STYLE;
    }

    return getNonSelectedCountryStyle(hasOpportunity, hovered);
  };

  const onEachCountry = (feature: WorldCountryFeature, layer: Layer) => {
    const countryCode = getCountryCode(feature);
    const countryName = getCountryName(feature);
    const hasOpportunity = Boolean(exchangeData[countryCode]);

    layer.bindTooltip(countryName, {
      className: "country-tooltip",
      direction: "top",
      opacity: 0.95,
      sticky: true,
    });

    layer.on({
      mouseout: () => {
        setHoveredCountryCode((current) =>
          current === countryCode ? null : current
        );
        const path = layer as Layer & { _path?: SVGPathElement };
        if (path._path) {
          path._path.style.cursor = "";
        }
      },
      mouseover: () => {
        setHoveredCountryCode(countryCode);
        const path = layer as Layer & { _path?: SVGPathElement };
        if (path._path) {
          path._path.style.cursor = hasOpportunity ? "pointer" : "default";
        }
      },
    });

    if (hasOpportunity) {
      layer.on({
        click: () => {
          const countryData = exchangeData[countryCode];
          if (countryData) {
            onMarkerClick(countryData);
          }
        },
      });
    }
  };

  return (
    <MapContainer
      boxZoom={false}
      center={[0, 0]}
      className="h-full w-full"
      doubleClickZoom={false}
      dragging={true}
      maxBounds={[
        [-75, -180],
        [85, 180],
      ]}
      maxBoundsViscosity={1.0}
      maxZoom={3}
      minZoom={2}
      scrollWheelZoom={true}
      style={{ minHeight: "100%", zIndex: 1, backgroundColor: "#020617" }}
      touchZoom={true}
      zoom={2}
      zoomControl={false}
    >
      <GeoJSON
        data={worldGeoJsonData}
        key={geoJsonLayerKey}
        onEachFeature={onEachCountry}
        style={getCountryStyle}
      />
    </MapContainer>
  );
};

export default memo(WorldMap);
