'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, AlertCircle, CheckCircle2, Check,
  ArrowRight, ArrowLeft, User, Building2, Mail, Shield,
  Globe, Package, Zap, MapPin, Lock, Rocket, Star,
} from 'lucide-react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);
const COUNTRIES = [
  { name: 'Afghanistan', code: 'AF', flag: '🇦🇫', dial: '+93' },
  { name: 'Albania', code: 'AL', flag: '🇦🇱', dial: '+355' },
  { name: 'Algeria', code: 'DZ', flag: '🇩🇿', dial: '+213' },
  { name: 'Andorra', code: 'AD', flag: '🇦🇩', dial: '+376' },
  { name: 'Angola', code: 'AO', flag: '🇦🇴', dial: '+244' },
  { name: 'Antigua and Barbuda', code: 'AG', flag: '🇦🇬', dial: '+1-268' },
  { name: 'Argentina', code: 'AR', flag: '🇦🇷', dial: '+54' },
  { name: 'Armenia', code: 'AM', flag: '🇦🇲', dial: '+374' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', dial: '+61' },
  { name: 'Austria', code: 'AT', flag: '🇦🇹', dial: '+43' },
  { name: 'Azerbaijan', code: 'AZ', flag: '🇦🇿', dial: '+994' },
  { name: 'Bahamas', code: 'BS', flag: '🇧🇸', dial: '+1-242' },
  { name: 'Bahrain', code: 'BH', flag: '🇧🇭', dial: '+973' },
  { name: 'Bangladesh', code: 'BD', flag: '🇧🇩', dial: '+880' },
  { name: 'Barbados', code: 'BB', flag: '🇧🇧', dial: '+1-246' },
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
  { name: 'Dominica', code: 'DM', flag: '🇩🇲', dial: '+1-767' },
  { name: 'Dominican Republic', code: 'DO', flag: '🇩🇴', dial: '+1-809' },
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
  { name: 'Grenada', code: 'GD', flag: '🇬🇩', dial: '+1-473' },
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
  { name: 'Jamaica', code: 'JM', flag: '🇯🇲', dial: '+1-876' },
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
  { name: 'Saint Kitts and Nevis', code: 'KN', flag: '🇰🇳', dial: '+1-869' },
  { name: 'Saint Lucia', code: 'LC', flag: '🇱🇨', dial: '+1-758' },
  { name: 'Saint Vincent and the Grenadines', code: 'VC', flag: '🇻🇨', dial: '+1-784' },
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
  { name: 'Trinidad and Tobago', code: 'TT', flag: '🇹🇹', dial: '+1-868' },
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

// Pattern: # = digit, everything else is literal (auto-inserted)
// Placeholder shows the LOCAL part only (after the dial code)
const PHONE_FORMATS: Record<string, { placeholder: string; pattern: string }> = {
  // North America
  US: { placeholder: '(201) 555-0123', pattern: '(###) ###-####' },
  CA: { placeholder: '(416) 555-0123', pattern: '(###) ###-####' },
  MX: { placeholder: '55 1234 5678', pattern: '## #### ####' },

  // Europe
  GB: { placeholder: '7400 123456', pattern: '#### ######' },
  DE: { placeholder: '1511 2345678', pattern: '#### #######' },
  FR: { placeholder: '06 12 34 56 78', pattern: '## ## ## ## ##' },
  IT: { placeholder: '312 345 6789', pattern: '### ### ####' },
  ES: { placeholder: '612 345 678', pattern: '### ### ###' },
  PT: { placeholder: '912 345 678', pattern: '### ### ###' },
  NL: { placeholder: '06 12345678', pattern: '## ########' },
  BE: { placeholder: '0472 12 34 56', pattern: '#### ## ## ##' },
  SE: { placeholder: '070 123 45 67', pattern: '### ### ## ##' },
  NO: { placeholder: '412 34 567', pattern: '### ## ###' },
  DK: { placeholder: '20 12 34 56', pattern: '## ## ## ##' },
  FI: { placeholder: '041 2345678', pattern: '### #######' },
  IE: { placeholder: '087 123 4567', pattern: '### ### ####' },
  AT: { placeholder: '0664 1234567', pattern: '#### #######' },
  CH: { placeholder: '076 123 45 67', pattern: '### ### ## ##' },
  PL: { placeholder: '512 345 678', pattern: '### ### ###' },
  CZ: { placeholder: '601 123 456', pattern: '### ### ###' },
  SK: { placeholder: '0912 123 456', pattern: '#### ### ###' },
  HU: { placeholder: '06 20 123 4567', pattern: '## ## ### ####' },
  RO: { placeholder: '0712 345 678', pattern: '#### ### ###' },
  BG: { placeholder: '087 123 4567', pattern: '### ### ####' },
  HR: { placeholder: '091 234 5678', pattern: '### ### ####' },
  RS: { placeholder: '060 1234567', pattern: '### #######' },
  GR: { placeholder: '694 123 4567', pattern: '### ### ####' },
  UA: { placeholder: '050 123 4567', pattern: '### ### ####' },
  RU: { placeholder: '912 345-67-89', pattern: '### ###-##-##' },
  BY: { placeholder: '029 123-45-67', pattern: '### ###-##-##' },
  MD: { placeholder: '0621 12 345', pattern: '#### ## ###' },
  LT: { placeholder: '612 34567', pattern: '### #####' },
  LV: { placeholder: '2123 4567', pattern: '#### ####' },
  EE: { placeholder: '5123 4567', pattern: '#### ####' },
  AL: { placeholder: '066 123 4567', pattern: '### ### ####' },
  ME: { placeholder: '067 123 456', pattern: '### ### ###' },
  MK: { placeholder: '072 123 456', pattern: '### ### ###' },
  BA: { placeholder: '061 123 456', pattern: '### ### ###' },
  SI: { placeholder: '040 123 456', pattern: '### ### ###' },
  LU: { placeholder: '628 123 456', pattern: '### ### ###' },
  MT: { placeholder: '9961 2345', pattern: '#### ####' },
  CY: { placeholder: '96 123456', pattern: '## ######' },
  IS: { placeholder: '611 1234', pattern: '### ####' },
  LI: { placeholder: '660 1234', pattern: '### ####' },
  MC: { placeholder: '06 12 34 56 78', pattern: '## ## ## ## ##' },
  SM: { placeholder: '66 66 12 34', pattern: '## ## ## ##' },
  AD: { placeholder: '312 345', pattern: '### ###' },
  VA: { placeholder: '06 698 12345', pattern: '## ### #####' },

  // Africa
  NG: { placeholder: '0801 234 5678', pattern: '#### ### ####' },
  GH: { placeholder: '024 123 4567', pattern: '### ### ####' },
  ZA: { placeholder: '071 234 5678', pattern: '### ### ####' },
  KE: { placeholder: '0712 345678', pattern: '#### ######' },
  ET: { placeholder: '091 123 4567', pattern: '### ### ####' },
  TZ: { placeholder: '0712 345 678', pattern: '#### ### ###' },
  UG: { placeholder: '0712 345678', pattern: '#### ######' },
  DZ: { placeholder: '0551 23 45 67', pattern: '#### ## ## ##' },
  MA: { placeholder: '0612-345678', pattern: '####-######' },
  TN: { placeholder: '20 123 456', pattern: '## ### ###' },
  EG: { placeholder: '0100 123 4567', pattern: '#### ### ####' },
  SD: { placeholder: '091 123 4567', pattern: '### ### ####' },
  SS: { placeholder: '0977 123 456', pattern: '#### ### ###' },
  LY: { placeholder: '091 123 4567', pattern: '### ### ####' },
  CM: { placeholder: '6712 3456', pattern: '#### ####' },
  SN: { placeholder: '77 123 45 67', pattern: '## ### ## ##' },
  CI: { placeholder: '07 12 34 56 78', pattern: '## ## ## ## ##' },
  AO: { placeholder: '923 123 456', pattern: '### ### ###' },
  MZ: { placeholder: '82 123 4567', pattern: '## ### ####' },
  MG: { placeholder: '032 12 345 67', pattern: '### ## ### ##' },
  ZW: { placeholder: '071 234 5678', pattern: '### ### ####' },
  ZM: { placeholder: '095 123 4567', pattern: '### ### ####' },
  BW: { placeholder: '71 234 567', pattern: '## ### ###' },
  NA: { placeholder: '081 123 4567', pattern: '### ### ####' },
  LS: { placeholder: '5012 3456', pattern: '#### ####' },
  SZ: { placeholder: '7612 3456', pattern: '#### ####' },
  RW: { placeholder: '0721 123 456', pattern: '#### ### ###' },
  BI: { placeholder: '79 12 34 56', pattern: '## ## ## ##' },
  CD: { placeholder: '0812 345 678', pattern: '#### ### ###' },
  CG: { placeholder: '06 123 4567', pattern: '## ### ####' },
  CF: { placeholder: '75 04 12 34', pattern: '## ## ## ##' },
  GA: { placeholder: '06 12 34 56', pattern: '## ## ## ##' },
  GQ: { placeholder: '222 123 456', pattern: '### ### ###' },
  TD: { placeholder: '63 01 23 45', pattern: '## ## ## ##' },
  GN: { placeholder: '622 12 34 56', pattern: '### ## ## ##' },
  GW: { placeholder: '955 123 456', pattern: '### ### ###' },
  SL: { placeholder: '025 123456', pattern: '### ######' },
  LR: { placeholder: '077 012 3456', pattern: '### ### ####' },
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
  ER: { placeholder: '07 123 456', pattern: '## ### ###' },
  SO: { placeholder: '61 234 567', pattern: '## ### ###' },
  MW: { placeholder: '0991 23 45 67', pattern: '#### ## ## ##' },

  // Middle East
  AE: { placeholder: '050 123 4567', pattern: '### ### ####' },
  SA: { placeholder: '050 123 4567', pattern: '### ### ####' },
  QA: { placeholder: '3312 3456', pattern: '#### ####' },
  KW: { placeholder: '500 12345', pattern: '### #####' },
  BH: { placeholder: '3600 1234', pattern: '#### ####' },
  OM: { placeholder: '9212 3456', pattern: '#### ####' },
  YE: { placeholder: '712 123 456', pattern: '### ### ###' },
  IQ: { placeholder: '0791 123 4567', pattern: '#### ### ####' },
  SY: { placeholder: '0944 123 456', pattern: '#### ### ###' },
  LB: { placeholder: '03 123 456', pattern: '## ### ###' },
  JO: { placeholder: '07 9012 3456', pattern: '## #### ####' },
  IL: { placeholder: '050-123-4567', pattern: '###-###-####' },
  PS: { placeholder: '059 123 4567', pattern: '### ### ####' },
  IR: { placeholder: '0912 345 6789', pattern: '#### ### ####' },

  // Asia
  IN: { placeholder: '98765 43210', pattern: '##### #####' },
  CN: { placeholder: '131 2345 6789', pattern: '### #### ####' },
  JP: { placeholder: '090-1234-5678', pattern: '###-####-####' },
  KR: { placeholder: '010-1234-5678', pattern: '###-####-####' },
  KP: { placeholder: '0192 123 4567', pattern: '#### ### ####' },
  TW: { placeholder: '0912-345-678', pattern: '####-###-###' },
  HK: { placeholder: '5123 4567', pattern: '#### ####' },
  MO: { placeholder: '6612 3456', pattern: '#### ####' },
  PH: { placeholder: '0917 123 4567', pattern: '#### ### ####' },
  ID: { placeholder: '0812-3456-7890', pattern: '####-####-####' },
  MY: { placeholder: '012-345 6789', pattern: '###-### ####' },
  SG: { placeholder: '9123 4567', pattern: '#### ####' },
  TH: { placeholder: '081 234 5678', pattern: '### ### ####' },
  VN: { placeholder: '091 234 56 78', pattern: '### ### ## ##' },
  MM: { placeholder: '09 123 456 789', pattern: '## ### ### ###' },
  KH: { placeholder: '012 345 678', pattern: '### ### ###' },
  LA: { placeholder: '020 5512 3456', pattern: '### #### ####' },
  BD: { placeholder: '01712-345678', pattern: '#####-######' },
  PK: { placeholder: '0301-2345678', pattern: '####-#######' },
  LK: { placeholder: '071 234 5678', pattern: '### ### ####' },
  NP: { placeholder: '984-1234567', pattern: '###-#######' },
  BT: { placeholder: '17 123 456', pattern: '## ### ###' },
  MV: { placeholder: '777-1234', pattern: '###-####' },
  AF: { placeholder: '070 123 4567', pattern: '### ### ####' },
  TJ: { placeholder: '917 12 3456', pattern: '### ## ####' },
  TM: { placeholder: '8 65 123456', pattern: '# ## ######' },
  UZ: { placeholder: '90 123 45 67', pattern: '## ### ## ##' },
  KG: { placeholder: '0700 123 456', pattern: '#### ### ###' },
  KZ: { placeholder: '700 123 45 67', pattern: '### ### ## ##' },
  MN: { placeholder: '9912 3456', pattern: '#### ####' },
  GE: { placeholder: '555 12 34 56', pattern: '### ## ## ##' },
  AM: { placeholder: '077 123 456', pattern: '### ### ###' },
  AZ: { placeholder: '050 123 45 67', pattern: '### ### ## ##' },
  TR: { placeholder: '0532 123 45 67', pattern: '#### ### ## ##' },

  // South/Central America & Caribbean
  BR: { placeholder: '(11) 99999-9999', pattern: '(##) #####-####' },
  AR: { placeholder: '011 1234-5678', pattern: '### ####-####' },
  CO: { placeholder: '310 123 4567', pattern: '### ### ####' },
  CL: { placeholder: '9 1234 5678', pattern: '# #### ####' },
  PE: { placeholder: '912 345 678', pattern: '### ### ###' },
  VE: { placeholder: '0412-123 4567', pattern: '####-### ####' },
  EC: { placeholder: '099 123 4567', pattern: '### ### ####' },
  BO: { placeholder: '7123 4567', pattern: '#### ####' },
  PY: { placeholder: '0981 234 567', pattern: '#### ### ###' },
  UY: { placeholder: '094 123 456', pattern: '### ### ###' },
  GY: { placeholder: '609 1234', pattern: '### ####' },
  SR: { placeholder: '741 2345', pattern: '### ####' },
  PA: { placeholder: '6123-4567', pattern: '####-####' },
  CR: { placeholder: '8312 3456', pattern: '#### ####' },
  NI: { placeholder: '8412 3456', pattern: '#### ####' },
  HN: { placeholder: '9812-3456', pattern: '####-####' },
  SV: { placeholder: '7012 3456', pattern: '#### ####' },
  GT: { placeholder: '5123 4567', pattern: '#### ####' },
  BZ: { placeholder: '622 3456', pattern: '### ####' },
  CU: { placeholder: '05 1234567', pattern: '## #######' },
  DO: { placeholder: '(809) 234-5678', pattern: '(###) ###-####' },
  HT: { placeholder: '34 12 3456', pattern: '## ## ####' },
  JM: { placeholder: '(876) 234-5678', pattern: '(###) ###-####' },
  TT: { placeholder: '(868) 234-5678', pattern: '(###) ###-####' },
  BB: { placeholder: '(246) 234-5678', pattern: '(###) ###-####' },
  BS: { placeholder: '(242) 234-5678', pattern: '(###) ###-####' },
  AG: { placeholder: '(268) 234-5678', pattern: '(###) ###-####' },
  DM: { placeholder: '(767) 234-5678', pattern: '(###) ###-####' },
  GD: { placeholder: '(473) 234-5678', pattern: '(###) ###-####' },
  KN: { placeholder: '(869) 234-5678', pattern: '(###) ###-####' },
  LC: { placeholder: '(758) 234-5678', pattern: '(###) ###-####' },
  VC: { placeholder: '(784) 234-5678', pattern: '(###) ###-####' },

  // Oceania
  AU: { placeholder: '0412 345 678', pattern: '#### ### ###' },
  NZ: { placeholder: '021 234 5678', pattern: '### ### ####' },
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

function getPhoneFormat(code: string) {
  return PHONE_FORMATS[code] || { placeholder: '123 456 7890', pattern: '### ### ####' };
}

function formatPhoneNumber(digits: string, pattern: string): string {
  let result = '';
  let di = 0;
  for (let i = 0; i < pattern.length; i++) {
    if (di >= digits.length) break;
    if (pattern[i] === '#') {
      result += digits[di++];
    } else {
      // Only auto-insert separator if there are more digits to come
      result += pattern[i];
    }
  }
  return result;
}

function FlagImg({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w40/${code.toLowerCase()}.png 2x`}
      width="20"
      height="15"
      alt=""
      className="shrink-0 object-cover"
      style={{ minWidth: '20px' }}
    />
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

function CountrySelect({ value, onChange, onDialChange, hasError }: {
  value: string; onChange: (country: string) => void;
  onDialChange?: (dial: string) => void; hasError: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = COUNTRIES.find(c => c.name === value);
  const filtered = COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`cursor-pointer w-full h-12 px-4 rounded-xl border bg-white flex items-center justify-between transition-all duration-200 ${
          hasError ? 'border-red-400' : open ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-gray-200 hover:border-blue-300'
        }`}>
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {selected ? (
            <><FlagImg code={selected.code} />
<span className="text-sm text-gray-900 truncate">{selected.name}</span></>
          ) : (
            <span className="text-sm text-gray-400">Select Country</span>
          )}
        </span>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search country..." style={{ fontSize: '16px' }}
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400 placeholder:text-gray-400" />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No countries found</p>
              ) : filtered.map(c => (
                <button key={c.code} type="button"
                  onClick={() => { onChange(c.name); onDialChange?.(c.dial); setOpen(false); setSearch(''); }}
                  className={`cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors text-left ${value === c.name ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}>
                  <FlagImg code={c.code} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-gray-400 text-xs shrink-0">{c.dial}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PasswordField({ value, onChange, placeholder, hasError, autoComplete }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  hasError: boolean; autoComplete: string;
}) {
  const [showPw, setShowPw] = useState(false);
  const [pwLength, setPwLength] = useState(0);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const border = hasError ? '1px solid #f87171' : focused ? '1px solid #3b82f6' : '1px solid #e5e7eb';
  const shadow = focused && !hasError ? '0 0 0 2px rgba(59,130,246,0.15)' : 'none';

  return (
    <div style={{ position: 'relative', height: '48px', borderRadius: '12px', backgroundColor: '#ffffff', border, boxShadow: shadow, transition: 'border-color 0.2s, box-shadow 0.2s', overflow: 'hidden' }}>
      {!showPw ? (
        <input ref={ref} type="text" inputMode="text" autoComplete={autoComplete} placeholder={placeholder}
          autoCorrect="off" autoCapitalize="off" spellCheck={false}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onSelect={e => { const t = e.target as HTMLInputElement; t.setSelectionRange(t.value.length, t.value.length); }}
          onChange={e => {
            const added = e.target.value.length - pwLength;
            let real = ref.current?.dataset.real || '';
            real = added > 0 ? real + e.target.value.slice(pwLength) : real.slice(0, e.target.value.length);
            ref.current!.dataset.real = real;
            e.target.value = '•'.repeat(e.target.value.length);
            setPwLength(e.target.value.length);
            onChange(real);
          }}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '48px',
            paddingLeft: '16px', paddingRight: '44px', borderRadius: '12px', border: 'none',
            fontSize: '16px', backgroundColor: '#ffffff',
            color: pwLength > 0 ? '#111827' : '#9ca3af',
            WebkitTextFillColor: pwLength > 0 ? '#111827' : '#9ca3af',
            caretColor: '#3b82f6', outline: 'none', WebkitAppearance: 'none' as any, appearance: 'none' as any,
            boxSizing: 'border-box' as const, zIndex: 2, fontFamily: 'inherit',
            letterSpacing: pwLength > 0 ? '0.2em' : 'normal',
          }}
        />
      ) : (
        <input ref={ref} type="text" autoComplete={autoComplete} placeholder={placeholder}
          autoCorrect="off" autoCapitalize="off" spellCheck={false}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onSelect={e => { const t = e.target as HTMLInputElement; t.setSelectionRange(t.value.length, t.value.length); }}
          onChange={e => { const val = e.target.value; ref.current!.dataset.real = val; setPwLength(val.length); onChange(val); }}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '48px',
            paddingLeft: '16px', paddingRight: '44px', borderRadius: '12px', border: 'none',
            fontSize: '16px', backgroundColor: '#ffffff', color: '#111827',
            caretColor: '#1d4ed8', outline: 'none', WebkitAppearance: 'none' as any, appearance: 'none' as any,
            boxSizing: 'border-box' as const, zIndex: 2, fontFamily: 'inherit',
          }}
        />
      )}
      <button type="button" tabIndex={-1}
        onClick={() => {
          const real = ref.current?.dataset.real || '';
          setShowPw(prev => {
            const next = !prev;
            setTimeout(() => {
              if (ref.current) {
                ref.current.value = next ? real : '•'.repeat(real.length);
                ref.current.dataset.real = real;
                setPwLength(real.length);
                ref.current.focus();
              }
            }, 10);
            return next;
          });
        }}
        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af', zIndex: 4 }}>
        {showPw
          ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        }
      </button>
    </div>
  );
}

