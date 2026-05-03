'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, AlertCircle, CheckCircle2, Check,
  User, Mail, Globe, Package, Zap, MapPin, Rocket, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import PasswordInput from '@/components/PasswordInput';

const COUNTRIES = [
  { name: 'Afghanistan', code: 'AF', dial: '+93' },
  { name: 'Albania', code: 'AL', dial: '+355' },
  { name: 'Algeria', code: 'DZ', dial: '+213' },
  { name: 'Andorra', code: 'AD', dial: '+376' },
  { name: 'Angola', code: 'AO', dial: '+244' },
  { name: 'Antigua and Barbuda', code: 'AG', dial: '+1' },
  { name: 'Argentina', code: 'AR', dial: '+54' },
  { name: 'Armenia', code: 'AM', dial: '+374' },
  { name: 'Australia', code: 'AU', dial: '+61' },
  { name: 'Austria', code: 'AT', dial: '+43' },
  { name: 'Azerbaijan', code: 'AZ', dial: '+994' },
  { name: 'Bahamas', code: 'BS', dial: '+1' },
  { name: 'Bahrain', code: 'BH', dial: '+973' },
  { name: 'Bangladesh', code: 'BD', dial: '+880' },
  { name: 'Barbados', code: 'BB', dial: '+1' },
  { name: 'Belarus', code: 'BY', dial: '+375' },
  { name: 'Belgium', code: 'BE', dial: '+32' },
  { name: 'Belize', code: 'BZ', dial: '+501' },
  { name: 'Benin', code: 'BJ', dial: '+229' },
  { name: 'Bhutan', code: 'BT', dial: '+975' },
  { name: 'Bolivia', code: 'BO', dial: '+591' },
  { name: 'Bosnia and Herzegovina', code: 'BA', dial: '+387' },
  { name: 'Botswana', code: 'BW', dial: '+267' },
  { name: 'Brazil', code: 'BR', dial: '+55' },
  { name: 'Brunei', code: 'BN', dial: '+673' },
  { name: 'Bulgaria', code: 'BG', dial: '+359' },
  { name: 'Burkina Faso', code: 'BF', dial: '+226' },
  { name: 'Burundi', code: 'BI', dial: '+257' },
  { name: 'Cabo Verde', code: 'CV', dial: '+238' },
  { name: 'Cambodia', code: 'KH', dial: '+855' },
  { name: 'Cameroon', code: 'CM', dial: '+237' },
  { name: 'Canada', code: 'CA', dial: '+1' },
  { name: 'Central African Republic', code: 'CF', dial: '+236' },
  { name: 'Chad', code: 'TD', dial: '+235' },
  { name: 'Chile', code: 'CL', dial: '+56' },
  { name: 'China', code: 'CN', dial: '+86' },
  { name: 'Colombia', code: 'CO', dial: '+57' },
  { name: 'Comoros', code: 'KM', dial: '+269' },
  { name: 'Congo (DRC)', code: 'CD', dial: '+243' },
  { name: 'Congo (Republic)', code: 'CG', dial: '+242' },
  { name: 'Costa Rica', code: 'CR', dial: '+506' },
  { name: 'Croatia', code: 'HR', dial: '+385' },
  { name: 'Cuba', code: 'CU', dial: '+53' },
  { name: 'Cyprus', code: 'CY', dial: '+357' },
  { name: 'Czech Republic', code: 'CZ', dial: '+420' },
  { name: 'Denmark', code: 'DK', dial: '+45' },
  { name: 'Djibouti', code: 'DJ', dial: '+253' },
  { name: 'Dominica', code: 'DM', dial: '+1' },
  { name: 'Dominican Republic', code: 'DO', dial: '+1' },
  { name: 'Ecuador', code: 'EC', dial: '+593' },
  { name: 'Egypt', code: 'EG', dial: '+20' },
  { name: 'El Salvador', code: 'SV', dial: '+503' },
  { name: 'Equatorial Guinea', code: 'GQ', dial: '+240' },
  { name: 'Eritrea', code: 'ER', dial: '+291' },
  { name: 'Estonia', code: 'EE', dial: '+372' },
  { name: 'Eswatini', code: 'SZ', dial: '+268' },
  { name: 'Ethiopia', code: 'ET', dial: '+251' },
  { name: 'Fiji', code: 'FJ', dial: '+679' },
  { name: 'Finland', code: 'FI', dial: '+358' },
  { name: 'France', code: 'FR', dial: '+33' },
  { name: 'Gabon', code: 'GA', dial: '+241' },
  { name: 'Gambia', code: 'GM', dial: '+220' },
  { name: 'Georgia', code: 'GE', dial: '+995' },
  { name: 'Germany', code: 'DE', dial: '+49' },
  { name: 'Ghana', code: 'GH', dial: '+233' },
  { name: 'Greece', code: 'GR', dial: '+30' },
  { name: 'Grenada', code: 'GD', dial: '+1' },
  { name: 'Guatemala', code: 'GT', dial: '+502' },
  { name: 'Guinea', code: 'GN', dial: '+224' },
  { name: 'Guinea-Bissau', code: 'GW', dial: '+245' },
  { name: 'Guyana', code: 'GY', dial: '+592' },
  { name: 'Haiti', code: 'HT', dial: '+509' },
  { name: 'Honduras', code: 'HN', dial: '+504' },
  { name: 'Hungary', code: 'HU', dial: '+36' },
  { name: 'Iceland', code: 'IS', dial: '+354' },
  { name: 'India', code: 'IN', dial: '+91' },
  { name: 'Indonesia', code: 'ID', dial: '+62' },
  { name: 'Iran', code: 'IR', dial: '+98' },
  { name: 'Iraq', code: 'IQ', dial: '+964' },
  { name: 'Ireland', code: 'IE', dial: '+353' },
  { name: 'Israel', code: 'IL', dial: '+972' },
  { name: 'Italy', code: 'IT', dial: '+39' },
  { name: 'Jamaica', code: 'JM', dial: '+1' },
  { name: 'Japan', code: 'JP', dial: '+81' },
  { name: 'Jordan', code: 'JO', dial: '+962' },
  { name: 'Kazakhstan', code: 'KZ', dial: '+7' },
  { name: 'Kenya', code: 'KE', dial: '+254' },
  { name: 'Kiribati', code: 'KI', dial: '+686' },
  { name: 'Kuwait', code: 'KW', dial: '+965' },
  { name: 'Kyrgyzstan', code: 'KG', dial: '+996' },
  { name: 'Laos', code: 'LA', dial: '+856' },
  { name: 'Latvia', code: 'LV', dial: '+371' },
  { name: 'Lebanon', code: 'LB', dial: '+961' },
  { name: 'Lesotho', code: 'LS', dial: '+266' },
  { name: 'Liberia', code: 'LR', dial: '+231' },
  { name: 'Libya', code: 'LY', dial: '+218' },
  { name: 'Liechtenstein', code: 'LI', dial: '+423' },
  { name: 'Lithuania', code: 'LT', dial: '+370' },
  { name: 'Luxembourg', code: 'LU', dial: '+352' },
  { name: 'Madagascar', code: 'MG', dial: '+261' },
  { name: 'Malawi', code: 'MW', dial: '+265' },
  { name: 'Malaysia', code: 'MY', dial: '+60' },
  { name: 'Maldives', code: 'MV', dial: '+960' },
  { name: 'Mali', code: 'ML', dial: '+223' },
  { name: 'Malta', code: 'MT', dial: '+356' },
  { name: 'Marshall Islands', code: 'MH', dial: '+692' },
  { name: 'Mauritania', code: 'MR', dial: '+222' },
  { name: 'Mauritius', code: 'MU', dial: '+230' },
  { name: 'Mexico', code: 'MX', dial: '+52' },
  { name: 'Micronesia', code: 'FM', dial: '+691' },
  { name: 'Moldova', code: 'MD', dial: '+373' },
  { name: 'Monaco', code: 'MC', dial: '+377' },
  { name: 'Mongolia', code: 'MN', dial: '+976' },
  { name: 'Montenegro', code: 'ME', dial: '+382' },
  { name: 'Morocco', code: 'MA', dial: '+212' },
  { name: 'Mozambique', code: 'MZ', dial: '+258' },
  { name: 'Myanmar', code: 'MM', dial: '+95' },
  { name: 'Namibia', code: 'NA', dial: '+264' },
  { name: 'Nauru', code: 'NR', dial: '+674' },
  { name: 'Nepal', code: 'NP', dial: '+977' },
  { name: 'Netherlands', code: 'NL', dial: '+31' },
  { name: 'New Zealand', code: 'NZ', dial: '+64' },
  { name: 'Nicaragua', code: 'NI', dial: '+505' },
  { name: 'Niger', code: 'NE', dial: '+227' },
  { name: 'Nigeria', code: 'NG', dial: '+234' },
  { name: 'North Korea', code: 'KP', dial: '+850' },
  { name: 'North Macedonia', code: 'MK', dial: '+389' },
  { name: 'Norway', code: 'NO', dial: '+47' },
  { name: 'Oman', code: 'OM', dial: '+968' },
  { name: 'Pakistan', code: 'PK', dial: '+92' },
  { name: 'Palau', code: 'PW', dial: '+680' },
  { name: 'Palestine', code: 'PS', dial: '+970' },
  { name: 'Panama', code: 'PA', dial: '+507' },
  { name: 'Papua New Guinea', code: 'PG', dial: '+675' },
  { name: 'Paraguay', code: 'PY', dial: '+595' },
  { name: 'Peru', code: 'PE', dial: '+51' },
  { name: 'Philippines', code: 'PH', dial: '+63' },
  { name: 'Poland', code: 'PL', dial: '+48' },
  { name: 'Portugal', code: 'PT', dial: '+351' },
  { name: 'Qatar', code: 'QA', dial: '+974' },
  { name: 'Romania', code: 'RO', dial: '+40' },
  { name: 'Russia', code: 'RU', dial: '+7' },
  { name: 'Rwanda', code: 'RW', dial: '+250' },
  { name: 'Saint Kitts and Nevis', code: 'KN', dial: '+1' },
  { name: 'Saint Lucia', code: 'LC', dial: '+1' },
  { name: 'Saint Vincent and the Grenadines', code: 'VC', dial: '+1' },
  { name: 'Samoa', code: 'WS', dial: '+685' },
  { name: 'San Marino', code: 'SM', dial: '+378' },
  { name: 'Sao Tome and Principe', code: 'ST', dial: '+239' },
  { name: 'Saudi Arabia', code: 'SA', dial: '+966' },
  { name: 'Senegal', code: 'SN', dial: '+221' },
  { name: 'Serbia', code: 'RS', dial: '+381' },
  { name: 'Seychelles', code: 'SC', dial: '+248' },
  { name: 'Sierra Leone', code: 'SL', dial: '+232' },
  { name: 'Singapore', code: 'SG', dial: '+65' },
  { name: 'Slovakia', code: 'SK', dial: '+421' },
  { name: 'Slovenia', code: 'SI', dial: '+386' },
  { name: 'Solomon Islands', code: 'SB', dial: '+677' },
  { name: 'Somalia', code: 'SO', dial: '+252' },
  { name: 'South Africa', code: 'ZA', dial: '+27' },
  { name: 'South Korea', code: 'KR', dial: '+82' },
  { name: 'South Sudan', code: 'SS', dial: '+211' },
  { name: 'Spain', code: 'ES', dial: '+34' },
  { name: 'Sri Lanka', code: 'LK', dial: '+94' },
  { name: 'Sudan', code: 'SD', dial: '+249' },
  { name: 'Suriname', code: 'SR', dial: '+597' },
  { name: 'Sweden', code: 'SE', dial: '+46' },
  { name: 'Switzerland', code: 'CH', dial: '+41' },
  { name: 'Syria', code: 'SY', dial: '+963' },
  { name: 'Taiwan', code: 'TW', dial: '+886' },
  { name: 'Tajikistan', code: 'TJ', dial: '+992' },
  { name: 'Tanzania', code: 'TZ', dial: '+255' },
  { name: 'Thailand', code: 'TH', dial: '+66' },
  { name: 'Timor-Leste', code: 'TL', dial: '+670' },
  { name: 'Togo', code: 'TG', dial: '+228' },
  { name: 'Tonga', code: 'TO', dial: '+676' },
  { name: 'Trinidad and Tobago', code: 'TT', dial: '+1' },
  { name: 'Tunisia', code: 'TN', dial: '+216' },
  { name: 'Turkey', code: 'TR', dial: '+90' },
  { name: 'Turkmenistan', code: 'TM', dial: '+993' },
  { name: 'Tuvalu', code: 'TV', dial: '+688' },
  { name: 'Uganda', code: 'UG', dial: '+256' },
  { name: 'Ukraine', code: 'UA', dial: '+380' },
  { name: 'United Arab Emirates', code: 'AE', dial: '+971' },
  { name: 'United Kingdom', code: 'GB', dial: '+44' },
  { name: 'United States', code: 'US', dial: '+1' },
  { name: 'Uruguay', code: 'UY', dial: '+598' },
  { name: 'Uzbekistan', code: 'UZ', dial: '+998' },
  { name: 'Vanuatu', code: 'VU', dial: '+678' },
  { name: 'Vatican City', code: 'VA', dial: '+379' },
  { name: 'Venezuela', code: 'VE', dial: '+58' },
  { name: 'Vietnam', code: 'VN', dial: '+84' },
  { name: 'Yemen', code: 'YE', dial: '+967' },
  { name: 'Zambia', code: 'ZM', dial: '+260' },
  { name: 'Zimbabwe', code: 'ZW', dial: '+263' },
];

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

