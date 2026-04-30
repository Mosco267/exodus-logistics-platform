'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import {
  Camera, Save, Loader2, User, Mail, Phone,
  CheckCircle2, MapPin, Calendar, Pencil, ChevronDown, X
} from 'lucide-react';
import { p } from 'framer-motion/client';
import { createPortal } from 'react-dom';
import { COUNTRIES_WITH_STATES } from '@/lib/countriesData';


// ─── Countries ───────────────────────────────────────────────
const COUNTRIES = [
  { name: 'Afghanistan', code: 'AF', flag: '🇦🇫', dial: '+93' },
  { name: 'Albania', code: 'AL', flag: '🇦🇱', dial: '+355' },
  { name: 'Algeria', code: 'DZ', flag: '🇩🇿', dial: '+213' },
  { name: 'Andorra', code: 'AD', flag: '🇦🇩', dial: '+376' },
  { name: 'Angola', code: 'AO', flag: '🇦🇴', dial: '+244' },
  { name: 'Antigua and Barbuda', code: 'AG', flag: '🇦🇬', dial: '+1' },
  { name: 'Argentina', code: 'AR', flag: '🇦🇷', dial: '+54' },
  { name: 'Armenia', code: 'AM', flag: '🇦🇲', dial: '+374' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', dial: '+61' },
  { name: 'Austria', code: 'AT', flag: '🇦🇹', dial: '+43' },
  { name: 'Azerbaijan', code: 'AZ', flag: '🇦🇿', dial: '+994' },
  { name: 'Bahamas', code: 'BS', flag: '🇧🇸', dial: '+1' },
  { name: 'Bahrain', code: 'BH', flag: '🇧🇭', dial: '+973' },
  { name: 'Bangladesh', code: 'BD', flag: '🇧🇩', dial: '+880' },
  { name: 'Barbados', code: 'BB', flag: '🇧🇧', dial: '+1' },
  { name: 'Belarus', code: 'BY', flag: '🇧🇾', dial: '+375' },
  { name: 'Belgium', code: 'BE', flag: '🇧🇪', dial: '+32' },
  { name: 'Belize', code: 'BZ', flag: '🇧🇿', dial: '+501' },
  { name: 'Benin', code: 'BJ', flag: '🇧🇯', dial: '+229' },
  { name: 'Bhutan', code: 'BT', flag: '🇧🇹', dial: '+975' },
  { name: 'Bolivia', code: 'BO', flag: '🇧🇴', dial: '+591' },
  { name: 'Bosnia and Herzegovina', code: 'BA', flag: '🇧🇦', dial: '+387' },
  { name: 'Botswana', code: 'BW', flag: '🇧🇼', dial: '+267' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷', dial: '+55' },
  { name: 'Brunei', code: 'BN', flag: '🇧🇳', dial: '+673' },
  { name: 'Bulgaria', code: 'BG', flag: '🇧🇬', dial: '+359' },
  { name: 'Burkina Faso', code: 'BF', flag: '🇧🇫', dial: '+226' },
  { name: 'Burundi', code: 'BI', flag: '🇧🇮', dial: '+257' },
  { name: 'Cabo Verde', code: 'CV', flag: '🇨🇻', dial: '+238' },
  { name: 'Cambodia', code: 'KH', flag: '🇰🇭', dial: '+855' },
  { name: 'Cameroon', code: 'CM', flag: '🇨🇲', dial: '+237' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', dial: '+1' },
  { name: 'Central African Republic', code: 'CF', flag: '🇨🇫', dial: '+236' },
  { name: 'Chad', code: 'TD', flag: '🇹🇩', dial: '+235' },
  { name: 'Chile', code: 'CL', flag: '🇨🇱', dial: '+56' },
  { name: 'China', code: 'CN', flag: '🇨🇳', dial: '+86' },
  { name: 'Colombia', code: 'CO', flag: '🇨🇴', dial: '+57' },
  { name: 'Comoros', code: 'KM', flag: '🇰🇲', dial: '+269' },
  { name: 'Congo (DRC)', code: 'CD', flag: '🇨🇩', dial: '+243' },
  { name: 'Congo (Republic)', code: 'CG', flag: '🇨🇬', dial: '+242' },
  { name: 'Costa Rica', code: 'CR', flag: '🇨🇷', dial: '+506' },
  { name: 'Croatia', code: 'HR', flag: '🇭🇷', dial: '+385' },
  { name: 'Cuba', code: 'CU', flag: '🇨🇺', dial: '+53' },
  { name: 'Cyprus', code: 'CY', flag: '🇨🇾', dial: '+357' },
  { name: 'Czech Republic', code: 'CZ', flag: '🇨🇿', dial: '+420' },
  { name: 'Denmark', code: 'DK', flag: '🇩🇰', dial: '+45' },
  { name: 'Djibouti', code: 'DJ', flag: '🇩🇯', dial: '+253' },
  { name: 'Dominica', code: 'DM', flag: '🇩🇲', dial: '+1' },
  { name: 'Dominican Republic', code: 'DO', flag: '🇩🇴', dial: '+1' },
  { name: 'Ecuador', code: 'EC', flag: '🇪🇨', dial: '+593' },
  { name: 'Egypt', code: 'EG', flag: '🇪🇬', dial: '+20' },
  { name: 'El Salvador', code: 'SV', flag: '🇸🇻', dial: '+503' },
  { name: 'Equatorial Guinea', code: 'GQ', flag: '🇬🇶', dial: '+240' },
  { name: 'Eritrea', code: 'ER', flag: '🇪🇷', dial: '+291' },
  { name: 'Estonia', code: 'EE', flag: '🇪🇪', dial: '+372' },
  { name: 'Eswatini', code: 'SZ', flag: '🇸🇿', dial: '+268' },
  { name: 'Ethiopia', code: 'ET', flag: '🇪🇹', dial: '+251' },
  { name: 'Fiji', code: 'FJ', flag: '🇫🇯', dial: '+679' },
  { name: 'Finland', code: 'FI', flag: '🇫🇮', dial: '+358' },
  { name: 'France', code: 'FR', flag: '🇫🇷', dial: '+33' },
  { name: 'Gabon', code: 'GA', flag: '🇬🇦', dial: '+241' },
  { name: 'Gambia', code: 'GM', flag: '🇬🇲', dial: '+220' },
  { name: 'Georgia', code: 'GE', flag: '🇬🇪', dial: '+995' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', dial: '+49' },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭', dial: '+233' },
  { name: 'Greece', code: 'GR', flag: '🇬🇷', dial: '+30' },
  { name: 'Grenada', code: 'GD', flag: '🇬🇩', dial: '+1' },
  { name: 'Guatemala', code: 'GT', flag: '🇬🇹', dial: '+502' },
  { name: 'Guinea', code: 'GN', flag: '🇬🇳', dial: '+224' },
  { name: 'Guinea-Bissau', code: 'GW', flag: '🇬🇼', dial: '+245' },
  { name: 'Guyana', code: 'GY', flag: '🇬🇾', dial: '+592' },
  { name: 'Haiti', code: 'HT', flag: '🇭🇹', dial: '+509' },
  { name: 'Honduras', code: 'HN', flag: '🇭🇳', dial: '+504' },
  { name: 'Hungary', code: 'HU', flag: '🇭🇺', dial: '+36' },
  { name: 'Iceland', code: 'IS', flag: '🇮🇸', dial: '+354' },
  { name: 'India', code: 'IN', flag: '🇮🇳', dial: '+91' },
  { name: 'Indonesia', code: 'ID', flag: '🇮🇩', dial: '+62' },
  { name: 'Iran', code: 'IR', flag: '🇮🇷', dial: '+98' },
  { name: 'Iraq', code: 'IQ', flag: '🇮🇶', dial: '+964' },
  { name: 'Ireland', code: 'IE', flag: '🇮🇪', dial: '+353' },
  { name: 'Israel', code: 'IL', flag: '🇮🇱', dial: '+972' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹', dial: '+39' },
  { name: 'Jamaica', code: 'JM', flag: '🇯🇲', dial: '+1' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵', dial: '+81' },
  { name: 'Jordan', code: 'JO', flag: '🇯🇴', dial: '+962' },
  { name: 'Kazakhstan', code: 'KZ', flag: '🇰🇿', dial: '+7' },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪', dial: '+254' },
  { name: 'Kiribati', code: 'KI', flag: '🇰🇮', dial: '+686' },
  { name: 'Kuwait', code: 'KW', flag: '🇰🇼', dial: '+965' },
  { name: 'Kyrgyzstan', code: 'KG', flag: '🇰🇬', dial: '+996' },
  { name: 'Laos', code: 'LA', flag: '🇱🇦', dial: '+856' },
  { name: 'Latvia', code: 'LV', flag: '🇱🇻', dial: '+371' },
  { name: 'Lebanon', code: 'LB', flag: '🇱🇧', dial: '+961' },
  { name: 'Lesotho', code: 'LS', flag: '🇱🇸', dial: '+266' },
  { name: 'Liberia', code: 'LR', flag: '🇱🇷', dial: '+231' },
  { name: 'Libya', code: 'LY', flag: '🇱🇾', dial: '+218' },
  { name: 'Liechtenstein', code: 'LI', flag: '🇱🇮', dial: '+423' },
  { name: 'Lithuania', code: 'LT', flag: '🇱🇹', dial: '+370' },
  { name: 'Luxembourg', code: 'LU', flag: '🇱🇺', dial: '+352' },
  { name: 'Madagascar', code: 'MG', flag: '🇲🇬', dial: '+261' },
  { name: 'Malawi', code: 'MW', flag: '🇲🇼', dial: '+265' },
  { name: 'Malaysia', code: 'MY', flag: '🇲🇾', dial: '+60' },
  { name: 'Maldives', code: 'MV', flag: '🇲🇻', dial: '+960' },
  { name: 'Mali', code: 'ML', flag: '🇲🇱', dial: '+223' },
  { name: 'Malta', code: 'MT', flag: '🇲🇹', dial: '+356' },
  { name: 'Marshall Islands', code: 'MH', flag: '🇲🇭', dial: '+692' },
  { name: 'Mauritania', code: 'MR', flag: '🇲🇷', dial: '+222' },
  { name: 'Mauritius', code: 'MU', flag: '🇲🇺', dial: '+230' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽', dial: '+52' },
  { name: 'Micronesia', code: 'FM', flag: '🇫🇲', dial: '+691' },
  { name: 'Moldova', code: 'MD', flag: '🇲🇩', dial: '+373' },
  { name: 'Monaco', code: 'MC', flag: '🇲🇨', dial: '+377' },
  { name: 'Mongolia', code: 'MN', flag: '🇲🇳', dial: '+976' },
  { name: 'Montenegro', code: 'ME', flag: '🇲🇪', dial: '+382' },
  { name: 'Morocco', code: 'MA', flag: '🇲🇦', dial: '+212' },
  { name: 'Mozambique', code: 'MZ', flag: '🇲🇿', dial: '+258' },
  { name: 'Myanmar', code: 'MM', flag: '🇲🇲', dial: '+95' },
  { name: 'Namibia', code: 'NA', flag: '🇳🇦', dial: '+264' },
  { name: 'Nauru', code: 'NR', flag: '🇳🇷', dial: '+674' },
  { name: 'Nepal', code: 'NP', flag: '🇳🇵', dial: '+977' },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱', dial: '+31' },
  { name: 'New Zealand', code: 'NZ', flag: '🇳🇿', dial: '+64' },
  { name: 'Nicaragua', code: 'NI', flag: '🇳🇮', dial: '+505' },
  { name: 'Niger', code: 'NE', flag: '🇳🇪', dial: '+227' },
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', dial: '+234' },
  { name: 'North Korea', code: 'KP', flag: '🇰🇵', dial: '+850' },
  { name: 'North Macedonia', code: 'MK', flag: '🇲🇰', dial: '+389' },
  { name: 'Norway', code: 'NO', flag: '🇳🇴', dial: '+47' },
  { name: 'Oman', code: 'OM', flag: '🇴🇲', dial: '+968' },
  { name: 'Pakistan', code: 'PK', flag: '🇵🇰', dial: '+92' },
  { name: 'Palau', code: 'PW', flag: '🇵🇼', dial: '+680' },
  { name: 'Palestine', code: 'PS', flag: '🇵🇸', dial: '+970' },
  { name: 'Panama', code: 'PA', flag: '🇵🇦', dial: '+507' },
  { name: 'Papua New Guinea', code: 'PG', flag: '🇵🇬', dial: '+675' },
  { name: 'Paraguay', code: 'PY', flag: '🇵🇾', dial: '+595' },
  { name: 'Peru', code: 'PE', flag: '🇵🇪', dial: '+51' },
  { name: 'Philippines', code: 'PH', flag: '🇵🇭', dial: '+63' },
  { name: 'Poland', code: 'PL', flag: '🇵🇱', dial: '+48' },
  { name: 'Portugal', code: 'PT', flag: '🇵🇹', dial: '+351' },
  { name: 'Qatar', code: 'QA', flag: '🇶🇦', dial: '+974' },
  { name: 'Romania', code: 'RO', flag: '🇷🇴', dial: '+40' },
  { name: 'Russia', code: 'RU', flag: '🇷🇺', dial: '+7' },
  { name: 'Rwanda', code: 'RW', flag: '🇷🇼', dial: '+250' },
  { name: 'Saint Kitts and Nevis', code: 'KN', flag: '🇰🇳', dial: '+1' },
  { name: 'Saint Lucia', code: 'LC', flag: '🇱🇨', dial: '+1' },
  { name: 'Saint Vincent and the Grenadines', code: 'VC', flag: '🇻🇨', dial: '+1' },
  { name: 'Samoa', code: 'WS', flag: '🇼🇸', dial: '+685' },
  { name: 'San Marino', code: 'SM', flag: '🇸🇲', dial: '+378' },
  { name: 'Sao Tome and Principe', code: 'ST', flag: '🇸🇹', dial: '+239' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', dial: '+966' },
  { name: 'Senegal', code: 'SN', flag: '🇸🇳', dial: '+221' },
  { name: 'Serbia', code: 'RS', flag: '🇷🇸', dial: '+381' },
  { name: 'Seychelles', code: 'SC', flag: '🇸🇨', dial: '+248' },
  { name: 'Sierra Leone', code: 'SL', flag: '🇸🇱', dial: '+232' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬', dial: '+65' },
  { name: 'Slovakia', code: 'SK', flag: '🇸🇰', dial: '+421' },
  { name: 'Slovenia', code: 'SI', flag: '🇸🇮', dial: '+386' },
  { name: 'Solomon Islands', code: 'SB', flag: '🇸🇧', dial: '+677' },
  { name: 'Somalia', code: 'SO', flag: '🇸🇴', dial: '+252' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦', dial: '+27' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷', dial: '+82' },
  { name: 'South Sudan', code: 'SS', flag: '🇸🇸', dial: '+211' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸', dial: '+34' },
  { name: 'Sri Lanka', code: 'LK', flag: '🇱🇰', dial: '+94' },
  { name: 'Sudan', code: 'SD', flag: '🇸🇩', dial: '+249' },
  { name: 'Suriname', code: 'SR', flag: '🇸🇷', dial: '+597' },
  { name: 'Sweden', code: 'SE', flag: '🇸🇪', dial: '+46' },
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭', dial: '+41' },
  { name: 'Syria', code: 'SY', flag: '🇸🇾', dial: '+963' },
  { name: 'Taiwan', code: 'TW', flag: '🇹🇼', dial: '+886' },
  { name: 'Tajikistan', code: 'TJ', flag: '🇹🇯', dial: '+992' },
  { name: 'Tanzania', code: 'TZ', flag: '🇹🇿', dial: '+255' },
  { name: 'Thailand', code: 'TH', flag: '🇹🇭', dial: '+66' },
  { name: 'Timor-Leste', code: 'TL', flag: '🇹🇱', dial: '+670' },
  { name: 'Togo', code: 'TG', flag: '🇹🇬', dial: '+228' },
  { name: 'Tonga', code: 'TO', flag: '🇹🇴', dial: '+676' },
  { name: 'Trinidad and Tobago', code: 'TT', flag: '🇹🇹', dial: '+1' },
  { name: 'Tunisia', code: 'TN', flag: '🇹🇳', dial: '+216' },
  { name: 'Turkey', code: 'TR', flag: '🇹🇷', dial: '+90' },
  { name: 'Turkmenistan', code: 'TM', flag: '🇹🇲', dial: '+993' },
  { name: 'Tuvalu', code: 'TV', flag: '🇹🇻', dial: '+688' },
  { name: 'Uganda', code: 'UG', flag: '🇺🇬', dial: '+256' },
  { name: 'Ukraine', code: 'UA', flag: '🇺🇦', dial: '+380' },
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', dial: '+971' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', dial: '+44' },
  { name: 'United States', code: 'US', flag: '🇺🇸', dial: '+1' },
  { name: 'Uruguay', code: 'UY', flag: '🇺🇾', dial: '+598' },
  { name: 'Uzbekistan', code: 'UZ', flag: '🇺🇿', dial: '+998' },
  { name: 'Vanuatu', code: 'VU', flag: '🇻🇺', dial: '+678' },
  { name: 'Vatican City', code: 'VA', flag: '🇻🇦', dial: '+379' },
  { name: 'Venezuela', code: 'VE', flag: '🇻🇪', dial: '+58' },
  { name: 'Vietnam', code: 'VN', flag: '🇻🇳', dial: '+84' },
  { name: 'Yemen', code: 'YE', flag: '🇾🇪', dial: '+967' },
  { name: 'Zambia', code: 'ZM', flag: '🇿🇲', dial: '+260' },
  { name: 'Zimbabwe', code: 'ZW', flag: '🇿🇼', dial: '+263' },
];

// Use COUNTRIES_WITH_STATES for state dropdown — it has the same structure plus states[]

// ─── Phone formats ────────────────────────────────────────────
const PHONE_FORMATS: Record<string, { placeholder: string; pattern: string }> = {
  US: { placeholder: '(201) 555-0123', pattern: '(###) ###-####' },
  CA: { placeholder: '(416) 555-0123', pattern: '(###) ###-####' },
  MX: { placeholder: '55 1234 5678', pattern: '## #### ####' },
  GB: { placeholder: '7400 123456', pattern: '#### ######' },
  DE: { placeholder: '151 12345678', pattern: '### ########' },
  FR: { placeholder: '6 12 34 56 78', pattern: '# ## ## ## ##' },
  IT: { placeholder: '312 345 6789', pattern: '### ### ####' },
  ES: { placeholder: '612 345 678', pattern: '### ### ###' },
  PT: { placeholder: '912 345 678', pattern: '### ### ###' },
  NL: { placeholder: '6 12345678', pattern: '# ########' },
  BE: { placeholder: '472 12 34 56', pattern: '### ## ## ##' },
  SE: { placeholder: '70 123 45 67', pattern: '## ### ## ##' },
  NO: { placeholder: '412 34 567', pattern: '### ## ###' },
  DK: { placeholder: '20 12 34 56', pattern: '## ## ## ##' },
  FI: { placeholder: '41 2345678', pattern: '## #######' },
  IE: { placeholder: '87 123 4567', pattern: '## ### ####' },
  AT: { placeholder: '664 1234567', pattern: '### #######' },
  CH: { placeholder: '76 123 45 67', pattern: '## ### ## ##' },
  PL: { placeholder: '512 345 678', pattern: '### ### ###' },
  CZ: { placeholder: '601 123 456', pattern: '### ### ###' },
  SK: { placeholder: '912 123 456', pattern: '### ### ###' },
  HU: { placeholder: '20 123 4567', pattern: '## ### ####' },
  RO: { placeholder: '712 345 678', pattern: '### ### ###' },
  BG: { placeholder: '87 123 4567', pattern: '## ### ####' },
  HR: { placeholder: '91 234 5678', pattern: '## ### ####' },
  RS: { placeholder: '60 1234567', pattern: '## #######' },
  GR: { placeholder: '694 123 4567', pattern: '### ### ####' },
  UA: { placeholder: '50 123 4567', pattern: '## ### ####' },
  RU: { placeholder: '912 345-67-89', pattern: '### ###-##-##' },
  BY: { placeholder: '29 123-45-67', pattern: '## ###-##-##' },
  MD: { placeholder: '621 12 345', pattern: '### ## ###' },
  LT: { placeholder: '612 34567', pattern: '### #####' },
  LV: { placeholder: '2123 4567', pattern: '#### ####' },
  EE: { placeholder: '5123 4567', pattern: '#### ####' },
  AL: { placeholder: '66 123 4567', pattern: '## ### ####' },
  ME: { placeholder: '67 123 456', pattern: '## ### ###' },
  MK: { placeholder: '72 123 456', pattern: '## ### ###' },
  BA: { placeholder: '61 123 456', pattern: '## ### ###' },
  SI: { placeholder: '40 123 456', pattern: '## ### ###' },
  LU: { placeholder: '628 123 456', pattern: '### ### ###' },
  MT: { placeholder: '9961 2345', pattern: '#### ####' },
  CY: { placeholder: '96 123456', pattern: '## ######' },
  IS: { placeholder: '611 1234', pattern: '### ####' },
  LI: { placeholder: '660 1234', pattern: '### ####' },
  MC: { placeholder: '6 12 34 56 78', pattern: '# ## ## ## ##' },
  SM: { placeholder: '66 66 12 34', pattern: '## ## ## ##' },
  AD: { placeholder: '312 345', pattern: '### ###' },
  VA: { placeholder: '6 698 12345', pattern: '# ### #####' },
  NG: { placeholder: '802 341 6524', pattern: '### ### ####' },
  GH: { placeholder: '24 123 4567', pattern: '## ### ####' },
  ZA: { placeholder: '71 234 5678', pattern: '## ### ####' },
  KE: { placeholder: '712 345678', pattern: '### ######' },
  ET: { placeholder: '91 123 4567', pattern: '## ### ####' },
  TZ: { placeholder: '712 345 678', pattern: '### ### ###' },
  UG: { placeholder: '712 345678', pattern: '### ######' },
  DZ: { placeholder: '551 23 45 67', pattern: '### ## ## ##' },
  MA: { placeholder: '612-345678', pattern: '###-######' },
  TN: { placeholder: '20 123 456', pattern: '## ### ###' },
  EG: { placeholder: '100 123 4567', pattern: '### ### ####' },
  SD: { placeholder: '91 123 4567', pattern: '## ### ####' },
  SS: { placeholder: '977 123 456', pattern: '### ### ###' },
  LY: { placeholder: '91 123 4567', pattern: '## ### ####' },
  CM: { placeholder: '6712 3456', pattern: '#### ####' },
  SN: { placeholder: '77 123 45 67', pattern: '## ### ## ##' },
  CI: { placeholder: '7 12 34 56 78', pattern: '# ## ## ## ##' },
  AO: { placeholder: '923 123 456', pattern: '### ### ###' },
  MZ: { placeholder: '82 123 4567', pattern: '## ### ####' },
  MG: { placeholder: '32 12 345 67', pattern: '## ## ### ##' },
  ZW: { placeholder: '71 234 5678', pattern: '## ### ####' },
  ZM: { placeholder: '95 123 4567', pattern: '## ### ####' },
  BW: { placeholder: '71 234 567', pattern: '## ### ###' },
  NA: { placeholder: '81 123 4567', pattern: '## ### ####' },
  LS: { placeholder: '5012 3456', pattern: '#### ####' },
  SZ: { placeholder: '7612 3456', pattern: '#### ####' },
  RW: { placeholder: '721 123 456', pattern: '### ### ###' },
  BI: { placeholder: '79 12 34 56', pattern: '## ## ## ##' },
  CD: { placeholder: '812 345 678', pattern: '### ### ###' },
  CG: { placeholder: '6 123 4567', pattern: '# ### ####' },
  CF: { placeholder: '75 04 12 34', pattern: '## ## ## ##' },
  GA: { placeholder: '6 12 34 56', pattern: '# ## ## ##' },
  GQ: { placeholder: '222 123 456', pattern: '### ### ###' },
  TD: { placeholder: '63 01 23 45', pattern: '## ## ## ##' },
  GN: { placeholder: '622 12 34 56', pattern: '### ## ## ##' },
  GW: { placeholder: '955 123 456', pattern: '### ### ###' },
  SL: { placeholder: '25 123456', pattern: '## ######' },
  LR: { placeholder: '77 012 3456', pattern: '## ### ####' },
  GM: { placeholder: '301 2345', pattern: '### ####' },
  ML: { placeholder: '65 12 34 56', pattern: '## ## ## ##' },
  BF: { placeholder: '70 12 34 56', pattern: '## ## ## ##' },
  NE: { placeholder: '93 12 34 56', pattern: '## ## ## ##' },
  BJ: { placeholder: '90 12 34 56', pattern: '## ## ## ##' },
  TG: { placeholder: '90 12 34 56', pattern: '## ## ## ##' },
  MR: { placeholder: '22 12 34 56', pattern: '## ## ## ##' },
  CV: { placeholder: '991 23 45', pattern: '### ## ##' },
  ST: { placeholder: '981 2345', pattern: '### ####' },
  SC: { placeholder: '2 512 345', pattern: '# ### ###' },
  MU: { placeholder: '5252 1234', pattern: '#### ####' },
  KM: { placeholder: '321 23 45', pattern: '### ## ##' },
  DJ: { placeholder: '77 83 12 34', pattern: '## ## ## ##' },
  ER: { placeholder: '7 123 456', pattern: '# ### ###' },
  SO: { placeholder: '61 234 567', pattern: '## ### ###' },
  MW: { placeholder: '991 23 45 67', pattern: '### ## ## ##' },
  AE: { placeholder: '50 123 4567', pattern: '## ### ####' },
  SA: { placeholder: '50 123 4567', pattern: '## ### ####' },
  QA: { placeholder: '3312 3456', pattern: '#### ####' },
  KW: { placeholder: '500 12345', pattern: '### #####' },
  BH: { placeholder: '3600 1234', pattern: '#### ####' },
  OM: { placeholder: '9212 3456', pattern: '#### ####' },
  YE: { placeholder: '712 123 456', pattern: '### ### ###' },
  IQ: { placeholder: '791 123 4567', pattern: '### ### ####' },
  SY: { placeholder: '944 123 456', pattern: '### ### ###' },
  LB: { placeholder: '3 123 456', pattern: '# ### ###' },
  JO: { placeholder: '7 9012 3456', pattern: '# #### ####' },
  IL: { placeholder: '50-123-4567', pattern: '##-###-####' },
  PS: { placeholder: '59 123 4567', pattern: '## ### ####' },
  IR: { placeholder: '912 345 6789', pattern: '### ### ####' },
  IN: { placeholder: '98765 43210', pattern: '##### #####' },
  CN: { placeholder: '131 2345 6789', pattern: '### #### ####' },
  JP: { placeholder: '90-1234-5678', pattern: '##-####-####' },
  KR: { placeholder: '10-1234-5678', pattern: '##-####-####' },
  KP: { placeholder: '192 123 4567', pattern: '### ### ####' },
  TW: { placeholder: '912-345-678', pattern: '###-###-###' },
  HK: { placeholder: '5123 4567', pattern: '#### ####' },
  MO: { placeholder: '6612 3456', pattern: '#### ####' },
  PH: { placeholder: '917 123 4567', pattern: '### ### ####' },
  ID: { placeholder: '812-3456-7890', pattern: '###-####-####' },
  MY: { placeholder: '12-345 6789', pattern: '##-### ####' },
  SG: { placeholder: '9123 4567', pattern: '#### ####' },
  TH: { placeholder: '81 234 5678', pattern: '## ### ####' },
  VN: { placeholder: '91 234 56 78', pattern: '## ### ## ##' },
  MM: { placeholder: '9 123 456 789', pattern: '# ### ### ###' },
  KH: { placeholder: '12 345 678', pattern: '## ### ###' },
  LA: { placeholder: '20 5512 3456', pattern: '## #### ####' },
  BD: { placeholder: '1712-345678', pattern: '####-######' },
  PK: { placeholder: '301-2345678', pattern: '###-#######' },
  LK: { placeholder: '71 234 5678', pattern: '## ### ####' },
  NP: { placeholder: '84-1234567', pattern: '##-#######' },
  BT: { placeholder: '17 123 456', pattern: '## ### ###' },
  MV: { placeholder: '777-1234', pattern: '###-####' },
  AF: { placeholder: '70 123 4567', pattern: '## ### ####' },
  TJ: { placeholder: '917 12 3456', pattern: '### ## ####' },
  TM: { placeholder: '8 65 123456', pattern: '# ## ######' },
  UZ: { placeholder: '90 123 45 67', pattern: '## ### ## ##' },
  KG: { placeholder: '700 123 456', pattern: '### ### ###' },
  KZ: { placeholder: '700 123 45 67', pattern: '### ### ## ##' },
  MN: { placeholder: '9912 3456', pattern: '#### ####' },
  GE: { placeholder: '555 12 34 56', pattern: '### ## ## ##' },
  AM: { placeholder: '77 123 456', pattern: '## ### ###' },
  AZ: { placeholder: '50 123 45 67', pattern: '## ### ## ##' },
  TR: { placeholder: '532 123 45 67', pattern: '### ### ## ##' },
  BR: { placeholder: '(11) 99999-9999', pattern: '(##) #####-####' },
  AR: { placeholder: '11 1234-5678', pattern: '## ####-####' },
  CO: { placeholder: '310 123 4567', pattern: '### ### ####' },
  CL: { placeholder: '9 1234 5678', pattern: '# #### ####' },
  PE: { placeholder: '912 345 678', pattern: '### ### ###' },
  VE: { placeholder: '412-123 4567', pattern: '###-### ####' },
  EC: { placeholder: '99 123 4567', pattern: '## ### ####' },
  BO: { placeholder: '7123 4567', pattern: '#### ####' },
  PY: { placeholder: '981 234 567', pattern: '### ### ###' },
  UY: { placeholder: '94 123 456', pattern: '## ### ###' },
  GY: { placeholder: '609 1234', pattern: '### ####' },
  SR: { placeholder: '741 2345', pattern: '### ####' },
  PA: { placeholder: '6123-4567', pattern: '####-####' },
  CR: { placeholder: '8312 3456', pattern: '#### ####' },
  NI: { placeholder: '8412 3456', pattern: '#### ####' },
  HN: { placeholder: '9812-3456', pattern: '####-####' },
  SV: { placeholder: '7012 3456', pattern: '#### ####' },
  GT: { placeholder: '5123 4567', pattern: '#### ####' },
  BZ: { placeholder: '622 3456', pattern: '### ####' },
  CU: { placeholder: '5 1234567', pattern: '# #######' },
  DO: { placeholder: '(809) 234-5678', pattern: '(809) ###-####' },
  HT: { placeholder: '34 12 3456', pattern: '## ## ####' },
  JM: { placeholder: '(876) 234-5678', pattern: '(876) ###-####' },
  TT: { placeholder: '(868) 234-5678', pattern: '(868) ###-####' },
  BB: { placeholder: '(246) 234-5678', pattern: '(246) ###-####' },
  BS: { placeholder: '(242) 234-5678', pattern: '(242) ###-####' },
  AG: { placeholder: '(268) 234-5678', pattern: '(268) ###-####' },
  DM: { placeholder: '(767) 234-5678', pattern: '(767) ###-####' },
  GD: { placeholder: '(473) 234-5678', pattern: '(473) ###-####' },
  KN: { placeholder: '(869) 234-5678', pattern: '(869) ###-####' },
  LC: { placeholder: '(758) 234-5678', pattern: '(758) ###-####' },
  VC: { placeholder: '(784) 234-5678', pattern: '(784) ###-####' },
  AU: { placeholder: '412 345 678', pattern: '### ### ###' },
  NZ: { placeholder: '21 234 5678', pattern: '## ### ####' },
  FJ: { placeholder: '701 2345', pattern: '### ####' },
  PG: { placeholder: '7012 3456', pattern: '#### ####' },
  SB: { placeholder: '74 12345', pattern: '## #####' },
  VU: { placeholder: '591 2345', pattern: '### ####' },
  WS: { placeholder: '72 12345', pattern: '## #####' },
  TO: { placeholder: '7715 123', pattern: '#### ###' },
  KI: { placeholder: '72012345', pattern: '########' },
  FM: { placeholder: '350 1234', pattern: '### ####' },
  MH: { placeholder: '235-1234', pattern: '###-####' },
  PW: { placeholder: '775 1234', pattern: '### ####' },
  NR: { placeholder: '444 1234', pattern: '### ####' },
  TV: { placeholder: '901 234', pattern: '### ###' },
};

function applyPattern(digits: string, pattern: string): string {
  let result = '';
  let di = 0;
  for (let i = 0; i < pattern.length && di < digits.length; i++) {
    if (pattern[i] === '#') {
      result += digits[di++];
    } else {
      result += pattern[i];
    }
  }
  return result;
}

function getFormat(code: string) {
  return PHONE_FORMATS[code] || { placeholder: '123 456 7890', pattern: '### ### ####' };
}

function findCountry(nameOrCode: string) {
  return COUNTRIES.find(c =>
    c.name.toLowerCase() === nameOrCode.toLowerCase() ||
    c.code.toLowerCase() === nameOrCode.toLowerCase()
  );
}

// ─── Types ────────────────────────────────────────────────────
type ProfileData = {
  name: string; email: string; phone: string; country: string;
  address: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
  avatarUrl: string; createdAt: string; provider: string;
};

// ─── Country Dropdown Component ───────────────────────────────
function CountryDropdown({
  value, onChange, disabled, accentColor = '#0b3aa4'
}: {
  value: string;
  onChange: (c: typeof COUNTRIES[0]) => void;
  disabled?: boolean;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = findCountry(value);
  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search)
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(o => !o); setSearch(''); } }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white transition hover:border-gray-300 dark:hover:border-white/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-left">
        {selected ? (
  <>
    <img
  src={`https://flagcdn.com/w20/${selected.code.toLowerCase()}.png`}
  width="20" height="15"
  alt={selected.name}
  className="shrink-0 rounded-sm object-cover"
  style={{ minWidth: 20 }}
/>
    <span className="flex-1 truncate">{selected.name}</span>
  </>
) : (
  <span className="text-gray-400 flex-1">Select country</span>
)}
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search country..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
              style={{ fontSize: '16px' }}
            />
          </div>
          {/* List */}
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">No countries found</li>
            ) : filtered.map(c => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); }}
                 className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition cursor-pointer ${selected?.code === c.code ? 'font-semibold' : 'hover:bg-gray-50 dark:hover:bg-white/10'}`}
style={selected?.code === c.code ? { background: `${accentColor}20`, color: accentColor } : {}}>
                 <img
  src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`}
  width="20" height="15"
  alt={c.name}
  className="shrink-0 rounded-sm object-cover"
  style={{ minWidth: 20 }}
/>
                  <span className="flex-1 truncate text-gray-900 dark:text-white">{c.name}</span>
                  
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DialCodePicker({
  selected,
  onChange,
}: {
  selected: typeof COUNTRIES[0] | null;
  onChange: (c: typeof COUNTRIES[0]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search)
  );

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className="h-10 px-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center gap-1.5 cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition"
        style={{ minWidth: 80 }}>
        {selected && (
          <img
            src={`https://flagcdn.com/w20/${selected.code.toLowerCase()}.png`}
            width="18" height="13"
            alt={selected.name}
            className="rounded-sm object-cover shrink-0"
          />
        )}
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
          {selected?.dial || '+?'}
        </span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden w-64">
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search country..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
              style={{ fontSize: '16px' }}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.map(c => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
                  <img
                    src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`}
                    width="18" height="13"
                    alt={c.name}
                    className="rounded-sm object-cover shrink-0"
                  />
                  <span className="text-gray-900 dark:text-white font-semibold">{c.dial}</span>
                  <span className="text-gray-400 text-xs truncate">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}



function StateDropdown({ value, onChange, states, accentColor = '#0b3aa4' }: {
  value: string;
  onChange: (s: string) => void;
  states: string[];
  accentColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = states.filter(s =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  if (states.length === 0) {
    return (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="State / Province"
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#0b3aa4] dark:focus:border-blue-400 transition"
        style={{ fontSize: '16px' }}
      />
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white transition hover:border-gray-300 dark:hover:border-white/20 cursor-pointer text-left">

        <span className="flex-1 truncate">
          {value || <span className="text-gray-400">Select state…</span>}
        </span>
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search state..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
              style={{ fontSize: '16px' }}
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">No results</li>
            ) : filtered.map(s => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => { onChange(s); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition cursor-pointer ${value === s ? 'font-semibold' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10'}`}
style={value === s ? { background: `${accentColor}20`, color: accentColor } : {}}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────
export default function ProfilePage() {
 const { data: session, update: updateSession } = useSession();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const fileRef = useRef<HTMLInputElement>(null);

  const [accent, setAccent] = useState('linear-gradient(135deg, #0b3aa4, #0e7490)');

  const accentSolid = (() => {
  const map: Record<string, string> = {
    default: '#0b3aa4', ocean: '#0891b2', sunset: '#f97316',
    arctic: '#0284c7', midnight: '#06b6d4',
  };
  const cached = typeof window !== 'undefined' ? localStorage.getItem('exodus_theme_cache') : null;
  return map[cached || 'default'] || '#0b3aa4';
})();

useEffect(() => {
  const accents: Record<string, string> = {
    default: 'linear-gradient(135deg, #0b3aa4, #0e7490)',
    ocean: 'linear-gradient(135deg, #0e7490, #06b6d4)',
    sunset: 'linear-gradient(135deg, #0b3aa4, #f97316)',
    arctic: 'linear-gradient(135deg, #0284c7, #bae6fd)',
    midnight: 'linear-gradient(135deg, #0f172a, #0e7490)',
  };

  const apply = () => {
    const cached = localStorage.getItem('exodus_theme_cache');
    if (cached && accents[cached]) setAccent(accents[cached]);
  };

  apply();

  window.addEventListener('storage', apply);
  // Also poll every second in case same-tab storage event doesn't fire
  const interval = setInterval(apply, 1000);

  return () => {
    window.removeEventListener('storage', apply);
    clearInterval(interval);
  };
}, []);

  const [profile, setProfile] = useState<ProfileData>({
  name: '', email: '', phone: '', country: '',
  address: '',
  addressStreet: '', addressCity: '', addressState: '', addressPostalCode: '',
  avatarUrl: '', createdAt: '', provider: '',
});
const [savedProfile, setSavedProfile] = useState({ name: '', phone: '', country: '', addressStreet: '', addressCity: '', addressState: '', addressPostalCode: '' });
const [savedDialCode, setSavedDialCode] = useState('');
const [savedPhoneNum, setSavedPhoneNum] = useState('');

  const [selectedCountry, setSelectedCountry] = useState<typeof COUNTRIES[0] | null>(null);
const [dialCountry, setDialCountry] = useState<typeof COUNTRIES[0] | null>(null);
  const [phoneNum, setPhoneNum] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [sessionRefreshing, setSessionRefreshing] = useState(false);

  // Email change
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailStep, setEmailStep] = useState<'input' | 'verify'>('input');
  const [emailSending, setEmailSending] = useState(false);
const [emailError, setEmailError] = useState('');

const [countdown, setCountdown] = useState(0);

const profileChanged =
  profile.name !== savedProfile.name ||
  profile.addressStreet !== savedProfile.addressStreet ||
  profile.addressCity !== savedProfile.addressCity ||
  profile.addressState !== savedProfile.addressState ||
  profile.addressPostalCode !== savedProfile.addressPostalCode ||
  profile.country !== savedProfile.country ||
  phoneNum !== savedPhoneNum ||
  (dialCountry?.dial || '') !== savedDialCode;

useEffect(() => {
  fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => {
        setProfile({
  name: data.name || '', email: data.email || '', phone: data.phone || '',
  country: data.country || '', address: data.address || '',
  addressStreet: data.addressStreet || '',
  addressCity: data.addressCity || '',
  addressState: data.addressState || '',
  addressPostalCode: data.addressPostalCode || '',
  avatarUrl: data.avatarUrl || '', createdAt: data.createdAt || '',
  provider: data.provider || 'credentials',
});
       const dbAvatar = data.avatarUrl || '';
setAvatarPreview(dbAvatar);

setSavedProfile({
  name: data.name || '',
  phone: data.phone || '',
  country: data.country || '',
  addressStreet: data.addressStreet || '',
  addressCity: data.addressCity || '',
  addressState: data.addressState || '',
  addressPostalCode: data.addressPostalCode || '',
});

localStorage.setItem('exodus_avatar_url', dbAvatar);
window.dispatchEvent(new Event('storage'));

        // Set selected country
        const found = findCountry(data.country || '');
        if (found) setSelectedCountry(found);

// Use saved dial code if different from country
const dialFound = data.phoneDialCode
  ? COUNTRIES.find(c => c.code === data.phoneDialCode) || found
  : found;
if (dialFound) setDialCountry(dialFound);

// Strip dial code, then strip any area code prefix that's in the pattern
const rawAfterDial = data.phone && dialFound
  ? (data.phone.startsWith(dialFound.dial)
    ? data.phone.slice(dialFound.dial.length).replace(/^\s+/, '')
    : data.phone)
  : (data.phone || '');

// Strip non-digit prefix from pattern (e.g. "(242) " from "(242) ###-####")
const fmt = PHONE_FORMATS[dialFound?.code || ''];
const patternPrefix = fmt?.pattern.replace(/^([^#]*).*/, '$1') || '';
const patternPrefixDigits = patternPrefix.replace(/\D/g, '');

let strippedPhone = rawAfterDial.replace(/\D/g, '');
if (patternPrefixDigits && strippedPhone.startsWith(patternPrefixDigits)) {
  strippedPhone = strippedPhone.slice(patternPrefixDigits.length);
}

setPhoneNum(strippedPhone);
setSavedDialCode(dialFound?.dial || '');
setSavedPhoneNum(strippedPhone);
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleCountryChange = (c: typeof COUNTRIES[0]) => {
  setSelectedCountry(c);
  setDialCountry(c);
  setProfile(p => ({ ...p, country: c.name, addressState: '' }));
  setPhoneNum('');
};

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
    setUploading(true);
    setError('');
    setAvatarPreview(URL.createObjectURL(file));
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/user/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) {
  setAvatarPreview(data.url);
  setProfile(p => ({ ...p, avatarUrl: data.url }));
  localStorage.setItem('exodus_avatar_url', data.url);
  window.dispatchEvent(new Event('storage'));
} else {
        setError(data.error || 'Upload failed');
      }
    } catch { setError('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Get area code digits from pattern prefix
const dialFmt = PHONE_FORMATS[dialCountry?.code || ''];
const prefix = dialFmt?.pattern.replace(/^([^#]*).*/, '$1').replace(/\D/g, '') || '';
const localDigits = phoneNum.replace(/\D/g, '');
const fullPhone = phoneNum ? `${dialCountry?.dial || ''}${prefix}${localDigits}` : '';

const dialCode = dialCountry?.code || selectedCountry?.code || '';
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
  name: profile.name,
  phone: fullPhone,
  country: profile.country,
  phoneDialCode: dialCode,
  addressStreet: profile.addressStreet,
  addressCity: profile.addressCity,
  addressState: profile.addressState,
  addressPostalCode: profile.addressPostalCode,
  address: [profile.addressStreet, profile.addressCity, profile.addressState, profile.addressPostalCode, profile.country]
    .filter(Boolean).join(', '),
}),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Save failed'); return; }

      setSavedProfile({
  name: profile.name, phone: profile.phone, country: profile.country,
  addressStreet: profile.addressStreet, addressCity: profile.addressCity,
  addressState: profile.addressState, addressPostalCode: profile.addressPostalCode,
});
setSavedDialCode(dialCountry?.dial || '');
setSavedPhoneNum(phoneNum);

      setShowSuccess(true);
    } catch { setError('Failed to save changes'); }
    finally { setSaving(false); }
  };

  const handleSendEmailCode = async () => {
  if (!newEmail || !/^\S+@\S+\.\S+$/.test(newEmail)) { setEmailError('Enter a valid email address'); return; }
  setEmailSending(true); setEmailError('');
  try {
    const res = await fetch('/api/user/change-email/send-code', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail }),
    });
    const data = await res.json();
    if (!res.ok) { setEmailError(data.error || 'Failed to send code'); return; }
    setEmailStep('verify');
    setEmailCode('');
    // Start 60 second countdown
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  } catch { setEmailError('Failed to send code'); }
  finally { setEmailSending(false); }
};

  const handleVerifyEmailCode = async () => {
  if (!emailCode) { setEmailError('Enter the verification code'); return; }
  setEmailSending(true); setEmailError('');
  try {
    const res = await fetch('/api/user/change-email/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail, code: emailCode.replace(/\D/g, '') }),
    });
    const data = await res.json();
    if (!res.ok) { setEmailError(data.error || 'Invalid code'); return; }

    // Update session with new email so all subsequent API calls use it
   setSessionRefreshing(true);
await updateSession();
setSessionRefreshing(false);
window.dispatchEvent(new CustomEvent('emailUpdated', { detail: { email: newEmail } }));
setProfile(p => ({ ...p, email: newEmail }));
    setSavedProfile(p => ({ ...p, email: newEmail }));
    setEditingEmail(false);
    setEmailStep('input');
    setEmailCode('');
    setNewEmail('');
    setCountdown(0);
    setShowSuccess(true);
  } catch { setEmailError('Verification failed'); }
  finally { setEmailSending(false); }
};

  const initials = profile.name
    ? profile.name.split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  );

  const statesForCountry = (() => {
  if (!profile.country) return [];
  const entry = COUNTRIES_WITH_STATES.find(c => c.name.toLowerCase() === profile.country.toLowerCase());
  return (entry as any)?.states || [];
})();

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-white/40 transition";
  const labelClass = "text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block";

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="h-24 w-full" style={{ background: accent }} />
        <div className="px-6 pb-6">
          <div className="relative -mt-12 mb-4 inline-block">
            <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-gray-900 overflow-hidden flex items-center justify-center shadow-lg"
              style={{ background: accent }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                : <span className="text-white font-extrabold text-xl">{initials}</span>}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-lg cursor-pointer transition hover:opacity-90"
              style={{ background: accent }}>
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{profile.name || 'Your Name'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>

          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {memberSince && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <Calendar size={12} /> Member since {memberSince}
              </div>
            )}
            {profile.provider === 'google' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">Google Account</span>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Personal Information</h3>

        <div className="space-y-4">

          {/* Name */}
          <div>
            <label className={labelClass}>Full Name</label>
            <div className="relative flex items-center">
  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
              <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                placeholder="Enter your full name" className={inputClass + " pl-10"} style={{ fontSize: '16px' }} />
            </div>
          </div>

          {/* Email */}
<div>
  <label className={labelClass}>Email Address</label>
  <div className="flex items-center gap-2">
    <div className="relative flex-1">
      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input value={profile.email} disabled
        className={inputClass + " pl-10 opacity-60 cursor-not-allowed"}
        style={{ fontSize: '16px' }} />
    </div>
    <button
      onClick={() => { setEditingEmail(true); setNewEmail(''); setEmailStep('input'); setEmailError(''); }}
      className="h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer shrink-0 flex items-center gap-1.5">
      <Pencil size={12} /> Change
    </button>
  </div>
</div>

          {/* Country dropdown */}
          <div>
            <label className={labelClass}>Country</label>
           <CountryDropdown
  value={profile.country}
  onChange={handleCountryChange}
  accentColor={accentSolid}
/>
          </div>

          {/* Phone */}
          <div>
            <label className={labelClass}>Phone Number</label>
            <div className="flex items-center gap-2">
              {/* Dial code badge */}
              {/* Dial code selector */}
<DialCodePicker
  selected={dialCountry}
  onChange={c => { setDialCountry(c); setPhoneNum(''); }}
/>
              <input
  value={dialCountry
  ? applyPattern(phoneNum.replace(/\D/g, ''), getFormat(dialCountry.code).pattern)
  : phoneNum}
  onChange={e => setPhoneNum(e.target.value.replace(/\D/g, ''))}
  placeholder={dialCountry ? getFormat(dialCountry.code).placeholder : '123 456 7890'}
  inputMode="numeric"
  className={inputClass + " flex-1"}
  style={{ fontSize: '16px' }}
/>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Numbers only. Dial code auto-set from your country.</p>
          </div>

          {/* Address — structured */}
<div className="space-y-3">
  <label className={labelClass}>Home Address <span className="text-gray-400 font-normal normal-case">(optional)</span></label>

  {/* Street */}
  <input
    value={profile.addressStreet}
    onChange={e => setProfile(p => ({ ...p, addressStreet: e.target.value }))}
    placeholder="Street address (e.g. 123 Main Street)"
    className={inputClass}
    style={{ fontSize: '16px' }}
  />

  {/* City + Postal */}
  <div className="grid grid-cols-2 gap-3">
    <input
      value={profile.addressCity}
      onChange={e => setProfile(p => ({ ...p, addressCity: e.target.value }))}
      placeholder="City"
      className={inputClass}
      style={{ fontSize: '16px' }}
    />
    <input
      value={profile.addressPostalCode}
      onChange={e => setProfile(p => ({ ...p, addressPostalCode: e.target.value.replace(/\D/g, '') }))}
      placeholder="Postal code"
      inputMode="numeric"
      className={inputClass}
      style={{ fontSize: '16px' }}
    />
  </div>

  {/* State */}
  <StateDropdown
  value={profile.addressState}
  onChange={s => setProfile(p => ({ ...p, addressState: s }))}
  states={statesForCountry}
  accentColor={accentSolid}
/>
</div>
        </div>

        {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}

        <div className="mt-5">
          <button onClick={handleSave} disabled={saving || !profileChanged}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
            style={{ background: accent }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* EMAIL CHANGE MODAL */}
{editingEmail && typeof document !== 'undefined' && createPortal(
  <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={() => {
        setEditingEmail(false);
        setEmailStep('input');
        setEmailError('');
        setEmailCode('');
        setCountdown(0);
      }}
    />
    <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">

      {/* Gradient top bar */}
      <div className="h-1 w-full" style={{ background: accent }} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent }}>
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {emailStep === 'input' ? 'Change Email' : 'Verify Code'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {emailStep === 'input' ? 'Enter your new email address' : `Code sent to ${newEmail}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingEmail(false);
              setEmailStep('input');
              setEmailError('');
              setEmailCode('');
              setCountdown(0);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer text-gray-400">
            <X size={16} />
          </button>
        </div>

        {emailStep === 'input' ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">New Email Address</label>
              <input
                value={newEmail}
                onChange={e => { setNewEmail(e.target.value); setEmailError(''); }}
                placeholder="Enter new email address"
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#0b3aa4] dark:focus:border-blue-400 transition"
                style={{ fontSize: '16px' }}
              />
              {emailError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{emailError}</p>}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              A 6-digit verification code will be sent to your new email address.
            </p>
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => { setEditingEmail(false); setEmailStep('input'); setEmailError(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
                Cancel
              </button>
              <button
                onClick={handleSendEmailCode}
                disabled={emailSending || !newEmail}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                style={{ background: accent }}>
                {emailSending ? <Loader2 size={14} className="animate-spin" /> : null}
                {emailSending ? 'Sending...' : 'Send Code'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Enter the 6-digit code sent to <strong className="text-gray-700 dark:text-gray-200">{newEmail}</strong>
            </p>

            {/* 6 individual code boxes */}
            <div className="flex items-center justify-center gap-2">
              {[0,1,2,3,4,5].map(i => (
                <input
                  key={i}
                  id={`email-code-box-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={emailCode[i] || ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (!val) {
                      const arr = emailCode.split('');
                      arr[i] = '';
                      setEmailCode(arr.join(''));
                      return;
                    }
                    const arr = emailCode.split('');
                    arr[i] = val[val.length - 1];
                    setEmailCode(arr.join(''));
                    setEmailError('');
                    // Move to next box
                    if (i < 5) {
                      const next = document.getElementById(`email-code-box-${i + 1}`);
                      if (next) (next as HTMLInputElement).focus();
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !emailCode[i] && i > 0) {
                      const prev = document.getElementById(`email-code-box-${i - 1}`);
                      if (prev) (prev as HTMLInputElement).focus();
                    }
                  }}
                  onPaste={e => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    setEmailCode(pasted.padEnd(6, '').slice(0, 6));
                    const last = Math.min(pasted.length, 5);
                    const box = document.getElementById(`email-code-box-${last}`);
                    if (box) (box as HTMLInputElement).focus();
                  }}
                  className="w-11 h-13 text-center text-xl font-bold rounded-xl border-2 border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:border-[#0b3aa4] dark:focus:border-blue-400 transition"
                  style={{ fontSize: '20px', height: '52px', width: '44px' }}
                />
              ))}
            </div>

            {emailError && <p className="text-xs text-red-600 dark:text-red-400 font-medium text-center">{emailError}</p>}

            {/* Countdown / Resend */}
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Resend code in <strong className="text-gray-600 dark:text-gray-300">{countdown}s</strong>
                </p>
              ) : (
                <button
                  onClick={handleSendEmailCode}
                  disabled={emailSending}
                  className="text-xs font-semibold cursor-pointer hover:underline disabled:opacity-50"
                  style={{ color: accent.includes('gradient') ? '#0b3aa4' : accent }}>
                  Resend code
                </button>
              )}
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => { setEmailStep('input'); setEmailCode(''); setEmailError(''); setCountdown(0); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
                Back
              </button>
              <button
                onClick={handleVerifyEmailCode}
                disabled={emailSending || emailCode.replace(/\D/g, '').length < 6}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-50"
                style={{ background: accent }}>
                {emailSending ? <Loader2 size={14} className="animate-spin" /> : null}
                {emailSending ? 'Verifying...' : 'Update Email'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>,
  document.body
)}

{sessionRefreshing && typeof document !== 'undefined' && createPortal(
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-gray-950">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Updating email...</p>
    </div>
  </div>,
  document.body
)}

      {/* SUCCESS MODAL */}
{showSuccess && typeof document !== 'undefined' && createPortal(
  <div className="fixed inset-0 z-[9999] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSuccess(false)} />
    <div className="relative w-[92%] max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-white/10 p-6">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: accent }}>
        <CheckCircle2 className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">Profile Updated</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">Your profile has been saved successfully.</p>
      <div className="mt-6">
        <button
          onClick={() => setShowSuccess(false)}
          className="w-full py-2.5 rounded-xl text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition"
          style={{ background: accent }}>
          Done
        </button>
      </div>
    </div>
  </div>,
  document.body
)}
    </div>
  );
}