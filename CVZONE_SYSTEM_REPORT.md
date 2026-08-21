# تقرير تنفيذ نظام CV Zone

## الملخص التنفيذي

تم تنفيذ طبقة النظام الكاملة على البنية الحالية لموقع CV Zone مع إبقاء الموقع العام متاحاً للزائر دون تسجيل. أصبح إنشاء الحساب اختيارياً ويظهر من خلال زر واحد في الهيدر، بينما أصبحت صفحات الحساب ولوحة الإدارة محمية بمصادقة Firebase Authentication وبصلاحيات مستخرجة من Firestore. يعتمد الأمان الفعلي على قواعد Firestore، وليس على إخفاء عناصر الواجهة أو تخزين كلمات مرور في المتصفح.

تحتاج بعض الخطوات التشغيلية إلى تنفيذها مرة واحدة من Firebase Console، وهي تفعيل مزود Email/Password، نشر قواعد Firestore، وإنشاء أول حساب ثم تعيين دوره إلى `super_admin`. هذه الخطوات لا يمكن تنفيذها بأمان من GitHub Pages أو من واجهة الزائر.

## 1. Structure — هيكل المشروع

| الملف | الوظيفة |
|---|---|
| `index.html` | الموقع العام، الخدمات، العروض، الأعمال، التعليقات، نموذج الطلب، وزر الحساب الاختياري |
| `firebase-config.js` | تهيئة Firebase المشتركة بين الصفحات |
| `auth.js` | التسجيل، الدخول، الخروج، استعادة كلمة السر، إنشاء ملف المستخدم، ومزامنة حالة الهيدر |
| `user-dashboard.html` | ملف المستخدم، الاشتراك، الإشعارات، وملفات CV الخاصة |
| `admin.html` | لوحة الإدارة الجديدة المحمية بالدور وتشمل الأقسام الإدارية الأساسية |
| `firestore.rules` | قواعد الوصول والملكية والصلاحيات في Firestore |
| `init-firebase.html` | تهيئة البيانات العامة الأولية فقط، دون كلمة مرور أدمن محلية |
| `ARCHITECTURE.md` | التصميم المعماري التفصيلي ومخطط البيانات |
| `TEST_NOTES.md` | نتائج الاختبارات المحلية |

تم إخراج لوحة التحكم القديمة التي كانت تعتمد على `localStorage` من مجلد النشر، حتى لا تبقى صفحة قديمة غير آمنة قابلة للوصول من GitHub Pages.

## 2. Database Schema — مخطط قاعدة البيانات

| Collection | الوثيقة والحقول الأساسية | من يقرأ؟ | من يكتب؟ |
|---|---|---|---|
| `users/{uid}` | `uid`, `email`, `displayName`, `phone`, `role`, `accountStatus`, timestamps | المستخدم لنفسه والأدمن | المستخدم لبياناته غير الحساسة، والأدمن للإدارة |
| `subscriptions/{uid}` | `userId`, `packageId`, `packageName`, `status`, `paymentStatus`, `startAt`, `endAt`, `notes` | المستخدم لصاحب الوثيقة والأدمن | الأدمن |
| `packages/{id}` | `name`, `price`, `currency`, `durationDays`, `features`, `active` | الجميع للباقة الفعالة | الأدمن |
| `content/{id}` | `key`, `value`, `type`, `active`, `updatedAt` | الجميع للمحتوى الفعال | Moderator أو Admin |
| `announcements/{id}` | `title`, `body`, `startsAt`, `endsAt`, `active` | الجميع للإعلان الفعال | Moderator أو Admin |
| `notifications/{id}` | `recipientId`, `title`, `body`, `read`, `createdAt` | المستخدم المستهدف والأدمن | الأدمن، والمستخدم يحدّث `read` فقط |
| `analytics_events/{id}` | `type`, `path`, `deviceType`, `sessionId`, `createdAt` | الأدمن | إنشاء مجهول من الواجهة، دون تعديل أو حذف |
| `adminLogs/{id}` | `actorUid`, `actorEmail`, `action`, `targetType`, `targetId`, `createdAt` | الأدمن | الأدمن، دون تعديل أو حذف |
| `cv_documents/{id}` | `userId`, `title`, `templateId`, `data`, `fileUrl`, timestamps | صاحب الملف والأدمن | المشترك النشط أو الأدمن |

يستخدم النظام وثيقة الاشتراك ذات المعرّف نفسه `uid` حتى يكون التحقق من الاشتراك داخل قواعد Firestore مباشراً. لا تعتبر قيمة الحالة الموجودة في الواجهة دليلاً على الصلاحية؛ فقاعدة Firestore تشترط الدور والاشتراك النشط وتاريخ الانتهاء قبل السماح بإنشاء أو تعديل ملف CV.

