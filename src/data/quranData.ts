export interface SurahInfo {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  revelationType: 'مكية' | 'مدنية';
  juz: number;
}

export const QURAN_SURAHS: SurahInfo[] = [
  { number: 1, name: "الفاتحة", englishName: "Al-Fatihah", numberOfAyahs: 7, revelationType: "مكية", juz: 1 },
  { number: 2, name: "البقرة", englishName: "Al-Baqarah", numberOfAyahs: 286, revelationType: "مدنية", juz: 1 },
  { number: 3, name: "آل عمران", englishName: "Ali 'Imran", numberOfAyahs: 200, revelationType: "مدنية", juz: 3 },
  { number: 4, name: "النساء", englishName: "An-Nisa", numberOfAyahs: 176, revelationType: "مدنية", juz: 4 },
  { number: 5, name: "المائدة", englishName: "Al-Ma'idah", numberOfAyahs: 120, revelationType: "مدنية", juz: 6 },
  { number: 6, name: "الأنعام", englishName: "Al-An'am", numberOfAyahs: 165, revelationType: "مكية", juz: 7 },
  { number: 7, name: "الأعراف", englishName: "Al-A'raf", numberOfAyahs: 206, revelationType: "مكية", juz: 8 },
  { number: 8, name: "الأنفال", englishName: "Al-Anfal", numberOfAyahs: 75, revelationType: "مدنية", juz: 9 },
  { number: 9, name: "التوبة", englishName: "At-Tawbah", numberOfAyahs: 129, revelationType: "مدنية", juz: 10 },
  { number: 10, name: "يونس", englishName: "Yunus", numberOfAyahs: 109, revelationType: "مكية", juz: 11 },
  { number: 11, name: "هود", englishName: "Hud", numberOfAyahs: 123, revelationType: "مكية", juz: 11 },
  { number: 12, name: "يوسف", englishName: "Yusuf", numberOfAyahs: 111, revelationType: "مكية", juz: 12 },
  { number: 13, name: "الرعد", englishName: "Ar-Ra'd", numberOfAyahs: 43, revelationType: "مدنية", juz: 13 },
  { number: 14, name: "إبراهيم", englishName: "Ibrahim", numberOfAyahs: 52, revelationType: "مكية", juz: 13 },
  { number: 15, name: "الحجر", englishName: "Al-Hijr", numberOfAyahs: 99, revelationType: "مكية", juz: 14 },
  { number: 16, name: "النحل", englishName: "An-Nahl", numberOfAyahs: 128, revelationType: "مكية", juz: 14 },
  { number: 17, name: "الإسراء", englishName: "Al-Isra", numberOfAyahs: 111, revelationType: "مكية", juz: 15 },
  { number: 18, name: "الكهف", englishName: "Al-Kahf", numberOfAyahs: 110, revelationType: "مكية", juz: 15 },
  { number: 19, name: "مريم", englishName: "Maryam", numberOfAyahs: 98, revelationType: "مكية", juz: 16 },
  { number: 20, name: "طه", englishName: "Ta-Ha", numberOfAyahs: 135, revelationType: "مكية", juz: 16 },
  { number: 21, name: "الأنبياء", englishName: "Al-Anbiya", numberOfAyahs: 112, revelationType: "مكية", juz: 17 },
  { number: 22, name: "الحج", englishName: "Al-Hajj", numberOfAyahs: 78, revelationType: "مدنية", juz: 17 },
  { number: 23, name: "المؤمنون", englishName: "Al-Mu'minun", numberOfAyahs: 118, revelationType: "مكية", juz: 18 },
  { number: 24, name: "النور", englishName: "An-Nur", numberOfAyahs: 64, revelationType: "مدنية", juz: 18 },
  { number: 25, name: "الفرقان", englishName: "Al-Furqan", numberOfAyahs: 77, revelationType: "مكية", juz: 18 },
  { number: 26, name: "الشعراء", englishName: "Ash-Shu'ara", numberOfAyahs: 227, revelationType: "مكية", juz: 19 },
  { number: 27, name: "النمل", englishName: "An-Naml", numberOfAyahs: 93, revelationType: "مكية", juz: 19 },
  { number: 28, name: "القصص", englishName: "Al-Qasas", numberOfAyahs: 88, revelationType: "مكية", juz: 20 },
  { number: 29, name: "العنكبوت", englishName: "Al-'Ankabut", numberOfAyahs: 69, revelationType: "مكية", juz: 20 },
  { number: 30, name: "الروم", englishName: "Ar-Rum", numberOfAyahs: 60, revelationType: "مكية", juz: 21 },
  { number: 31, name: "لقمان", englishName: "Luqman", numberOfAyahs: 34, revelationType: "مكية", juz: 21 },
  { number: 32, name: "السجدة", englishName: "As-Sajdah", numberOfAyahs: 30, revelationType: "مكية", juz: 21 },
  { number: 33, name: "الأحزاب", englishName: "Al-Ahzab", numberOfAyahs: 73, revelationType: "مدنية", juz: 21 },
  { number: 34, name: "سبأ", englishName: "Saba", numberOfAyahs: 54, revelationType: "مكية", juz: 22 },
  { number: 35, name: "فاطر", englishName: "Fatir", numberOfAyahs: 45, revelationType: "مكية", juz: 22 },
  { number: 36, name: "يس", englishName: "Ya-Sin", numberOfAyahs: 83, revelationType: "مكية", juz: 22 },
  { number: 37, name: "الصافات", englishName: "As-Saffat", numberOfAyahs: 182, revelationType: "مكية", juz: 23 },
  { number: 38, name: "ص", englishName: "Sad", numberOfAyahs: 88, revelationType: "مكية", juz: 23 },
  { number: 39, name: "الزمر", englishName: "Az-Zumar", numberOfAyahs: 75, revelationType: "مكية", juz: 23 },
  { number: 40, name: "غافر", englishName: "Ghafir", numberOfAyahs: 85, revelationType: "مكية", juz: 24 },
  { number: 41, name: "فصلت", englishName: "Fussilat", numberOfAyahs: 54, revelationType: "مكية", juz: 24 },
  { number: 42, name: "الشورى", englishName: "Ash-Shura", numberOfAyahs: 53, revelationType: "مكية", juz: 25 },
  { number: 43, name: "الزخرف", englishName: "Az-Zukhruf", numberOfAyahs: 89, revelationType: "مكية", juz: 25 },
  { number: 44, name: "الدخان", englishName: "Ad-Dukhan", numberOfAyahs: 59, revelationType: "مكية", juz: 25 },
  { number: 45, name: "الجاثية", englishName: "Al-Jathiyah", numberOfAyahs: 37, revelationType: "مكية", juz: 25 },
  { number: 46, name: "الأحقاف", englishName: "Al-Ahqaf", numberOfAyahs: 35, revelationType: "مكية", juz: 26 },
  { number: 47, name: "محمد", englishName: "Muhammad", numberOfAyahs: 38, revelationType: "مدنية", juz: 26 },
  { number: 48, name: "الفتح", englishName: "Al-Fath", numberOfAyahs: 29, revelationType: "مدنية", juz: 26 },
  { number: 49, name: "الحجرات", englishName: "Al-Hujurat", numberOfAyahs: 18, revelationType: "مدنية", juz: 26 },
  { number: 50, name: "ق", englishName: "Qaf", numberOfAyahs: 45, revelationType: "مكية", juz: 26 },
  { number: 51, name: "الذاريات", englishName: "Adh-Dhariyat", numberOfAyahs: 60, revelationType: "مكية", juz: 26 },
  { number: 52, name: "الطور", englishName: "At-Tur", numberOfAyahs: 49, revelationType: "مكية", juz: 27 },
  { number: 53, name: "النجم", englishName: "An-Najm", numberOfAyahs: 62, revelationType: "مكية", juz: 27 },
  { number: 54, name: "القمر", englishName: "Al-Qamar", numberOfAyahs: 55, revelationType: "مكية", juz: 27 },
  { number: 55, name: "الرحمن", englishName: "Ar-Rahman", numberOfAyahs: 78, revelationType: "مدنية", juz: 27 },
  { number: 56, name: "الواقعة", englishName: "Al-Waqi'ah", numberOfAyahs: 96, revelationType: "مكية", juz: 27 },
  { number: 57, name: "الحديد", englishName: "Al-Hadid", numberOfAyahs: 29, revelationType: "مدنية", juz: 27 },
  { number: 58, name: "المجادلة", englishName: "Al-Mujadilah", numberOfAyahs: 22, revelationType: "مدنية", juz: 28 },
  { number: 59, name: "الحشر", englishName: "Al-Hashr", numberOfAyahs: 24, revelationType: "مدنية", juz: 28 },
  { number: 60, name: "الممتحنة", englishName: "Al-Mumtahanah", numberOfAyahs: 13, revelationType: "مدنية", juz: 28 },
  { number: 61, name: "الصف", englishName: "As-Saff", numberOfAyahs: 14, revelationType: "مدنية", juz: 28 },
  { number: 62, name: "الجمعة", englishName: "Al-Jumu'ah", numberOfAyahs: 11, revelationType: "مدنية", juz: 28 },
  { number: 63, name: "المنافقون", englishName: "Al-Munafiqun", numberOfAyahs: 11, revelationType: "مدنية", juz: 28 },
  { number: 64, name: "التغابن", englishName: "At-Taghabun", numberOfAyahs: 18, revelationType: "مدنية", juz: 28 },
  { number: 65, name: "الطلاق", englishName: "At-Talaq", numberOfAyahs: 12, revelationType: "مدنية", juz: 28 },
  { number: 66, name: "التحريم", englishName: "At-Tahrim", numberOfAyahs: 12, revelationType: "مدنية", juz: 28 },
  { number: 67, name: "الملك", englishName: "Al-Mulk", numberOfAyahs: 30, revelationType: "مكية", juz: 29 },
  { number: 68, name: "القلم", englishName: "Al-Qalam", numberOfAyahs: 52, revelationType: "مكية", juz: 29 },
  { number: 69, name: "الحاقة", englishName: "Al-Haqqah", numberOfAyahs: 52, revelationType: "مكية", juz: 29 },
  { number: 70, name: "المعارج", englishName: "Al-Ma'arij", numberOfAyahs: 44, revelationType: "مكية", juz: 29 },
  { number: 71, name: "نوح", englishName: "Nuh", numberOfAyahs: 28, revelationType: "مكية", juz: 29 },
  { number: 72, name: "الجن", englishName: "Al-Jinn", numberOfAyahs: 28, revelationType: "مكية", juz: 29 },
  { number: 73, name: "المزمل", englishName: "Al-Muzzammil", numberOfAyahs: 20, revelationType: "مكية", juz: 29 },
  { number: 74, name: "المدثر", englishName: "Al-Muddaththir", numberOfAyahs: 56, revelationType: "مكية", juz: 29 },
  { number: 75, name: "القيامة", englishName: "Al-Qiyamah", numberOfAyahs: 40, revelationType: "مكية", juz: 29 },
  { number: 76, name: "الإنسان", englishName: "Al-Insan", numberOfAyahs: 31, revelationType: "مدنية", juz: 29 },
  { number: 77, name: "المرسلات", englishName: "Al-Mursalat", numberOfAyahs: 50, revelationType: "مكية", juz: 29 },
  { number: 78, name: "النبأ", englishName: "An-Naba", numberOfAyahs: 40, revelationType: "مكية", juz: 30 },
  { number: 79, name: "النازعات", englishName: "An-Nazi'at", numberOfAyahs: 46, revelationType: "مكية", juz: 30 },
  { number: 80, name: "عبس", englishName: "'Abasa", numberOfAyahs: 42, revelationType: "مكية", juz: 30 },
  { number: 81, name: "التكوير", englishName: "At-Takwir", numberOfAyahs: 29, revelationType: "مكية", juz: 30 },
  { number: 82, name: "الانفطار", englishName: "Al-Infitar", numberOfAyahs: 19, revelationType: "مكية", juz: 30 },
  { number: 83, name: "المطففين", englishName: "Al-Mutaffifin", numberOfAyahs: 36, revelationType: "مكية", juz: 30 },
  { number: 84, name: "الانشقاق", englishName: "Al-Inshiqaq", numberOfAyahs: 25, revelationType: "مكية", juz: 30 },
  { number: 85, name: "البروج", englishName: "Al-Buruj", numberOfAyahs: 22, revelationType: "مكية", juz: 30 },
  { number: 86, name: "الطارق", englishName: "At-Tariq", numberOfAyahs: 17, revelationType: "مكية", juz: 30 },
  { number: 87, name: "الأعلى", englishName: "Al-A'la", numberOfAyahs: 19, revelationType: "مكية", juz: 30 },
  { number: 88, name: "الغاشية", englishName: "Al-Ghashiyah", numberOfAyahs: 26, revelationType: "مكية", juz: 30 },
  { number: 89, name: "الفجر", englishName: "Al-Fajr", numberOfAyahs: 30, revelationType: "مكية", juz: 30 },
  { number: 90, name: "البلد", englishName: "Al-Balad", numberOfAyahs: 20, revelationType: "مكية", juz: 30 },
  { number: 91, name: "الشمس", englishName: "Ash-Shams", numberOfAyahs: 15, revelationType: "مكية", juz: 30 },
  { number: 92, name: "الليل", englishName: "Al-Layl", numberOfAyahs: 21, revelationType: "مكية", juz: 30 },
  { number: 93, name: "الضحى", englishName: "Ad-Duha", numberOfAyahs: 11, revelationType: "مكية", juz: 30 },
  { number: 94, name: "الشرح", englishName: "Ash-Sharh", numberOfAyahs: 8, revelationType: "مكية", juz: 30 },
  { number: 95, name: "التين", englishName: "At-Tin", numberOfAyahs: 8, revelationType: "مكية", juz: 30 },
  { number: 96, name: "العلق", englishName: "Al-'Alaq", numberOfAyahs: 19, revelationType: "مكية", juz: 30 },
  { number: 97, name: "القدر", englishName: "Al-Qadr", numberOfAyahs: 5, revelationType: "مكية", juz: 30 },
  { number: 98, name: "البينة", englishName: "Al-Bayyinah", numberOfAyahs: 8, revelationType: "مدنية", juz: 30 },
  { number: 99, name: "الزلزلة", englishName: "Az-Zalzalah", numberOfAyahs: 8, revelationType: "مدنية", juz: 30 },
  { number: 100, name: "العاديات", englishName: "Al-'Adiyat", numberOfAyahs: 11, revelationType: "مكية", juz: 30 },
  { number: 101, name: "القارعة", englishName: "Al-Qari'ah", numberOfAyahs: 11, revelationType: "مكية", juz: 30 },
  { number: 102, name: "التكاثر", englishName: "At-Takathur", numberOfAyahs: 8, revelationType: "مكية", juz: 30 },
  { number: 103, name: "العصر", englishName: "Al-'Asr", numberOfAyahs: 3, revelationType: "مكية", juz: 30 },
  { number: 104, name: "الهمزة", englishName: "Al-Humazah", numberOfAyahs: 9, revelationType: "مكية", juz: 30 },
  { number: 105, name: "الفيل", englishName: "Al-Fil", numberOfAyahs: 5, revelationType: "مكية", juz: 30 },
  { number: 106, name: "قريش", englishName: "Quraysh", numberOfAyahs: 4, revelationType: "مكية", juz: 30 },
  { number: 107, name: "الماعون", englishName: "Al-Ma'un", numberOfAyahs: 7, revelationType: "مكية", juz: 30 },
  { number: 108, name: "الكوثر", englishName: "Al-Kawthar", numberOfAyahs: 3, revelationType: "مكية", juz: 30 },
  { number: 109, name: "الكافرون", englishName: "Al-Kafirun", numberOfAyahs: 6, revelationType: "مكية", juz: 30 },
  { number: 110, name: "النصر", englishName: "An-Nasr", numberOfAyahs: 3, revelationType: "مدنية", juz: 30 },
  { number: 111, name: "المسد", englishName: "Al-Masad", numberOfAyahs: 5, revelationType: "مكية", juz: 30 },
  { number: 112, name: "الإخلاص", englishName: "Al-Ikhlas", numberOfAyahs: 4, revelationType: "مكية", juz: 30 },
  { number: 113, name: "الفلق", englishName: "Al-Falaq", numberOfAyahs: 5, revelationType: "مكية", juz: 30 },
  { number: 114, name: "الناس", englishName: "An-Nas", numberOfAyahs: 6, revelationType: "مكية", juz: 30 }
];

