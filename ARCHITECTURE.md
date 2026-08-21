# CV Zone — Architecture and Database Design

## الهدف

يتكون النظام من موقع عام سريع يعمل على GitHub Pages، ومصادقة Firebase اختيارية للمستخدمين، ولوحة مستخدم، ولوحة إدارة محمية بصلاحيات Firestore. يستطيع الزائر استخدام الموقع العام دون تسجيل، بينما يفتح التسجيل الاختياري ميزات الحساب والاشتراك والإشعارات وحفظ نماذج السيرة الذاتية.

## المكونات

| المكون | التنفيذ |
|---|---|
| الواجهة العامة | HTML/CSS/JavaScript ثابت على GitHub Pages |
| المصادقة | Firebase Authentication بالبريد وكلمة المرور، مع إعادة تعيين كلمة السر |
| قاعدة البيانات | Cloud Firestore |
| الملفات | Firebase Storage عند توفر تفعيل Storage في المشروع |
| التحليلات | Firebase Analytics مع بيانات مجمعة غير حساسة |
| الصلاحيات | حقل role في users مع Firestore Rules، وليس localStorage |
| لوحة المستخدم | user-dashboard.html |
| لوحة الإدارة | admin.html بعد استبدال كلمة المرور المحلية بمصادقة Firebase |
| الاشتراك | subscription document مرتبط بـ uid، مع حساب الصلاحية من تاريخ الانتهاء |
| الدفع | حالات يدوية قابلة للتوسعة لاحقاً، ولا تعتبر قيمة Frontend دليلاً على نجاح الدفع |

## Collections

### users/{uid}

تحتوي على `uid`, `email`, `displayName`, `phone`, `photoURL`, `role`, `accountStatus`, `createdAt`, `updatedAt`. القيم الافتراضية هي `role: user` و`accountStatus: active`.

### subscriptions/{subscriptionId}

تحتوي على `userId`, `packageId`, `packageName`, `status`, `paymentStatus`, `startAt`, `endAt`, `notes`, `createdAt`, `updatedAt`, و`updatedBy`. يظل المستخدم قادراً على قراءة اشتراكه فقط، بينما يدير الأدمن جميع الحقول.

### packages/{packageId}

تحتوي على `name`, `price`, `currency`, `durationDays`, `features`, `active`, `createdAt`, `updatedAt`, و`updatedBy`.

### content/{contentId}

تحتوي على `key`, `value`, `type`, `active`, `updatedAt`, و`updatedBy`. يمكن استخدامها لمحتوى الصفحة والأسعار والأسئلة الشائعة وروابط التواصل.

### announcements/{announcementId}

تحتوي على `title`, `body`, `imageUrl`, `startsAt`, `endsAt`, `active`, `createdAt`, و`updatedBy`. يقرأ الزائر الإعلانات الفعالة زمنياً، ويكتبها الأدمن فقط.

### notifications/{notificationId}

تحتوي على `recipientType`, `recipientId`, `title`, `body`, `read`, `createdAt`, و`createdBy`. المستخدم يقرأ إشعاراته، والأدمن ينشئها ويعدلها.

### analytics_events/{eventId}

تحتوي على `type`, `path`, `deviceType`, `country`, `sessionId`, `createdAt`. لا تحفظ كلمات مرور أو بيانات حساسة، وتُفضل البيانات المجمعة أو المجهولة.

### adminLogs/{logId}

تحتوي على `actorUid`, `actorEmail`, `action`, `targetType`, `targetId`, `metadata`, و`createdAt`. يمنع تسجيل كلمات السر أو رموز التحقق أو بيانات الدفع الحساسة.

### cv_documents/{documentId}

تحتوي على `userId`, `title`, `templateId`, `data`, `fileUrl`, `createdAt`, و`updatedAt`. لا يقرأها إلا صاحبها أو الأدمن وفق الحاجة الإدارية.

## الصلاحيات

| الدور | الصلاحيات |
|---|---|
| user | قراءة وتعديل ملفه، قراءة اشتراكه وإشعاراته، إنشاء وتعديل ملفاته الخاصة |
| moderator | إدارة المحتوى والإعلانات دون إدارة المستخدمين أو الاشتراكات |
| admin | إدارة المستخدمين والاشتراكات والباقات والمحتوى والإشعارات والتحليلات |
| super_admin | جميع صلاحيات admin وإدارة الأدوار والإعدادات الحساسة |

## التسجيل الاختياري

لا يحتوي الموقع العام على Guard يمنع الوصول. زر «إنشاء حساب / تسجيل الدخول» يظهر في الهيدر، ويمكن للزائر تصفح الخدمات والأعمال وطلب الخدمة عبر واتساب دون إنشاء حساب. صفحات الحساب فقط تطلب المصادقة.

## ملاحظات النشر

يعمل Frontend على GitHub Pages. تحتاج المصادقة وقاعدة البيانات إلى تفعيل Firebase Authentication وFirestore وStorage من Firebase Console. لا توضع مفاتيح سرية في الواجهة؛ Firebase Web API key ليس بديلاً عن Firestore Rules، وجميع حماية البيانات تعتمد على القواعد والصلاحيات.
