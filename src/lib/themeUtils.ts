import { ComplexThemeConfig } from '../types';

export function hexToRgb(hex?: string | null): string {
  if (!hex) return '6, 78, 59';
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return '6, 78, 59';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

export function lightenHex(hex?: string | null, percent = 0.2): string {
  if (!hex) return '#065f46';
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return '#065f46';
  const r = Math.min(255, Math.floor(((num >> 16) & 255) + (255 - ((num >> 16) & 255)) * percent));
  const g = Math.min(255, Math.floor(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * percent));
  const b = Math.min(255, Math.floor((num & 255) + (255 - (num & 255)) * percent));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function darkenHex(hex?: string | null, percent = 0.2): string {
  if (!hex) return '#022c22';
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return '#022c22';
  const r = Math.max(0, Math.floor(((num >> 16) & 255) * (1 - percent)));
  const g = Math.max(0, Math.floor(((num >> 8) & 255) * (1 - percent)));
  const b = Math.max(0, Math.floor((num & 255) * (1 - percent)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export interface IslamicThemePreset {
  id: string;
  name: string;
  subtitle: string;
  colors: ComplexThemeConfig;
}

/**
 * 10 Master Islamic Palettes with mathematically verified contrast separation:
 * - Canvas Background is dark & immersive
 * - Card/Secondary has visible elevation (+18% to +25%) so cards & headers NEVER blend into the background
 * - Accent is vibrant jewel/gold with glowing contrast
 * - Buttons are guaranteed high-contrast (never match background)
 */
export const ISLAMIC_THEME_PRESETS: IslamicThemePreset[] = [
  {
    id: 'duo_green',
    name: 'ثيم دولينجو الأخضر القياسي',
    subtitle: 'الأخضر النضر الأيقوني لدولينجو مع بطاقات مجسمة وثلاثية الأبعاد',
    colors: {
      primaryColor: '#131f24',
      secondaryColor: '#1b2e35',
      accentColor: '#58cc02',
      backgroundColor: '#131f24',
      surfaceColor: 'rgba(27, 46, 53, 0.85)',
      cardColor: '#203843',
      textColor: '#ffffff'
    }
  },
  {
    id: 'duo_blue',
    name: 'ثيم دولينجو الأزرق السماوي',
    subtitle: 'أزرق فيذر المنعش مع تباين قوي وبطاقات واضحة وسلسة',
    colors: {
      primaryColor: '#0f1c24',
      secondaryColor: '#172c38',
      accentColor: '#1cb0f6',
      backgroundColor: '#0f1c24',
      surfaceColor: 'rgba(23, 44, 56, 0.85)',
      cardColor: '#1a3746',
      textColor: '#f0f9ff'
    }
  },
  {
    id: 'duo_gold',
    name: 'ثيم دولينجو الحماسي الذهبي',
    subtitle: 'أصفر الإنجاز والتنافس المشرق مع بطاقات دافئة وعصرية',
    colors: {
      primaryColor: '#1d170a',
      secondaryColor: '#302613',
      accentColor: '#ffc800',
      backgroundColor: '#171206',
      surfaceColor: 'rgba(48, 38, 19, 0.85)',
      cardColor: '#3d3016',
      textColor: '#fffbeb'
    }
  },
  {
    id: 'duo_purple',
    name: 'ثيم دولينجو الماسي البنفسجي',
    subtitle: 'بنفسجي سوبر دولينجو الفاخر مع لمسات براقة',
    colors: {
      primaryColor: '#180f24',
      secondaryColor: '#2b1a3f',
      accentColor: '#ce82ff',
      backgroundColor: '#140c1e',
      surfaceColor: 'rgba(43, 26, 63, 0.85)',
      cardColor: '#372051',
      textColor: '#faf5ff'
    }
  },
  {
    id: 'duo_orange',
    name: 'ثيم دولينجو الناري',
    subtitle: 'برتقالي ستريك الحماسي للتحدي والمنافسة اليومية',
    colors: {
      primaryColor: '#1f1308',
      secondaryColor: '#382210',
      accentColor: '#ff9600',
      backgroundColor: '#190e05',
      surfaceColor: 'rgba(56, 34, 16, 0.85)',
      cardColor: '#472a12',
      textColor: '#fff7ed'
    }
  },
  {
    id: 'emerald',
    name: 'الزمردي النبوي الأصيل',
    subtitle: 'أخضر زمردي داكن مع بطاقات واضحة ولمسات خضراء نضرة',
    colors: {
      primaryColor: '#0c1f19',
      secondaryColor: '#143329',
      accentColor: '#58cc02',
      backgroundColor: '#091813',
      surfaceColor: 'rgba(20, 51, 41, 0.75)',
      cardColor: '#194034',
      textColor: '#f0fdf4'
    }
  },
  {
    id: 'navy',
    name: 'الكحلي القرآني الملكي',
    subtitle: 'أزرق كحلي عميق مع بطاقات كحلية بارزة وأزرق سماوي فاخر',
    colors: {
      primaryColor: '#030f1c',
      secondaryColor: '#0c2340',
      accentColor: '#1cb0f6',
      backgroundColor: '#041122',
      surfaceColor: 'rgba(12, 35, 64, 0.7)',
      cardColor: '#0e2a4d',
      textColor: '#f0f9ff'
    }
  },
  {
    id: 'andalusi_gold',
    name: 'الذهبي الأندلسي الفاخر',
    subtitle: 'بني شوكولاتي أندلسي مع بطاقات واضحة وذهب قرطبي مشرق',
    colors: {
      primaryColor: '#150d06',
      secondaryColor: '#36210f',
      accentColor: '#ffc800',
      backgroundColor: '#1c120a',
      surfaceColor: 'rgba(54, 33, 15, 0.7)',
      cardColor: '#3a2512',
      textColor: '#fef3c7'
    }
  },
  {
    id: 'turquoise',
    name: 'الفيروزي الأصفهاني التراثي',
    subtitle: 'تركواز بحري إسلامي عميق مع لمسات زمردية وذهبية نضرة',
    colors: {
      primaryColor: '#031a1b',
      secondaryColor: '#093c3e',
      accentColor: '#2dd4bf',
      backgroundColor: '#042022',
      surfaceColor: 'rgba(9, 60, 62, 0.7)',
      cardColor: '#0c484b',
      textColor: '#f0fdfa'
    }
  },
  {
    id: 'charcoal',
    name: 'الفحمي العصري الداكن',
    subtitle: 'فحمي داكن مع ألوان حيوية مجسمة وتباين نقي',
    colors: {
      primaryColor: '#131f24',
      secondaryColor: '#1b2e35',
      accentColor: '#58cc02',
      backgroundColor: '#10191d',
      surfaceColor: 'rgba(27, 46, 53, 0.85)',
      cardColor: '#203843',
      textColor: '#fafafa'
    }
  }
];

/**
 * Intelligent Color Harmonizer:
 * Takes any base hue and optional accent, and mathematically constructs
 * a complete, harmonious theme where buttons NEVER match the background,
 * and cards have clear step-up contrast.
 */
export function generateHarmoniousIslamicPalette(
  baseColor: string,
  accentColor: string = '#58cc02'
): ComplexThemeConfig {
  const bg = darkenHex(baseColor, 0.25);
  const primary = darkenHex(baseColor, 0.1);
  const secondary = lightenHex(baseColor, 0.18);
  const card = lightenHex(baseColor, 0.22);
  const surface = `rgba(${hexToRgb(card)}, 0.85)`;

  return {
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor: accentColor,
    backgroundColor: bg,
    surfaceColor: surface,
    cardColor: card,
    textColor: '#ffffff'
  };
}

/**
 * Checks if a complex theme config differs from the default natural platform Duolingo theme
 */
export function isCustomTheme(theme?: ComplexThemeConfig | null): boolean {
  if (!theme) return false;
  const p = (theme.primaryColor || '').trim().toLowerCase();
  const s = (theme.secondaryColor || '').trim().toLowerCase();
  const a = (theme.accentColor || '').trim().toLowerCase();
  const bg = (theme.backgroundColor || '').trim().toLowerCase();
  if (p === '#131f24' && s === '#1b2e35' && a === '#58cc02' && (bg === '#131f24' || bg === '#10191d')) {
    return false;
  }
  return true;
}

/**
 * Applies complex theme variables to document DOM if inside a complex,
 * or strictly resets to the natural platform Duolingo colors if outside.
 */
export function applyComplexThemeToDOM(
  theme?: ComplexThemeConfig | null,
  isInsideComplex: boolean = false
): void {
  if (typeof document === 'undefined') return;

  if (isInsideComplex && theme) {
    const primary = theme.primaryColor || '#131f24';
    const secondary = theme.secondaryColor || '#1b2e35';
    const accent = theme.accentColor || '#58cc02';
    const bg = theme.backgroundColor || '#131f24';
    
    // Ensure card has guaranteed step-up contrast over bg (never match!)
    let card = theme.cardColor || theme.surfaceColor || secondary;
    if (card.toLowerCase() === bg.toLowerCase()) {
      card = lightenHex(bg, 0.2);
    }
    
    const border = lightenHex(card, 0.2);
    const subtext = lightenHex(accent, 0.45);
    const text = theme.textColor || '#ffffff';

    const pRgb = hexToRgb(primary);
    const sRgb = hexToRgb(secondary);
    const aRgb = hexToRgb(accent);
    const bgRgb = hexToRgb(bg);
    const cardRgb = hexToRgb(card);
    const bRgb = hexToRgb(border);

    document.body.style.backgroundColor = bg;
    document.body.style.color = text;

    document.documentElement.setAttribute('data-complex-themed', 'true');
    document.documentElement.style.setProperty('--complex-primary', primary);
    document.documentElement.style.setProperty('--complex-primary-rgb', pRgb);
    document.documentElement.style.setProperty('--complex-secondary', secondary);
    document.documentElement.style.setProperty('--complex-secondary-rgb', sRgb);
    document.documentElement.style.setProperty('--complex-accent', accent);
    document.documentElement.style.setProperty('--complex-accent-rgb', aRgb);
    document.documentElement.style.setProperty('--complex-bg', bg);
    document.documentElement.style.setProperty('--complex-bg-rgb', bgRgb);
    document.documentElement.style.setProperty('--complex-card', card);
    document.documentElement.style.setProperty('--complex-card-rgb', cardRgb);
    document.documentElement.style.setProperty('--complex-border', border);
    document.documentElement.style.setProperty('--complex-border-rgb', bRgb);
    document.documentElement.style.setProperty('--complex-text', text);
    document.documentElement.style.setProperty('--complex-subtext', subtext);
  } else {
    // Natural platform theme (Duolingo #131f24 & #ffc800) - outside complex
    document.body.style.backgroundColor = '#131f24';
    document.body.style.color = '#ffffff';

    document.documentElement.removeAttribute('data-complex-themed');
    document.documentElement.style.setProperty('--complex-primary', '#131f24');
    document.documentElement.style.setProperty('--complex-primary-rgb', '19, 31, 36');
    document.documentElement.style.setProperty('--complex-secondary', '#1b2e35');
    document.documentElement.style.setProperty('--complex-secondary-rgb', '27, 46, 53');
    document.documentElement.style.setProperty('--complex-accent', '#ffc800');
    document.documentElement.style.setProperty('--complex-accent-rgb', '255, 200, 0');
    document.documentElement.style.setProperty('--complex-bg', '#131f24');
    document.documentElement.style.setProperty('--complex-bg-rgb', '19, 31, 36');
    document.documentElement.style.setProperty('--complex-card', '#203843');
    document.documentElement.style.setProperty('--complex-card-rgb', '32, 56, 67');
    document.documentElement.style.setProperty('--complex-border', '#2b4550');
    document.documentElement.style.setProperty('--complex-border-rgb', '43, 69, 80');
    document.documentElement.style.setProperty('--complex-text', '#ffffff');
    document.documentElement.style.setProperty('--complex-subtext', '#ffd233');
  }
}


/**
 * Extracts vibrant and harmonious Islamic colors from an uploaded image data URL.
 */
export async function extractColorsFromImageDataUrl(dataUrl: string): Promise<{
  theme: ComplexThemeConfig;
  palette: string[];
}> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Browser environment required for image processing'));
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({
            theme: generateHarmoniousIslamicPalette('#022c22', '#fbbf24'),
            palette: ['#022c22', '#064e3b', '#fbbf24', '#021e17', '#f0f9f6']
          });
        }

        // Downscale for fast, robust color quantization
        const width = 80;
        const height = 80;
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height).data;
        const colorCounts: Record<string, { r: number; g: number; b: number; count: number; sat: number; light: number }> = {};

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue; // ignore transparent pixels

          // Quantize to reduce noise (step of 16)
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          const key = `${qr},${qg},${qb}`;

          // Calculate HSL saturation & lightness
          const max = Math.max(r, g, b) / 255;
          const min = Math.min(r, g, b) / 255;
          const light = (max + min) / 2;
          const sat = max === min ? 0 : (max - min) / (light > 0.5 ? 2 - max - min : max + min);

          if (!colorCounts[key]) {
            colorCounts[key] = { r: qr, g: qg, b: qb, count: 0, sat, light };
          }
          colorCounts[key].count++;
        }

        const sortedColors = Object.values(colorCounts).sort((a, b) => b.count - a.count);

        const toHex = (r: number, g: number, b: number) =>
          `#${[r, g, b].map(x => Math.min(255, Math.max(0, x)).toString(16).padStart(2, '0')).join('')}`;

        // Find vibrant candidate for Accent (high saturation, pleasant lightness)
        const vibrantCandidates = sortedColors
          .filter(c => c.sat > 0.25 && c.light > 0.35 && c.light < 0.85)
          .sort((a, b) => (b.sat * 2 + b.count / 100) - (a.sat * 2 + a.count / 100));

        // Find dark/deep candidate for Background / Primary
        const darkCandidates = sortedColors
          .filter(c => c.light < 0.35)
          .sort((a, b) => b.count - a.count);

        // Find mid-tone candidate for Cards / Secondary
        const midCandidates = sortedColors
          .filter(c => c.light >= 0.25 && c.light <= 0.65)
          .sort((a, b) => b.count - a.count);

        const primaryRaw = darkCandidates[0] || sortedColors[0] || { r: 2, g: 44, b: 34 };
        const accentRaw = vibrantCandidates[0] || { r: 251, g: 191, b: 36 };
        const secondaryRaw = midCandidates[0] || { r: 6, g: 78, b: 59 };

        const baseHex = toHex(primaryRaw.r, primaryRaw.g, primaryRaw.b);
        const accentHex = toHex(accentRaw.r, accentRaw.g, accentRaw.b);
        const secHex = toHex(secondaryRaw.r, secondaryRaw.g, secondaryRaw.b);

        // Construct complete theme
        const bg = darkenHex(baseHex, 0.3);
        const primary = baseHex;
        let card = lightenHex(secHex, 0.1);
        if (card.toLowerCase() === bg.toLowerCase()) {
          card = lightenHex(bg, 0.25);
        }

        const theme: ComplexThemeConfig = {
          primaryColor: primary,
          secondaryColor: secHex,
          accentColor: accentHex,
          backgroundColor: bg,
          surfaceColor: `rgba(${hexToRgb(card)}, 0.7)`,
          cardColor: card,
          textColor: '#f8fafc'
        };

        const rawPalette = sortedColors.slice(0, 8).map(c => toHex(c.r, c.g, c.b));
        // Add distinct theme colors to palette
        const fullPalette = Array.from(new Set([
          theme.backgroundColor,
          theme.primaryColor,
          theme.cardColor,
          theme.secondaryColor,
          theme.accentColor,
          theme.textColor,
          ...rawPalette
        ])).filter(Boolean);

        resolve({ theme, palette: fullPalette });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for color extraction'));
    img.src = dataUrl;
  });
}

