import { getDashboardLanguage } from './dashboardLanguage';

type AppCopy = {
  home: string;
  explore: string;
  learning: string;
  passport: string;
  exploreTitle: string;
  exploreSubtitle: string;
  sortCourses: string;
  searchCourses: string;
  clearSearch: string;
  recommendedSort: string;
  alphabeticalSort: string;
  shortestSort: string;
  allTopics: string;
  contentLanguage: string;
  allLanguages: string;
  featuredCourse: string;
  popularThisMonth: string;
  course: string;
  courses: string;
  loadingCourses: string;
  tryAgain: string;
  noCoursesAvailable: string;
  noCoursesMatch: string;
  noMoreCourses: string;
  lessonCount: (count: number) => string;
  viewCourse: (title: string) => string;
  myLearning: string;
  learningSubtitle: string;
  opportunities: string;
  inProgress: string;
  completed: string;
  saved: string;
  activeCourses: string;
  averageProgress: string;
  timeLearned: string;
  loadingCertificates: string;
  couldNotLoadCompleted: string;
  noCompletedCourses: string;
  completedCoursesHint: string;
  exploreCourses: string;
  loadingLearning: string;
  couldNotLoadCourses: string;
  noCoursesInProgress: string;
  noCoursesInProgressHint: string;
  noSavedCourses: string;
  noSavedCoursesHint: string;
  coursesStartHint: string;
  lesson: (current: number, total: number) => string;
  continueCourse: (title: string) => string;
  continue: string;
  assessmentPending: string;
  enrolled: string;
  lessonsComplete: string;
  percentComplete: (percent: number) => string;
  resume: string;
  certificateEarned: string;
  viewCertificate: string;
  digitalPassport: string;
  learnerName: string;
  courseCertificate: string;
  dateNotProvided: string;
  sharePassportMessage: (name: string) => string;
  sharePassport: string;
  category: (value: string) => string;
  level: (value: string) => string;
  duration: (value: string) => string;
  achievements: string;
  skills: string;
  certificates: string;
  points: string;
  accountConnected: string;
  credentialsDisclaimer: string;
  history: string;
  loadingPassport: string;
  couldNotLoadCredentials: string;
  earnedFrom: (courses: string) => string;
  earned: string;
  skillsGrowHere: string;
  earnCredentialHint: string;
  issued: string;
  noCredentials: string;
  certificatesSavedHere: string;
  credentialEarned: string;
  noActivity: string;
  earnedAppearInHistory: string;
  profile: string;
  editProfile: string;
  account: string;
  learnerAccount: string;
  employerAccount: string;
  trainerAccount: string;
  adminAccount: string;
  personalInformation: string;
  editAccountName: string;
  notificationPreferences: string;
  recentUpdates: string;
  privacySecurity: string;
  securitySettings: string;
  language: (language: string) => string;
  chooseLanguage: string;
  helpSupport: string;
  getHelp: string;
  signOut: string;
  signingOut: string;
  cancel: string;
  done: string;
  confirmSignOut: string;
  dismissDialog: string;
  couldNotLoadProfile: string;
  contactAdministrator: string;
  privacyMessage: string;
  languageSetTo: (language: string) => string;
  continueLearning: string;
  pickUpWhereLeftOff: string;
  noModulesInProgress: string;
  enrolCourseHint: string;
  recommendedForYou: string;
  viewAll: string;
  recommendedCoursesHint: string;
  previousRecommendedCourse: string;
  nextRecommendedCourse: string;
  showCourse: (title: string) => string;
  recommendations: readonly [RecommendationCopy, RecommendationCopy];
  loadingPassportSummary: string;
  skillsGrowing: string;
  startBuildingSkills: string;
  passportUnavailable: string;
  loadingSkills: string;
  skillCount: (count: number) => string;
  certificateCount: (count: number) => string;
  learningPoints: (count: number) => string;
  viewMyPassport: string;
  openNotifications: string;
  switchToLightMode: string;
  switchToDarkMode: string;
};

type RecommendationCopy = { title: string; category: string; details: string };

