// Shared location item type — also used by LocationPicker and home
export type LocationItem = { id: string; name: string; category?: string };

export type Country = {
  id: string;
  nameAr: string;
  nameEn: string;
  currency: string;
};

export type City = {
  id: string;
  countryId: string;
  nameAr: string;
  nameEn: string;
  zonesAr: string[];
  zonesEn: string[];
  locationItems?: LocationItem[];
};

export type VehicleType = {
  id: string;
  nameAr: string;
  nameEn: string;
  baseFare: number;
  perKmFare: number;
  minimumFare: number;
  icon: string;
};

export type ServiceMode = {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  fareMultiplier: number;
  icon: string;
  isMultiStop?: boolean;
  maxStops?: number;
};

export const countries: Country[] = [
  { id: 'sd', nameAr: 'السودان', nameEn: 'Sudan', currency: 'SDG' },
  { id: 'sa', nameAr: 'السعودية', nameEn: 'Saudi Arabia', currency: 'SAR' }
];

// ─── All 212 Rufaa zones — organized by 8 categories ─────────────────────────
export const rufaaLocationItems: LocationItem[] = [
  // أحياء وشوارع
  { id: 'rufaa-dimlotfy',       name: 'ديم لطفى',                         category: 'أحياء وشوارع' },
  { id: 'rufaa-dimlotfy-ext',   name: 'امتداد ديم لطفى',                  category: 'أحياء وشوارع' },
  { id: 'rufaa-dimwast',        name: 'ديم الوسط',                        category: 'أحياء وشوارع' },
  { id: 'rufaa-jnina',          name: 'حي الجنينة',                       category: 'أحياء وشوارع' },
  { id: 'rufaa-shaygia',        name: 'حى الشايقية',                      category: 'أحياء وشوارع' },
  { id: 'rufaa-shrlbn',         name: 'شارع اللبن',                       category: 'أحياء وشوارع' },
  { id: 'rufaa-shraydat',       name: 'شارع العيادات',                    category: 'أحياء وشوارع' },
  { id: 'rufaa-shrsiyagh',      name: 'شارع الصياغ',                      category: 'أحياء وشوارع' },
  { id: 'rufaa-omrab',          name: 'حى العمراب',                       category: 'أحياء وشوارع' },
  { id: 'rufaa-qabtab',         name: 'حى القبتاب',                       category: 'أحياء وشوارع' },
  { id: 'rufaa-fadnia',         name: 'حى الفادنية',                      category: 'أحياء وشوارع' },
  { id: 'rufaa-h17snab',        name: 'الحى 17 السناب',                   category: 'أحياء وشوارع' },
  { id: 'rufaa-dimawad-bitar',  name: 'ديم العوض البيطرى',                category: 'أحياء وشوارع' },
  { id: 'rufaa-dimawad-saha',   name: 'ديم العوض الساحة',                 category: 'أحياء وشوارع' },
  { id: 'rufaa-dimawad-snaa',   name: 'ديم العوض الصناعية',               category: 'أحياء وشوارع' },
  { id: 'rufaa-mantaqa-snaa',   name: 'المنطقة الصناعية',                 category: 'أحياء وشوارع' },
  { id: 'rufaa-dimnoor-bday',   name: 'ديم النور البداية',                category: 'أحياء وشوارع' },
  { id: 'rufaa-dimnoor-nhay',   name: 'ديم النور النهاية',                category: 'أحياء وشوارع' },
  { id: 'rufaa-hlaib',          name: 'حلايب',                            category: 'أحياء وشوارع' },
  { id: 'rufaa-h-amami',        name: 'الحى الامامى',                     category: 'أحياء وشوارع' },
  { id: 'rufaa-h23-azhari',     name: 'الحى 23 أزهري مصطفى',             category: 'أحياء وشوارع' },
  { id: 'rufaa-h24',            name: 'الحى 24',                          category: 'أحياء وشوارع' },
  { id: 'rufaa-h-amami-abn',    name: 'الحى الامامى اب نجامة',           category: 'أحياء وشوارع' },
  { id: 'rufaa-hsnab',          name: 'الحسيناب',                         category: 'أحياء وشوارع' },
  { id: 'rufaa-zidab',          name: 'الزيداب',                          category: 'أحياء وشوارع' },
  { id: 'rufaa-daqash',         name: 'الدقش',                            category: 'أحياء وشوارع' },
  { id: 'rufaa-shrahmar',       name: 'الشارع الأحمر التراكا',            category: 'أحياء وشوارع' },
  { id: 'rufaa-h23-abdrhmn',    name: 'الحى 23 عبد الرحمن نجمة',         category: 'أحياء وشوارع' },
  { id: 'rufaa-qaraan',         name: 'حى القرعان',                       category: 'أحياء وشوارع' },
  { id: 'rufaa-hsafa',          name: 'حى الصفاء كبري الحصاحيصا',        category: 'أحياء وشوارع' },

  // مرافق ومعالم
  { id: 'rufaa-maqabir-gharb',  name: 'المقابر الغربيه',                  category: 'مرافق ومعالم' },
  { id: 'rufaa-maqabir-shrq',   name: 'المقابر الشرقية',                  category: 'مرافق ومعالم' },
  { id: 'rufaa-maqabir-qadm',   name: 'المقابر القديمة',                  category: 'مرافق ومعالم' },
  { id: 'rufaa-salkhana',       name: 'السلخانة',                         category: 'مرافق ومعالم' },
  { id: 'rufaa-mawrda-qadm',    name: 'الموردة القديمة',                  category: 'مرافق ومعالم' },
  { id: 'rufaa-saha-shbia',     name: 'الساحة الشعبية',                   category: 'مرافق ومعالم' },
  { id: 'rufaa-dkn-wdsheen',    name: 'دكان ود الشين',                    category: 'مرافق ومعالم' },
  { id: 'rufaa-mazlqan',        name: 'المزلقان',                         category: 'مرافق ومعالم' },
  { id: 'rufaa-shkh-halla',     name: 'شيخ الحلة للمناسبات',             category: 'مرافق ومعالم' },
  { id: 'rufaa-dkn-fakhri',     name: 'دكان فخرى',                       category: 'مرافق ومعالم' },
  { id: 'rufaa-wqf-halla',      name: 'موقف الحلة الجديدة',              category: 'مرافق ومعالم' },
  { id: 'rufaa-tamin-sihi',     name: 'التأمين الصحي',                    category: 'مرافق ومعالم' },
  { id: 'rufaa-wqf-tmbul',      name: 'موقف تمبول (الحديقة البلدية)',    category: 'مرافق ومعالم' },
  { id: 'rufaa-wqf-khrtwm',     name: 'موقف الخرطوم',                    category: 'مرافق ومعالم' },
  { id: 'rufaa-wqf-mdni',       name: 'موقف مدني',                       category: 'مرافق ومعالم' },
  { id: 'rufaa-wqf-hsahisa',    name: 'موقف الحصاحيصا',                  category: 'مرافق ومعالم' },
  { id: 'rufaa-msnaa-hdid',     name: 'مصنع الحديد',                     category: 'مرافق ومعالم' },
  { id: 'rufaa-mtathn',         name: 'المطاحن',                          category: 'مرافق ومعالم' },
  { id: 'rufaa-dkn-noh',        name: 'ديم العوض دكان نوح',              category: 'مرافق ومعالم' },
  { id: 'rufaa-mhtta-abuyamn',  name: 'محطة ابو يمن',                    category: 'مرافق ومعالم' },
  { id: 'rufaa-mhtta-lastk',    name: 'محطة اللستك',                     category: 'مرافق ومعالم' },
  { id: 'rufaa-mhtta-nowsh',    name: 'محطة النوش',                      category: 'مرافق ومعالم' },
  { id: 'rufaa-dkn-bssa',       name: 'دكان بسة',                        category: 'مرافق ومعالم' },
  { id: 'rufaa-bqala-kmniya',   name: 'بقالة كمونية',                    category: 'مرافق ومعالم' },
  { id: 'rufaa-mhtta-wqd',      name: 'محطة وقود ديم النور',             category: 'مرافق ومعالم' },
  { id: 'rufaa-myah',           name: 'هيئة توفير المياه',               category: 'مرافق ومعالم' },
  { id: 'rufaa-dakhlia-mwrda',  name: 'داخلية الموردة',                  category: 'مرافق ومعالم' },
  { id: 'rufaa-stad-rfaa',      name: 'استاد رفاعة',                     category: 'مرافق ومعالم' },
  { id: 'rufaa-bqala-mljy',     name: 'بقالة مليجى',                     category: 'مرافق ومعالم' },
  { id: 'rufaa-mydan-afriqa',   name: 'ميدان الأفارقة',                  category: 'مرافق ومعالم' },
  { id: 'rufaa-mhtta-diab',     name: 'محطة دياب',                       category: 'مرافق ومعالم' },
  { id: 'rufaa-bqala-khalifa',  name: 'بقالة ود الخليفة',               category: 'مرافق ومعالم' },
  { id: 'rufaa-bqala-barbri',   name: 'بقالة البربرى',                   category: 'مرافق ومعالم' },
  { id: 'rufaa-stad-nashein',   name: 'استاد الناشئين',                  category: 'مرافق ومعالم' },
  { id: 'rufaa-ashlaq-bolis',   name: 'اشلاق البوليس',                   category: 'مرافق ومعالم' },

  // مستشفيات وعيادات
  { id: 'rufaa-mstosf-hikma',   name: 'مستوصف الحكمة',                   category: 'مستشفيات وعيادات' },
  { id: 'rufaa-bayara-halla',   name: 'بيارة الحلة الجديدة',             category: 'مستشفيات وعيادات' },
  { id: 'rufaa-iyada-abas',     name: 'عيادة د. عباس',                   category: 'مستشفيات وعيادات' },
  { id: 'rufaa-mstosf-ihsan',   name: 'مستوصف احسان الطبى',              category: 'مستشفيات وعيادات' },
  { id: 'rufaa-mstosf-jabri',   name: 'مستوصف الجابرى',                  category: 'مستشفيات وعيادات' },
  { id: 'rufaa-mstosf-jazira',  name: 'مستوصف الجزيرة',                  category: 'مستشفيات وعيادات' },
  { id: 'rufaa-mstshfa-talmi',  name: 'مستشفى رفاعة التعليمى',           category: 'مستشفيات وعيادات' },

  // مساجد وزوايا
  { id: 'rufaa-msid-shkhabas',  name: 'مسيد شيخ عبد الله الشيخ العباس', category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-shkhabas',  name: 'مسجد الشيخ عبد الله الشيخ العباس', category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-shuhda',    name: 'مسجد الشهداء',                    category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-khalifa-o', name: 'مسجد الخليفة عثمان',              category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-dimawad',   name: 'مسجد ديم العوض',                  category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-maka',      name: 'مسجد مكة',                        category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-madina',    name: 'مسجد المدينة',                    category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-ansar',     name: 'مسجد الانصار',                    category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-hsnab',     name: 'مسجد الحسيناب',                   category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-ansrsna',   name: 'مسجد أنصار السنة',               category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-abrar',     name: 'مسجد الأبرار حى 23',             category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-khalifa-a', name: 'مسجد الخليفة على',               category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-abubkr',    name: 'مسجد ابوبكر الصديق',             category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-fatima',    name: 'مسجد فاطمة الزهراء',             category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-taqwa',     name: 'مسجد التقوى',                     category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-rashid',    name: 'مسجد الرشيد عبد الله مجدوب',     category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-raqiya',    name: 'مسجد السيدة رقية',               category: 'مساجد وزوايا' },
  { id: 'rufaa-msgd-rdwan',     name: 'مسجد الرضوان ديم العوض',         category: 'مساجد وزوايا' },
  { id: 'rufaa-msid-qrashi',    name: 'مسيد شيخ قرشى',                  category: 'مساجد وزوايا' },
  { id: 'rufaa-msid-faris',     name: 'مسيد شيخ فارس',                  category: 'مساجد وزوايا' },
  { id: 'rufaa-msid-smani',     name: 'مسيد الشيخ السمانى',             category: 'مساجد وزوايا' },
  { id: 'rufaa-msid-omrein',    name: 'مسيد شيخ عمرين',                 category: 'مساجد وزوايا' },
  { id: 'rufaa-msid-shrif',     name: 'مسيد الشريف أبو القاسم',         category: 'مساجد وزوايا' },
  { id: 'rufaa-zawya-brhan',    name: 'زاوية البرهانية',                 category: 'مساجد وزوايا' },
  { id: 'rufaa-acadm-qasim',    name: 'اكاديمية قاسم البشير القرآنية',  category: 'مساجد وزوايا' },

  // مدارس وجامعات
  { id: 'rufaa-mdrsa-babkr',    name: 'مدرسة بابكر بدرى',               category: 'مدارس وجامعات' },
  { id: 'rufaa-mdrsa-rashad',   name: 'مدارس الرشاد الخاصة',            category: 'مدارس وجامعات' },
  { id: 'rufaa-mdrsa-fadni',    name: 'مدرسة عبدالله الفادني',          category: 'مدارس وجامعات' },
  { id: 'rufaa-mdrsa-tayb',     name: 'مدرسة الشيخ الطيّب',             category: 'مدارس وجامعات' },
  { id: 'rufaa-mdrsa-thanwi',   name: 'المدرسة الثانوية',               category: 'مدارس وجامعات' },
  { id: 'rufaa-mdrsa-hmira',    name: 'مدرسة الحميراء',                 category: 'مدارس وجامعات' },
  { id: 'rufaa-mdrsa-rqiya',    name: 'مدرسة رقية الطيب القرآنية',     category: 'مدارس وجامعات' },
  { id: 'rufaa-mdrsa-salh',     name: 'مدرسة صالح عبد الرحمن',         category: 'مدارس وجامعات' },
  { id: 'rufaa-mdrsa-rwad',     name: 'مدرسة الرواد',                   category: 'مدارس وجامعات' },
  { id: 'rufaa-mdrsa-nafisa',   name: 'مدرسة نفيسة عوض الكريم',        category: 'مدارس وجامعات' },
  { id: 'rufaa-mdrsa-sakina',   name: 'مدرسة سكينة ابو تركى',          category: 'مدارس وجامعات' },
  { id: 'rufaa-mdrsa-ali',      name: 'مدرسة على ابن ابى طالب',        category: 'مدارس وجامعات' },
  { id: 'rufaa-mdrsa-amria',    name: 'مدرسة رفاعة الأميرية بنين',     category: 'مدارس وجامعات' },
  { id: 'rufaa-mdrsa-snaia',    name: 'مدرسة رفاعة الصناعية',          category: 'مدارس وجامعات' },
  { id: 'rufaa-klt-trbia',      name: 'كلية التربية جامعة البطانة',    category: 'مدارس وجامعات' },
  { id: 'rufaa-klt-tibb',       name: 'كلية الطب جامعة البطانة',       category: 'مدارس وجامعات' },
  { id: 'rufaa-klt-eqtsd',      name: 'كلية الاقتصاد جامعة البطانة',   category: 'مدارس وجامعات' },
  { id: 'rufaa-idarah-jama',    name: 'إدارة جامعة البطانة',            category: 'مدارس وجامعات' },

  // حكومية وأمنية
  { id: 'rufaa-niyaba',         name: 'النيابة',                         category: 'حكومية وأمنية' },
  { id: 'rufaa-sujun',          name: 'السجون',                          category: 'حكومية وأمنية' },
  { id: 'rufaa-mahkama',        name: 'محكمة شرق الجزيرة',              category: 'حكومية وأمنية' },
  { id: 'rufaa-mahalia',        name: 'رئاسة محلية شرق الجزيرة',        category: 'حكومية وأمنية' },
  { id: 'rufaa-aradi',          name: 'مصلحة الأراضي',                  category: 'حكومية وأمنية' },
  { id: 'rufaa-misaha',         name: 'مصلحة المساحة',                  category: 'حكومية وأمنية' },
  { id: 'rufaa-bosta',          name: 'البوستة',                         category: 'حكومية وأمنية' },
  { id: 'rufaa-shurta',         name: 'قسم شرطة مدينة رفاعة',          category: 'حكومية وأمنية' },
  { id: 'rufaa-murur',          name: 'قسم مرور شرق الجزيرة',           category: 'حكومية وأمنية' },
  { id: 'rufaa-amn',            name: 'مكاتب الأمن',                    category: 'حكومية وأمنية' },
  { id: 'rufaa-talim',          name: 'مكاتب التعليم',                  category: 'حكومية وأمنية' },
  { id: 'rufaa-kahrba',         name: 'الكهرباء',                       category: 'حكومية وأمنية' },

  // أندية رياضية
  { id: 'rufaa-hilal',          name: 'نادي الهلال',                    category: 'أندية رياضية' },
  { id: 'rufaa-shuala',         name: 'نادى الشعلة',                    category: 'أندية رياضية' },
  { id: 'rufaa-amel',           name: 'نادى العامل',                    category: 'أندية رياضية' },
  { id: 'rufaa-taka',           name: 'نادى التاكا',                    category: 'أندية رياضية' },
  { id: 'rufaa-buhira',         name: 'نادى البحيرة',                   category: 'أندية رياضية' },
  { id: 'rufaa-ahli',           name: 'النادى الاهلى',                  category: 'أندية رياضية' },

  // مناطق محيطة
  { id: 'rufaa-bant',           name: 'بانت',                           category: 'مناطق محيطة' },
  { id: 'rufaa-omara',          name: 'العمارة',                        category: 'مناطق محيطة' },
  { id: 'rufaa-wdrhum',         name: 'ودرحوم',                         category: 'مناطق محيطة' },
  { id: 'rufaa-asid',           name: 'الأسيد',                         category: 'مناطق محيطة' },
  { id: 'rufaa-aziba',          name: 'العزيبة',                        category: 'مناطق محيطة' },
  { id: 'rufaa-sqia',           name: 'الصقيعة',                        category: 'مناطق محيطة' },
  { id: 'rufaa-sfita-tirab',    name: 'صفيتة تيراب',                    category: 'مناطق محيطة' },
  { id: 'rufaa-sfita-ghnum',    name: 'صفيتة الغنوماب',                 category: 'مناطق محيطة' },
  { id: 'rufaa-trajma',         name: 'التراجمة',                       category: 'مناطق محيطة' },
  { id: 'rufaa-tkla',           name: 'التكلة',                         category: 'مناطق محيطة' },
  { id: 'rufaa-abujlfa',        name: 'ابو جلفة',                       category: 'مناطق محيطة' },
  { id: 'rufaa-awayda-mhb',     name: 'العوايدة محبوب',                 category: 'مناطق محيطة' },
  { id: 'rufaa-awayda-1',       name: 'العوايدة 1',                     category: 'مناطق محيطة' },
  { id: 'rufaa-awayda-2',       name: 'العوايدة 2',                     category: 'مناطق محيطة' },
  { id: 'rufaa-rfain',          name: 'الرفاعيين',                      category: 'مناطق محيطة' },
  { id: 'rufaa-dlut-bhr',       name: 'دلوت البحر',                     category: 'مناطق محيطة' },
  { id: 'rufaa-dlut-qwz',       name: 'دلوت القوز',                     category: 'مناطق محيطة' },
  { id: 'rufaa-dlut',           name: 'دلوت',                           category: 'مناطق محيطة' },
  { id: 'rufaa-hbika-akod',     name: 'الهبيكة عكود',                   category: 'مناطق محيطة' },
  { id: 'rufaa-hbika',          name: 'الهبيكة',                        category: 'مناطق محيطة' },
  { id: 'rufaa-shrfa-bhr',      name: 'الشرفة البحر',                   category: 'مناطق محيطة' },
  { id: 'rufaa-shrfa-fwq',      name: 'الشرفة الفوق',                   category: 'مناطق محيطة' },
  { id: 'rufaa-shrfa-brkt',     name: 'الشرفة بركات',                   category: 'مناطق محيطة' },
  { id: 'rufaa-omalaila',       name: 'ام عليلة',                       category: 'مناطق محيطة' },
  { id: 'rufaa-qwz-btahn',      name: 'قوز البطاحين',                   category: 'مناطق محيطة' },
  { id: 'rufaa-qwz-ahmd',       name: 'قوز الاحامدة',                   category: 'مناطق محيطة' },
  { id: 'rufaa-omshq-sad',      name: 'ام شانق سعد',                    category: 'مناطق محيطة' },
  { id: 'rufaa-omshq-haj',      name: 'ام شانق حاج ابراهيم',           category: 'مناطق محيطة' },
  { id: 'rufaa-wdfadni',        name: 'ود الفادني',                     category: 'مناطق محيطة' },
  { id: 'rufaa-hshish',         name: 'حشيش',                           category: 'مناطق محيطة' },
  { id: 'rufaa-qrfa',           name: 'قرفة',                           category: 'مناطق محيطة' },
  { id: 'rufaa-rdma',           name: 'الرضمة',                         category: 'مناطق محيطة' },
  { id: 'rufaa-omtala',         name: 'أم طالة',                        category: 'مناطق محيطة' },
  { id: 'rufaa-omhrizat',       name: 'أم حريزات',                      category: 'مناطق محيطة' },
  { id: 'rufaa-omtlata',        name: 'أم تلاتة',                       category: 'مناطق محيطة' },
  { id: 'rufaa-omaksh',         name: 'أم عكش',                         category: 'مناطق محيطة' },
  { id: 'rufaa-blalab',         name: 'البلعلاب',                       category: 'مناطق محيطة' },
  { id: 'rufaa-laota',          name: 'اللعوتة',                        category: 'مناطق محيطة' },
  { id: 'rufaa-hdabat',         name: 'الحدبات',                        category: 'مناطق محيطة' },
  { id: 'rufaa-hndlab',         name: 'الحنضلاب',                       category: 'مناطق محيطة' },
  { id: 'rufaa-dkhakhn',        name: 'الدخاخين',                       category: 'مناطق محيطة' },
  { id: 'rufaa-siyal-fatr',     name: 'السيال فاطر',                    category: 'مناطق محيطة' },
  { id: 'rufaa-siyal-ahmd',     name: 'السيال الأحامدة',                category: 'مناطق محيطة' },
  { id: 'rufaa-siyal-njad',     name: 'السيال النجاضة',                 category: 'مناطق محيطة' },
  { id: 'rufaa-moalyab',        name: 'المعلياب',                       category: 'مناطق محيطة' },
  { id: 'rufaa-jnid-hla',       name: 'الجنيد الحلة',                   category: 'مناطق محيطة' },
  { id: 'rufaa-jnid-byra',      name: 'الجنيد البيارة',                 category: 'مناطق محيطة' },
  { id: 'rufaa-wdsid',          name: 'ود السيد',                       category: 'مناطق محيطة' },
  { id: 'rufaa-bwida',          name: 'البويضاء',                       category: 'مناطق محيطة' },
  { id: 'rufaa-tdamn',          name: 'التضامن',                        category: 'مناطق محيطة' },
  { id: 'rufaa-ghnumab',        name: 'الغنوماب',                       category: 'مناطق محيطة' },
  { id: 'rufaa-hdaf',           name: 'حداف',                           category: 'مناطق محيطة' },
  { id: 'rufaa-kriaat',         name: 'كريعات',                         category: 'مناطق محيطة' },
  { id: 'rufaa-tamari',         name: 'التمارى',                        category: 'مناطق محيطة' },
  { id: 'rufaa-hlalia',         name: 'الهلالية',                       category: 'مناطق محيطة' },
  { id: 'rufaa-branko',         name: 'برانكو',                         category: 'مناطق محيطة' },
  { id: 'rufaa-dim-ilyas',      name: 'ديم الياس',                      category: 'مناطق محيطة' },
  { id: 'rufaa-arybab',         name: 'العريباب',                       category: 'مناطق محيطة' },
  { id: 'rufaa-sbuhab',         name: 'الصبوحاب',                       category: 'مناطق محيطة' },
  { id: 'rufaa-homr',           name: 'الحمر',                          category: 'مناطق محيطة' },
  { id: 'rufaa-zrqa',           name: 'زرقة',                           category: 'مناطق محيطة' },
  { id: 'rufaa-adhusn',         name: 'عد الحسين',                      category: 'مناطق محيطة' },
  { id: 'rufaa-wdghlqa',        name: 'ود غلوقة',                       category: 'مناطق محيطة' },
  { id: 'rufaa-awak',           name: 'العوك',                          category: 'مناطق محيطة' },
  { id: 'rufaa-hjlij',          name: 'الهجليج',                        category: 'مناطق محيطة' },
  { id: 'rufaa-kdiwa',          name: 'الكديوة',                        category: 'مناطق محيطة' },
  { id: 'rufaa-dim-jadkrm',     name: 'ديم جاد كريم',                   category: 'مناطق محيطة' },
  { id: 'rufaa-maknun',         name: 'مكنون',                          category: 'مناطق محيطة' },
  { id: 'rufaa-wdhmaim',        name: 'ود الهميم',                      category: 'مناطق محيطة' },
  { id: 'rufaa-wdkashf',        name: 'ود الكاشف',                      category: 'مناطق محيطة' },
  { id: 'rufaa-tbaib',          name: 'التبيب',                         category: 'مناطق محيطة' },
  { id: 'rufaa-srwfab',         name: 'السروفاب',                       category: 'مناطق محيطة' },
  { id: 'rufaa-wdkhbir',        name: 'ود الخبير',                      category: 'مناطق محيطة' },
  { id: 'rufaa-blyab',          name: 'البلياب',                        category: 'مناطق محيطة' },
  { id: 'rufaa-awfina',         name: 'عوفينة',                         category: 'مناطق محيطة' },
  { id: 'rufaa-wdamin',         name: 'ود الأمين',                      category: 'مناطق محيطة' },
  { id: 'rufaa-wdadam',         name: 'ود ادم',                         category: 'مناطق محيطة' },
  { id: 'rufaa-tmbul',          name: 'تمبول',                          category: 'مناطق محيطة' },
  { id: 'rufaa-qlabis',         name: 'القلابيس',                       category: 'مناطق محيطة' },
];

