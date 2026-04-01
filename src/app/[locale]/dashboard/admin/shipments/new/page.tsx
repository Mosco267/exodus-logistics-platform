"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, PlusCircle, ChevronDown } from "lucide-react";
import {
  computeInvoiceFromDeclaredValue,
  DEFAULT_PRICING,
  type PricingSettings,
  type PricingProfiles,
} from "@/lib/pricing";


// ─── Country data ────────────────────────────────────────────────────────────
type CountryEntry = { name: string; code: string; dial: string; flag: string };

const COUNTRY_DATA: CountryEntry[] = [
  { name: "Afghanistan", code: "AF", dial: "+93", flag: "🇦🇫" },
  { name: "Albania", code: "AL", dial: "+355", flag: "🇦🇱" },
  { name: "Algeria", code: "DZ", dial: "+213", flag: "🇩🇿" },
  { name: "Andorra", code: "AD", dial: "+376", flag: "🇦🇩" },
  { name: "Angola", code: "AO", dial: "+244", flag: "🇦🇴" },
  { name: "Antigua and Barbuda", code: "AG", dial: "+1", flag: "🇦🇬" },
  { name: "Argentina", code: "AR", dial: "+54", flag: "🇦🇷" },
  { name: "Armenia", code: "AM", dial: "+374", flag: "🇦🇲" },
  { name: "Australia", code: "AU", dial: "+61", flag: "🇦🇺" },
  { name: "Austria", code: "AT", dial: "+43", flag: "🇦🇹" },
  { name: "Azerbaijan", code: "AZ", dial: "+994", flag: "🇦🇿" },
  { name: "Bahamas", code: "BS", dial: "+1", flag: "🇧🇸" },
  { name: "Bahrain", code: "BH", dial: "+973", flag: "🇧🇭" },
  { name: "Bangladesh", code: "BD", dial: "+880", flag: "🇧🇩" },
  { name: "Barbados", code: "BB", dial: "+1", flag: "🇧🇧" },
  { name: "Belarus", code: "BY", dial: "+375", flag: "🇧🇾" },
  { name: "Belgium", code: "BE", dial: "+32", flag: "🇧🇪" },
  { name: "Belize", code: "BZ", dial: "+501", flag: "🇧🇿" },
  { name: "Benin", code: "BJ", dial: "+229", flag: "🇧🇯" },
  { name: "Bhutan", code: "BT", dial: "+975", flag: "🇧🇹" },
  { name: "Bolivia", code: "BO", dial: "+591", flag: "🇧🇴" },
  { name: "Bosnia and Herzegovina", code: "BA", dial: "+387", flag: "🇧🇦" },
  { name: "Botswana", code: "BW", dial: "+267", flag: "🇧🇼" },
  { name: "Brazil", code: "BR", dial: "+55", flag: "🇧🇷" },
  { name: "Brunei", code: "BN", dial: "+673", flag: "🇧🇳" },
  { name: "Bulgaria", code: "BG", dial: "+359", flag: "🇧🇬" },
  { name: "Burkina Faso", code: "BF", dial: "+226", flag: "🇧🇫" },
  { name: "Burundi", code: "BI", dial: "+257", flag: "🇧🇮" },
  { name: "Cabo Verde", code: "CV", dial: "+238", flag: "🇨🇻" },
  { name: "Cambodia", code: "KH", dial: "+855", flag: "🇰🇭" },
  { name: "Cameroon", code: "CM", dial: "+237", flag: "🇨🇲" },
  { name: "Canada", code: "CA", dial: "+1", flag: "🇨🇦" },
  { name: "Central African Republic", code: "CF", dial: "+236", flag: "🇨🇫" },
  { name: "Chad", code: "TD", dial: "+235", flag: "🇹🇩" },
  { name: "Chile", code: "CL", dial: "+56", flag: "🇨🇱" },
  { name: "China", code: "CN", dial: "+86", flag: "🇨🇳" },
  { name: "Colombia", code: "CO", dial: "+57", flag: "🇨🇴" },
  { name: "Comoros", code: "KM", dial: "+269", flag: "🇰🇲" },
  { name: "Congo", code: "CG", dial: "+242", flag: "🇨🇬" },
  { name: "Costa Rica", code: "CR", dial: "+506", flag: "🇨🇷" },
  { name: "Croatia", code: "HR", dial: "+385", flag: "🇭🇷" },
  { name: "Cuba", code: "CU", dial: "+53", flag: "🇨🇺" },
  { name: "Cyprus", code: "CY", dial: "+357", flag: "🇨🇾" },
  { name: "Czech Republic", code: "CZ", dial: "+420", flag: "🇨🇿" },
  { name: "Democratic Republic of the Congo", code: "CD", dial: "+243", flag: "🇨🇩" },
  { name: "Denmark", code: "DK", dial: "+45", flag: "🇩🇰" },
  { name: "Djibouti", code: "DJ", dial: "+253", flag: "🇩🇯" },
  { name: "Dominica", code: "DM", dial: "+1", flag: "🇩🇲" },
  { name: "Dominican Republic", code: "DO", dial: "+1", flag: "🇩🇴" },
  { name: "Ecuador", code: "EC", dial: "+593", flag: "🇪🇨" },
  { name: "Egypt", code: "EG", dial: "+20", flag: "🇪🇬" },
  { name: "El Salvador", code: "SV", dial: "+503", flag: "🇸🇻" },
  { name: "Equatorial Guinea", code: "GQ", dial: "+240", flag: "🇬🇶" },
  { name: "Eritrea", code: "ER", dial: "+291", flag: "🇪🇷" },
  { name: "Estonia", code: "EE", dial: "+372", flag: "🇪🇪" },
  { name: "Eswatini", code: "SZ", dial: "+268", flag: "🇸🇿" },
  { name: "Ethiopia", code: "ET", dial: "+251", flag: "🇪🇹" },
  { name: "Fiji", code: "FJ", dial: "+679", flag: "🇫🇯" },
  { name: "Finland", code: "FI", dial: "+358", flag: "🇫🇮" },
  { name: "France", code: "FR", dial: "+33", flag: "🇫🇷" },
  { name: "Gabon", code: "GA", dial: "+241", flag: "🇬🇦" },
  { name: "Gambia", code: "GM", dial: "+220", flag: "🇬🇲" },
  { name: "Georgia", code: "GE", dial: "+995", flag: "🇬🇪" },
  { name: "Germany", code: "DE", dial: "+49", flag: "🇩🇪" },
  { name: "Ghana", code: "GH", dial: "+233", flag: "🇬🇭" },
  { name: "Greece", code: "GR", dial: "+30", flag: "🇬🇷" },
  { name: "Grenada", code: "GD", dial: "+1", flag: "🇬🇩" },
  { name: "Guatemala", code: "GT", dial: "+502", flag: "🇬🇹" },
  { name: "Guinea", code: "GN", dial: "+224", flag: "🇬🇳" },
  { name: "Guinea-Bissau", code: "GW", dial: "+245", flag: "🇬🇼" },
  { name: "Guyana", code: "GY", dial: "+592", flag: "🇬🇾" },
  { name: "Haiti", code: "HT", dial: "+509", flag: "🇭🇹" },
  { name: "Honduras", code: "HN", dial: "+504", flag: "🇭🇳" },
  { name: "Hungary", code: "HU", dial: "+36", flag: "🇭🇺" },
  { name: "Iceland", code: "IS", dial: "+354", flag: "🇮🇸" },
  { name: "India", code: "IN", dial: "+91", flag: "🇮🇳" },
  { name: "Indonesia", code: "ID", dial: "+62", flag: "🇮🇩" },
  { name: "Iran", code: "IR", dial: "+98", flag: "🇮🇷" },
  { name: "Iraq", code: "IQ", dial: "+964", flag: "🇮🇶" },
  { name: "Ireland", code: "IE", dial: "+353", flag: "🇮🇪" },
  { name: "Israel", code: "IL", dial: "+972", flag: "🇮🇱" },
  { name: "Italy", code: "IT", dial: "+39", flag: "🇮🇹" },
  { name: "Ivory Coast", code: "CI", dial: "+225", flag: "🇨🇮" },
  { name: "Jamaica", code: "JM", dial: "+1", flag: "🇯🇲" },
  { name: "Japan", code: "JP", dial: "+81", flag: "🇯🇵" },
  { name: "Jordan", code: "JO", dial: "+962", flag: "🇯🇴" },
  { name: "Kazakhstan", code: "KZ", dial: "+7", flag: "🇰🇿" },
  { name: "Kenya", code: "KE", dial: "+254", flag: "🇰🇪" },
  { name: "Kiribati", code: "KI", dial: "+686", flag: "🇰🇮" },
  { name: "Kuwait", code: "KW", dial: "+965", flag: "🇰🇼" },
  { name: "Kyrgyzstan", code: "KG", dial: "+996", flag: "🇰🇬" },
  { name: "Laos", code: "LA", dial: "+856", flag: "🇱🇦" },
  { name: "Latvia", code: "LV", dial: "+371", flag: "🇱🇻" },
  { name: "Lebanon", code: "LB", dial: "+961", flag: "🇱🇧" },
  { name: "Lesotho", code: "LS", dial: "+266", flag: "🇱🇸" },
  { name: "Liberia", code: "LR", dial: "+231", flag: "🇱🇷" },
  { name: "Libya", code: "LY", dial: "+218", flag: "🇱🇾" },
  { name: "Liechtenstein", code: "LI", dial: "+423", flag: "🇱🇮" },
  { name: "Lithuania", code: "LT", dial: "+370", flag: "🇱🇹" },
  { name: "Luxembourg", code: "LU", dial: "+352", flag: "🇱🇺" },
  { name: "Madagascar", code: "MG", dial: "+261", flag: "🇲🇬" },
  { name: "Malawi", code: "MW", dial: "+265", flag: "🇲🇼" },
  { name: "Malaysia", code: "MY", dial: "+60", flag: "🇲🇾" },
  { name: "Maldives", code: "MV", dial: "+960", flag: "🇲🇻" },
  { name: "Mali", code: "ML", dial: "+223", flag: "🇲🇱" },
  { name: "Malta", code: "MT", dial: "+356", flag: "🇲🇹" },
  { name: "Marshall Islands", code: "MH", dial: "+692", flag: "🇲🇭" },
  { name: "Mauritania", code: "MR", dial: "+222", flag: "🇲🇷" },
  { name: "Mauritius", code: "MU", dial: "+230", flag: "🇲🇺" },
  { name: "Mexico", code: "MX", dial: "+52", flag: "🇲🇽" },
  { name: "Micronesia", code: "FM", dial: "+691", flag: "🇫🇲" },
  { name: "Moldova", code: "MD", dial: "+373", flag: "🇲🇩" },
  { name: "Monaco", code: "MC", dial: "+377", flag: "🇲🇨" },
  { name: "Mongolia", code: "MN", dial: "+976", flag: "🇲🇳" },
  { name: "Montenegro", code: "ME", dial: "+382", flag: "🇲🇪" },
  { name: "Morocco", code: "MA", dial: "+212", flag: "🇲🇦" },
  { name: "Mozambique", code: "MZ", dial: "+258", flag: "🇲🇿" },
  { name: "Myanmar", code: "MM", dial: "+95", flag: "🇲🇲" },
  { name: "Namibia", code: "NA", dial: "+264", flag: "🇳🇦" },
  { name: "Nauru", code: "NR", dial: "+674", flag: "🇳🇷" },
  { name: "Nepal", code: "NP", dial: "+977", flag: "🇳🇵" },
  { name: "Netherlands", code: "NL", dial: "+31", flag: "🇳🇱" },
  { name: "New Zealand", code: "NZ", dial: "+64", flag: "🇳🇿" },
  { name: "Nicaragua", code: "NI", dial: "+505", flag: "🇳🇮" },
  { name: "Niger", code: "NE", dial: "+227", flag: "🇳🇪" },
  { name: "Nigeria", code: "NG", dial: "+234", flag: "🇳🇬" },
  { name: "North Korea", code: "KP", dial: "+850", flag: "🇰🇵" },
  { name: "North Macedonia", code: "MK", dial: "+389", flag: "🇲🇰" },
  { name: "Norway", code: "NO", dial: "+47", flag: "🇳🇴" },
  { name: "Oman", code: "OM", dial: "+968", flag: "🇴🇲" },
  { name: "Pakistan", code: "PK", dial: "+92", flag: "🇵🇰" },
  { name: "Palau", code: "PW", dial: "+680", flag: "🇵🇼" },
  { name: "Palestine", code: "PS", dial: "+970", flag: "🇵🇸" },
  { name: "Panama", code: "PA", dial: "+507", flag: "🇵🇦" },
  { name: "Papua New Guinea", code: "PG", dial: "+675", flag: "🇵🇬" },
  { name: "Paraguay", code: "PY", dial: "+595", flag: "🇵🇾" },
  { name: "Peru", code: "PE", dial: "+51", flag: "🇵🇪" },
  { name: "Philippines", code: "PH", dial: "+63", flag: "🇵🇭" },
  { name: "Poland", code: "PL", dial: "+48", flag: "🇵🇱" },
  { name: "Portugal", code: "PT", dial: "+351", flag: "🇵🇹" },
  { name: "Qatar", code: "QA", dial: "+974", flag: "🇶🇦" },
  { name: "Romania", code: "RO", dial: "+40", flag: "🇷🇴" },
  { name: "Russia", code: "RU", dial: "+7", flag: "🇷🇺" },
  { name: "Rwanda", code: "RW", dial: "+250", flag: "🇷🇼" },
  { name: "Saint Kitts and Nevis", code: "KN", dial: "+1", flag: "🇰🇳" },
  { name: "Saint Lucia", code: "LC", dial: "+1", flag: "🇱🇨" },
  { name: "Saint Vincent and the Grenadines", code: "VC", dial: "+1", flag: "🇻🇨" },
  { name: "Samoa", code: "WS", dial: "+685", flag: "🇼🇸" },
  { name: "San Marino", code: "SM", dial: "+378", flag: "🇸🇲" },
  { name: "Sao Tome and Principe", code: "ST", dial: "+239", flag: "🇸🇹" },
  { name: "Saudi Arabia", code: "SA", dial: "+966", flag: "🇸🇦" },
  { name: "Senegal", code: "SN", dial: "+221", flag: "🇸🇳" },
  { name: "Serbia", code: "RS", dial: "+381", flag: "🇷🇸" },
  { name: "Seychelles", code: "SC", dial: "+248", flag: "🇸🇨" },
  { name: "Sierra Leone", code: "SL", dial: "+232", flag: "🇸🇱" },
  { name: "Singapore", code: "SG", dial: "+65", flag: "🇸🇬" },
  { name: "Slovakia", code: "SK", dial: "+421", flag: "🇸🇰" },
  { name: "Slovenia", code: "SI", dial: "+386", flag: "🇸🇮" },
  { name: "Solomon Islands", code: "SB", dial: "+677", flag: "🇸🇧" },
  { name: "Somalia", code: "SO", dial: "+252", flag: "🇸🇴" },
  { name: "South Africa", code: "ZA", dial: "+27", flag: "🇿🇦" },
  { name: "South Korea", code: "KR", dial: "+82", flag: "🇰🇷" },
  { name: "South Sudan", code: "SS", dial: "+211", flag: "🇸🇸" },
  { name: "Spain", code: "ES", dial: "+34", flag: "🇪🇸" },
  { name: "Sri Lanka", code: "LK", dial: "+94", flag: "🇱🇰" },
  { name: "Sudan", code: "SD", dial: "+249", flag: "🇸🇩" },
  { name: "Suriname", code: "SR", dial: "+597", flag: "🇸🇷" },
  { name: "Sweden", code: "SE", dial: "+46", flag: "🇸🇪" },
  { name: "Switzerland", code: "CH", dial: "+41", flag: "🇨🇭" },
  { name: "Syria", code: "SY", dial: "+963", flag: "🇸🇾" },
  { name: "Taiwan", code: "TW", dial: "+886", flag: "🇹🇼" },
  { name: "Tajikistan", code: "TJ", dial: "+992", flag: "🇹🇯" },
  { name: "Tanzania", code: "TZ", dial: "+255", flag: "🇹🇿" },
  { name: "Thailand", code: "TH", dial: "+66", flag: "🇹🇭" },
  { name: "Timor-Leste", code: "TL", dial: "+670", flag: "🇹🇱" },
  { name: "Togo", code: "TG", dial: "+228", flag: "🇹🇬" },
  { name: "Tonga", code: "TO", dial: "+676", flag: "🇹🇴" },
  { name: "Trinidad and Tobago", code: "TT", dial: "+1", flag: "🇹🇹" },
  { name: "Tunisia", code: "TN", dial: "+216", flag: "🇹🇳" },
  { name: "Turkey", code: "TR", dial: "+90", flag: "🇹🇷" },
  { name: "Turkmenistan", code: "TM", dial: "+993", flag: "🇹🇲" },
  { name: "Tuvalu", code: "TV", dial: "+688", flag: "🇹🇻" },
  { name: "UAE", code: "AE", dial: "+971", flag: "🇦🇪" },
  { name: "Uganda", code: "UG", dial: "+256", flag: "🇺🇬" },
  { name: "Ukraine", code: "UA", dial: "+380", flag: "🇺🇦" },
  { name: "United Kingdom", code: "GB", dial: "+44", flag: "🇬🇧" },
  { name: "United States", code: "US", dial: "+1", flag: "🇺🇸" },
  { name: "Uruguay", code: "UY", dial: "+598", flag: "🇺🇾" },
  { name: "Uzbekistan", code: "UZ", dial: "+998", flag: "🇺🇿" },
  { name: "Vanuatu", code: "VU", dial: "+678", flag: "🇻🇺" },
  { name: "Vatican City", code: "VA", dial: "+39", flag: "🇻🇦" },
  { name: "Venezuela", code: "VE", dial: "+58", flag: "🇻🇪" },
  { name: "Vietnam", code: "VN", dial: "+84", flag: "🇻🇳" },
  { name: "Yemen", code: "YE", dial: "+967", flag: "🇾🇪" },
  { name: "Zambia", code: "ZM", dial: "+260", flag: "🇿🇲" },
  { name: "Zimbabwe", code: "ZW", dial: "+263", flag: "🇿🇼" },
].sort((a, b) => a.name.localeCompare(b.name));