// ─── Country Dropdown ────────────────────────────────────
function CountryDropdown({
  value, onChange, hasError,
}: {
  value: string;
  onChange: (c: typeof COUNTRIES[0]) => void;
  hasError: boolean;
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
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className={`w-full h-12 flex items-center gap-2.5 px-3.5 rounded-xl border bg-white text-sm transition cursor-pointer text-left ${
          hasError ? 'border-red-400' : open ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-gray-200 hover:border-blue-300'
        }`}>
        {selected ? (
          <>
            <img
              src={`https://flagcdn.com/w20/${selected.code.toLowerCase()}.png`}
              width="20" height="15"
              alt={selected.name}
              className="shrink-0 rounded-sm object-cover"
              style={{ minWidth: 20 }}
            />
            <span className="flex-1 truncate text-gray-900">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-gray-400">Select country</span>
        )}
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search country..."
              className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none"
              style={{ fontSize: '16px' }}
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">No countries found</li>
            ) : filtered.map(c => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition cursor-pointer ${selected?.code === c.code ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50'}`}>
                  <img
                    src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`}
                    width="20" height="15"
                    alt={c.name}
                    className="shrink-0 rounded-sm object-cover"
                    style={{ minWidth: 20 }}
                  />
                  <span className="flex-1 truncate text-gray-900">{c.name}</span>
                  <span className="text-gray-400 text-xs shrink-0">{c.dial}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Dial Code Picker ─────────────────────────────────────
function DialCodePicker({
  selected, onChange,
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
        className="h-12 px-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-1.5 cursor-pointer hover:border-gray-300 transition"
        style={{ minWidth: 90 }}>
        {selected && (
          <img
            src={`https://flagcdn.com/w20/${selected.code.toLowerCase()}.png`}
            width="18" height="13"
            alt={selected.name}
            className="rounded-sm object-cover shrink-0"
          />
        )}
        <span className="text-sm font-bold text-gray-700">
          {selected?.dial || '+?'}
        </span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden w-64">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search country..."
              className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none"
              style={{ fontSize: '16px' }}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.map(c => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left hover:bg-gray-50 transition cursor-pointer">
                  <img
                    src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`}
                    width="18" height="13"
                    alt={c.name}
                    className="rounded-sm object-cover shrink-0"
                  />
                  <span className="text-gray-900 font-semibold">{c.dial}</span>
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

// ─── Smart Phone Input (with fixed-prefix support) ───────
function SignUpPhoneInput({ countryCode, value, onChange, hasError }: {
  countryCode: string;
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  const fmt = PHONE_FORMATS[countryCode] || { placeholder: '123 456 7890', pattern: '### ### ####' };
  const pattern = fmt.pattern;

  const prefixMatch = pattern.match(/^([^#]*)/);
  const rawPrefix = prefixMatch ? prefixMatch[1] : '';
  const prefixDigits = rawPrefix.replace(/\D/g, '');
  const fixedPrefix = prefixDigits.length > 0 ? rawPrefix : '';
  const dynamicPattern = pattern.slice(fixedPrefix.length);
  const dynamicPlaceholder = fmt.placeholder.slice(fixedPrefix.length);

  const digits = value.replace(/\D/g, '');
  const formatted = applyPattern(digits, dynamicPattern);
  const prefixPx = fixedPrefix.length * 8 + 12;

  return (
    <div className="relative flex-1">
      {fixedPrefix && (
  <div
    className="absolute inset-y-0 left-0 flex items-center pointer-events-none select-none z-10"
    style={{ paddingLeft: '16px' }}>
    <span style={{ fontSize: '16px', color: 'inherit', lineHeight: 1 }} className="text-gray-900 dark:text-white">
      {fixedPrefix}
    </span>
  </div>
)}
      <input
        value={formatted}
        onChange={e => {
          const raw = e.target.value.replace(/\D/g, '');
          onChange(raw);
        }}
        onKeyDown={e => {
          if (e.key === 'Backspace' && digits.length === 0) e.preventDefault();
        }}
        placeholder={dynamicPlaceholder}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        className={`w-full h-12 rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all duration-200 text-gray-900 placeholder:text-gray-400 ${
          hasError ? 'border-red-400 focus:ring-red-400/20' : 'border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/15'
        }`}
        style={{
          fontSize: '16px',
          paddingLeft: fixedPrefix ? `${prefixPx}px` : '16px',
          paddingRight: '16px',
        }}
      />
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
    { label: 'Special character', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const barColor = score <= 1 ? 'bg-red-400' : score === 2 ? 'bg-amber-400' : score === 3 ? 'bg-blue-400' : 'bg-emerald-500';
  const label = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];
  const labelColor = ['', 'text-red-500', 'text-amber-600', 'text-blue-600', 'text-emerald-600'][score];
  if (!password) return null;
  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? barColor : 'bg-gray-200'}`} />
        ))}
        {label && <span className={`text-xs font-bold ml-1 ${labelColor}`}>{label}</span>}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map(({ label, pass }) => (
          <span key={label} className={`text-[11px] flex items-center gap-1 font-medium transition ${pass ? 'text-emerald-600' : 'text-gray-400'}`}>
            <Check className="w-3 h-3" />{label}
          </span>
        ))}
      </div>
    </div>
  );
}