// Derived string arrays — kept for backward-compatible index-based pickup/destination
export const rufaaZonesAr = rufaaLocationItems.map((z) => z.name);
export const rufaaZonesEn = rufaaLocationItems.map((z) => z.name);

export const cities: City[] = [
  {
    id: 'rufaa',
    countryId: 'sd',
    nameAr: 'رفاعة',
    nameEn: 'Rufaa',
    zonesAr: rufaaZonesAr,
    zonesEn: rufaaZonesEn,
    locationItems: rufaaLocationItems,
  },
  {
    id: 'khartoum',
    countryId: 'sd',
    nameAr: 'الخرطوم',
    nameEn: 'Khartoum',
    zonesAr: ['وسط الخرطوم', 'بحري', 'أمدرمان', 'السوق العربي', 'المطار'],
    zonesEn: ['Central Khartoum', 'Bahri', 'Omdurman', 'Arab Market', 'Airport']
  },
  {
    id: 'dammam',
    countryId: 'sa',
    nameAr: 'الدمام',
    nameEn: 'Dammam',
    zonesAr: ['وسط الدمام', 'الكورنيش', 'الشاطئ', 'الفيصلية', 'المطار'],
    zonesEn: ['Central Dammam', 'Corniche', 'Al Shati', 'Al Faisaliyah', 'Airport']
  }
];