const english: AppCopy = {
  home: 'Home',
  explore: 'Explore',
  learning: 'Learning',
  passport: 'Passport',
  profile: 'Profile',
  exploreTitle: 'Explore learning',
  exploreSubtitle: 'Practical skills for every stage',
  sortCourses: 'Sort courses',
  searchCourses: 'Search courses, skills or topics',
  clearSearch: 'Clear search',
  recommendedSort: 'Recommended',
  alphabeticalSort: 'A–Z',
  shortestSort: 'Shortest first',
  allTopics: 'All topics',
  contentLanguage: 'Content language',
  allLanguages: 'All languages',
  featuredCourse: 'Featured course',
  popularThisMonth: 'Popular this month',
  course: 'course',
  courses: 'courses',
  loadingCourses: 'Loading published courses…',
  tryAgain: 'Try again',
  noCoursesAvailable: 'No published courses are available yet.',
  noCoursesMatch: 'No courses match your search.',
  noMoreCourses: 'No more courses in this topic yet.',
  lessonCount: (count) => `${count} ${count === 1 ? 'lesson' : 'lessons'}`,
  viewCourse: (title) => `View ${title} course information`,
  myLearning: 'My learning',
  learningSubtitle: 'Your courses and saved lessons',
  opportunities: 'Open agricultural opportunities',
  inProgress: 'In progress',
  completed: 'Completed',
  saved: 'Saved',
  activeCourses: 'Active courses',
  averageProgress: 'Average progress',
  timeLearned: 'Time learned',
  loadingCertificates: 'Loading your certificates…',
  couldNotLoadCompleted: 'Could not load completed courses',
  noCompletedCourses: 'No completed courses yet',
  completedCoursesHint: 'Courses you pass will appear here with their certificates.',
  exploreCourses: 'Explore courses',
  loadingLearning: 'Loading your courses…',
  couldNotLoadCourses: 'Could not load your courses',
  noCoursesInProgress: 'No courses in progress',
  noCoursesInProgressHint: 'Courses you enrol in will appear here.',
  noSavedCourses: 'No saved courses yet',
  noSavedCoursesHint: 'Save courses you want to return to and they’ll appear here.',
  coursesStartHint: 'Courses you start will appear here.',
  lesson: (current, total) => `Lesson ${current} of ${total}`,
  continueCourse: (title) => `Continue ${title}`,
  continue: 'Continue',
  assessmentPending: 'ASSESSMENT PENDING',
  enrolled: 'ENROLLED',
  lessonsComplete: 'Lessons complete · assessment pending',
  percentComplete: (percent) => `${percent}% complete`,
  resume: 'Resume',
  certificateEarned: 'Certificate earned',
  viewCertificate: 'View certificate',
  digitalPassport: 'DIGITAL SKILLS PASSPORT',
  learnerName: 'AgriLearn learner',
  courseCertificate: 'Course certificate',
  dateNotProvided: 'Date not provided',
  sharePassportMessage: (name) => name ? `${name}'s AgriLearn Skills Passport` : 'My AgriLearn Skills Passport',
  sharePassport: 'Share passport',
  category: (value) => value,
  level: (value) => value,
  duration: (value) => value,
  achievements: 'Your learning achievements',
  skills: 'Skills',
  certificates: 'Certificates',
  points: 'Points',
  accountConnected: 'AgriLearn account connected',
  credentialsDisclaimer: 'Credentials shown here are issued through AgriLearn. External accreditation is not implied.',
  history: 'History',
  loadingPassport: 'Loading your passport…',
  couldNotLoadCredentials: 'Could not load passport credentials',
  earnedFrom: (courses) => `Earned from ${courses}`,
  earned: 'Earned',
  skillsGrowHere: 'Your skills will grow here',
  earnCredentialHint: 'Earn a course credential to add verified skills to your passport.',
  issued: 'Issued',
  noCredentials: 'No credentials yet',
  certificatesSavedHere: 'Certificates you earn will be saved here.',
  credentialEarned: 'Credential earned',
  noActivity: 'No passport activity yet',
  earnedAppearInHistory: 'Earned credentials will appear in your activity history.',
  editProfile: 'Edit profile',
  account: 'Account',
  learnerAccount: 'Learner account',
  employerAccount: 'SME + Employer account',
  trainerAccount: 'Content creator account',
  adminAccount: 'Admin account',
  personalInformation: 'Personal information',
  editAccountName: 'Edit your account name',
  notificationPreferences: 'Notification preferences',
  recentUpdates: 'View your recent updates',
  privacySecurity: 'Privacy & security',
  securitySettings: 'Account security settings',
  language: (language) => `Language · ${language}`,
  chooseLanguage: 'Choose your app language',
  helpSupport: 'Help & support',
  getHelp: 'Get help with AgriLearn',
  signOut: 'Sign out',
  signingOut: 'Signing out…',
  cancel: 'Cancel',
  done: 'Done',
  confirmSignOut: 'Are you sure you want to sign out?',
  dismissDialog: 'Dismiss dialog',
  couldNotLoadProfile: 'Could not load profile',
  contactAdministrator: 'For help with your account, contact your AgriLearn administrator.',
  privacyMessage: 'Your account is protected by your sign-in session. Sign out on shared devices to end your session.',
  languageSetTo: (language) => `${language} is your selected app language.`,
  continueLearning: 'Continue learning',
  pickUpWhereLeftOff: 'Pick up where you left off',
  noModulesInProgress: 'No modules in progress',
  enrolCourseHint: 'Enrol in a course to see your learning progress here.',
  recommendedForYou: 'Recommended for you',
  viewAll: 'View all',
  recommendedCoursesHint: 'Recommended courses. Swipe horizontally to browse.',
  previousRecommendedCourse: 'Previous recommended course',
  nextRecommendedCourse: 'Next recommended course',
  showCourse: (title) => `Show ${title}`,
  recommendations: [
    { title: 'Smart Irrigation Basics', category: 'Crop production', details: '45 min · Beginner' },
    { title: 'Healthy Herd Essentials', category: 'Livestock', details: '1.5 hrs · Beginner' },
  ],
  loadingPassportSummary: 'Loading your passport',
  skillsGrowing: 'Your skills are growing',
  startBuildingSkills: 'Start building your skills',
  passportUnavailable: 'Passport details unavailable',
  loadingSkills: 'Loading earned skills and credentials…',
  skillCount: (count) => `${count} ${count === 1 ? 'skill' : 'skills'}`,
  certificateCount: (count) => `${count} ${count === 1 ? 'certificate' : 'certificates'}`,
  learningPoints: (count) => `${count} learning points`,
  viewMyPassport: 'View my passport →',
  openNotifications: 'Open notifications',
  switchToLightMode: 'Switch to light mode',
  switchToDarkMode: 'Switch to dark mode',
};