function CustomCheckbox({ checked, onChange, error }: { checked: boolean; onChange: () => void; error?: boolean }) {
  return (
    <div onClick={onChange} className="cursor-pointer w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 mt-0.5"
      style={{ backgroundColor: checked ? '#2563eb' : '#ffffff', borderColor: error ? '#f87171' : checked ? '#2563eb' : '#d1d5db' }}>
      {checked && (
        <svg className="w-3 h-3 text-white" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

function SignUpContent() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<typeof COUNTRIES[0] | null>(null);
  const [dialCountry, setDialCountry] = useState<typeof COUNTRIES[0] | null>(null);

  const [agreed, setAgreed] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [navOpen, setNavOpen] = useState(false);

  const navItems = [
    { name: 'Home', href: `/${locale}` },
    { name: 'About', href: `/${locale}/about` },
    { name: 'Services', href: `/${locale}/services` },
    { name: 'Contact', href: `/${locale}/contact` },
    { name: 'Get Started', href: `/${locale}/sign-up` },
  ];

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  // Auto-detect user country from IP
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        const found = COUNTRIES.find(c => c.code === data.country_code || c.name === data.country_name);
        if (found) {
          setCountry(found.name);
          setSelectedCountry(found);
          setDialCountry(found);
          setPhone('');
        }
      }).catch(() => {});
  }, []);

  const inputCls = (hasError: boolean) =>
    `w-full h-12 px-4 rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all duration-200 text-gray-900 placeholder:text-gray-400 ${
      hasError ? 'border-red-400 focus:ring-red-400/20' : 'border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/15'
    }`;

  const handleCountryChange = (c: typeof COUNTRIES[0]) => {
    setCountry(c.name);
    setSelectedCountry(c);
    setDialCountry(c);
    setPhone('');
    setErrors(p => ({ ...p, country: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Full name is required.';
    if (!email.trim()) e.email = 'Email address is required.';
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Please enter a valid email address.';
    if (!country.trim()) e.country = 'Please select your country.';
    if (!phone.trim()) e.phone = 'Phone number is required.';
    if (!password) e.password = 'Password is required.';
    else if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) e.password = 'Password must meet all requirements above.';
    if (!confirm) e.confirm = 'Please confirm your password.';
    else if (confirm !== password) e.confirm = 'Passwords do not match.';
    if (!agreed) e.agreed = 'You must accept our Terms of Service and Privacy Policy to create an account.';
    return e;
  };

  const scrollToFirstError = (errs: Record<string, string>) => {
    const fieldOrder = ['name', 'email', 'country', 'phone', 'password', 'confirm', 'agreed'];
    for (const field of fieldOrder) {
      if (errs[field]) {
        const el = document.getElementById(`input-${field}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const input = el.querySelector('input, select, button') as HTMLElement;
          if (input) input.focus();
        }
        break;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setTimeout(() => scrollToFirstError(errs), 50);
      return;
    }

    // Build full phone: dial code + (digits only of phone, including any fixed-prefix area code)
    const fmt = PHONE_FORMATS[dialCountry?.code || ''];
    const patternPrefix = fmt?.pattern.replace(/^([^#]*).*/, '$1') || '';
    const patternPrefixDigits = patternPrefix.replace(/\D/g, '');
    const phoneDigits = phone.replace(/\D/g, '');
    const fullLocal = patternPrefixDigits + phoneDigits;
    const fullPhone = `${dialCountry?.dial || ''}${fullLocal}`;

    const submitEmail = email.trim().toLowerCase();
    const submitPassword = password;
    const submitName = name.trim();

    setIsSubmitting(true);
    try {
      const body = {
        name: submitName,
        email: submitEmail,
        password: submitPassword,
        phone: fullPhone,
        country,
        accountType: 'individual',
        emailUpdates,
      };
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setGeneralError(json?.error || 'Registration failed. Please try again.');
        setTimeout(() => {
          const el = document.getElementById('general-error');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        return;
      }
      sessionStorage.setItem('exodus_reg_password', submitPassword);
      router.push(`/${locale}/verify-email?email=${encodeURIComponent(submitEmail)}&locale=${locale}`);
    } catch {
      setGeneralError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @media (min-width: 1024px) {
          header, nav[role="navigation"] { display: none !important; }
        }
        html { overscroll-behavior-x: none; }
      `}</style>
      <div className="flex min-h-screen">

        {/* ── LEFT PANEL ── */}
        <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] relative flex-col justify-start gap-10 p-12 xl:p-16 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 50%, #0891b2 100%)' }}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)' }} />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.3) 0%, transparent 70%)' }} />
            <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            <div className="absolute top-1/3 right-8 w-2 h-2 rounded-full bg-orange-400 opacity-60" />
            <div className="absolute top-1/2 right-24 w-1.5 h-1.5 rounded-full bg-cyan-300 opacity-50" />
            <div className="absolute top-2/3 right-16 w-1 h-1 rounded-full bg-white opacity-40" />
          </div>

          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10">
            <Link href={`/${locale}`} className="cursor-pointer">
              <Image src="/logo.svg" alt="Exodus Logistics" width={180} height={54} className="h-12 w-auto" priority />
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
              <Rocket className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-bold text-white/90 tracking-widest uppercase">Get Started Today</span>
            </div>
            <div>
              <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.15] tracking-tight">
                You're one step away from smarter shipping.<br />
                <span style={{ background: 'linear-gradient(90deg, #67e8f9, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Track. Ship. Deliver.
                </span>
              </h2>
              <p className="mt-4 text-white/60 text-base leading-relaxed max-w-sm">
                Complete your profile and gain instant access to real-time tracking, automated invoicing, and our global logistics network.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { icon: MapPin, title: 'Real-time Tracking', desc: 'Know where your shipment is at all times' },
                { icon: Package, title: 'Automated Invoicing', desc: 'Invoices generated and sent automatically' },
                { icon: Globe, title: 'Global Network', desc: 'Partners in 120+ countries worldwide' },
              ].map(({ icon: Icon, title, desc }, i) => (
                <motion.div key={title} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{title}</p>
                    <p className="text-xs text-white/50">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[{ value: '< 2min', label: 'Setup time' }, { value: 'Free', label: 'To start' }, { value: '24/7', label: 'Support' }].map(({ value, label }, i) => (
                <motion.div key={label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm">
                  <p className="text-xl font-extrabold text-white">{value}</p>
                  <p className="text-[11px] text-white/50 mt-0.5 font-semibold tracking-wide">{label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="relative z-10 mt-auto">
            <p className="text-xs text-white/30">© {new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved.</p>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-10 relative"
          style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 40%, #fff7ed 100%)' }}>

          <div className="hidden lg:block absolute top-6 right-6 z-20">
            <button
              onClick={() => setNavOpen(v => !v)}
              className="cursor-pointer w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-110"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>

          <AnimatePresence>
            {navOpen && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  className="hidden lg:block fixed inset-0 bg-black/30 z-40" onClick={() => setNavOpen(false)} />
                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.28, ease: 'easeInOut' }}
                  className="hidden lg:flex fixed top-0 right-0 h-full w-72 z-50 flex-col shadow-2xl"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                  <div className="flex items-center justify-between px-6 py-6 border-b border-white/20">
                    <Link href={`/${locale}`} onClick={() => setNavOpen(false)}>
                      <Image src="/logo.svg" alt="Exodus Logistics" width={140} height={42} className="h-9 w-auto" />
                    </Link>
                    <button onClick={() => setNavOpen(false)}
                      className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-all duration-200 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
                    {navItems.map((item, i) => (
                      <motion.div key={item.name} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: i * 0.05 }}>
                        <Link href={item.href} onClick={() => setNavOpen(false)}
                          className={`flex items-center px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                            item.name === 'Get Started'
                              ? 'bg-orange-500 text-white hover:bg-orange-600 mt-4'
                              : 'text-white/80 hover:text-white hover:bg-white/15'
                          }`}>
                          {item.name}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                  <div className="px-6 py-5 border-t border-white/20">
                    <p className="text-xs text-white/40">© {new Date().getFullYear()} Exodus Logistics Ltd.</p>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.04) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.04) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }} className="w-full max-w-[440px] relative z-10">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/80 p-8 sm:p-10" style={{ touchAction: 'pan-y' }}>

              <div className="mb-5">
                <div className="w-11 h-11 rounded-2xl mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                  <User className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Create your account</h1>
                <p className="mt-1 text-sm text-gray-500">Fill in your information to get started.</p>
              </div>

              {generalError && (
                <div id="general-error" className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />{generalError}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                  <input id="input-name" value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                    placeholder="Full Name" autoComplete="name" style={{ fontSize: '16px' }} className={inputCls(!!errors.name)} />
                  {errors.name && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <input id="input-email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                    type="email" placeholder="Email Address" autoComplete="email" style={{ fontSize: '16px' }} className={inputCls(!!errors.email)} />
                  {errors.email && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
                </div>

                <div id="input-country">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country</label>
                  <CountryDropdown value={country} onChange={handleCountryChange} hasError={!!errors.country} />
                  {errors.country && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.country}</p>}
                </div>

                <div id="input-phone">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                  <div className="flex items-center gap-2">
                    <DialCodePicker
                      selected={dialCountry}
                      onChange={c => { setDialCountry(c); setPhone(''); }}
                    />
                    <SignUpPhoneInput
                      countryCode={dialCountry?.code || ''}
                      value={phone}
                      onChange={v => { setPhone(v); setErrors(p => ({ ...p, phone: '' })); }}
                      hasError={!!errors.phone}
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>}
                 {dialCountry?.code === selectedCountry?.code && (
  <p className="text-[11px] text-gray-400 mt-1">Numbers only. Dial code auto-set from your country.</p>
)}
                </div>

                <div id="input-password">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <PasswordInput
                    value={password}
                    onChange={v => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }}
                    placeholder="Create a Strong Password"
                    autoComplete="new-password"
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>
                  )}
                  <PasswordStrength password={password} />
                </div>

                <div id="input-confirm">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                  <PasswordInput
                    value={confirm}
                    onChange={v => { setConfirm(v); setErrors(p => ({ ...p, confirm: '' })); }}
                    placeholder="Re-enter Your Password"
                    autoComplete="new-password"
                  />
                  {errors.confirm && (
                    <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.confirm}</p>
                  )}
                  {confirm && confirm === password && !errors.confirm && (
                    <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Passwords match</p>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <CustomCheckbox checked={emailUpdates} onChange={() => setEmailUpdates(v => !v)} />
                      <span className="text-sm text-gray-600 leading-relaxed cursor-pointer" onClick={() => setEmailUpdates(v => !v)}>
                        Keep me updated with shipment alerts, platform news, and exclusive offers from Exodus Logistics.
                      </span>
                    </div>
                  </div>
                  <div id="input-agreed" className={`rounded-xl border p-4 transition-all duration-200 ${errors.agreed ? 'border-red-300 bg-red-50/60' : 'border-gray-200 bg-gray-50/80'}`}>
                    <div className="flex items-start gap-3">
                      <CustomCheckbox checked={agreed} onChange={() => { setAgreed(v => !v); setErrors(p => ({ ...p, agreed: '' })); }} error={!!errors.agreed} />
                      <span className="text-sm text-gray-600 leading-relaxed cursor-pointer" onClick={() => { setAgreed(v => !v); setErrors(p => ({ ...p, agreed: '' })); }}>
                        I have read, understood, and agree to be bound by the{' '}
                        <Link href={`/${locale}/terms`} target="_blank" onClick={e => e.stopPropagation()} className="cursor-pointer font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 transition">Terms of Service</Link>{' '}
                        and{' '}
                        <Link href={`/${locale}/privacy`} target="_blank" onClick={e => e.stopPropagation()} className="cursor-pointer font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 transition">Privacy Policy</Link>{' '}
                        of Exodus Logistics Ltd.
                      </span>
                    </div>
                    {errors.agreed && <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1 pl-8"><AlertCircle className="w-3 h-3 shrink-0" />{errors.agreed}</p>}
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="cursor-pointer w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Creating Account...</span></> : <><span>Create Account</span></>}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link href={`/${locale}/sign-in`} className="cursor-pointer font-bold text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 transition">Sign in</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}