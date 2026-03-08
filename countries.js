// countries.js - Configuración de países v2.1
// El número es FIJO y es lo que el viewer escribe en el chat para unirse
const COUNTRIES = {
  MX: { num: 1,  name: "México",       flag: "🇲🇽", color: "#FF4444" },
  BR: { num: 2,  name: "Brasil",        flag: "🇧🇷", color: "#00CC44" },
  CO: { num: 3,  name: "Colombia",      flag: "🇨🇴", color: "#FFD700" },
  AR: { num: 4,  name: "Argentina",     flag: "🇦🇷", color: "#74ACDF" },
  CL: { num: 5,  name: "Chile",         flag: "🇨🇱", color: "#D52B1E" },
  PE: { num: 6,  name: "Perú",          flag: "🇵🇪", color: "#D91023" },
  VE: { num: 7,  name: "Venezuela",     flag: "🇻🇪", color: "#CF142B" },
  EC: { num: 8,  name: "Ecuador",       flag: "🇪🇨", color: "#FFD100" },
  GT: { num: 9,  name: "Guatemala",     flag: "🇬🇹", color: "#4997D0" },
  CU: { num: 10, name: "Cuba",          flag: "🇨🇺", color: "#002A8F" },
  BO: { num: 11, name: "Bolivia",       flag: "🇧🇴", color: "#009A44" },
  DO: { num: 12, name: "R. Dominicana", flag: "🇩🇴", color: "#002D62" },
  HN: { num: 13, name: "Honduras",      flag: "🇭🇳", color: "#0073CF" },
  PY: { num: 14, name: "Paraguay",      flag: "🇵🇾", color: "#D52B1E" },
  SV: { num: 15, name: "El Salvador",   flag: "🇸🇻", color: "#0F47AF" },
  NI: { num: 16, name: "Nicaragua",     flag: "🇳🇮", color: "#3A7728" },
  CR: { num: 17, name: "Costa Rica",    flag: "🇨🇷", color: "#002B7F" },
  PA: { num: 18, name: "Panamá",        flag: "🇵🇦", color: "#005293" },
  US: { num: 19, name: "USA",           flag: "🇺🇸", color: "#3C3B6E" },
  IN: { num: 20, name: "India",         flag: "🇮🇳", color: "#FF9933" },
  CN: { num: 21, name: "China",         flag: "🇨🇳", color: "#DE2910" },
  DE: { num: 22, name: "Alemania",      flag: "🇩🇪", color: "#555555" },
  UK: { num: 23, name: "Reino Unido",   flag: "🇬🇧", color: "#C8102E" },
  FR: { num: 24, name: "Francia",       flag: "🇫🇷", color: "#0055A4" },
  ES: { num: 25, name: "España",        flag: "🇪🇸", color: "#AA151B" },
  IT: { num: 26, name: "Italia",        flag: "🇮🇹", color: "#009246" },
  RU: { num: 27, name: "Rusia",         flag: "🇷🇺", color: "#1C3578" },
  JP: { num: 28, name: "Japón",         flag: "🇯🇵", color: "#BC002D" },
  KR: { num: 29, name: "Corea",         flag: "🇰🇷", color: "#003478" },
  CA: { num: 30, name: "Canadá",        flag: "🇨🇦", color: "#FF0000" },
  AU: { num: 31, name: "Australia",     flag: "🇦🇺", color: "#00008B" },
};

// Mapa inverso: número → ISO
const NUM_TO_ISO = {};
Object.entries(COUNTRIES).forEach(([iso, data]) => {
  NUM_TO_ISO[data.num] = iso;
});

module.exports = { COUNTRIES, NUM_TO_ISO };