const STATES_BY_COUNTRY: Record<string, string[]> = {
  "Nigeria": ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"],
  "United States": ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"],
  "United Kingdom": ["England","Scotland","Wales","Northern Ireland"],
  "Canada": ["Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador","Northwest Territories","Nova Scotia","Nunavut","Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon"],
  "Germany": ["Baden-Württemberg","Bavaria","Berlin","Brandenburg","Bremen","Hamburg","Hesse","Lower Saxony","Mecklenburg-Vorpommern","North Rhine-Westphalia","Rhineland-Palatinate","Saarland","Saxony","Saxony-Anhalt","Schleswig-Holstein","Thuringia"],
  "Australia": ["Australian Capital Territory","New South Wales","Northern Territory","Queensland","South Australia","Tasmania","Victoria","Western Australia"],
  "India": ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi"],
  "Brazil": ["Acre","Alagoas","Amapá","Amazonas","Bahia","Ceará","Distrito Federal","Espírito Santo","Goiás","Maranhão","Mato Grosso","Mato Grosso do Sul","Minas Gerais","Pará","Paraíba","Paraná","Pernambuco","Piauí","Rio de Janeiro","Rio Grande do Norte","Rio Grande do Sul","Rondônia","Roraima","Santa Catarina","São Paulo","Sergipe","Tocantins"],
  "Mexico": ["Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Guanajuato","Guerrero","Hidalgo","Jalisco","México","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas"],
  "South Africa": ["Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","Northern Cape","North West","Western Cape"],
  "China": ["Anhui","Beijing","Chongqing","Fujian","Gansu","Guangdong","Guangxi","Guizhou","Hainan","Hebei","Heilongjiang","Henan","Hubei","Hunan","Inner Mongolia","Jiangsu","Jiangxi","Jilin","Liaoning","Ningxia","Qinghai","Shaanxi","Shandong","Shanghai","Shanxi","Sichuan","Tianjin","Tibet","Xinjiang","Yunnan","Zhejiang"],
  "Kenya": ["Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri","Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"],
  "Ghana": ["Ahafo","Ashanti","Bono","Bono East","Central","Eastern","Greater Accra","North East","Northern","Oti","Savannah","Upper East","Upper West","Volta","Western","Western North"],
};

