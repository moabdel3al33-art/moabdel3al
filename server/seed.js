'use strict';
// Demo content so the site does not look empty on the first run. Edit or delete it from the admin panel.
const { count, insert } = require('./db');
const { now } = require('./util');

const DEMO_VIDEO = 'https://vimeo.com/76979871';

async function demo() {
  if ((await count('courses')) + (await count('books')) + (await count('posts')) > 0) return;
  const t = now();
  const base = { published: 1, created_at: t, updated_at: t };

  const c1 = await insert('courses', {
    ...base, slug: 'أسرار-التلاعب-النفسي', sort: 1, price: 499, old_price: 799,
    title: 'أسرار التلاعب النفسي',
    subtitle: 'كيف تكتشف المتلاعب قبل أن يسيطر عليك',
    description: '## ماذا ستتعلم؟\n- أشهر ٧ أساليب يستخدمها المتلاعبون في العلاقات والعمل\n- كيف تقول **لا** بدون شعور بالذنب\n- كيف تحمي نفسك من الابتزاز العاطفي\n\n## لمن هذا الكورس؟\nلكل شخص شعر يوماً أنه يُستغَل ولا يعرف السبب.\n\n> المعرفة هي خط الدفاع الأول.',
  });
  const c2 = await insert('courses', {
    ...base, slug: 'لغة-الجسد-المظلمة', sort: 2, price: 349,
    title: 'لغة الجسد المظلمة',
    subtitle: 'اقرأ ما لا يقوله الناس',
    description: 'كورس عملي يعلّمك قراءة الإشارات الخفية في الوجه والجسد والصوت، وكيف تكتشف الكذب والتوتر والنوايا الخفية.',
  });
  const lessons = [
    [c1, 'مقدمة: ما هو التلاعب النفسي؟', '08:20', 1],
    [c1, 'الإضاءة الغازية (Gaslighting)', '14:05', 0],
    [c1, 'الابتزاز العاطفي وكيف تواجهه', '17:40', 0],
    [c1, 'بناء حدود لا تُكسر', '12:10', 0],
    [c2, 'أساسيات قراءة الوجه', '10:00', 1],
    [c2, 'إشارات الكذب الخمس', '15:30', 0],
    [c2, 'الصوت ونبرة الكلام', '09:45', 0],
  ];
  let sort = 0;
  for (const [course_id, title, duration, is_preview] of lessons) {
    await insert('lessons', { course_id, title, duration, is_preview, video_url: DEMO_VIDEO, sort: ++sort, notes: is_preview ? 'هذا الدرس متاح مجاناً للتجربة.' : null, created_at: t, updated_at: t });
  }

  await insert('books', {
    ...base, slug: 'العقل-المخترق', sort: 1, price: 150, pages: 210,
    title: 'العقل المُخترَق', subtitle: 'كيف تُزرع الأفكار في رأسك دون أن تشعر',
    description: 'كتاب يشرح بلغة بسيطة كيف تعمل الدعاية والإعلانات ووسائل التواصل على تشكيل قراراتك، وكيف تستعيد السيطرة على عقلك.',
  });
  await insert('books', {
    ...base, slug: 'وجوه-خلف-الأقنعة', sort: 2, price: 120, pages: 160,
    title: 'وجوه خلف الأقنعة', subtitle: 'دليلك لفهم الشخصيات الصعبة',
    description: 'النرجسي، السيكوباتي، والمتلاعب الهادئ… تعرّف على الشخصيات الصعبة وكيف تتعامل معها بذكاء.',
  });

  await insert('posts', {
    ...base, slug: '5-علامات-تكشف-الشخص-النرجسي', published_at: t - 2 * 864e5,
    title: '5 علامات تكشف الشخص النرجسي',
    excerpt: 'النرجسي لا يظهر على حقيقته من أول لقاء… لكن هناك علامات لا تخطئ.',
    body: 'النرجسي لا يظهر على حقيقته من أول لقاء، لكن هناك علامات واضحة إذا عرفتها:\n\n1. يحتاج إلى الإعجاب باستمرار\n2. لا يتحمل النقد أبداً\n3. يقلل من إنجازاتك\n4. يلعب دور الضحية\n5. يختفي عندما تحتاجه\n\n> إذا لاحظت ٣ علامات أو أكثر، فقد حان الوقت لوضع حدود.',
  });
  await insert('posts', {
    ...base, slug: 'لماذا-نصدق-الكذبة-إذا-تكررت', published_at: t - 5 * 864e5,
    title: 'لماذا نصدق الكذبة إذا تكررت؟',
    excerpt: 'تأثير "الحقيقة الوهمية" وكيف يستخدمه الإعلام والمتلاعبون.',
    body: 'عقلنا يحب الأشياء المألوفة. كلما سمعنا معلومة أكثر، شعرنا أنها **صحيحة** حتى لو كانت كاذبة. هذا ما يسميه علماء النفس **تأثير الحقيقة الوهمية**.\n\n## كيف تحمي نفسك؟\n- اسأل دائماً: ما مصدر هذه المعلومة؟\n- لا تحكم على صحة الكلام من عدد مرات سماعه',
  });

  await insert('consult_types', {
    ...base, sort: 1, price: 40, price_today: 80, price_2d: 60, price_4d: 40, title: 'استشارة فردية كاملة',
    description: 'جلسة أونلاين خاصة لمدة ساعة لمناقشة موقفك بالتفصيل (علاقة، عمل، أسرة) والخروج بخطة واضحة.',
  });
  await insert('consult_types', {
    ...base, sort: 2, price: 25, price_today: 50, price_2d: 35, price_4d: 25, title: 'جلسة سريعة',
    description: 'نصف ساعة للإجابة عن سؤال محدد أو موقف عاجل.',
  });

  const qr = [
    ['ترحيب', 'أهلاً بيك 👋 معاك فريق محمد عبد العال، إزاي نقدر نساعدك؟'],
    ['دفع', 'طرق الدفع المتاحة:\n• فودافون كاش: 01000000000\n• إنستاباي: example@instapay\nابعتلنا صورة التحويل هنا وهنفعّل طلبك فوراً ✅'],
    ['تم', 'تم تفعيل طلبك بنجاح ✅ تقدر تلاقيه دلوقتي في صفحة حسابي. لو احتجت أي حاجة احنا هنا.'],
  ];
  for (const [title, body] of qr) await insert('quick_replies', { title, body, created_at: t });
  console.log('  Added demo content (courses, books, articles, consultations). Edit or delete it from the admin panel.');
}