const isiZulu: AppCopy = {
  ...english,
  home: 'Ekhaya',
  explore: 'Hlola',
  learning: 'Ukufunda',
  passport: 'Iphasiphothi',
  exploreTitle: 'Hlola ukufunda',
  exploreSubtitle: 'Amakhono awusizo kuzo zonke izigaba',
  sortCourses: 'Hlunga izifundo',
  searchCourses: 'Sesha izifundo, amakhono noma izihloko',
  clearSearch: 'Sula usesho',
  recommendedSort: 'Okunconyiwe',
  alphabeticalSort: 'A–Z',
  shortestSort: 'Ezifushane kuqala',
  allTopics: 'Zonke izihloko',
  contentLanguage: 'Ulimi lokuqukethwe',
  allLanguages: 'Zonke izilimi',
  featuredCourse: 'Isifundo esikhethiwe',
  popularThisMonth: 'Okudumile kule nyanga',
  course: 'isifundo',
  courses: 'izifundo',
  loadingCourses: 'Kulayishwa izifundo ezishicilelwe…',
  tryAgain: 'Zama futhi',
  noCoursesAvailable: 'Azikho izifundo ezishicilelwe okwamanje.',
  noCoursesMatch: 'Azikho izifundo ezihambisana nosesho lwakho.',
  noMoreCourses: 'Azisekho izifundo kulesi sihloko okwamanje.',
  lessonCount: (count) => `Izifundo ezingu-${count}`,
  viewCourse: (title) => `Buka imininingwane yesifundo esithi ${title}`,
  myLearning: 'Ukufunda kwami',
  learningSubtitle: 'Izifundo zakho nezifundo ozigcinile',
  opportunities: 'Vula amathuba ezolimo',
  inProgress: 'Kuyaqhubeka',
  completed: 'Kuqediwe',
  saved: 'Okugciniwe',
  activeCourses: 'Izifundo eziqhubekayo',
  averageProgress: 'Isilinganiso senqubekelaphambili',
  timeLearned: 'Isikhathi sokufunda',
  loadingCertificates: 'Kulayishwa izitifiketi zakho…',
  couldNotLoadCompleted: 'Ayikwazanga ukulayisha izifundo eziqediwe',
  noCompletedCourses: 'Azikho izifundo eziqediwe okwamanje',
  completedCoursesHint: 'Izifundo ozidlulile zizovela lapha nezitifiketi zazo.',
  exploreCourses: 'Hlola izifundo',
  loadingLearning: 'Kulayishwa izifundo zakho…',
  couldNotLoadCourses: 'Ayikwazanga ukulayisha izifundo zakho',
  noCoursesInProgress: 'Azikho izifundo eziqhubekayo',
  noCoursesInProgressHint: 'Izifundo obhalisele zona zizovela lapha.',
  noSavedCourses: 'Azikho izifundo ezigciniwe okwamanje',
  noSavedCoursesHint: 'Gcina izifundo ofuna ukubuyela kuzo ukuze zivele lapha.',
  coursesStartHint: 'Izifundo oziqalayo zizovela lapha.',
  lesson: (current, total) => `Isifundo ${current} kwezingu-${total}`,
  continueCourse: (title) => `Qhubeka nesifundo esithi ${title}`,
  continue: 'Qhubeka',
  assessmentPending: 'UKUHLOLA KUSALINDILE',
  enrolled: 'UBHALISELE',
  lessonsComplete: 'Izifundo ziphelile · ukuhlolwa kusalindile',
  percentComplete: (percent) => `${percent}% kuqediwe`,
  resume: 'Qhubeka',
  certificateEarned: 'Isitifiketi sizuziwe',
  viewCertificate: 'Buka isitifiketi',
  digitalPassport: 'IPHASIPHOTHI YAMAKHONO EDIGITHALI',
  learnerName: 'Umfundi we-AgriLearn',
  courseCertificate: 'Isitifiketi sesifundo',
  dateNotProvided: 'Usuku alunikeziwe',
  sharePassportMessage: (name) => name ? `Iphasiphothi yamakhono ye-AgriLearn ka-${name}` : 'Iphasiphothi yami yamakhono ye-AgriLearn',
  sharePassport: 'Yabelana ngephasiphothi',
  category: (value) => ({
    'Crop Production': 'Ukukhiqizwa kwezitshalo',
    'Livestock Management': 'Ukuphathwa kwemfuyo',
    'Farm Financial Management': 'Ukuphathwa kwezimali zasepulazini',
    'Drone Operation': 'Ukusebenzisa ama-drone',
    'Precision Agriculture': 'Ezolimo ezinembayo',
    'IoT in Agriculture': 'I-inthanethi yezinto kwezolimo',
    GIS: 'Uhlelo lolwazi lwendawo',
    Cybersecurity: 'Ukuphepha ku-inthanethi',
    'Data Analytics': 'Ukuhlaziywa kwedatha',
    'AI in Agriculture': 'Ubuhlakani bokwenziwa kwezolimo',
    'Agricultural Entrepreneurship': 'Usomabhizinisi wezolimo',
    'Food Safety': 'Ukuphepha kokudla',
    'Export Readiness': 'Ukulungela ukuthumela kwamanye amazwe',
    'Co-operative Management': 'Ukuphathwa kwamabhizinisi obambiswano',
    'Farm Health and Safety': 'Impilo nokuphepha epulazini',
    'Water Management': 'Ukuphathwa kwamanzi',
    'Soil Health': 'Impilo yomhlabathi',
    Technology: 'Ubuchwepheshe',
    'Climate-Smart Farming': 'Ukulima okuhambisana nesimo sezulu',
  }[value] ?? value),
  level: (value) => value === 'Beginner' ? 'Oqalayo' : value === 'Intermediate' ? 'Osezingeni eliphakathi' : value === 'Advanced' ? 'Othuthukile' : value,
  duration: (value) => value.replace(/\bh\b/g, 'ihora').replace(/\bm\b/g, 'imiz').replace(/\bhrs\b/g, 'amahora').replace(/\bmin\b/g, 'imiz'),
  achievements: 'Izimpumelelo zakho zokufunda',
  skills: 'Amakhono',
  certificates: 'Izitifiketi',
  points: 'Amaphuzu',
  accountConnected: 'I-akhawunti ye-AgriLearn ixhunyiwe',
  credentialsDisclaimer: 'Iziqinisekiso eziboniswe lapha zikhishwe yi-AgriLearn. Akushiwo ukuthi zigunyazwe ezinye izinhlangano.',
  history: 'Umlando',
  loadingPassport: 'Kulayishwa iphasiphothi yakho…',
  couldNotLoadCredentials: 'Ayikwazanga ukulayisha iziqinisekiso zephasiphothi',
  earnedFrom: (courses) => `Uthole ku-${courses}`,
  earned: 'Kuzuziwe',
  skillsGrowHere: 'Amakhono akho azokhula lapha',
  earnCredentialHint: 'Thola isiqinisekiso sesifundo ukuze wengeze amakhono aqinisekisiwe kwiphasiphothi yakho.',
  issued: 'Ikhishwe',
  noCredentials: 'Azikho iziqinisekiso okwamanje',
  certificatesSavedHere: 'Izitifiketi ozitholayo zizogcinwa lapha.',
  credentialEarned: 'Isiqinisekiso sizuziwe',
  noActivity: 'Akukho okwenzekile kwiphasiphothi okwamanje',
  earnedAppearInHistory: 'Iziqinisekiso ozitholile zizovela emlandweni wakho womsebenzi.',
  editProfile: 'Hlela iphrofayela',
  account: 'I-akhawunti',
  learnerAccount: 'I-akhawunti yomfundi',
  employerAccount: 'I-akhawunti ye-SME nomqashi',
  trainerAccount: 'I-akhawunti yomdali wokuqukethwe',
  adminAccount: 'I-akhawunti yomlawuli',
  personalInformation: 'Ulwazi lomuntu siqu',
  editAccountName: 'Hlela igama le-akhawunti yakho',
  notificationPreferences: 'Izilungiselelo zezaziso',
  recentUpdates: 'Buka izibuyekezo zakho zakamuva',
  privacySecurity: 'Ubumfihlo nokuphepha',
  securitySettings: 'Izilungiselelo zokuphepha kwe-akhawunti',
  language: (language) => `Ulimi · ${language}`,
  chooseLanguage: 'Khetha ulimi lohlelo lwakho lokusebenza',
  helpSupport: 'Usizo nokwesekwa',
  getHelp: 'Thola usizo nge-AgriLearn',
  signOut: 'Phuma',
  signingOut: 'Kuyaphunywa…',
  cancel: 'Khansela',
  done: 'Kwenziwe',
  confirmSignOut: 'Uyaqiniseka ukuthi ufuna ukuphuma?',
  dismissDialog: 'Vala ibhokisi lengxoxo',
  couldNotLoadProfile: 'Ayikwazanga ukulayisha iphrofayela',
  contactAdministrator: 'Ukuze uthole usizo nge-akhawunti yakho, xhumana nomlawuli we-AgriLearn.',
  privacyMessage: 'I-akhawunti yakho ivikelwe yiseshini yokungena. Phuma kumadivayisi asetshenziswa abanye ukuze uqede iseshini yakho.',
  languageSetTo: (language) => `${language} ulimi olukhethiwe lohlelo lwakho lokusebenza.`,
  continueLearning: 'Qhubeka ufunde',
  pickUpWhereLeftOff: 'Qhubeka lapho ogcine khona',
  noModulesInProgress: 'Azikho izifundo eziqhubekayo',
  enrolCourseHint: 'Bhalisela isifundo ukuze ubone ukuqhubeka kwakho kokufunda lapha.',
  recommendedForYou: 'Okunconyelwe wena',
  viewAll: 'Buka konke',
  recommendedCoursesHint: 'Izifundo ezinconyiwe. Swayipha uye eceleni ukuze uphequlule.',
  previousRecommendedCourse: 'Isifundo esinconyiwe sangaphambilini',
  nextRecommendedCourse: 'Isifundo esilandelayo esinconyiwe',
  showCourse: (title) => `Bonisa ${title}`,
  recommendations: [
    { title: 'Izisekelo zokunisela ngobuhlakani', category: 'Ukukhiqizwa kwezitshalo', details: 'Amaminithi angu-45 · Oqalayo' },
    { title: 'Okubalulekile ngomhlambi onempilo', category: 'Imfuyo', details: 'Amahora angu-1.5 · Oqalayo' },
  ],
  loadingPassportSummary: 'Kulayishwa iphasiphothi yakho',
  skillsGrowing: 'Amakhono akho ayakhula',
  startBuildingSkills: 'Qala ukwakha amakhono akho',
  passportUnavailable: 'Imininingwane yepasiphothi ayitholakali',
  loadingSkills: 'Kulayishwa amakhono nezitifiketi ozizuzile…',
  skillCount: (count) => `${count} ${count === 1 ? 'ikhono' : 'amakhono'}`,
  certificateCount: (count) => `${count} ${count === 1 ? 'isitifiketi' : 'izitifiketi'}`,
  learningPoints: (count) => `${count} amaphuzu okufunda`,
  viewMyPassport: 'Buka iphasipoti yami →',
  openNotifications: 'Vula izaziso',
  switchToLightMode: 'Shintshela ekukhanyeni',
  switchToDarkMode: 'Shintshela ebumnyameni',
};