export const FAMOUS_RECITERS = [
  { id: "minshawi", name: "الشيخ محمد صديق المنشاوي (المصحف المعلم)", style: "خشوع وعذوبة الصوت وترسيخ الحفظ للناشئة", everyAyahFolder: "Minshawy_Teacher_128kbps", hasAudio: true },
  { id: "hussary", name: "الشيخ محمود خليل الحصري (المصحف المعلم)", style: "إتقان الأحكام ومخارج الحروف والتأني الفائق", everyAyahFolder: "Husary_Muallim_128kbps", hasAudio: true },
  { id: "afasy", name: "الشيخ مشاري بن راشد العفاسي", style: "نبرة محببة وعصرية للأجيال الناشئة", everyAyahFolder: "Alafasy_128kbps", hasAudio: true },
  { id: "hudhaify", name: "الشيخ علي بن عبد الرحمن الحذيفي", style: "وضوح الترتيل وسلاسة القراءة وضبط الوقف والابتداء", everyAyahFolder: "Hudhaify_128kbps", hasAudio: true },
  { id: "abdulbasit", name: "الشيخ عبد الباسط عبد الصمد (المصحف المرتل)", style: "فصاحة الصوت وقوة الأداء القرآني", everyAyahFolder: "Abdul_Basit_Murattal_192kbps", hasAudio: true },
  { id: "suwaid", name: "الدكتور أيمن رشدي سويد", style: "التطبيق العملي الدقيق لقواعد التجويد ومخارج الحروف", everyAyahFolder: "Ayman_Sowaid_64kbps", hasAudio: true }
];

