import type { CSSProperties } from 'react';

/** --scan-delay (s) of every CV section, header to references: the scan reads the whole file. */
export const SCAN_FIELD_DELAYS = [0.15, 0.55, 0.95, 1.4, 1.8, 2.3, 2.7, 3.1, 3.5, 3.9];
export const scanAt = (i: number) => ({ '--scan-delay': `${SCAN_FIELD_DELAYS[i]}s` }) as CSSProperties;