const isiXhosa: AppCopy = {
  ...english,
  home: 'Ekhaya',
  explore: 'Jonga',
  learning: 'Ukufunda',
  passport: 'Ipaspoti',
  profile: 'Iprofayile',
  exploreTitle: 'Jonga ukufunda',
  exploreSubtitle: 'Izakhono ezisebenzayo kuwo onke amanqanaba',
  sortCourses: 'Hlela iikhosi',
  searchCourses: 'Khangela iikhosi, izakhono okanye izihloko',
  clearSearch: 'Cima uphendlo',
  recommendedSort: 'Kucetyiswa',
  alphabeticalSort: 'A–Z',
  shortestSort: 'Ezona zimfutshane kuqala',
  allTopics: 'Zonke izihloko',
  contentLanguage: 'Ulwimi lomxholo',
  allLanguages: 'Zonke iilwimi',
  featuredCourse: 'Ikhosi ekhethiweyo',
  popularThisMonth: 'Ezithandwayo kule nyanga',
  course: 'ikhosi',
  courses: 'iikhosi',
  loadingCourses: 'Kulayishwa iikhosi ezipapashiweyo…',
  tryAgain: 'Zama kwakhona',
  noCoursesAvailable: 'Akukho zikhosi zipapashiweyo okwangoku.',
  noCoursesMatch: 'Akukho zikhosi zihambelana nophendlo lwakho.',
  noMoreCourses: 'Akukho zikhosi zininzi kwesi sihloko okwangoku.',
  lessonCount: (count) => `Izifundo ezi-${count}`,
  viewCourse: (title) => `Jonga iinkcukacha zekhosi ethi ${title}`,
  myLearning: 'Ukufunda kwam',
  learningSubtitle: 'Iikhosi zakho nezifundo ezigciniweyo',
  opportunities: 'Vula amathuba ezolimo',
  inProgress: 'Iyaqhuba',
  completed: 'Igqityiwe',
  saved: 'Ezigciniweyo',
  activeCourses: 'Iikhosi ezisebenzayo',
  averageProgress: 'Umndilili wenkqubela',
  timeLearned: 'Ixesha lokufunda',
  loadingCertificates: 'Kulayishwa izatifikethi zakho…',
  couldNotLoadCompleted: 'Ayikwazanga ukulayisha iikhosi ezigqityiweyo',
  noCompletedCourses: 'Akukho zikhosi zigqityiweyo okwangoku',
  completedCoursesHint: 'Iikhosi ozipasileyo ziza kuvela apha nezatifikethi zazo.',
  exploreCourses: 'Jonga iikhosi',
  loadingLearning: 'Kulayishwa iikhosi zakho…',
  couldNotLoadCourses: 'Ayikwazanga ukulayisha iikhosi zakho',
  noCoursesInProgress: 'Akukho zikhosi ziqhubayo',
  noCoursesInProgressHint: 'Iikhosi obhalisele kuzo ziza kuvela apha.',
  noSavedCourses: 'Akukho zikhosi zigciniweyo okwangoku',
  noSavedCoursesHint: 'Gcina iikhosi ofuna ukubuyela kuzo ukuze zivele apha.',
  coursesStartHint: 'Iikhosi oziqalayo ziza kuvela apha.',
  lesson: (current, total) => `Isifundo ${current} kwezili-${total}`,
  continueCourse: (title) => `Qhubeka ngekhosi ethi ${title}`,
  continue: 'Qhubeka',
  assessmentPending: 'UVAVANYO LUYALINDEKA',
  enrolled: 'UBHALISELE',
  lessonsComplete: 'Izifundo zigqityiwe · uvavanyo lusalindile',
  percentComplete: (percent) => `${percent}% kugqityiwe`,
  resume: 'Qhubeka',
  certificateEarned: 'Isiqinisekiso sifunyenwe',
  viewCertificate: 'Jonga isiqinisekiso',
  digitalPassport: 'IPASPOTI YEZAKHONO ZEDIJITHALI',
  learnerName: 'Umfundi we-AgriLearn',
  courseCertificate: 'Isiqinisekiso sekhosi',
  dateNotProvided: 'Umhla awuchazwanga',
  sharePassportMessage: (name) => name ? `Ipaspoti yezakhono ye-AgriLearn ka-${name}` : 'Ipaspoti yam yezakhono ze-AgriLearn',
  sharePassport: 'Yabelana ngepaspoti',
  category: (value) => ({
    'Crop Production': 'Imveliso yezityalo',
    'Livestock Management': 'Ulawulo lwemfuyo',
    'Farm Financial Management': 'Ulawulo lwezemali zasefama',
    'Drone Operation': 'Ukusebenza ngeedrone',
    'Precision Agriculture': 'Ezolimo ezichanekileyo',
    'IoT in Agriculture': 'I-Intanethi yezinto kwezolimo',
    GIS: 'Inkqubo yolwazi ngeendawo',
    Cybersecurity: 'Ukhuseleko lwe-intanethi',
    'Data Analytics': 'Uhlalutyo lwedatha',
    'AI in Agriculture': 'Ubukrelekrele bokwenziwa kwezolimo',
    'Agricultural Entrepreneurship': 'Ushishino lwezolimo',
    'Food Safety': 'Ukhuseleko lokutya',
    'Export Readiness': 'Ukulungela ukuthumela ngaphandle',
    'Co-operative Management': 'Ulawulo lwemibutho yentsebenziswano',
    'Farm Health and Safety': 'Impilo nokhuseleko efama',
    'Water Management': 'Ulawulo lwamanzi',
    'Soil Health': 'Impilo yomhlaba',
    Technology: 'Itekhnoloji',
    'Climate-Smart Farming': 'Ukulima okuhambelana nemozulu',
  }[value] ?? value),
  level: (value) => value === 'Beginner' ? 'Osaqalayo' : value === 'Intermediate' ? 'Ophakathi' : value === 'Advanced' ? 'Ophambili' : value,
  duration: (value) => value.replace(/\bh\b/g, 'iyure').replace(/\bm\b/g, 'imiz').replace(/\bhrs\b/g, 'iiyure').replace(/\bmin\b/g, 'imiz'),
  achievements: 'Impumelelo yakho yokufunda',
  skills: 'Izakhono',
  certificates: 'Iziqinisekiso',
  points: 'Amanqaku',
  accountConnected: 'Iakhawunti ye-AgriLearn iqhagamshelwe',
  credentialsDisclaimer: 'Iziqinisekiso eziboniswe apha zikhutshwe yi-AgriLearn. Akuthethwa ukuba zivunywe ngamanye amaziko.',
  history: 'Imbali',
  loadingPassport: 'Kulayishwa ipaspoti yakho…',
  couldNotLoadCredentials: 'Ayikwazanga ukulayisha iziqinisekiso zepaspoti',
  earnedFrom: (courses) => `Ufumene kwi-${courses}`,
  earned: 'Ufunyenwe',
  skillsGrowHere: 'Izakhono zakho ziza kukhula apha',
  earnCredentialHint: 'Fumana isiqinisekiso sekhosi ukuze wongeze izakhono eziqinisekisiweyo kwipaspoti yakho.',
  issued: 'Ikhutshwe',
  noCredentials: 'Akukho ziqinisekiso okwangoku',
  certificatesSavedHere: 'Iziqinisekiso ozifumanayo ziza kugcinwa apha.',
  credentialEarned: 'Isiqinisekiso sifunyenwe',
  noActivity: 'Akukho msebenzi wepaspoti okwangoku',
  earnedAppearInHistory: 'Iziqinisekiso ozifumeneyo ziza kuvela kwimbali yomsebenzi wakho.',
  editProfile: 'Hlela iprofayile',
  account: 'Iakhawunti',
  learnerAccount: 'Iakhawunti yomfundi',
  employerAccount: 'Iakhawunti ye-SME nomqeshi',
  trainerAccount: 'Iakhawunti yomdali womxholo',
  adminAccount: 'Iakhawunti yomlawuli',
  personalInformation: 'Ulwazi lomntu siqu',
  editAccountName: 'Hlela igama leakhawunti yakho',
  notificationPreferences: 'Iinketho zezaziso',
  recentUpdates: 'Jonga uhlaziyo lwakho lwamva nje',
  privacySecurity: 'Ubumfihlo nokhuseleko',
  securitySettings: 'Iisetingi zokhuseleko lweakhawunti',
  language: (language) => `Ulwimi · ${language}`,
  chooseLanguage: 'Khetha ulwimi lwe-app yakho',
  helpSupport: 'Uncedo nenkxaso',
  getHelp: 'Fumana uncedo nge-AgriLearn',
  signOut: 'Phuma',
  signingOut: 'Kuyaphuma…',
  cancel: 'Rhoxisa',
  done: 'Kwenziwe',
  confirmSignOut: 'Uqinisekile ukuba ufuna ukuphuma?',
  dismissDialog: 'Vala incoko',
  couldNotLoadProfile: 'Ayikwazanga ukulayisha iprofayile',
  contactAdministrator: 'Ukufumana uncedo ngeakhawunti yakho, qhagamshelana nomlawuli we-AgriLearn.',
  privacyMessage: 'Iakhawunti yakho ikhuselwe yiseshoni yokungena. Phuma kwizixhobo ekwabelwana ngazo ukuze uphelise iseshoni yakho.',
  languageSetTo: (language) => `${language} lulwimi olukhethiweyo lwe-app yakho.`,
  continueLearning: 'Qhubeka ufunda',
  pickUpWhereLeftOff: 'Qhubeka apho ubuyeke khona',
  noModulesInProgress: 'Akukho zimodyuli ziqhubekayo',
  enrolCourseHint: 'Bhalisela ikhosi ukuze ubone inkqubela yakho yokufunda apha.',
  recommendedForYou: 'Kucetyiswa wena',
  viewAll: 'Jonga zonke',
  recommendedCoursesHint: 'Iikhosi ezicetyiswayo. Swayipha uye ecaleni ukuze ukhangele.',
  previousRecommendedCourse: 'Ikhosi ecetyiswayo engaphambili',
  nextRecommendedCourse: 'Ikhosi ecetyiswayo elandelayo',
  showCourse: (title) => `Bonisa i-${title}`,
  recommendations: [
    { title: 'Iziseko zokunkcenkceshela ngobuchule', category: 'Imveliso yezityalo', details: 'Imizuzu engama-45 · Osaqalayo' },
    { title: 'Izinto ezibalulekileyo ngomhlambi ophilileyo', category: 'Imfuyo', details: 'Iyure e-1.5 · Osaqalayo' },
  ],
  loadingPassportSummary: 'Kulayishwa ipaspoti yakho',
  skillsGrowing: 'Izakhono zakho ziyakhula',
  startBuildingSkills: 'Qalisa ukwakha izakhono zakho',
  passportUnavailable: 'Iinkcukacha zepaspoti azifumaneki',
  loadingSkills: 'Kulayishwa izakhono neziqinisekiso ozifumeneyo…',
  skillCount: (count) => `${count} ${count === 1 ? 'isakhono' : 'izakhono'}`,
  certificateCount: (count) => `${count} ${count === 1 ? 'isiqinisekiso' : 'iziqinisekiso'}`,
  learningPoints: (count) => `${count} amanqaku okufunda`,
  viewMyPassport: 'Jonga ipaspoti yam →',
  openNotifications: 'Vula izaziso',
  switchToLightMode: 'Tshintshela ekukhanyeni',
  switchToDarkMode: 'Tshintshela ebumnyameni',
};

