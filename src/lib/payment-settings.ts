// src/lib/payment-settings.ts

export type CryptoNetwork = 'BTC' | 'ETH' | 'TRC20' | 'ERC20' | 'BEP20' | 'SOL' | 'POLYGON';

export type CryptoMethod = {
  enabled: boolean;
  walletAddress: string;
  network: CryptoNetwork;
  qrImageUrl: string;
  confirmationTime: string;
};

export type BankTransferMethod = {
  enabled: boolean;
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  iban: string;
  branchAddress: string;
  instructions: string;
  confirmationTime: string;
};

export type PaypalMethod = {
  enabled: boolean;
  email: string;
  link: string;
  useLink: boolean;
  confirmationTime: string;
};

export type CardMethod = {
  enabled: boolean;
  confirmationTime: string;
};

export type CustomMethod = {
  id: string;
  enabled: boolean;
  name: string;
  emoji: string;
  description: string;
  instructions: string;
  fields: Array<{ label: string; value: string }>;
  qrImageUrl?: string;
  confirmationTime: string;
};

export type PaymentSettings = {
  card: CardMethod;
  bitcoin: CryptoMethod;
  usdt: CryptoMethod;
  ethereum: CryptoMethod;
  bankTransfer: BankTransferMethod;
  paypal: PaypalMethod;
  customMethods: CustomMethod[];
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  card: {
    enabled: true,
    confirmationTime: 'Instant',
  },
  bitcoin: {
    enabled: false,
    walletAddress: '',
    network: 'BTC',
    qrImageUrl: '',
    confirmationTime: '10–30 minutes',
  },
  usdt: {
    enabled: false,
    walletAddress: '',
    network: 'TRC20',
    qrImageUrl: '',
    confirmationTime: '5–15 minutes',
  },
  ethereum: {
    enabled: false,
    walletAddress: '',
    network: 'ERC20',
    qrImageUrl: '',
    confirmationTime: '5–15 minutes',
  },
  bankTransfer: {
    enabled: false,
    bankName: '',
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    swiftCode: '',
    iban: '',
    branchAddress: '',
    instructions: '',
    confirmationTime: 'Up to 24 hours',
  },
  paypal: {
    enabled: false,
    email: '',
    link: '',
    useLink: true,
    confirmationTime: '10–30 minutes',
  },
  customMethods: [],
};

// Card brand detection
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb' | 'diners' | 'verve' | 'unionpay' | 'unknown';

export function detectCardBrand(cardNumber: string): CardBrand {
  const num = cardNumber.replace(/\s/g, '');
  if (!num) return 'unknown';

  // Visa: starts with 4
  if (/^4/.test(num)) return 'visa';

  // Mastercard: starts with 51-55, or 2221-2720
  if (/^5[1-5]/.test(num)) return 'mastercard';
  if (/^2(?:2[2-9]|[3-6]|7[01]|720)/.test(num)) return 'mastercard';

  // Amex: starts with 34 or 37
  if (/^3[47]/.test(num)) return 'amex';

  // Discover: starts with 6011, 622126-622925, 644-649, 65
  if (/^6011/.test(num)) return 'discover';
  if (/^65/.test(num)) return 'discover';
  if (/^64[4-9]/.test(num)) return 'discover';

  // JCB: starts with 3528-3589
  if (/^35(2[89]|[3-8])/.test(num)) return 'jcb';

  // Diners Club: starts with 300-305, 36, 38
  if (/^3(?:0[0-5]|[68])/.test(num)) return 'diners';

  // Verve (Nigerian): starts with 506099-506198, 650002-650027
  if (/^5061(?:9[89]|[0-8])/.test(num)) return 'verve';
  if (/^650(?:0[0-2]|0[02][0-7])/.test(num)) return 'verve';
  if (/^5061[9]/.test(num)) return 'verve';

  // UnionPay: starts with 62
  if (/^62/.test(num)) return 'unionpay';

  return 'unknown';
}

export function getCardBrandLabel(brand: CardBrand): string {
  const labels: Record<CardBrand, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    jcb: 'JCB',
    diners: 'Diners Club',
    verve: 'Verve',
    unionpay: 'UnionPay',
    unknown: '',
  };
  return labels[brand] || '';
}

export function getCardCvvLength(brand: CardBrand): number {
  return brand === 'amex' ? 4 : 3;
}

export function getCardMaxLength(brand: CardBrand): number {
  if (brand === 'amex') return 15;
  if (brand === 'diners') return 14;
  return 16;
}