// Default membership plans (only when there are none). Prices are examples - edit them in the admin panel.
async function plans() {
  if ((await count('plans')) > 0) return;
  const t = now();
  const rows = [
    ['اشتراك شهري', 1, 199, null, 'وصول كامل لكل الكورسات والكتب لمدة شهر.'],
    ['اشتراك 3 شهور', 3, 499, 597, 'وفّر أكثر من 15% مقارنة بالشهري.'],
    ['اشتراك 6 شهور', 6, 899, 1194, 'الأكثر طلباً — نصف سنة من التعلم بدون حدود.'],
    ['اشتراك سنوي', 12, 1499, 2388, 'أفضل قيمة: سنة كاملة بأقل من نصف السعر.'],
  ];
  let sort = 0;
  for (const [title, months, price, old, description] of rows) {
    await insert('plans', { title, months, price, old_price: old, description, published: 1, sort: ++sort, created_at: t, updated_at: t });
  }
  console.log('  Added 4 membership plans (monthly, 3, 6 and 12 months). Edit prices in the admin panel.');
}

// Consultation types made before the 3 booking options: their old price becomes the "within 4 days" price.
async function consultTiers() {
  const { col } = require('./db');
  await col('consult_types').updateMany({ price_today: { $exists: false }, price_2d: { $exists: false }, price_4d: { $exists: false } },
    [{ $set: { price_4d: { $cond: [{ $gt: ['$price', 0] }, '$price', null] }, price_today: null, price_2d: null } }]);
}

module.exports = { demo, plans, consultTiers };