const supportedLanguages: Record<string, AppCopy> = {
  english,
  afrikaans: {
    ...english,
    home: 'Tuis', explore: 'Verken', learning: 'Leer', passport: 'Paspoort', profile: 'Profiel',
    exploreTitle: 'Verken leer', exploreSubtitle: 'Praktiese vaardighede vir elke stadium',
    sortCourses: 'Sorteer kursusse', searchCourses: 'Soek kursusse, vaardighede of onderwerpe',
    clearSearch: 'Vee soektog uit', recommendedSort: 'Aanbeveel', alphabeticalSort: 'A–Z',
    shortestSort: 'Kortste eerste', allTopics: 'Alle onderwerpe', contentLanguage: 'Inhoudstaal',
    allLanguages: 'Alle tale', featuredCourse: 'Uitgestalde kursus', popularThisMonth: 'Gewild hierdie maand',
    course: 'kursus', courses: 'kursusse', loadingCourses: 'Laai gepubliseerde kursusse…',
    tryAgain: 'Probeer weer', noCoursesAvailable: 'Geen gepubliseerde kursusse is nog beskikbaar nie.',
    noCoursesMatch: 'Geen kursusse pas by jou soektog nie.', noMoreCourses: 'Geen verdere kursusse in hierdie onderwerp nie.',
    lessonCount: (count) => `${count} ${count === 1 ? 'les' : 'lesse'}`,
    viewCourse: (title) => `Bekyk inligting oor ${title}`, myLearning: 'My leerwerk',
    learningSubtitle: 'Jou kursusse en gestoorde lesse', opportunities: 'Maak landbougeleenthede oop',
    inProgress: 'Aan die gang', completed: 'Voltooi', saved: 'Gestoor', activeCourses: 'Aktiewe kursusse',
    averageProgress: 'Gemiddelde vordering', timeLearned: 'Leertyd', loadingCertificates: 'Laai jou sertifikate…',
    couldNotLoadCompleted: 'Kon nie voltooide kursusse laai nie', noCompletedCourses: 'Nog geen voltooide kursusse nie',
    completedCoursesHint: 'Kursusse wat jy slaag, sal hier met hul sertifikate verskyn.',
    exploreCourses: 'Verken kursusse', loadingLearning: 'Laai jou kursusse…',
    couldNotLoadCourses: 'Kon nie jou kursusse laai nie', noCoursesInProgress: 'Geen kursusse aan die gang nie',
    noCoursesInProgressHint: 'Kursusse waarvoor jy inskryf, sal hier verskyn.',
    noSavedCourses: 'Nog geen gestoorde kursusse nie',
    noSavedCoursesHint: 'Stoor kursusse waarna jy wil terugkeer; hulle sal hier verskyn.',
    coursesStartHint: 'Kursusse wat jy begin, sal hier verskyn.',
    lesson: (current, total) => `Les ${current} van ${total}`, continueCourse: (title) => `Gaan voort met ${title}`,
    continue: 'Gaan voort', assessmentPending: 'ASSESSERING WAG', enrolled: 'INGESKRYF',
    lessonsComplete: 'Lesse voltooi · assessering wag', percentComplete: (percent) => `${percent}% voltooi`,
    resume: 'Gaan voort', certificateEarned: 'Sertifikaat verwerf', viewCertificate: 'Bekyk sertifikaat',
    digitalPassport: 'DIGITALE VAARDIGHEIDSPASPOORT', achievements: 'Jou leerprestasies',
    learnerName: 'AgriLearn-leerder', courseCertificate: 'Kursussertifikaat',
    dateNotProvided: 'Datum nie verstrek nie',
    sharePassportMessage: (name) => name ? `${name} se AgriLearn-vaardigheidspaspoort` : 'My AgriLearn-vaardigheidspaspoort',
    sharePassport: 'Deel paspoort',
    category: (value) => ({
      'Crop Production': 'Gewasproduksie',
      'Livestock Management': 'Vee-bestuur',
      'Farm Financial Management': 'Plaasfinansiële bestuur',
      'Drone Operation': 'Hommelbestuur',
      'Precision Agriculture': 'Presisielandbou',
      'IoT in Agriculture': 'Internet van dinge in landbou',
      GIS: 'Geografiese inligtingstelsel',
      Cybersecurity: 'Kuberveiligheid',
      'Data Analytics': 'Data-ontleding',
      'AI in Agriculture': 'KI in landbou',
      'Agricultural Entrepreneurship': 'Landbou-entrepreneurskap',
      'Food Safety': 'Voedselveiligheid',
      'Export Readiness': 'Uitvoergereedheid',
      'Co-operative Management': 'Koöperasiebestuur',
      'Farm Health and Safety': 'Plaasgesondheid en -veiligheid',
      'Water Management': 'Waterbestuur',
      'Soil Health': 'Grondgesondheid',
      Technology: 'Tegnologie',
      'Climate-Smart Farming': 'Klimaatslim boerdery',
    }[value] ?? value),
    level: (value) => value === 'Beginner' ? 'Beginner' : value === 'Intermediate' ? 'Intermediêr' : value === 'Advanced' ? 'Gevorderd' : value,
    duration: (value) => value.replace(/\bh\b/g, 'u').replace(/\bm\b/g, 'min').replace(/\bhrs\b/g, 'ure').replace(/\bmin\b/g, 'min'),
    skills: 'Vaardighede', certificates: 'Sertifikate', points: 'Punte',
    accountConnected: 'AgriLearn-rekening gekoppel',
    credentialsDisclaimer: 'Bewyse hier is deur AgriLearn uitgereik. Eksterne akkreditasie word nie geïmpliseer nie.',
    history: 'Geskiedenis', loadingPassport: 'Laai jou paspoort…',
    couldNotLoadCredentials: 'Kon nie paspoortbewyse laai nie',
    earnedFrom: (courses) => `Verwerf uit ${courses}`, earned: 'Verwerf',
    skillsGrowHere: 'Jou vaardighede sal hier groei',
    earnCredentialHint: 'Verwerf ’n kursusbewys om geverifieerde vaardighede by jou paspoort te voeg.',
    issued: 'Uitgereik', noCredentials: 'Nog geen bewyse nie',
    certificatesSavedHere: 'Sertifikate wat jy verwerf, sal hier gestoor word.',
    credentialEarned: 'Bewys verwerf', noActivity: 'Nog geen paspoortaktiwiteit nie',
    earnedAppearInHistory: 'Verwerfde bewyse sal in jou aktiwiteitsgeskiedenis verskyn.',
    editProfile: 'Wysig profiel', account: 'Rekening', learnerAccount: 'Leerderrekening',
    employerAccount: 'KMO- en werkgewerrekening', trainerAccount: 'Inhoudskeppersrekening', adminAccount: 'Adminrekening',
    personalInformation: 'Persoonlike inligting', editAccountName: 'Wysig jou rekeningnaam',
    notificationPreferences: 'Kennisgewingvoorkeure', recentUpdates: 'Bekyk jou jongste opdaterings',
    privacySecurity: 'Privaatheid en sekuriteit', securitySettings: 'Rekeningsekuriteitinstellings',
    language: (language) => `Taal · ${language}`, chooseLanguage: 'Kies jou toepassingstaal',
    helpSupport: 'Hulp en ondersteuning', getHelp: 'Kry hulp met AgriLearn',
    signOut: 'Teken uit', signingOut: 'Teken uit…', confirmSignOut: 'Is jy seker jy wil uitteken?',
    cancel: 'Kanselleer', done: 'Klaar',
    dismissDialog: 'Maak dialoog toe', couldNotLoadProfile: 'Kon nie profiel laai nie',
    contactAdministrator: 'Kontak jou AgriLearn-administrateur vir hulp met jou rekening.',
    privacyMessage: 'Jou rekening word deur jou aanmeldsessie beskerm. Teken op gedeelde toestelle uit om jou sessie te beëindig.',
    languageSetTo: (language) => `${language} is jou gekose toepassingstaal.`,
    continueLearning: 'Gaan voort met leer', pickUpWhereLeftOff: 'Gaan voort waar jy opgehou het',
    noModulesInProgress: 'Geen modules aan die gang nie',
    enrolCourseHint: 'Skryf vir ’n kursus in om jou leervordering hier te sien.',
    recommendedForYou: 'Aanbeveel vir jou', viewAll: 'Sien alles',
    recommendedCoursesHint: 'Aanbevole kursusse. Swiep horisontaal om te blaai.',
    previousRecommendedCourse: 'Vorige aanbevole kursus', nextRecommendedCourse: 'Volgende aanbevole kursus',
    showCourse: (title) => `Wys ${title}`,
    recommendations: [
      { title: 'Slim besproeiing: basiese beginsels', category: 'Gewasproduksie', details: '45 min · Beginner' },
      { title: 'Gesonde kudde: noodsaaklikhede', category: 'Vee', details: '1,5 uur · Beginner' },
    ],
    loadingPassportSummary: 'Jou paspoort laai', skillsGrowing: 'Jou vaardighede groei',
    startBuildingSkills: 'Begin jou vaardighede bou',
    passportUnavailable: 'Paspoortbesonderhede nie beskikbaar nie',
    loadingSkills: 'Verworwe vaardighede en sertifikate laai…',
    skillCount: (count) => `${count} ${count === 1 ? 'vaardigheid' : 'vaardighede'}`,
    certificateCount: (count) => `${count} ${count === 1 ? 'sertifikaat' : 'sertifikate'}`,
    learningPoints: (count) => `${count} leerpunte`,
    viewMyPassport: 'Sien my paspoort →',
    openNotifications: 'Maak kennisgewings oop',
    switchToLightMode: 'Skakel na ligte modus', switchToDarkMode: 'Skakel na donker modus',
  },
  isizulu: isiZulu,
  isixhosa: isiXhosa,
};