function getCountryByName(name: string): CountryEntry | undefined {
  return COUNTRY_DATA.find(c => c.name.toLowerCase() === name.toLowerCase());
}

function numericOnly(val: string, allowDecimal = true): string {
  if (allowDecimal) return val.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  return val.replace(/[^0-9]/g, "");
}

function CountrySelect({ value, onChange, onCountryChange, label, required }: {
  value: string; onChange: (name: string) => void;
  onCountryChange?: (entry: CountryEntry | undefined) => void;
  label: string; required?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() =>
    COUNTRY_DATA.filter(c => c.name.toLowerCase().includes(search.toLowerCase())), [search]);
  const selected = getCountryByName(value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="text-sm font-semibold text-gray-700 block mb-2">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <button type="button" onClick={() => { setOpen(v => !v); setSearch(""); }}
        className="cursor-pointer w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-left flex items-center justify-between bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
        <span className="flex items-center gap-2">
          {selected
            ? <><span>{selected.flag}</span><span>{selected.name}</span></>
            : <span className="text-gray-400">Select country…</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search country…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">No results</p>}
            {filtered.map(c => (
              <button key={c.code + c.name} type="button"
                onMouseDown={() => { onChange(c.name); onCountryChange?.(c); setOpen(false); setSearch(""); }}
                className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-blue-50 transition ${value === c.name ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-800"}`}>
                <span>{c.flag}</span><span>{c.name}</span>
                <span className="ml-auto text-xs text-gray-400">{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StateInput({ country, value, onChange, label, required }: {
  country: string; value: string; onChange: (v: string) => void; label: string; required?: boolean;
}) {
  const states = STATES_BY_COUNTRY[country] || [];
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-2">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {states.length > 0 ? (
        <div className="space-y-1.5">
          <select value={value} onChange={e => onChange(e.target.value)}
            className="cursor-pointer w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
            <option value="">Select state…</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={value} onChange={e => onChange(e.target.value)} placeholder="Or type manually…"
            className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-gray-300" />
        </div>
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="Enter state / province"
          className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
      )}
    </div>
  );
}

function PhoneInput({ countryName, value, onChange, label, required }: {
  countryName: string; value: string; onChange: (v: string) => void; label: string; required?: boolean;
}) {
  const entry = getCountryByName(countryName);
  const [dialCode, setDialCode] = useState(entry?.dial || "");
  const [localNumber, setLocalNumber] = useState("");

  useEffect(() => {
    const newDial = getCountryByName(countryName)?.dial || "";
    setDialCode(newDial);
    const full = newDial ? `${newDial} ${localNumber}`.trim() : localNumber;
    onChange(full);
  }, [countryName]); // eslint-disable-line

  const handleDialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.startsWith("+") ? e.target.value : "+" + e.target.value.replace(/\+/g, "");
    setDialCode(v);
    onChange(v ? `${v} ${localNumber}`.trim() : localNumber);
  };

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = numericOnly(e.target.value, false);
    setLocalNumber(v);
    onChange(dialCode ? `${dialCode} ${v}`.trim() : v);
  };

  const flag = getCountryByName(countryName)?.flag || "🌐";

  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-2">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="flex gap-2">
        <div className="flex items-center gap-1.5 rounded-2xl border border-gray-300 px-3 py-3 bg-gray-50 shrink-0">
          <span className="text-base">{flag}</span>
          <input value={dialCode} onChange={handleDialChange}
            className="w-14 bg-transparent text-sm font-semibold text-gray-700 focus:outline-none" placeholder="+1" />
        </div>
        <input value={localNumber} onChange={handleLocalChange} inputMode="numeric" placeholder="Phone number"
          className="flex-1 rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
      </div>
    </div>
  );
}

type ShipmentStatus =
  | "Created"
  | "In Transit"
  | "Custom Clearance"
  | "Unclaimed"
  | "Delivered";

function toPct(rate: number) {
  const pct = Number(rate) * 100;
  return Number.isFinite(pct) ? pct.toFixed(2).replace(/\.00$/, "") : "0";
}
function fromPct(pct: string) {
  const n = Number(pct);
  if (!Number.isFinite(n)) return 0;
  return n / 100;
}

function toMoney(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? String(x) : "0";
}
function fromMoney(s: string) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

type PricingApiResponse = {
  ok?: boolean;
  settings?: PricingProfiles;
  error?: string;
};


function isFormValid(f: Record<string, string>): { valid: boolean; missing: string } {
  const required: Array<[string, string]> = [
    ["senderName", "Sender name"], ["senderEmail", "Sender email"],
    ["senderCountry", "Sender country"], ["senderState", "Sender state"],
    ["senderCity", "Sender city"], ["senderAddress", "Sender address"],
    ["senderPhone", "Sender phone"], ["receiverName", "Receiver name"],
    ["receiverEmail", "Receiver email"], ["receiverCountry", "Receiver country"],
    ["receiverState", "Receiver state"], ["receiverCity", "Receiver city"],
    ["receiverAddress", "Receiver address"], ["receiverPhone", "Receiver phone"],
    ["shipmentMeans", "Shipment means"], ["weightKg", "Weight"],
    ["declaredValue", "Declared value"],
  ];
  for (const [key, label] of required) {
    if (!f[key]?.trim()) return { valid: false, missing: label };
  }
  return { valid: true, missing: "" };
}


export default function AdminCreateShipmentPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const router = useRouter();

  // Parties
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderCountryCode, setSenderCountryCode] = useState("US");
  const [senderCountry, setSenderCountry] = useState("United States");
  const [senderState, setSenderState] = useState("");
  const [senderCity, setSenderCity] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [senderPostalCode, setSenderPostalCode] = useState("");
  const [senderPhone, setSenderPhone] = useState("+1");

  const [receiverName, setReceiverName] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [destinationCountryCode, setDestinationCountryCode] = useState("US");
  const [receiverCountry, setReceiverCountry] = useState("United States");
  const [receiverState, setReceiverState] = useState("");
  const [receiverCity, setReceiverCity] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [receiverPostalCode, setReceiverPostalCode] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("+1");

const [packageDescription, setPackageDescription] = useState("");

  // Shipment details
  const [serviceLevel, setServiceLevel] = useState<"Standard" | "Express">(
    "Standard"
  );
  const [shipmentScope, setShipmentScope] = useState<"international" | "local">("international");
  const [shipmentType, setShipmentType] = useState("Parcel");
  const [shipmentMeans, setShipmentMeans] = useState("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string>("");

  const [weightKg, setWeightKg] = useState<string>("2");
  const [lengthCm, setLengthCm] = useState<string>("24");
  const [widthCm, setWidthCm] = useState<string>("18");
  const [heightCm, setHeightCm] = useState<string>("12");

  // Invoice
  const [currency, setCurrency] = useState<string>("USD");
  const [declaredValue, setDeclaredValue] = useState<string>("1000");
  
  const [status, setStatus] = useState<ShipmentStatus>("Created");
  const [statusNote, setStatusNote] = useState("");

  // ✅ NEW invoice fields you requested
  const [invoiceStatus, setInvoiceStatus] = useState<
    "paid" | "unpaid" | "overdue" | "cancelled"
  >("unpaid");
  const [invoiceDueDate, setInvoiceDueDate] = useState<string>(""); // yyyy-mm-dd
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<string>("");
  const [invoicePaymentMethodOther, setInvoicePaymentMethodOther] =
    useState<string>("");

  const PAYMENT_METHODS = useMemo(
    () => ["", "Cryptocurrency", "Bank transfer", "PayPal", "Zelle", "Cash", "Other"],
    []
  );

  // ✅ Pricing defaults come ONLY from DB (Admin Pricing)
  const [ratesLoading, setRatesLoading] = useState(true);

  const [pricingProfiles, setPricingProfiles] = useState<PricingProfiles>(DEFAULT_PRICING);

  // ✅ NEW: FIXED FEES (money)
  const [shippingFee, setShippingFee] = useState("");
  const [handlingFee, setHandlingFee] = useState("");
  const [customsFee, setCustomsFee] = useState("");
  const [taxFee, setTaxFee] = useState("");
  const [discountFee, setDiscountFee] = useState("");

  // ✅ NEW: ONLY TWO PERCENTAGES
  const [fuelRatePct, setFuelRatePct] = useState("");
  const [insuranceRatePct, setInsuranceRatePct] = useState("");

  const [loading, setLoading] = useState(false);
const [err, setErr] = useState<string>("");
const [okMsg, setOkMsg] = useState("");
const [attempted, setAttempted] = useState(false);

  

  // ✅ Load pricing settings from your admin pricing API
  useEffect(() => {
    const loadDefaultRates = async () => {
      setErr("");
      setRatesLoading(true);

      try {
        const res = await fetch("/api/admin/pricing", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as
          | PricingApiResponse
          | null;

        if (!res.ok) {
          throw new Error(json?.error || "Failed to load pricing settings.");
        }

        const s = json?.settings;

      

if (!s) throw new Error("Pricing settings missing.");

setPricingProfiles(s);

const active = s[shipmentScope] || DEFAULT_PRICING[shipmentScope];

setShippingFee(toMoney(active.shippingFee ?? DEFAULT_PRICING[shipmentScope].shippingFee));
setHandlingFee(toMoney(active.handlingFee ?? DEFAULT_PRICING[shipmentScope].handlingFee));
setCustomsFee(toMoney(active.customsFee ?? DEFAULT_PRICING[shipmentScope].customsFee));
setTaxFee(toMoney(active.taxFee ?? DEFAULT_PRICING[shipmentScope].taxFee));
setDiscountFee(toMoney(active.discountFee ?? DEFAULT_PRICING[shipmentScope].discountFee));
setFuelRatePct(toPct(Number(active.fuelRate ?? DEFAULT_PRICING[shipmentScope].fuelRate)));
setInsuranceRatePct(
  toPct(Number(active.insuranceRate ?? DEFAULT_PRICING[shipmentScope].insuranceRate))
);
      } catch (e: any) {
        setErr(String(e?.message || "Failed to load pricing settings."));
      } finally {
        setRatesLoading(false);
      }
    };

    void loadDefaultRates();
  }, []);

  useEffect(() => {
    const active =
      pricingProfiles[shipmentScope] || DEFAULT_PRICING[shipmentScope];

    setShippingFee(toMoney(active.shippingFee ?? DEFAULT_PRICING[shipmentScope].shippingFee));
    setHandlingFee(toMoney(active.handlingFee ?? DEFAULT_PRICING[shipmentScope].handlingFee));
    setCustomsFee(toMoney(active.customsFee ?? DEFAULT_PRICING[shipmentScope].customsFee));
    setTaxFee(toMoney(active.taxFee ?? DEFAULT_PRICING[shipmentScope].taxFee));
    setDiscountFee(toMoney(active.discountFee ?? DEFAULT_PRICING[shipmentScope].discountFee));
    setFuelRatePct(toPct(Number(active.fuelRate ?? DEFAULT_PRICING[shipmentScope].fuelRate)));
    setInsuranceRatePct(
      toPct(Number(active.insuranceRate ?? DEFAULT_PRICING[shipmentScope].insuranceRate))
    );
  }, [shipmentScope, pricingProfiles]);

  // ✅ This is the PricingSettings object we will:
  // 1) use for preview breakdown
  // 2) send to /api/shipments to store inside the shipment invoice breakdown
  const previewPricing: PricingSettings = useMemo(
    () => ({
      ...DEFAULT_PRICING,

      shippingFee: fromMoney(shippingFee),
      handlingFee: fromMoney(handlingFee),
      customsFee: fromMoney(customsFee),
      taxFee: fromMoney(taxFee),
      discountFee: fromMoney(discountFee),

      fuelRate: fromPct(fuelRatePct),
      insuranceRate: fromPct(insuranceRatePct),
    }),
    [
      shippingFee,
      handlingFee,
      customsFee,
      taxFee,
      discountFee,
      fuelRatePct,
      insuranceRatePct,
    ]
  );

  const breakdown = useMemo(() => {
    return computeInvoiceFromDeclaredValue(
      Number(declaredValue || 0),
      previewPricing
    );
  }, [declaredValue, previewPricing]);

  const invoiceAmount = breakdown.total;

  const submit = async () => {
  setAttempted(true);
  setErr("");
  setOkMsg("");

  if (ratesLoading) {
    setErr("Pricing is still loading. Please wait a moment.");
    return;
  }

  const { valid, missing } = isFormValid({
    senderName, senderEmail, senderCountry, senderState, senderCity,
    senderAddress, senderPhone, receiverName, receiverEmail,
    receiverCountry, receiverState, receiverCity, receiverAddress,
    receiverPhone, shipmentMeans, weightKg, declaredValue,
  });
  if (!valid) { setErr(`${missing} is required.`); return; }

  const dv = Number(declaredValue);
  if (!Number.isFinite(dv) || dv <= 0) {
    setErr("Declared value must be a valid number greater than 0.");
    return;
  }

  const senderCode = getCountryByName(senderCountry)?.code || senderCountryCode;
  const receiverCode = getCountryByName(receiverCountry)?.code || destinationCountryCode;

    // ✅ Payment method final value
   const finalPaymentMethod =
  invoicePaymentMethod === "Other"
    ? String(invoicePaymentMethodOther || "").trim()
    : String(invoicePaymentMethod || "").trim();

const finalPaymentMethodOrNull = finalPaymentMethod || null;

    setLoading(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  senderCountryCode: senderCode,
  destinationCountryCode: receiverCode,

          senderName,
          senderEmail,
          receiverName,
          receiverEmail,

          senderCountry,
          senderState,
          senderCity,
          senderAddress,
          senderPostalCode,
          senderPhone,

          receiverCountry,
          receiverState,
          receiverCity,
          receiverAddress,
          receiverPostalCode,
          receiverPhone,
          
          shipmentScope,
          serviceLevel,
          shipmentType,
          packageDescription,

          shipmentMeans,
          estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate).toISOString() : null,

          weightKg: Number(weightKg || 0),
          dimensionsCm: {
            length: Number(lengthCm || 0),
            width: Number(widthCm || 0),
            height: Number(heightCm || 0),
          },

          declaredValue: dv,
          declaredValueCurrency: currency,

          // ✅ IMPORTANT: send the NEW pricing model
          pricing: previewPricing,

          // ✅ NEW: send invoice details (status/method/due date)
          invoice: {
            status: invoiceStatus,
            dueDate: invoiceDueDate ? invoiceDueDate : null,
            paymentMethod: finalPaymentMethodOrNull,
          },

          status,
          statusNote,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(String(json?.error || "Failed to create shipment."));
        return;
      }

      setOkMsg("Shipment created successfully.");
      const shipmentId = String(json?.shipment?.shipmentId || "").trim();
      if (shipmentId) {
        router.push(
          `/${locale}/dashboard/admin/shipments?focusShipment=${encodeURIComponent(
            shipmentId
          )}`
        );
      }
    } catch (e: any) {
      setErr(String(e?.message || "Failed to create shipment."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            Create Shipment
          </h1>
          <p className="mt-2 text-gray-600">
            Fill details, preview invoice breakdown, then create shipment.
          </p>
          {ratesLoading && (
            <p className="mt-2 text-sm font-semibold text-gray-700">
              Loading default pricing from Admin settings…
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6"
          >
            {/* Parties */}
<p className="font-extrabold text-gray-900 mb-3">Parties</p>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <label className="text-sm font-semibold text-gray-700">Sender name <span className="text-red-500">*</span></label>
    <input value={senderName} onChange={e => setSenderName(e.target.value)}
      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
  </div>
  <div>
    <label className="text-sm font-semibold text-gray-700">Sender email <span className="text-red-500">*</span></label>
    <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} type="email"
      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
  </div>
  <div>
    <label className="text-sm font-semibold text-gray-700">Receiver name <span className="text-red-500">*</span></label>
    <input value={receiverName} onChange={e => setReceiverName(e.target.value)}
      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
  </div>
  <div>
    <label className="text-sm font-semibold text-gray-700">Receiver email <span className="text-red-500">*</span></label>
    <input value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)} type="email"
      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
  </div>
</div>

            {/* Sender address */}
<p className="font-extrabold text-gray-900 mt-6 mb-3">Sender address</p>
<div className="space-y-3">
  <CountrySelect label="Country" required value={senderCountry}
    onChange={name => { setSenderCountry(name); setSenderState(""); setSenderCity(""); }}
    onCountryChange={entry => { if (entry) setSenderCountryCode(entry.code); }} />
  <StateInput country={senderCountry} value={senderState} onChange={setSenderState} label="State / Province" required />
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className="text-sm font-semibold text-gray-700">City <span className="text-red-500">*</span></label>
      <input value={senderCity} onChange={e => setSenderCity(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
    </div>
    <div>
      <label className="text-sm font-semibold text-gray-700">Postal code</label>
      <input value={senderPostalCode} onChange={e => setSenderPostalCode(numericOnly(e.target.value, false))} inputMode="numeric"
        className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
    </div>
  </div>
  <div>
    <label className="text-sm font-semibold text-gray-700">Address <span className="text-red-500">*</span></label>
    <input value={senderAddress} onChange={e => setSenderAddress(e.target.value)}
      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
  </div>
  <PhoneInput countryName={senderCountry} value={senderPhone} onChange={setSenderPhone} label="Phone" required />
</div>

            {/* Receiver address */}
<p className="font-extrabold text-gray-900 mt-6 mb-3">Receiver address</p>
<div className="space-y-3">
  <CountrySelect label="Country" required value={receiverCountry}
    onChange={name => { setReceiverCountry(name); setReceiverState(""); setReceiverCity(""); }}
    onCountryChange={entry => { if (entry) setDestinationCountryCode(entry.code); }} />
  <StateInput country={receiverCountry} value={receiverState} onChange={setReceiverState} label="State / Province" required />
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className="text-sm font-semibold text-gray-700">City <span className="text-red-500">*</span></label>
      <input value={receiverCity} onChange={e => setReceiverCity(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
    </div>
    <div>
      <label className="text-sm font-semibold text-gray-700">Postal code</label>
      <input value={receiverPostalCode} onChange={e => setReceiverPostalCode(numericOnly(e.target.value, false))} inputMode="numeric"
        className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
    </div>
  </div>
  <div>
    <label className="text-sm font-semibold text-gray-700">Address <span className="text-red-500">*</span></label>
    <input value={receiverAddress} onChange={e => setReceiverAddress(e.target.value)}
      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
  </div>
  <PhoneInput countryName={receiverCountry} value={receiverPhone} onChange={setReceiverPhone} label="Phone" required />
</div>

            {/* Shipment */}
            <p className="font-extrabold text-gray-900 mt-6 mb-3">
              Shipment details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
  <label className="text-sm font-semibold text-gray-700">
    Shipping type
  </label>
  <select
    value={shipmentScope}
    onChange={(e) => setShipmentScope(e.target.value as "international" | "local")}
    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
  >
    <option value="international">International</option>
    <option value="local">Local</option>
  </select>
</div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Service level
                </label>
                <select
                  value={serviceLevel}
                  onChange={(e) => setServiceLevel(e.target.value as any)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option>Standard</option>
                  <option>Express</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Shipment type
                </label>
                <input
                  value={shipmentType}
                  onChange={(e) => setShipmentType(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div className="sm:col-span-2">
  <label className="text-sm font-semibold text-gray-700">
    Package description
  </label>
  <textarea
    value={packageDescription}
    onChange={(e) => setPackageDescription(e.target.value)}
    rows={4}
    placeholder="Describe the package contents..."
    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
  />
</div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
  Shipment means <span className="text-red-500">*</span>
</label>
                <select
                  value={shipmentMeans}
                  onChange={(e) => setShipmentMeans(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="">Select means</option>
                  <option value="Air Freight">Air Freight</option>
                  <option value="Sea Freight">Sea Freight</option>
                  <option value="Land Freight">Land Freight</option>
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Ship">Ship</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Estimated delivery date
                </label>
                <input
                  type="date"
                  value={estimatedDeliveryDate}
                  onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Weight (kg)
                </label>
                <input
                  value={weightKg}
                  onChange={(e) => setWeightKg(numericOnly(e.target.value))}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Dimensions (cm)
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input
                    value={lengthCm}
                    onChange={(e) => setLengthCm(numericOnly(e.target.value))}
                    inputMode="decimal"
                    placeholder="L"
                    className="rounded-2xl border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <input
                    value={widthCm}
                    onChange={(e) => setWidthCm(numericOnly(e.target.value))}
                    inputMode="decimal"
                    placeholder="W"
                    className="rounded-2xl border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <input
                    value={heightCm}
                    onChange={(e) => setHeightCm(numericOnly(e.target.value))}
                    inputMode="decimal"
                    placeholder="H"
                    className="rounded-2xl border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>
            </div>

            {/* Invoice */}
            <p className="font-extrabold text-gray-900 mt-6 mb-3">Invoice</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Declared value
                </label>
                <input
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(numericOnly(e.target.value))}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Currency
                </label>
                <select
  value={currency}
  onChange={(e) => setCurrency(e.target.value as any)}
  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
>
  <option value="USD">USD – US Dollar</option>
  <option value="EUR">EUR – Euro</option>
  <option value="GBP">GBP – British Pound</option>
  <option value="NGN">NGN – Nigerian Naira</option>
  <option value="AED">AED – UAE Dirham</option>
  <option value="AFN">AFN – Afghan Afghani</option>
  <option value="ALL">ALL – Albanian Lek</option>
  <option value="AMD">AMD – Armenian Dram</option>
  <option value="ANG">ANG – Netherlands Antillean Guilder</option>
  <option value="AOA">AOA – Angolan Kwanza</option>
  <option value="ARS">ARS – Argentine Peso</option>
  <option value="AUD">AUD – Australian Dollar</option>
  <option value="AWG">AWG – Aruban Florin</option>
  <option value="AZN">AZN – Azerbaijani Manat</option>
  <option value="BAM">BAM – Bosnia-Herzegovina Convertible Mark</option>
  <option value="BBD">BBD – Barbadian Dollar</option>
  <option value="BDT">BDT – Bangladeshi Taka</option>
  <option value="BGN">BGN – Bulgarian Lev</option>
  <option value="BHD">BHD – Bahraini Dinar</option>
  <option value="BIF">BIF – Burundian Franc</option>
  <option value="BMD">BMD – Bermudan Dollar</option>
  <option value="BND">BND – Brunei Dollar</option>
  <option value="BOB">BOB – Bolivian Boliviano</option>
  <option value="BRL">BRL – Brazilian Real</option>
  <option value="BSD">BSD – Bahamian Dollar</option>
  <option value="BTN">BTN – Bhutanese Ngultrum</option>
  <option value="BWP">BWP – Botswanan Pula</option>
  <option value="BYN">BYN – Belarusian Ruble</option>
  <option value="BZD">BZD – Belize Dollar</option>
  <option value="CAD">CAD – Canadian Dollar</option>
  <option value="CDF">CDF – Congolese Franc</option>
  <option value="CHF">CHF – Swiss Franc</option>
  <option value="CLP">CLP – Chilean Peso</option>
  <option value="CNY">CNY – Chinese Yuan</option>
  <option value="COP">COP – Colombian Peso</option>
  <option value="CRC">CRC – Costa Rican Colón</option>
  <option value="CUP">CUP – Cuban Peso</option>
  <option value="CVE">CVE – Cape Verdean Escudo</option>
  <option value="CZK">CZK – Czech Koruna</option>
  <option value="DJF">DJF – Djiboutian Franc</option>
  <option value="DKK">DKK – Danish Krone</option>
  <option value="DOP">DOP – Dominican Peso</option>
  <option value="DZD">DZD – Algerian Dinar</option>
  <option value="EGP">EGP – Egyptian Pound</option>
  <option value="ERN">ERN – Eritrean Nakfa</option>
  <option value="ETB">ETB – Ethiopian Birr</option>
  <option value="FJD">FJD – Fijian Dollar</option>
  <option value="FKP">FKP – Falkland Islands Pound</option>
  <option value="GEL">GEL – Georgian Lari</option>
  <option value="GHS">GHS – Ghanaian Cedi</option>
  <option value="GIP">GIP – Gibraltar Pound</option>
  <option value="GMD">GMD – Gambian Dalasi</option>
  <option value="GNF">GNF – Guinean Franc</option>
  <option value="GTQ">GTQ – Guatemalan Quetzal</option>
  <option value="GYD">GYD – Guyanaese Dollar</option>
  <option value="HKD">HKD – Hong Kong Dollar</option>
  <option value="HNL">HNL – Honduran Lempira</option>
  <option value="HRK">HRK – Croatian Kuna</option>
  <option value="HTG">HTG – Haitian Gourde</option>
  <option value="HUF">HUF – Hungarian Forint</option>
  <option value="IDR">IDR – Indonesian Rupiah</option>
  <option value="ILS">ILS – Israeli New Shekel</option>
  <option value="INR">INR – Indian Rupee</option>
  <option value="IQD">IQD – Iraqi Dinar</option>
  <option value="IRR">IRR – Iranian Rial</option>
  <option value="ISK">ISK – Icelandic Króna</option>
  <option value="JMD">JMD – Jamaican Dollar</option>
  <option value="JOD">JOD – Jordanian Dinar</option>
  <option value="JPY">JPY – Japanese Yen</option>
  <option value="KES">KES – Kenyan Shilling</option>
  <option value="KGS">KGS – Kyrgystani Som</option>
  <option value="KHR">KHR – Cambodian Riel</option>
  <option value="KMF">KMF – Comorian Franc</option>
  <option value="KPW">KPW – North Korean Won</option>
  <option value="KRW">KRW – South Korean Won</option>
  <option value="KWD">KWD – Kuwaiti Dinar</option>
  <option value="KYD">KYD – Cayman Islands Dollar</option>
  <option value="KZT">KZT – Kazakhstani Tenge</option>
  <option value="LAK">LAK – Laotian Kip</option>
  <option value="LBP">LBP – Lebanese Pound</option>
  <option value="LKR">LKR – Sri Lankan Rupee</option>
  <option value="LRD">LRD – Liberian Dollar</option>
  <option value="LSL">LSL – Lesotho Loti</option>
  <option value="LYD">LYD – Libyan Dinar</option>
  <option value="MAD">MAD – Moroccan Dirham</option>
  <option value="MDL">MDL – Moldovan Leu</option>
  <option value="MGA">MGA – Malagasy Ariary</option>
  <option value="MKD">MKD – Macedonian Denar</option>
  <option value="MMK">MMK – Myanmar Kyat</option>
  <option value="MNT">MNT – Mongolian Tugrik</option>
  <option value="MOP">MOP – Macanese Pataca</option>
  <option value="MRU">MRU – Mauritanian Ouguiya</option>
  <option value="MUR">MUR – Mauritian Rupee</option>
  <option value="MVR">MVR – Maldivian Rufiyaa</option>
  <option value="MWK">MWK – Malawian Kwacha</option>
  <option value="MXN">MXN – Mexican Peso</option>
  <option value="MYR">MYR – Malaysian Ringgit</option>
  <option value="MZN">MZN – Mozambican Metical</option>
  <option value="NAD">NAD – Namibian Dollar</option>
  <option value="NIO">NIO – Nicaraguan Córdoba</option>
  <option value="NOK">NOK – Norwegian Krone</option>
  <option value="NPR">NPR – Nepalese Rupee</option>
  <option value="NZD">NZD – New Zealand Dollar</option>
  <option value="OMR">OMR – Omani Rial</option>
  <option value="PAB">PAB – Panamanian Balboa</option>
  <option value="PEN">PEN – Peruvian Sol</option>
  <option value="PGK">PGK – Papua New Guinean Kina</option>
  <option value="PHP">PHP – Philippine Peso</option>
  <option value="PKR">PKR – Pakistani Rupee</option>
  <option value="PLN">PLN – Polish Zloty</option>
  <option value="PYG">PYG – Paraguayan Guarani</option>
  <option value="QAR">QAR – Qatari Rial</option>
  <option value="RON">RON – Romanian Leu</option>
  <option value="RSD">RSD – Serbian Dinar</option>
  <option value="RUB">RUB – Russian Ruble</option>
  <option value="RWF">RWF – Rwandan Franc</option>
  <option value="SAR">SAR – Saudi Riyal</option>
  <option value="SBD">SBD – Solomon Islands Dollar</option>
  <option value="SCR">SCR – Seychellois Rupee</option>
  <option value="SDG">SDG – Sudanese Pound</option>
  <option value="SEK">SEK – Swedish Krona</option>
  <option value="SGD">SGD – Singapore Dollar</option>
  <option value="SHP">SHP – Saint Helena Pound</option>
  <option value="SLL">SLL – Sierra Leonean Leone</option>
  <option value="SOS">SOS – Somali Shilling</option>
  <option value="SRD">SRD – Surinamese Dollar</option>
  <option value="STN">STN – São Tomé and Príncipe Dobra</option>
  <option value="SVC">SVC – Salvadoran Colón</option>
  <option value="SYP">SYP – Syrian Pound</option>
  <option value="SZL">SZL – Swazi Lilangeni</option>
  <option value="THB">THB – Thai Baht</option>
  <option value="TJS">TJS – Tajikistani Somoni</option>
  <option value="TMT">TMT – Turkmenistani Manat</option>
  <option value="TND">TND – Tunisian Dinar</option>
  <option value="TOP">TOP – Tongan Paʻanga</option>
  <option value="TRY">TRY – Turkish Lira</option>
  <option value="TTD">TTD – Trinidad and Tobago Dollar</option>
  <option value="TWD">TWD – New Taiwan Dollar</option>
  <option value="TZS">TZS – Tanzanian Shilling</option>
  <option value="UAH">UAH – Ukrainian Hryvnia</option>
  <option value="UGX">UGX – Ugandan Shilling</option>
  <option value="UYU">UYU – Uruguayan Peso</option>
  <option value="UZS">UZS – Uzbekistan Som</option>
  <option value="VES">VES – Venezuelan Bolívar</option>
  <option value="VND">VND – Vietnamese Dong</option>
  <option value="VUV">VUV – Vanuatu Vatu</option>
  <option value="WST">WST – Samoan Tala</option>
  <option value="XAF">XAF – Central African CFA Franc</option>
  <option value="XCD">XCD – East Caribbean Dollar</option>
  <option value="XOF">XOF – West African CFA Franc</option>
  <option value="XPF">XPF – CFP Franc</option>
  <option value="YER">YER – Yemeni Rial</option>
  <option value="ZAR">ZAR – South African Rand</option>
  <option value="ZMW">ZMW – Zambian Kwacha</option>
  <option value="ZWL">ZWL – Zimbabwean Dollar</option>
</select>
              </div>

              {/* ✅ NEW invoice status */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Invoice status
                </label>
                <select
                  value={invoiceStatus}
                  onChange={(e) => setInvoiceStatus(e.target.value as any)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* ✅ NEW due date */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Invoice due date
                </label>
                <input
                  type="date"
                  value={invoiceDueDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              {/* ✅ NEW payment method */}
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700">
                  Payment method
                </label>
                <select
                  value={invoicePaymentMethod}
                  onChange={(e) => setInvoicePaymentMethod(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m ? m : "Select a payment method"}
                    </option>
                  ))}
                </select>

                {invoicePaymentMethod === "Other" && (
                  <input
                    value={invoicePaymentMethodOther}
                    onChange={(e) => setInvoicePaymentMethodOther(e.target.value)}
                    placeholder="Enter payment method"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                )}
              </div>

              

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Initial status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option>Created</option>
                  <option>In Transit</option>
                  <option>Custom Clearance</option>
                  <option>Unclaimed</option>
                  <option>Delivered</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Status note (optional)
                </label>
                <input
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>

            {/* Pricing controls (Preview only) */}
            <p className="font-extrabold text-gray-900 mt-6 mb-3">
              Charges (Preview / Override)
            </p>
            <p className="text-xs text-gray-600 mb-3">
              These are loaded from Admin Pricing (default). Editing here affects the preview AND will be saved into this shipment invoice breakdown.
            </p>

            {/* ✅ Fixed fees */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Shipping fee (fixed)
                </label>
                <input
                  value={shippingFee}
                  onChange={(e) => setShippingFee(numericOnly(e.target.value))}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Handling fee (fixed)
                </label>
                <input
                  value={handlingFee}
                  onChange={(e) => setHandlingFee(numericOnly(e.target.value))}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Customs fee (fixed)
                </label>
                <input
                  value={customsFee}
                  onChange={(e) => setCustomsFee(numericOnly(e.target.value))}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Tax (fixed)
                </label>
                <input
                  value={taxFee}
                  onChange={(e) => setTaxFee(numericOnly(e.target.value))}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Discount (fixed)
                </label>
                <input
                  value={discountFee}
                  onChange={(e) => setDiscountFee(numericOnly(e.target.value))}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* ✅ Percent rates */}
            <p className="font-extrabold text-gray-900 mt-6 mb-3">Rates (percent)</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Fuel surcharge % (of shipping)
                </label>
                <input
                  value={fuelRatePct}
                  onChange={(e) => setFuelRatePct(numericOnly(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Insurance % (of declared value)
                </label>
                <input
                  value={insuranceRatePct}
                  onChange={(e) => setInsuranceRatePct(numericOnly(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={loading || ratesLoading}
              className={[
                "mt-6 w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold transition flex items-center justify-center",
                loading || ratesLoading
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-blue-700 cursor-pointer",
              ].join(" ")}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating…
                </>
              ) : ratesLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading pricing…
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 mr-2" /> Create Shipment
                </>
              )}
            </button>

            {attempted && !isFormValid({ senderName, senderEmail, senderCountry, senderState, senderCity, senderAddress, senderPhone, receiverName, receiverEmail, receiverCountry, receiverState, receiverCity, receiverAddress, receiverPhone, shipmentMeans, weightKg, declaredValue }).valid && (
  <p className="mt-3 text-xs text-amber-600 font-semibold text-center">
    Please fill in all required fields (*) before creating.
  </p>
)}
{err && (
  <div className="mt-4 flex items-center text-red-600 font-semibold">
    <AlertCircle className="w-5 h-5 mr-2" />
    {String(err)}
  </div>
)}
            {okMsg && (
              <div className="mt-4 flex items-center text-green-700 font-semibold">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {okMsg}
              </div>
            )}
          </motion.div>

          {/* Preview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6"
          >
            <p className="font-extrabold text-gray-900 mb-2">Invoice Preview</p>
            <p className="text-sm text-gray-600 mb-4">
              Calculated from declared value using your pricing rules.
            </p>

            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <p className="font-extrabold text-gray-900">Declared Value</p>
                <p className="text-sm text-gray-700">
                  {Number(breakdown.declaredValue).toLocaleString()} {currency}
                </p>
              </div>

              <div className="p-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Shipping (fixed)</span>
                  <span className="font-semibold">{breakdown.shipping.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Fuel surcharge ({fuelRatePct || "—"}%)</span>
                  <span className="font-semibold">{breakdown.fuel.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Handling (fixed)</span>
                  <span className="font-semibold">{breakdown.handling.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Customs (fixed)</span>
                  <span className="font-semibold">{breakdown.customs.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Insurance ({insuranceRatePct || "—"}%)</span>
                  <span className="font-semibold">{breakdown.insurance.toFixed(2)}</span>
                </div>

                <div className="flex justify-between pt-3 border-t">
                  <span className="font-bold">Subtotal</span>
                  <span className="font-bold">{breakdown.subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Tax (fixed)</span>
                  <span className="font-semibold">{breakdown.tax.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Discount (fixed)</span>
                  <span className="font-semibold">-{breakdown.discount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between pt-4 border-t text-lg">
                  <span className="font-extrabold text-gray-900">Total</span>
                  <span className="font-extrabold text-blue-700">
                    {invoiceAmount.toFixed(2)} {currency}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}