## 3. Firebase Setup — إعداد Firebase

من [Firebase Console](https://console.firebase.google.com/) افتح المشروع `cvzone-app-9a41b`، ثم فعّل **Authentication** واختَر مزود **Email/Password**. فعّل **Cloud Firestore** في وضع الإنتاج، ثم انسخ محتوى `firestore.rules` إلى تبويب Rules وانشره. إذا احتاجت ملفات CV إلى رفع ملفات فعلية، فعّل **Firebase Storage** وأضف قواعد Storage مستقلة قبل استخدام روابط الملفات.

تستخدم الواجهة إعداد Firebase العام اللازم لتشغيل SDK. هذا الإعداد لا يمنح المستخدم صلاحية قراءة أو تعديل تلقائية؛ الحماية الحقيقية تتم من خلال قواعد Firestore التي تعتمد على `request.auth` وبيانات الدور في `users/{uid}`. توصي وثائق Firebase باستخدام Authentication وقواعد Firestore للتحكم بالوصول إلى البيانات [1] [2].

## 4. Admin Setup — إعداد لوحة الإدارة

ادخل إلى الموقع العام، اضغط «دخول / إنشاء حساب»، وأنشئ حساباً بالبريد وكلمة سر لا تقل عن ستة أحرف. بعد إنشاء الحساب، افتح Firestore وأنشئ أو عدّل الوثيقة التالية:

```text
Collection: users
Document ID: UID الخاص بالحساب
role: super_admin
accountStatus: active
```

بعد تسجيل الخروج والدخول من جديد، افتح `/admin.html`. تتحقق الصفحة أولاً من جلسة Firebase ثم تقرأ الدور من Firestore؛ المستخدم الذي لا يحمل `admin` أو `super_admin` لا يرى لوحة الإدارة. دور `moderator` محفوظ للتوسع وإدارة المحتوى، لكنه لا يحصل على صلاحيات المستخدمين أو الاشتراكات.

## 5. User Setup — إعداد المستخدم

المستخدم العادي لا يحتاج إلى إنشاء حساب لتصفح الخدمات أو مشاهدة الأعمال أو إرسال طلب الخدمة عبر واتساب. إذا اختار إنشاء حساب، تنشئ `auth.js` حساب Firebase وتضيف وثيقة `users/{uid}` بدور `user` وحالة `active`. يمكن للمستخدم فتح `user-dashboard.html` لإدارة الاسم ورقم الهاتف ومراجعة الاشتراك والإشعارات وملفات CV الخاصة به.

توجد أيضاً وظيفة إعادة تعيين كلمة السر عبر البريد الإلكتروني. لا يتم حفظ كلمة السر في `localStorage` أو في Firestore أو في ملفات المشروع.

## 6. Security Rules — قواعد الأمان

قواعد `firestore.rules` تطبق الملكية والصلاحيات على مستوى قاعدة البيانات، وتشمل ما يلي:

| السيناريو | القرار الأمني |
|---|---|
| زائر يقرأ `portfolio` أو `testimonials` | مسموح للعرض العام |
| مستخدم يقرأ ملف مستخدم آخر | مرفوض |
| مستخدم يغير دوره أو حالة حسابه | مرفوض |
| أدمن يقرأ ويدير المستخدمين والاشتراكات والباقات | مسموح |
| Moderator يعدل المحتوى والإعلانات | مسموح دون إدارة المستخدمين |
| مستخدم ينشئ ملف CV دون اشتراك فعال | مرفوض من Rules |
| مستخدم يعدل إشعار مستخدم آخر | مرفوض |
| تعديل أو حذف سجل إداري | مرفوض حتى للأدمن بعد إنشائه |
| الزائر يسجل حدث زيارة مجهول | مسموح بالإنشاء فقط |

يجب نشر القواعد من Firebase Console قبل الاعتماد على النظام في الإنتاج. كما يجب ضبط قواعد Firebase Storage إذا أضيف رفع ملفات؛ قواعد Firestore لا تحمي Storage تلقائياً. التفاصيل العامة حول التحقق من الدور والملكية موثقة في Firebase Security Rules [2] [3].

## 7. التشغيل المحلي

من مجلد المشروع شغّل خادماً ثابتاً، لأن استيراد Firebase ES Modules لا يعمل بصورة صحيحة عند فتح الملفات عبر `file://` في بعض المتصفحات:

```bash
cd /home/ubuntu/cvzone_repo
python3 -m http.server 4173
```

ثم افتح:

```text
http://127.0.0.1:4173/index.html
http://127.0.0.1:4173/admin.html
http://127.0.0.1:4173/user-dashboard.html
```

الصفحة العامة تعمل دون تسجيل، بينما الصفحتان الخاصتان تعيدان الزائر غير المسجل إلى `index.html`. تم تنفيذ فحص ثابت للملفات والسكربتات ونجح، كما نجح اختبار HTTP 200 للصفحات الأساسية.

## 8. Deploy — النشر على GitHub Pages

المستودع هو [HACK056/cvzone](https://github.com/HACK056/cvzone)، والرابط العام المستهدف هو [https://hack056.github.io/cvzone/](https://hack056.github.io/cvzone/). بعد دفع التغييرات، يتولى GitHub Pages تقديم ملفات HTML وJavaScript الثابتة. لا يحتاج الموقع إلى Server-side routing؛ صفحات `admin.html` و`user-dashboard.html` مستقلة، ولذلك تتوافق مع طبيعة GitHub Pages.

يجب إضافة نطاق GitHub Pages الحالي إلى **Authorized domains** في Firebase Authentication. عند ربط Custom Domain مستقبلاً، أضف النطاق الجديد إلى القائمة نفسها ثم حدّث إعداد Custom Domain في GitHub Pages. يظل Firebase هو Backend للمصادقة والبيانات، بينما GitHub Pages يستضيف الواجهة فقط.

## 9. إضافة أول Admin

الطريقة الآمنة هي التسجيل أولاً من الموقع ثم تعديل الدور يدوياً من Firestore مرة واحدة. لا توجد آلية Bootstrap عامة داخل الواجهة حتى لا يستطيع أي زائر رفع نفسه إلى أدمن. بعد تعيين `super_admin`، يصبح بإمكان الحساب مراجعة المستخدمين من لوحة Admin، بينما يظل تغيير الأدوار الحساسة عملية مقصودة ومحمية.

لإنشاء Admin لاحقاً، أنشئ الحساب من صفحة التسجيل ثم استخدم Firestore لتعديل `users/{uid}.role` إلى `admin` أو `moderator` وفق المسؤولية. لا تضع بريداً أو كلمة سر داخل `index.html` أو `admin.html`.

## 10. تغيير البيانات من Dashboard

من `admin.html` يمكن للأدمن إدارة الباقات من قسم **Packages**، وإضافة اشتراك من قسم **Subscriptions**، وتعديل بيانات المستخدمين وحالة الحساب من **Users**، وإضافة المحتوى من **Content Management**، وإنشاء الإعلانات من **Announcements**، وإرسال الإشعارات من **Notifications**، ومراجعة الأحداث والسجلات من **Analytics** و**Activity Logs**.

تظهر عناصر `content` التي تحمل مفتاحاً يطابق `id` في الصفحة العامة تلقائياً عند تحميلها. تظهر الإعلانات الفعالة زمنياً في شريط أعلى الصفحة. لذلك يمكن تغيير أرقام الثقة والعناوين والإعلانات دون تعديل HTML، مع ضرورة احترام قواعد المحتوى وعدم إدخال HTML غير موثوق في القيم النصية.

## ما تم اختباره وما يحتاج إعداداً خارجياً

| البند | الحالة |
|---|---|
| تحميل `index.html` و`admin.html` و`user-dashboard.html` | ناجح محلياً HTTP 200 |
| زر الحساب الاختياري في الهيدر | ناجح بصرياً |
| منع الزائر غير المسجل من لوحتي الأدمن والمستخدم | ناجح بإعادة التوجيه |
| تحليل JavaScript وHTML الأساسي | ناجح |
| إزالة كلمة المرور المحلية القديمة | تم |
| ربط Firebase Authentication فعلياً | الكود جاهز، ويحتاج تفعيل Email/Password من Console |
| إنشاء أول Super Admin | يحتاج تسجيل حساب وتعديل الدور يدوياً مرة واحدة |
| نشر Firestore Rules | يحتاج لصق القواعد والنشر من Firebase Console |
| اختبار دفع حقيقي | غير مفعّل؛ النظام يدعم حالات الدفع الإدارية فقط |
| Firebase Storage لملفات CV | اختياري ويحتاج تفعيل وقواعد Storage مستقلة |

## المراجع

[1]: https://firebase.google.com/docs/auth/web/password-auth "Firebase Authentication — Password Authentication"

[2]: https://firebase.google.com/docs/firestore/security/get-started "Firebase Firestore Security Rules — Get Started"

[3]: https://firebase.google.com/docs/firestore/security/rules-conditions "Firebase Firestore Security Rules — Conditions"