const navigationLabels: Record<string, Partial<AppCopy>> = {
  english: { home: 'Home', explore: 'Explore', learning: 'Learning', passport: 'Passport', profile: 'Profile' },
  afrikaans: { home: 'Tuis', explore: 'Verken', learning: 'Leer', passport: 'Paspoort', profile: 'Profiel', completed: 'Voltooi', saved: 'Gestoor', skills: 'Vaardighede', certificates: 'Sertifikate', points: 'Punte', account: 'Rekening', editProfile: 'Wysig profiel' },
  isindebele: { home: 'Ekhaya', explore: 'Hlola', learning: 'Ukufunda', passport: 'Iphasipoti', profile: 'Iphrofayela', completed: 'Kuphelile', saved: 'Okubulungiweko', skills: 'Amakghono', certificates: 'Iincwadi zokufakazela', points: 'Amaphuzu', account: 'I-akhawundi', editProfile: 'Hlela iphrofayela' },
  isixhosa: { home: 'Ekhaya', explore: 'Jonga', learning: 'Ukufunda', passport: 'Ipaspoti', profile: 'Iprofayile', completed: 'Igqityiwe', saved: 'Ezigciniweyo', skills: 'Izakhono', certificates: 'Iziqinisekiso', points: 'Amanqaku', account: 'Iakhawunti', editProfile: 'Hlela iprofayile' },
  isizulu: { home: 'Ekhaya', explore: 'Hlola', learning: 'Ukufunda', passport: 'Iphasiphothi', profile: 'Iphrofayela', completed: 'Kuqediwe', saved: 'Okugciniwe', skills: 'Amakhono', certificates: 'Izitifiketi', points: 'Amaphuzu', account: 'I-akhawunti', editProfile: 'Hlela iphrofayela' },
  sepedi: { home: 'Gae', explore: 'Nyakišiša', learning: 'Go ithuta', passport: 'Pasepoto', profile: 'Profaele', completed: 'E fedilego', saved: 'Tše di bolokilwego', skills: 'Bokgoni', certificates: 'Mangwalo a bohlatse', points: 'Dintlha', account: 'Akhaonto', editProfile: 'Rulaganya profaele' },
  sesotho: { home: 'Lapeng', explore: 'Hlahloba', learning: 'Ho ithuta', passport: 'Pasepoto', profile: 'Boemo', completed: 'Phethilwe', saved: 'Bolokilwe', skills: 'Bokgoni', certificates: 'Disetifikeiti', points: 'Dintlha', account: 'Akhaonto', editProfile: 'Fetola profaele' },
  setswana: { home: 'Gae', explore: 'Batla', learning: 'Go ithuta', passport: 'Pasopoto', profile: 'Porofaele', completed: 'Di fedile', saved: 'Di bolokilwe', skills: 'Bokgoni', certificates: 'Ditifikeiti', points: 'Dintlha', account: 'Akhaonto', editProfile: 'Baakanya porofaele' },
  siswati: { home: 'Ekhaya', explore: 'Hlola', learning: 'Kufundza', passport: 'Iphasipothi', profile: 'Iphrofayela', completed: 'Kuphelile', saved: 'Lokugciniwe', skills: 'Emakhono', certificates: 'Titifiketi', points: 'Emaphuzu', account: 'I-akhawunti', editProfile: 'Lungisa iphrofayela' },
  tshivenda: { home: 'Hayani', explore: 'Ṱoḓani', learning: 'U guda', passport: 'Phasipoto', profile: 'Phurofaile', completed: 'Zwo fhela', saved: 'Zwo vhulungwa', skills: 'Vhukoni', certificates: 'Ṱhanziela', points: 'Zwipiḓa', account: 'Akhawunthu', editProfile: 'Dzudzanyani phurofaile' },
  xitsonga: { home: 'Kaya', explore: 'Lavisisa', learning: 'Dyondzo', passport: 'Pasipoto', profile: 'Profayili', completed: 'Swi herile', saved: 'Leswi hlayisiweke', skills: 'Vuswikoti', certificates: 'Switifiketi', points: 'Tinhla', account: 'Akhaunti', editProfile: 'Lulamisa profayili' },
};

