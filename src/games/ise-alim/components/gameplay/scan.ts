import type { CSSProperties } from 'react';

/** Her CV bölümünün --scan-delay'i (sn), başlıktan referanslara: tarama bütün dosyayı okur. */
export const SCAN_FIELD_DELAYS = [0.15, 0.55, 0.95, 1.4, 1.8, 2.3, 2.7, 3.1, 3.5, 3.9];
export const scanAt = (i: number) => ({ '--scan-delay': `${SCAN_FIELD_DELAYS[i]}s` }) as CSSProperties;