export const vehicleTypes: VehicleType[] = [
  { id: 'rickshaw', nameAr: 'ركشة', nameEn: 'Rickshaw', baseFare: 500, perKmFare: 300, minimumFare: 1000, icon: 'R' },
];

export const serviceModes: ServiceMode[] = [
  {
    id: 'fast',
    nameAr: 'ركشة سريعة',
    nameEn: 'Fast ride',
    descriptionAr: 'أقرب ركشة متاحة بأقل زمن انتظار.',
    descriptionEn: 'Nearest available rickshaw with the shortest wait.',
    fareMultiplier: 1,
    icon: '↯'
  },
  {
    id: 'waqar',
    nameAr: 'ركشة الوقار',
    nameEn: 'Waqar ride',
    descriptionAr: 'سائقون كبار السن أو عالي التقييم لطمأنة العائلات.',
    descriptionEn: 'Senior or highly rated drivers for families and safety.',
    fareMultiplier: 1.15,
    icon: '✓'
  },
  {
    id: 'delivery',
    nameAr: 'جنبك دليفري',
    nameEn: 'Jnbk Delivery',
    descriptionAr: 'استلام أغراض من السوق وتوصيلها للمنزل.',
    descriptionEn: 'Pickup items from market and deliver home.',
    fareMultiplier: 1.2,
    icon: '□'
  },
  {
    id: 'emergency',
    nameAr: 'ركشة الطوارئ',
    nameEn: 'Emergency ride',
    descriptionAr: 'طلب عاجل مع أولوية تشغيل وتنبيه دعم.',
    descriptionEn: 'Urgent request with priority dispatch and support alert.',
    fareMultiplier: 1.25,
    icon: '!'
  },
  {
    id: 'offline_sms',
    nameAr: 'طلب أوفلاين SMS',
    nameEn: 'Offline SMS',
    descriptionAr: 'خيار بديل عند ضعف الإنترنت في الأحياء والقرى.',
    descriptionEn: 'Fallback request option for weak internet areas.',
    fareMultiplier: 1,
    icon: 'SMS'
  },
  {
    id: 'open_ride',
    nameAr: 'مشوار مفتوح',
    nameEn: 'Open Ride',
    descriptionAr: 'رحلة تصل إلى خمس حركات — أضف توقفاتك وادفع بحركة واحدة.',
    descriptionEn: 'Up to 5 stops in one trip — add your waypoints, pay once.',
    fareMultiplier: 1.3,
    icon: '⑤',
    isMultiStop: true,
    maxStops: 5,
  }
];

export function estimateFare(distanceKm: number, vehicle: VehicleType, multiplier = 1) {
  return Math.max(Math.round((vehicle.baseFare + distanceKm * vehicle.perKmFare) * multiplier), vehicle.minimumFare);
}