type AccountType = 'individual' | 'company' | null;
type Step = 'type' | 'method' | 'form';

const LEFT_PANELS = {
  type: {
    badge: { icon: Star, text: 'Join 50,000+ Users' },
    headline: 'Join the future of logistics.',
    highlight: 'Simple. Fast. Global.',
    desc: "Whether you're an individual sender or a global enterprise, Exodus Logistics has the tools to manage every shipment with ease.",
    items: [
      { icon: Globe, title: 'Global Coverage', desc: 'Ship to 120+ countries worldwide' },
      { icon: Package, title: 'Smart Tracking', desc: 'Real-time updates on every shipment' },
      { icon: Zap, title: 'Instant Invoices', desc: 'Automated billing and receipts' },
    ],
    stats: [{ value: '50K+', label: 'Users' }, { value: '120+', label: 'Countries' }, { value: '99.9%', label: 'Uptime' }],
  },
  method: {
    badge: { icon: Shield, text: 'Bank-Level Security' },
    headline: 'Your data is always safe with us.',
    highlight: 'Encrypted. Protected.',
    desc: 'We use industry-leading encryption and security protocols to protect your account and shipment data at every step.',
    items: [
      { icon: Lock, title: 'End-to-End Encryption', desc: 'All data encrypted in transit and at rest' },
      { icon: Shield, title: 'Fraud Protection', desc: 'Advanced monitoring to keep you safe' },
      { icon: Zap, title: 'Instant Access', desc: 'Sign up in under 2 minutes' },
    ],
    stats: [{ value: '256-bit', label: 'Encryption' }, { value: '24/7', label: 'Monitoring' }, { value: '0', label: 'Breaches' }],
  },
  form: {
    badge: { icon: Rocket, text: 'Get Started Today' },
    headline: "You're one step away from smarter shipping.",
    highlight: 'Track. Ship. Deliver.',
    desc: 'Complete your profile and gain instant access to real-time tracking, automated invoicing, and our global logistics network.',
    items: [
      { icon: MapPin, title: 'Real-time Tracking', desc: 'Know where your shipment is at all times' },
      { icon: Package, title: 'Automated Invoicing', desc: 'Invoices generated and sent automatically' },
      { icon: Globe, title: 'Global Network', desc: 'Partners in 120+ countries worldwide' },
    ],
    stats: [{ value: '< 2min', label: 'Setup time' }, { value: 'Free', label: 'To start' }, { value: '24/7', label: 'Support' }],
  },
};