/**
 * Returns the direct high-quality audio URL for any Surah and Ayah from EveryAyah CDN
 */
export function getAyahAudioUrl(surahNumber: number, ayahNumber: number, reciterIdOrFolder: string = 'minshawi'): string {
  const reciter = FAMOUS_RECITERS.find(
    r => r.id === reciterIdOrFolder || r.name === reciterIdOrFolder || r.everyAyahFolder === reciterIdOrFolder
  ) || FAMOUS_RECITERS[0];
  const folder = reciter.everyAyahFolder || 'Minshawy_Teacher_128kbps';
  const sStr = String(surahNumber).padStart(3, '0');
  const aStr = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/${folder}/${sStr}${aStr}.mp3`;
}

/**
 * Find surah by name, number, or fuzzy matching
 */
export function getSurahInfo(identifier: string | number): SurahInfo {
  if (typeof identifier === 'number') {
    const found = QURAN_SURAHS.find(s => s.number === identifier);
    return found || QURAN_SURAHS[0];
  }

  const cleanName = identifier
    .replace(/^سورة\s+/, '')
    .replace(/^(ال)/, '')
    .trim();

  const exact = QURAN_SURAHS.find(
    s =>
      s.name === identifier ||
      s.name === `سورة ${identifier}` ||
      s.name.replace(/^(ال)/, '') === cleanName ||
      s.englishName.toLowerCase() === identifier.toLowerCase()
  );

  return exact || QURAN_SURAHS[113]; // Default to An-Nas if not found
}

/**
 * Pedagogical Quranic Assignment Calculator
 * Calculates REALISTIC, accurate ayah ranges that NEVER exceed surah ayah counts
 */
export function calculateRealisticQuranAssignment(
  surahIdentifier: string | number,
  startAyah: number = 1,
  level: string = 'متوسط',
  dailyTarget: string = 'نصف وجه'
) {
  const surah = getSurahInfo(surahIdentifier);
  const totalAyahs = surah.numberOfAyahs;
  
  const validStartAyah = Math.max(1, Math.min(startAyah, totalAyahs));
  
  // Determine realistic ayah count based on surah length and student level
  let step = 5;
  if (totalAyahs <= 10) {
    // Short Surahs (e.g. Al-Ikhlas, An-Nas, Al-Falaq, Al-Kawthar, Al-Asr)
    step = totalAyahs; // Assign whole surah or remaining
  } else if (totalAyahs <= 30) {
    step = level === 'ضعيف' ? 4 : level === 'قوي' ? 10 : 6;
  } else {
    // Long Surahs (Al-Baqarah, etc.)
    step = level === 'ضعيف' ? 5 : level === 'قوي' ? 15 : 8;
  }

  let endAyah = validStartAyah + step - 1;
  let isCompleteSurah = false;
  let nextSurahRecommendation = '';

  if (validStartAyah === 1 && (endAyah >= totalAyahs || totalAyahs <= 12)) {
    // Whole surah
    endAyah = totalAyahs;
    isCompleteSurah = true;
  } else if (endAyah >= totalAyahs) {
    endAyah = totalAyahs;
    // Next surah in order
    if (surah.number > 1) {
      const prevSurahInJuz = QURAN_SURAHS.find(s => s.number === surah.number - 1);
      if (prevSurahInJuz) {
        nextSurahRecommendation = `ثم الشروع في سورة ${prevSurahInJuz.name}`;
      }
    }
  }

  let newMemorizationText = '';
  if (isCompleteSurah) {
    newMemorizationText = `سورة ${surah.name} كاملة (الآيات 1 - ${totalAyahs})`;
  } else if (validStartAyah === endAyah) {
    newMemorizationText = `سورة ${surah.name}: الآية (${validStartAyah}) مع إتقانها وتثبيتها`;
  } else {
    newMemorizationText = `سورة ${surah.name}: من الآية (${validStartAyah}) إلى الآية (${endAyah})`;
    if (endAyah === totalAyahs) {
      newMemorizationText += ` (ختام السورة)`;
    }
  }

  // Realistic review assignment based on Juz & previous surahs
  let reviewText = '';
  if (surah.number < 114) {
    const nextSurahs = QURAN_SURAHS.filter(s => s.number > surah.number && s.number <= surah.number + 2);
    if (nextSurahs.length > 0) {
      reviewText = `مراجعة وتثبيت سورة ${nextSurahs.map(s => s.name).join(' و ')}`;
    } else {
      reviewText = `مراجعة وتثبيت ما تم حفظه من جزء ${surah.juz}`;
    }
  } else {
    reviewText = `مراجعة قصار السور من سورة الفيل إلى سورة الفلق وتثبيتها`;
  }

  // Recommended reader based on level
  const suggestedSheikh =
    level === 'ضعيف'
      ? 'الشيخ محمود خليل الحصري (المصحف المعلم - سرعة معتدلة ومخارج واضحة)'
      : level === 'قوي'
      ? 'الشيخ علي بن عبد الرحمن الحذيفي أو الشيخ مشاري العفاسي'
      : 'الشيخ محمد صديق المنشاوي (المصحف المرتل)';

  const dailyNote = isCompleteSurah
    ? `تهانينا للطالب على إتمام سورة ${surah.name}! يرجى التسميع للوالدين مرتين قبل النوم.`
    : `يرجى تكرار الآيات المقررة (${validStartAyah} - ${endAyah}) 5 مرات على الأقل بالاستماع والترديد.`;

  const tajweedFocus =
    totalAyahs <= 20
      ? 'تحقيق همزات القطع وضبط الغنن وأحكام القلقلة'
      : 'مراعاة المدود الطبيعية والفرعية وضبط أزمنة الغنن ومخارج الحروف';

  return {
    surah,
    fromAyah: validStartAyah,
    startAyah: validStartAyah,
    toAyah: endAyah,
    totalAyahs,
    newMemorization: newMemorizationText,
    review: reviewText,
    suggestedSheikh,
    tajweedFocus,
    dailyNote,
    nextSurahRecommendation
  };
}

export const REVIEW_TYPES = [
  "مراجعة صغرى (السور القريبة)",
  "مراجعة كبرى (الأجزاء السابقة)",
  "مراجعة تراكمية",
  "تثبيت المصحف",
  "اختبار مرحلي / سبر",
  "سورة مخصصة",
  "مراجعة عامة"
];

/**
 * Format Quran recitation range into clear Arabic text, supporting single or multi-surah ranges
 */
export function formatQuranPortion(
  surahName: string,
  fromAyah: number,
  toAyah: number,
  totalAyahs?: number,
  type?: string,
  toSurahName?: string,
  toSurahTotalAyahs?: number
): string {
  const cleanFromSurah = surahName.startsWith("سورة ") ? surahName.replace("سورة ", "").trim() : surahName.trim();
  const cleanToSurah = toSurahName
    ? (toSurahName.startsWith("سورة ") ? toSurahName.replace("سورة ", "").trim() : toSurahName.trim())
    : cleanFromSurah;

  let text = "";

  // Check if reciting across multiple surahs (e.g. from An-Nas 1 to Al-Alaq 4)
  if (toSurahName && cleanToSurah !== cleanFromSurah) {
    text = `من سورة ${cleanFromSurah} (الآية ${fromAyah}) إلى سورة ${cleanToSurah} (الآية ${toAyah})`;
    if (toSurahTotalAyahs && toAyah >= toSurahTotalAyahs) {
      text += ` (ختام سورة ${cleanToSurah})`;
    }
  } else {
    // Single Surah range
    const isFull = totalAyahs ? (fromAyah === 1 && toAyah >= totalAyahs) : false;
    if (isFull) {
      text = `سورة ${cleanFromSurah} كاملة (الآيات 1 - ${totalAyahs})`;
    } else if (fromAyah === toAyah) {
      text = `سورة ${cleanFromSurah}: الآية (${fromAyah})`;
    } else {
      text = `سورة ${cleanFromSurah}: من الآية (${fromAyah}) إلى الآية (${toAyah})`;
      if (totalAyahs && toAyah >= totalAyahs) {
        text += ` (ختام السورة)`;
      }
    }
  }

  if (type && !type.includes("حفظ جديد")) {
    return `${type}: ${text}`;
  }
  return text;
}