export function getAppLanguage(language: string | null | undefined): AppCopy {
  const key = language?.trim().toLowerCase() ?? '';
  const dashboard = getDashboardLanguage(key);
  const copy = supportedLanguages[key] ?? english;
  return {
    ...copy,
    ...navigationLabels[key],
    digitalPassport: dashboard.skillsPassport,
    inProgress: dashboard.inProgress,
    assessmentPending: dashboard.assessmentPending,
    continueCourse: dashboard.continueCourse,
    lesson: dashboard.lessonProgress,
    lessonsComplete: dashboard.lessonsCompleteAssessmentPending,
    percentComplete: dashboard.percentComplete,
    noCoursesInProgress: dashboard.noModulesInProgress,
    exploreCourses: dashboard.exploreCourses.replace(/ →$/, ''),
    continueLearning: dashboard.continueLearning,
    pickUpWhereLeftOff: dashboard.pickUpWhereLeftOff,
    loadingLearning: dashboard.loadingLearning,
    noModulesInProgress: dashboard.noModulesInProgress,
    enrolCourseHint: dashboard.enrolCourseHint,
    recommendedForYou: dashboard.recommendedForYou,
    viewAll: dashboard.viewAll,
    recommendedCoursesHint: dashboard.recommendedCoursesHint,
    previousRecommendedCourse: dashboard.previousRecommendedCourse,
    nextRecommendedCourse: dashboard.nextRecommendedCourse,
    showCourse: dashboard.showCourse,
    recommendations: dashboard.recommendations,
    loadingPassportSummary: dashboard.loadingPassport,
    skillsGrowing: dashboard.skillsGrowing,
    startBuildingSkills: dashboard.startBuildingSkills,
    passportUnavailable: dashboard.passportUnavailable,
    loadingSkills: dashboard.loadingSkills,
    skillCount: dashboard.skillsCount,
    certificateCount: dashboard.certificatesCount,
    learningPoints: dashboard.learningPointsCount,
    viewMyPassport: dashboard.viewMyPassport,
  };
}

export function getAppLocale(language: string | null | undefined): string {
  const key = language?.trim().toLowerCase() ?? '';
  const locales: Record<string, string> = {
    english: 'en-ZA',
    afrikaans: 'af-ZA',
    isindebele: 'nr-ZA',
    isixhosa: 'xh-ZA',
    isizulu: 'zu-ZA',
    sepedi: 'nso-ZA',
    sesotho: 'st-ZA',
    setswana: 'tn-ZA',
    siswati: 'ss-ZA',
    tshivenda: 've-ZA',
    xitsonga: 'ts-ZA',
  };
  return locales[key] ?? 'en-ZA';
}

export type { AppCopy };