const INDUSTRIES = [
  'Agriculture & Farming', 'Automotive & Transportation', 'Banking & Financial Services',
  'Chemicals & Petrochemicals', 'Construction & Real Estate', 'Consumer Goods & FMCG',
  'Education & Training', 'Energy & Utilities', 'Fashion & Apparel', 'Food & Beverage',
  'Government & Public Sector', 'Healthcare & Pharmaceuticals', 'Hospitality & Tourism',
  'Information Technology', 'Logistics & Supply Chain', 'Manufacturing & Industrial',
  'Media & Entertainment', 'Mining & Resources', 'Non-Profit & NGO', 'Oil & Gas',
  'Retail & E-commerce', 'Telecommunications', 'Other',
];

export default function SignUpPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();

  const [step, setStep] = useState<Step>('type');
  const [accountType, setAccountType] = useState<AccountType>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [companyCountryCode, setCompanyCountryCode] = useState('');
  const [dialCode, setDialCode] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyPassword, setCompanyPassword] = useState('');
  const [companyConfirm, setCompanyConfirm] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactName, setContactName] = useState('');
  const [website, setWebsite] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyDialCode, setCompanyDialCode] = useState('');

  const [agreed, setAgreed] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        const found = COUNTRIES.find(c => c.code === data.country_code || c.name === data.country_name);
        if (found) {
  setCountry(found.name); setCompanyCountry(found.name);
  setDialCode(found.dial); setCompanyDialCode(found.dial);
  setCountryCode(found.code); setCompanyCountryCode(found.code);
  setPhone(''); setCompanyPhone('');
}
      }).catch(() => {});
  }, []);

  const inputCls = (hasError: boolean) =>
    `w-full h-12 px-4 rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all duration-200 text-gray-900 placeholder:text-gray-400 ${
      hasError ? 'border-red-400 focus:ring-red-400/20' : 'border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500/15'
    }`;

  const validate = () => {
    const e: Record<string, string> = {};
    if (accountType === 'individual') {
      if (!name.trim()) e.name = 'Full name is required.';
      if (!email.trim()) e.email = 'Email address is required.';
      else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Please enter a valid email address.';
      if (!phone.trim()) e.phone = 'Phone number is required.';
      if (!country.trim()) e.country = 'Please select your country.';
      if (!password) e.password = 'Password is required.';
      else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
      else if (!/[^A-Za-z0-9]/.test(password)) e.password = 'Password must include at least one special character.';
      if (!confirm) e.confirm = 'Please confirm your password.';
      else if (confirm !== password) e.confirm = 'Passwords do not match.';
    } else {
      if (!companyName.trim()) e.companyName = 'Company name is required.';
      if (!contactName.trim()) e.contactName = 'Contact person name is required.';
      if (!companyEmail.trim()) e.companyEmail = 'Business email is required.';
      else if (!/^\S+@\S+\.\S+$/.test(companyEmail)) e.companyEmail = 'Please enter a valid email address.';
      if (!companyPhone.trim()) e.companyPhone = 'Phone number is required.';
      if (!companyCountry.trim()) e.companyCountry = 'Please select your country.';
      if (!vatNumber.trim()) e.vatNumber = 'VAT number is required.';
      if (!registrationNumber.trim()) e.registrationNumber = 'Registration number is required.';
      if (!industry) e.industry = 'Please select an industry.';
      if (!companyPassword) e.companyPassword = 'Password is required.';
      else if (companyPassword.length < 8) e.companyPassword = 'Password must be at least 8 characters.';
      else if (!/[^A-Za-z0-9]/.test(companyPassword)) e.companyPassword = 'Password must include at least one special character.';
      if (!companyConfirm) e.companyConfirm = 'Please confirm your password.';
      else if (companyConfirm !== companyPassword) e.companyConfirm = 'Passwords do not match.';
    }
    if (!agreed) e.agreed = 'You must accept our Terms of Service and Privacy Policy to create an account.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const submitEmail = accountType === 'individual' ? email.trim().toLowerCase() : companyEmail.trim().toLowerCase();
    const submitPassword = accountType === 'individual' ? password : companyPassword;
    const submitName = accountType === 'individual' ? name.trim() : contactName.trim();
    setIsSubmitting(true);
    try {
      const body = accountType === 'individual'
        ? { name: submitName, email: submitEmail, password: submitPassword, phone: dialCode + '' + phone, country, accountType: 'individual', emailUpdates }
        : { name: submitName, email: submitEmail, password: submitPassword, phone: companyDialCode + '' + companyPhone, country: companyCountry, accountType: 'company', companyName: companyName.trim(), vatNumber, registrationNumber, industry, website, emailUpdates };
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { setGeneralError(json?.error || 'Registration failed. Please try again.'); return; }
      setSuccess(true);
      setTimeout(async () => {
        const result = await signIn('credentials', { email: submitEmail, password: submitPassword, redirect: false });
        if (result?.ok) { router.replace(`/${locale}/dashboard`); setTimeout(() => { window.location.href = `/${locale}/dashboard`; }, 200); }
        else { router.replace(`/${locale}/sign-in`); }
      }, 1500);
    } catch { setGeneralError('Something went wrong. Please try again.'); }
    finally { setIsSubmitting(false); }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try { await signIn('google', { callbackUrl: `/${locale}/dashboard` }); }
    catch { setGoogleLoading(false); }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-10 text-center max-w-sm w-full shadow-xl border border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Account Created!</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">Welcome to Exodus Logistics. Signing you in...</p>
          <div className="mt-5 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
        </motion.div>
      </div>
    );
  }

  const stepIndex: Record<Step, number> = { type: 0, method: 1, form: 2 };
  const panel = LEFT_PANELS[step];
  const BadgeIcon = panel.badge.icon;

  return (
    <div className="min-h-screen flex">
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

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.4 }} className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
              <BadgeIcon className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-bold text-white/90 tracking-widest uppercase">{panel.badge.text}</span>
            </div>
            <div>
              <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.15] tracking-tight">
                {panel.headline}<br />
                <span style={{ background: 'linear-gradient(90deg, #67e8f9, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {panel.highlight}
                </span>
              </h2>
              <p className="mt-4 text-white/60 text-base leading-relaxed max-w-sm">{panel.desc}</p>
            </div>
            <div className="space-y-3">
              {panel.items.map(({ icon: Icon, title, desc }, i) => (
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
              {panel.stats.map(({ value, label }, i) => (
                <motion.div key={label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm">
                  <p className="text-xl font-extrabold text-white">{value}</p>
                  <p className="text-[11px] text-white/50 mt-0.5 font-semibold tracking-wide">{label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 mt-auto">
  <p className="text-xs text-white/30">© {new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved.</p>
</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-5 pt-6 pb-10 sm:px-10 bg-gradient-to-br from-slate-50 via-blue-50/20 to-white relative overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch' as any }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.04) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.04) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="lg:hidden mb-6 relative z-10">
          <Link href={`/${locale}`} className="cursor-pointer">
            <Image src="/logo-dark.svg" alt="Exodus Logistics" width={160} height={50} className="h-10 w-auto" priority />
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }} className="w-full max-w-[440px] relative z-10">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100/80 p-6 sm:p-10">
            <AnimatePresence mode="wait">

              {step === 'type' && (
                <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <div className="mb-7">
                    <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Create an account</h1>
                    <p className="mt-1.5 text-sm text-gray-500">Select the account type that best suits you.</p>
                  </div>
                  <div className="space-y-3 mb-7">
                    <button type="button" onClick={() => { setAccountType('individual'); setStep('method'); }}
                      className="cursor-pointer w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-md transition-all duration-200 text-left group">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200" style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">Individual</p>
                        <p className="text-sm text-gray-500 mt-0.5">Personal shipments and tracking</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200 shrink-0" />
                    </button>
                    <button type="button" onClick={() => { setAccountType('company'); setStep('method'); }}
                      className="cursor-pointer w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50/40 hover:shadow-md transition-all duration-200 text-left group">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">Company</p>
                        <p className="text-sm text-gray-500 mt-0.5">Business logistics with VAT & registration</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all duration-200 shrink-0" />
                    </button>
                  </div>
                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link href={`/${locale}/sign-in`} className="cursor-pointer font-bold text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 transition">Sign in</Link>
                  </p>
                </motion.div>
              )}

              {step === 'method' && (
                <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <button onClick={() => setStep('type')} className="cursor-pointer inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all duration-200 mb-6 -ml-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <div className="mb-7">
                    <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center"
                      style={{ background: accountType === 'company' ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                      {accountType === 'company' ? <Building2 className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                      {accountType === 'company' ? 'Company account' : 'Individual account'}
                    </h1>
                    <p className="mt-1.5 text-sm text-gray-500">How would you like to create your account?</p>
                  </div>
                  <div className="space-y-3 mb-7">
                    <button type="button" onClick={handleGoogleSignUp} disabled={googleLoading}
                      className="cursor-pointer w-full h-14 flex items-center justify-center gap-3 rounded-2xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-[.98] transition-all duration-200 disabled:opacity-60">
                      {googleLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <GoogleIcon />}
                      Continue with Google
                    </button>
                    <button type="button" onClick={() => setStep('form')}
                      className="cursor-pointer w-full h-14 flex items-center justify-center gap-3 rounded-2xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 hover:shadow-md active:scale-[.98] transition-all duration-200">
                      <Mail className="w-5 h-5 text-blue-500" />
                      Continue with Email
                    </button>
                  </div>
                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link href={`/${locale}/sign-in`} className="cursor-pointer font-bold text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 transition">Sign in</Link>
                  </p>
                </motion.div>
              )}

              {step === 'form' && (
                <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <button onClick={() => setStep('method')} className="cursor-pointer inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all duration-200 mb-5 -ml-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <div className="mb-5">
                    <div className="w-11 h-11 rounded-2xl mb-3 flex items-center justify-center"
                      style={{ background: accountType === 'company' ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}>
                      {accountType === 'company' ? <Building2 className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                      {accountType === 'company' ? 'Company details' : 'Your details'}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                      {accountType === 'company' ? 'Complete your company profile to get started.' : 'Fill in your personal information to create your account.'}
                    </p>
                  </div>

                  {generalError && (
                    <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />{generalError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                    {accountType === 'individual' ? (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                          <input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                            placeholder="Full Name" autoComplete="name" style={{ fontSize: '16px' }} className={inputCls(!!errors.name)} />
                          {errors.name && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                          <input value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                            type="email" placeholder="Email Address" autoComplete="email" style={{ fontSize: '16px' }} className={inputCls(!!errors.email)} />
                          {errors.email && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country</label>
                          <CountrySelect value={country}
                            onChange={n => {
  const found = COUNTRIES.find(c => c.name === n);
  setCountry(n);
  setCountryCode(found?.code || '');
  setDialCode(found?.dial || '');
  setPhone('');
  setErrors(p => ({ ...p, country: '' }));
}}
                            
                            hasError={!!errors.country} />
                          {errors.country && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.country}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                          <div className={`flex h-12 rounded-xl border overflow-hidden transition-all duration-200 ${errors.phone ? 'border-red-400' : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 hover:border-blue-300'}`}>
  <div className="flex items-center px-3 bg-gray-50 border-r border-gray-200 shrink-0">
    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{dialCode}</span>
  </div>
  <input
    value={phone}
    onChange={e => {
      const digits = e.target.value.replace(/\D/g, '');
      const fmt = getPhoneFormat(countryCode);
      const formatted = formatPhoneNumber(digits, fmt.pattern);
      setPhone(formatted);
      setErrors(p => ({ ...p, phone: '' }));
    }}
    type="tel"
    inputMode="numeric"
    placeholder={getPhoneFormat(countryCode).placeholder}
    autoComplete="tel"
    style={{ fontSize: '16px' }}
    className="flex-1 px-3 bg-white focus:outline-none text-gray-900 placeholder:text-gray-400 min-w-0"
  />
</div>
                          {errors.phone && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Name</label>
  <input value={companyName} onChange={e => { setCompanyName(e.target.value); setErrors(p => ({ ...p, companyName: '' })); }}
    placeholder="Company Name" autoComplete="organization" style={{ fontSize: '16px' }} className={inputCls(!!errors.companyName)} />
  {errors.companyName && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.companyName}</p>}
</div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Person Name</label>
                          <input value={contactName} onChange={e => { setContactName(e.target.value); setErrors(p => ({ ...p, contactName: '' })); }}
                            placeholder="Contact Person Name" autoComplete="name" style={{ fontSize: '16px' }} className={inputCls(!!errors.contactName)} />
                          {errors.contactName && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.contactName}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Email Address</label>
                          <input value={companyEmail} onChange={e => { setCompanyEmail(e.target.value); setErrors(p => ({ ...p, companyEmail: '' })); }}
                            type="email" placeholder="Business Email Address" autoComplete="email" style={{ fontSize: '16px' }} className={inputCls(!!errors.companyEmail)} />
                          {errors.companyEmail && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.companyEmail}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country</label>
                          <CountrySelect value={companyCountry}
                            onChange={n => {
  const found = COUNTRIES.find(c => c.name === n);
  setCompanyCountry(n);
  setCompanyCountryCode(found?.code || '');
  setCompanyDialCode(found?.dial || '');
  setCompanyPhone('');
  setErrors(p => ({ ...p, companyCountry: '' }));
}}
                            
                            hasError={!!errors.companyCountry} />
                          {errors.companyCountry && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.companyCountry}</p>}
                        </div>
                        <div>
  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Phone Number</label>
  <div className={`flex h-12 rounded-xl border overflow-hidden transition-all duration-200 ${errors.companyPhone ? 'border-red-400' : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 hover:border-blue-300'}`}>
    <div className="flex items-center px-3 bg-gray-50 border-r border-gray-200 shrink-0">
      <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{companyDialCode}</span>
    </div>
    <input
      value={companyPhone}
      onChange={e => {
        const digits = e.target.value.replace(/\D/g, '');
        const fmt = getPhoneFormat(companyCountryCode);
        const formatted = formatPhoneNumber(digits, fmt.pattern);
        setCompanyPhone(formatted);
        setErrors(p => ({ ...p, companyPhone: '' }));
      }}
      type="tel"
      inputMode="numeric"
      placeholder={getPhoneFormat(companyCountryCode).placeholder}
      autoComplete="tel"
      style={{ fontSize: '16px' }}
      className="flex-1 px-3 bg-white focus:outline-none text-gray-900 placeholder:text-gray-400 min-w-0"
    />
  </div>
  {errors.companyPhone && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.companyPhone}</p>}
</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">VAT Number</label>
                            <input value={vatNumber} onChange={e => { setVatNumber(e.target.value); setErrors(p => ({ ...p, vatNumber: '' })); }}
                              placeholder="VAT Number" style={{ fontSize: '16px' }} className={inputCls(!!errors.vatNumber)} />
                            {errors.vatNumber && <p className="mt-1 text-xs text-red-600 font-medium">{errors.vatNumber}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Registration No.</label>
                            <input value={registrationNumber} onChange={e => { setRegistrationNumber(e.target.value); setErrors(p => ({ ...p, registrationNumber: '' })); }}
                              placeholder="Registration No." style={{ fontSize: '16px' }} className={inputCls(!!errors.registrationNumber)} />
                            {errors.registrationNumber && <p className="mt-1 text-xs text-red-600 font-medium">{errors.registrationNumber}</p>}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Industry</label>
                          <select value={industry} onChange={e => { setIndustry(e.target.value); setErrors(p => ({ ...p, industry: '' })); }}
                            style={{ fontSize: '16px' }} className={inputCls(!!errors.industry) + ' cursor-pointer'}>
                            <option value="" disabled>Select Your Industry</option>
                            {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                          </select>
                          {errors.industry && <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.industry}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Website <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                          </label>
                          <input value={website} onChange={e => setWebsite(e.target.value)}
                            placeholder="https://www.yourcompany.com" style={{ fontSize: '16px' }} className={inputCls(false)} />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                      <PasswordField
                        value={accountType === 'individual' ? password : companyPassword}
                        onChange={val => { accountType === 'individual' ? setPassword(val) : setCompanyPassword(val); setErrors(p => ({ ...p, [accountType === 'individual' ? 'password' : 'companyPassword']: '' })); }}
                        placeholder="Create a Strong Password" hasError={!!(accountType === 'individual' ? errors.password : errors.companyPassword)} autoComplete="new-password" />
                      {(accountType === 'individual' ? errors.password : errors.companyPassword) && (
                        <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{accountType === 'individual' ? errors.password : errors.companyPassword}</p>
                      )}
                      <PasswordStrength password={accountType === 'individual' ? password : companyPassword} />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                      <PasswordField
                        value={accountType === 'individual' ? confirm : companyConfirm}
                        onChange={val => { accountType === 'individual' ? setConfirm(val) : setCompanyConfirm(val); setErrors(p => ({ ...p, [accountType === 'individual' ? 'confirm' : 'companyConfirm']: '' })); }}
                        placeholder="Re-enter Your Password" hasError={!!(accountType === 'individual' ? errors.confirm : errors.companyConfirm)} autoComplete="new-password" />
                      {(accountType === 'individual' ? errors.confirm : errors.companyConfirm) && (
                        <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />{accountType === 'individual' ? errors.confirm : errors.companyConfirm}</p>
                      )}
                      {(() => {
                        const pw = accountType === 'individual' ? password : companyPassword;
                        const cf = accountType === 'individual' ? confirm : companyConfirm;
                        const err = accountType === 'individual' ? errors.confirm : errors.companyConfirm;
                        return cf && cf === pw && !err ? (
                          <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Passwords match</p>
                        ) : null;
                      })()}
                    </div>

                    <div className="space-y-3 pt-1">
                      <div className={`rounded-xl border p-4 transition-all duration-200 ${errors.agreed ? 'border-red-300 bg-red-50/60' : 'border-gray-200 bg-gray-50/80'}`}>
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
                      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                        <div className="flex items-start gap-3">
                          <CustomCheckbox checked={emailUpdates} onChange={() => setEmailUpdates(v => !v)} />
                          <span className="text-sm text-gray-600 leading-relaxed cursor-pointer" onClick={() => setEmailUpdates(v => !v)}>
                            I would like to receive email notifications from Exodus Logistics, including real-time shipment updates, delivery confirmations, platform news, and exclusive offers.
                          </span>
                        </div>
                      </div>
                    </div>

                    <button type="submit" disabled={isSubmitting || googleLoading}
                      className="cursor-pointer w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
                      {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Creating Account...</span></> : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>

                  <p className="mt-5 text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link href={`/${locale}/sign-in`} className="cursor-pointer font-bold text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 transition">Sign in</Link>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            {(['type', 'method', 'form'] as Step[]).map((s) => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${step === s ? 'w-8 bg-blue-600' : stepIndex[s] < stepIndex[step] ? 'w-4 bg-blue-300' : 'w-4 bg-gray-200'}`} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}