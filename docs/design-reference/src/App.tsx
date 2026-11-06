import { useEffect, useMemo, useState, type ReactNode } from 'react'

type Role = 'learner' | 'employer' | 'trainer' | 'admin'
type Page =
  | 'welcome' | 'onboarding' | 'register' | 'category' | 'personal' | 'verify' | 'login'
  | 'home' | 'explore' | 'course' | 'learning' | 'lesson' | 'assessment' | 'results'
  | 'passport' | 'certificate' | 'profile' | 'notifications' | 'invitation'
  | 'employer' | 'business' | 'job' | 'applications' | 'applicant' | 'sendInvite'
  | 'trainer' | 'modules' | 'createModule' | 'createAssessment' | 'previewModule' | 'submitted'
  | 'admin' | 'users' | 'approvals' | 'review' | 'reports'

type IconName =
  | 'home' | 'search' | 'book' | 'passport' | 'user' | 'bell' | 'arrow' | 'back'
  | 'play' | 'clock' | 'check' | 'leaf' | 'award' | 'briefcase' | 'building'
  | 'users' | 'plus' | 'edit' | 'chart' | 'settings' | 'menu' | 'filter' | 'share'
  | 'download' | 'lock' | 'mail' | 'location' | 'calendar' | 'file' | 'video'
  | 'chevron' | 'close' | 'more' | 'upload' | 'eye' | 'shield' | 'trend'

const photos = {
  farmer: 'https://images.unsplash.com/photo-1552645388-31461619e5e3?auto=format&fit=crop&w=900&q=85',
  field: 'https://images.unsplash.com/photo-1686947078487-a9b8d4857eee?auto=format&fit=crop&w=900&q=85',
  soil: 'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=900&q=85',
  cattle: 'https://images.unsplash.com/photo-1506349103253-e648563ec8b9?auto=format&fit=crop&w=900&q=85',
  greenhouse: 'https://images.unsplash.com/photo-1728137575406-039af3085f37?auto=format&fit=crop&w=900&q=85',
  crops: 'https://images.unsplash.com/photo-1529583647475-67602abaa6f2?auto=format&fit=crop&w=900&q=85',
}

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Partial<Record<IconName, ReactNode>> = {
    home: <><path d="M3 10.8 12 3l9 7.8"/><path d="M5 9.8V21h14V9.8M9 21v-7h6v7"/></>,
    search: <><circle cx="10.8" cy="10.8" r="7.3"/><path d="m16.2 16.2 4.3 4.3"/></>,
    book: <><path d="M4 5.2A3.2 3.2 0 0 1 7.2 2H11v18H7.2A3.2 3.2 0 0 0 4 23Z"/><path d="M20 5.2A3.2 3.2 0 0 0 16.8 2H13v18h3.8A3.2 3.2 0 0 1 20 23Z"/></>,
    passport: <><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8.5 16h7M8.5 19h4"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    back: <><path d="M19 12H5M10 7l-5 5 5 5"/></>,
    play: <path d="m8 5 11 7-11 7Z"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    leaf: <><path d="M20 4C10 4 5 8 5 14c0 3 2 5 5 5 6 0 10-5 10-15Z"/><path d="M4 21c3-6 7-9 12-12"/></>,
    award: <><circle cx="12" cy="9" r="6"/><path d="m8 14-1 8 5-3 5 3-1-8"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2"/></>,
    building: <><path d="M4 22V3h11v19M15 9h5v13M8 7h3M8 11h3M8 15h3M8 19h3"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    edit: <><path d="m4 16-1 5 5-1L19 9l-4-4Z"/><path d="m13 7 4 4"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    filter: <path d="M3 5h18l-7 8v6l-4 2v-8Z"/>,
    share: <><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    location: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
    file: <><path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3Z"/></>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></>,
    eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
    shield: <><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    trend: <><path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function Button({ children, onClick, variant = 'primary', icon, full = false, disabled = false, type = 'button' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
  icon?: IconName; full?: boolean; disabled?: boolean; type?: 'button' | 'submit'
}) {
  return <button type={type} className={`btn btn-${variant} ${full ? 'btn-full' : ''}`} onClick={onClick} disabled={disabled}>
    {children}{icon && <Icon name={icon} size={18}/>}
  </button>
}

function Logo({ light = false }: { light?: boolean }) {
  return <div className={`logo ${light ? 'logo-light' : ''}`}><span className="logo-mark"><Icon name="leaf" size={22}/></span><span>AgriLearn</span></div>
}

function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'gold' | 'grey' | 'red' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

function Progress({ value, light = false }: { value: number; light?: boolean }) {
  return <div className={`progress ${light ? 'progress-light' : ''}`}><span style={{ width: `${value}%` }}/></div>
}

function Header({ title, subtitle, back, right }: { title?: string; subtitle?: string; back?: () => void; right?: ReactNode }) {
  return <header className="page-header">
    <div className="header-row">
      {back && <button className="icon-btn" onClick={back} aria-label="Go back"><Icon name="back"/></button>}
      <div className="header-copy">{title && <h1>{title}</h1>}{subtitle && <p>{subtitle}</p>}</div>
      {right}
    </div>
  </header>
}

function Field({ label, placeholder, type = 'text', value, onChange }: { label: string; placeholder: string; type?: string; value?: string; onChange?: (v: string) => void }) {
  return <label className="field"><span>{label}</span><input type={type} placeholder={placeholder} value={value} onChange={e => onChange?.(e.target.value)}/></label>
}

function SelectField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span><select>{children}</select></label>
}

function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`screen ${className}`}>{children}</main>
}

function Nav({ role, page, go }: { role: Role; page: Page; go: (p: Page) => void }) {
  const learnerItems: { label: string; icon: IconName; page: Page }[] = [
    { label: 'Home', icon: 'home', page: 'home' }, { label: 'Explore', icon: 'search', page: 'explore' },
    { label: 'Learning', icon: 'book', page: 'learning' }, { label: 'Passport', icon: 'passport', page: 'passport' },
    { label: 'Profile', icon: 'user', page: 'profile' },
  ]
  const employerItems: { label: string; icon: IconName; page: Page }[] = [
    { label: 'Learn', icon: 'home', page: 'home' }, { label: 'Employer', icon: 'building', page: 'employer' },
    { label: 'Jobs', icon: 'briefcase', page: 'applications' }, { label: 'Talent', icon: 'users', page: 'applicant' },
    { label: 'Profile', icon: 'user', page: 'profile' },
  ]
  const trainerItems: { label: string; icon: IconName; page: Page }[] = [
    { label: 'Dashboard', icon: 'home', page: 'trainer' }, { label: 'Content', icon: 'book', page: 'modules' },
    { label: 'Create', icon: 'plus', page: 'createModule' }, { label: 'Reviews', icon: 'file', page: 'submitted' },
    { label: 'Profile', icon: 'user', page: 'profile' },
  ]
  const adminItems: { label: string; icon: IconName; page: Page }[] = [
    { label: 'Dashboard', icon: 'home', page: 'admin' }, { label: 'Users', icon: 'users', page: 'users' },
    { label: 'Approvals', icon: 'check', page: 'approvals' }, { label: 'Reports', icon: 'chart', page: 'reports' },
    { label: 'Settings', icon: 'settings', page: 'profile' },
  ]
  const items = role === 'admin' ? adminItems : role === 'trainer' ? trainerItems : role === 'employer' ? employerItems : learnerItems
  return <nav className="bottom-nav">{items.map(item => <button key={item.label} onClick={() => go(item.page)} className={page === item.page ? 'active' : ''}><Icon name={item.icon} size={21}/><span>{item.label}</span></button>)}</nav>
}

function Welcome({ go }: { go: (p: Page) => void }) {
  return <Screen className="welcome-screen">
    <img src={photos.farmer} alt="South African farmer holding a young plant" className="welcome-image"/>
    <div className="welcome-overlay"/>
    <div className="welcome-content">
      <Logo light/>
      <div className="welcome-message"><Badge tone="gold">AgriSETA Digital 2030 initiative</Badge><h1>Grow your skills.<br/>Grow your future.</h1><p>Practical agricultural learning, trusted credentials and real opportunities — all in one place.</p></div>
      <div className="welcome-actions"><Button full variant="gold" onClick={() => go('onboarding')} icon="arrow">Get started</Button><Button full variant="secondary" onClick={() => go('login')}>I already have an account</Button></div>
    </div>
  </Screen>
}

function Onboarding({ go }: { go: (p: Page) => void }) {
  const [slide, setSlide] = useState(0)
  const slides = [
    { image: photos.soil, eyebrow: 'LEARN', title: 'Skills made practical', body: 'Build farming knowledge with short lessons, expert-led courses and learning that works in the field.' },
    { image: photos.greenhouse, eyebrow: 'ACHIEVE', title: 'Show what you know', body: 'Complete assessments, earn digital certificates and build a Skills Passport that grows with you.' },
    { image: photos.field, eyebrow: 'CONNECT', title: 'Find your next opportunity', body: 'Discover jobs, projects and agricultural businesses looking for people with your skills.' },
  ]
  const current = slides[slide]
  return <Screen className="onboard-screen">
    <div className="onboard-top"><button onClick={() => go('welcome')} className="icon-btn light"><Icon name="back"/></button><button className="text-link light-text" onClick={() => go('register')}>Skip</button></div>
    <img src={current.image} alt="" className="onboard-image"/>
    <div className="onboard-card">
      <span className="eyebrow">{current.eyebrow}</span><h1>{current.title}</h1><p>{current.body}</p>
      <div className="dots">{slides.map((_, i) => <span key={i} className={i === slide ? 'active' : ''}/>)}</div>
      <Button full icon="arrow" onClick={() => slide < 2 ? setSlide(slide + 1) : go('register')}>{slide < 2 ? 'Continue' : 'Create my account'}</Button>
    </div>
  </Screen>
}

function Auth({ page, go }: { page: Page; go: (p: Page) => void }) {
  if (page === 'category') return <Screen><Header title="How do you work in agriculture?" subtitle="This helps us personalise your learning." back={() => go('register')}/><div className="content auth-content"><div className="category-grid">
    {[
      ['leaf','Farmer','I manage or work my own farm'],['briefcase','Agricultural worker','I work in the agriculture sector'],
      ['book','Student','I am studying agriculture'],['building','Agricultural SMME','I run a small agricultural business'],
    ].map(([icon,title,text]) => <button className="category-card" key={title} onClick={() => go('personal')}><span className="category-icon"><Icon name={icon as IconName}/></span><strong>{title}</strong><small>{text}</small><span className="radio"/></button>)}
  </div><p className="helper"><Icon name="shield" size={16}/> You can change this later in your profile.</p></div></Screen>

  if (page === 'personal') return <Screen><Header title="Tell us about yourself" subtitle="Just the essentials to get you started." back={() => go('category')}/><div className="content auth-content form-stack"><Field label="Full name" placeholder="e.g. Thabo Mokoena"/><Field label="Mobile number" placeholder="+27 71 234 5678"/><SelectField label="Province"><option>Gauteng</option><option>Limpopo</option><option>Mpumalanga</option><option>KwaZulu-Natal</option></SelectField><SelectField label="Primary interest"><option>Crop Production</option><option>Livestock Management</option><option>Agricultural Business</option></SelectField><Button full onClick={() => go('verify')} icon="arrow">Create account</Button></div></Screen>

  if (page === 'verify') return <Screen><div className="centered auth-content"><span className="hero-icon"><Icon name="mail" size={34}/></span><h1>Check your messages</h1><p>We sent a 6-digit verification code to <strong>+27 71 234 5678</strong>.</p><div className="otp">{[4,8,2,9,1,6].map((n,i)=><input key={i} value={n} readOnly aria-label={`Digit ${i+1}`}/>)}</div><Button full onClick={() => go('home')}>Verify account</Button><button className="text-link">Resend code in 00:42</button></div></Screen>

  if (page === 'login') return <Screen className="auth-screen"><div className="auth-brand"><Logo/><button onClick={() => go('welcome')} className="icon-btn"><Icon name="close"/></button></div><div className="content auth-content"><div><span className="eyebrow">WELCOME BACK</span><h1>Continue growing</h1><p>Sign in to access your learning and opportunities.</p></div><div className="form-stack"><Field label="Email or mobile number" placeholder="thabo@example.co.za"/><Field label="Password" placeholder="Enter your password" type="password"/><button className="text-link align-right">Forgot password?</button><Button full onClick={() => go('home')}>Sign in</Button></div><div className="demo-roles"><span>Or explore a role demo</span><div><Button variant="secondary" onClick={() => go('trainer')}>Trainer</Button><Button variant="secondary" onClick={() => go('admin')}>Admin</Button></div></div><p className="center-text">New to AgriLearn? <button className="text-link" onClick={() => go('register')}>Create account</button></p></div></Screen>

  return <Screen className="auth-screen"><div className="auth-brand"><Logo/><span>Step 1 of 3</span></div><div className="content auth-content"><div><span className="eyebrow">CREATE YOUR ACCOUNT</span><h1>Start your learning journey</h1><p>Free access to practical agricultural knowledge.</p></div><div className="form-stack"><Field label="Email address" placeholder="you@example.co.za" type="email"/><Field label="Create password" placeholder="At least 8 characters" type="password"/><label className="check-row"><input type="checkbox" defaultChecked/><span>I agree to the Terms of Use and Privacy Policy.</span></label><Button full onClick={() => go('category')} icon="arrow">Continue</Button></div><p className="center-text">Already registered? <button className="text-link" onClick={() => go('login')}>Sign in</button></p></div></Screen>
}

const CourseCard = ({ image, title, category, meta, onClick }: { image: string; title: string; category: string; meta: string; onClick: () => void }) =>
  <button className="course-card" onClick={onClick}><img src={image} alt=""/><div><span className="card-category">{category}</span><h3>{title}</h3><p><Icon name="clock" size={14}/>{meta}</p></div><span className="course-arrow"><Icon name="chevron" size={18}/></span></button>

function LearnerHome({ go, toast }: { go: (p: Page) => void; toast: (m: string) => void }) {
  return <Screen>
    <div className="home-hero">
      <div className="home-top"><Logo light/><button className="notification-btn" onClick={() => go('notifications')}><Icon name="bell"/><span>3</span></button></div>
      <div className="greeting"><div><small>GOOD MORNING</small><h1>Thabo Mokoena</h1><p>Keep growing your agricultural knowledge.</p></div><div className="avatar">TM</div></div>
      <div className="streak"><span><Icon name="trend" size={20}/></span><div><strong>4 week learning streak</strong><small>One lesson away from your weekly goal</small></div><span className="streak-count">3/4</span></div>
    </div>
    <div className="content home-content">
      <div className="section-head"><div><span className="eyebrow">CONTINUE LEARNING</span><h2>Pick up where you left off</h2></div></div>
      <button className="continue-card" onClick={() => go('lesson')}><img src={photos.soil} alt="Hands holding healthy soil"/><div className="image-shade"/><div className="continue-copy"><Badge>IN PROGRESS</Badge><h3>Soil Health Fundamentals</h3><p>Lesson 4 of 6 · Understanding soil pH</p><Progress value={62} light/><div className="continue-footer"><span>62% complete</span><span className="round-play"><Icon name="play" size={16}/></span></div></div></button>
      <div className="section-head"><h2>Recommended for you</h2><button className="text-link" onClick={() => go('explore')}>View all</button></div>
      <div className="horizontal-cards">
        <CourseCard image={photos.crops} category="CROP PRODUCTION" title="Smart Irrigation Basics" meta="45 min · Beginner" onClick={() => go('course')}/>
        <CourseCard image={photos.cattle} category="LIVESTOCK" title="Healthy Herd Essentials" meta="1.5 hrs · Beginner" onClick={() => go('course')}/>
      </div>
      <div className="passport-preview"><div className="passport-top"><span className="passport-seal"><Icon name="passport"/></span><Badge tone="gold">SKILLS PASSPORT</Badge></div><h3>Your skills are growing</h3><p>4 skills · 2 certificates · 680 learning points</p><div className="skill-faces"><span>SH</span><span>CS</span><span>FS</span><span>+1</span></div><Button variant="secondary" onClick={() => go('passport')} icon="arrow">View my passport</Button></div>
      <div className="achievement"><span><Icon name="award"/></span><div><small>NEW ACHIEVEMENT</small><strong>Consistent Grower</strong><p>Completed lessons 3 weeks in a row</p></div><button className="icon-btn" onClick={() => toast('Achievement saved to your Passport')}><Icon name="share" size={18}/></button></div>
    </div>
  </Screen>
}

function Explore({ go }: { go: (p: Page) => void }) {
  const categories = ['All topics','Crop Production','Livestock','Climate-smart','Soil','Agribusiness']
  const [active, setActive] = useState('All topics')
  const courses = [
    [photos.crops,'Crop Production','Smart Irrigation Basics','45 min · Beginner'],
    [photos.cattle,'Livestock Management','Healthy Herd Essentials','1.5 hrs · Beginner'],
    [photos.soil,'Soil Management','Soil Health Fundamentals','2 hrs · Intermediate'],
    [photos.field,'Climate-Smart Agriculture','Farming Through Drought','1 hr · Beginner'],
  ]
  return <Screen><Header title="Explore learning" subtitle="Practical skills for every stage" right={<button className="icon-btn"><Icon name="filter"/></button>}/><div className="content">
    <label className="search"><Icon name="search"/><input placeholder="Search courses, skills or topics..."/></label>
    <div className="chips">{categories.map(c => <button key={c} className={active === c ? 'active' : ''} onClick={() => setActive(c)}>{c}</button>)}</div>
    <button className="featured" onClick={() => go('course')}><img src={photos.farmer} alt="Farmer inspecting a plant"/><div className="image-shade"/><div><Badge tone="gold">FEATURED COURSE</Badge><h2>Climate-smart crop production</h2><p>Build a resilient farm for a changing climate</p><span>8 lessons · 3 hours <Icon name="arrow" size={17}/></span></div></button>
    <div className="section-head"><h2>Popular this month</h2><span>24 courses</span></div>
    <div className="course-list">{courses.map(c => <CourseCard key={c[2]} image={c[0]} category={c[1]} title={c[2]} meta={c[3]} onClick={() => go('course')}/>)}</div>
  </div></Screen>
}

function CourseDetail({ go, enrolled, setEnrolled }: { go: (p: Page) => void; enrolled: boolean; setEnrolled: (v: boolean) => void }) {
  return <Screen className="detail-screen">
    <div className="detail-media"><img src={photos.farmer} alt="Farmer holding a green plant"/><div className="image-shade"/><button className="icon-btn light top-back" onClick={() => go('explore')}><Icon name="back"/></button><Badge tone="gold">CLIMATE-SMART AGRICULTURE</Badge></div>
    <div className="detail-body"><h1>Climate-smart crop production</h1><p className="lead">Practical ways to improve yields, protect your soil and build resilience in changing weather.</p>
      <div className="course-facts"><span><Icon name="clock"/><strong>3 hours</strong><small>Duration</small></span><span><Icon name="book"/><strong>8 lessons</strong><small>Self-paced</small></span><span><Icon name="award"/><strong>Certificate</strong><small>Assessment</small></span></div>
      <div className="author"><div className="avatar small">NM</div><div><small>CREATED BY</small><strong>Nomsa Mahlangu</strong><p>Crop Production Specialist</p></div></div>
      <section><h2>What you’ll learn</h2>{['Read weather and climate risks on your farm','Build and protect healthy, productive soil','Plan water-efficient crop production','Choose resilient crops for local conditions'].map(x => <p className="check-line" key={x}><span><Icon name="check" size={15}/></span>{x}</p>)}</section>
      <section><div className="section-head"><h2>Course content</h2><span>8 lessons</span></div>{['Understanding climate-smart farming','Know your soil','Water-wise crop planning','Selecting resilient crops'].map((x,i) => <div className="lesson-row" key={x}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{x}</strong><small>{i === 0 ? 'Video · 12 min' : 'Reading · 10 min'}</small></div>{i === 0 ? <Icon name="play" size={18}/> : <Icon name="lock" size={16}/>}</div>)}</section>
    </div>
    <div className="sticky-action"><Button full onClick={() => { setEnrolled(true); go(enrolled ? 'lesson' : 'learning') }} icon="arrow">{enrolled ? 'Continue course' : 'Enrol for free'}</Button></div>
  </Screen>
}

function MyLearning({ go }: { go: (p: Page) => void }) {
  const [tab,setTab] = useState('In progress')
  return <Screen><Header title="My learning" subtitle="Your courses and saved lessons"/><div className="content">
    <div className="segmented">{['In progress','Completed','Saved'].map(x=><button key={x} onClick={()=>setTab(x)} className={tab===x?'active':''}>{x}</button>)}</div>
    {tab === 'In progress' ? <><div className="learning-summary"><span><strong>2</strong><small>Active courses</small></span><span><strong>68%</strong><small>Average progress</small></span><span><strong>4.5h</strong><small>Time learned</small></span></div>
      <div className="learning-card"><img src={photos.soil} alt="Soil in hands"/><div className="learning-card-body"><Badge>IN PROGRESS</Badge><h2>Soil Health Fundamentals</h2><p>Next: Understanding soil pH</p><Progress value={62}/><div><span>62% complete</span><Button onClick={()=>go('lesson')} variant="primary" icon="play">Continue</Button></div></div></div>
      <div className="learning-card"><img src={photos.field} alt="Agricultural fields"/><div className="learning-card-body"><Badge>JUST STARTED</Badge><h2>Climate-smart crop production</h2><p>Next: Climate-smart farming</p><Progress value={12}/><div><span>12% complete</span><Button onClick={()=>go('lesson')} variant="primary" icon="play">Continue</Button></div></div></div></> :
      <div className="empty-state"><span><Icon name={tab==='Completed'?'award':'book'} size={32}/></span><h2>{tab==='Completed'?'Your first certificate is close':'Save learning for later'}</h2><p>{tab==='Completed'?'Complete your active course and pass the final assessment to earn it.':'Tap the bookmark on any course to find it here.'}</p><Button onClick={()=>go('explore')}>Explore courses</Button></div>}
  </div></Screen>
}

function Lesson({ go }: { go: (p: Page) => void }) {
  const [complete,setComplete] = useState(false)
  return <Screen className="lesson-screen"><Header title="Soil Health Fundamentals" subtitle="Lesson 4 of 6" back={() => go('learning')} right={<button className="icon-btn"><Icon name="more"/></button>}/><Progress value={67}/>
    <div className="video"><img src={photos.soil} alt="Hands demonstrating healthy soil"/><button className="video-play"><Icon name="play" size={25}/></button><span>06:24 / 10:12</span></div>
    <article className="lesson-content"><Badge>VIDEO LESSON</Badge><h1>Understanding soil pH</h1><p className="lead">Soil pH affects how easily your crops can access nutrients. In this lesson, you’ll learn to test, read and improve it.</p>
      <div className="key-point"><span><Icon name="leaf"/></span><div><strong>In the field</strong><p>Most vegetables grow best in soil with a pH between 6.0 and 7.0.</p></div></div>
      <h2>Why pH matters</h2><p>When soil becomes too acidic or too alkaline, key nutrients become difficult for plant roots to absorb — even when they are present in the soil.</p>
      <h2>Three simple steps</h2>{['Collect soil from several parts of your field.','Mix the samples and use a basic pH test kit.','Compare the result with your crop’s preferred range.'].map((x,i)=><div className="number-step" key={x}><span>{i+1}</span><p>{x}</p></div>)}
    </article>
    <div className="lesson-actions"><Button variant="secondary" onClick={() => go('learning')}><Icon name="back" size={17}/> Previous</Button><Button onClick={()=>complete ? go('assessment') : setComplete(true)} icon={complete?'arrow':'check'}>{complete?'Take assessment':'Mark complete'}</Button></div>
    {complete && <div className="completion-toast"><span><Icon name="check"/></span><div><strong>Lesson complete</strong><p>You’re ready for the knowledge check.</p></div></div>}
  </Screen>
}

function Assessment({ go }: { go: (p: Page) => void }) {
  const [question,setQuestion] = useState(0)
  const [selected,setSelected] = useState<number | null>(null)
  const questions = [
    { q:'Which pH range is best for most vegetable crops?', a:['3.0 – 4.0','6.0 – 7.0','8.0 – 9.0','Above 10.0'] },
    { q:'Why should soil samples be collected from several areas?', a:['To get a representative result','To change the soil colour','To use more test solution','To make the soil warmer'] },
    { q:'What can happen when soil is too acidic?', a:['Roots grow instantly','Nutrients become less available','The pH always rises','Water is no longer needed'] },
  ]
  const current = questions[question]
  return <Screen><Header title="Knowledge check" subtitle={`Question ${question+1} of ${questions.length}`} back={() => go('lesson')}/><Progress value={(question+1)/questions.length*100}/><div className="content assessment-content"><div className="assessment-meta"><span><Icon name="clock" size={18}/> About 3 minutes</span><Badge>PASS MARK 70%</Badge></div><span className="question-num">QUESTION {String(question+1).padStart(2,'0')}</span><h1>{current.q}</h1><p>Select one answer.</p><div className="answers">{current.a.map((a,i)=><button key={a} className={selected===i?'selected':''} onClick={()=>setSelected(i)}><span>{String.fromCharCode(65+i)}</span><strong>{a}</strong>{selected===i&&<Icon name="check"/>}</button>)}</div></div><div className="sticky-action"><Button full disabled={selected===null} onClick={()=>{ if(question<questions.length-1){setQuestion(question+1);setSelected(null)}else go('results')}} icon="arrow">{question<questions.length-1?'Next question':'Submit answers'}</Button></div></Screen>
}

function Results({ go }: { go: (p: Page) => void }) {
  return <Screen className="result-screen"><div className="confetti c1"/><div className="confetti c2"/><div className="confetti c3"/><div className="content result-content"><span className="result-seal"><Icon name="award" size={42}/></span><Badge>ASSESSMENT PASSED</Badge><h1>Excellent work, Thabo!</h1><p>You’ve demonstrated your understanding of soil health fundamentals.</p><div className="score-ring"><strong>87%</strong><span>Your score</span></div><div className="result-stats"><span><strong>7/8</strong><small>Correct</small></span><span><strong>70%</strong><small>Pass mark</small></span><span><strong>1</strong><small>Attempt</small></span></div><div className="credential-earned"><Icon name="shield"/><div><small>NEW CREDENTIAL EARNED</small><strong>Soil Health Fundamentals</strong><p>Added to your Skills Passport</p></div></div><Button full onClick={()=>go('certificate')} icon="award">View my certificate</Button><Button full variant="secondary" onClick={()=>go('passport')}>Go to Skills Passport</Button></div></Screen>
}

function Passport({ go }: { go: (p: Page) => void }) {
  const [tab,setTab]=useState('Skills')
  return <Screen><div className="passport-hero"><div className="passport-header"><Logo light/><button className="icon-btn light"><Icon name="share"/></button></div><div className="passport-person"><div className="avatar photo">TM</div><div><Badge tone="gold">DIGITAL SKILLS PASSPORT</Badge><h1>Thabo Mokoena</h1><p>Farmer · Gauteng, South Africa</p></div></div><div className="passport-numbers"><span><strong>4</strong><small>Skills</small></span><span><strong>2</strong><small>Certificates</small></span><span><strong>680</strong><small>Points</small></span></div></div><div className="content passport-content"><div className="verification"><Icon name="shield"/><div><strong>Profile identity confirmed</strong><p>Credentials are issued by AgriLearn. Accreditation is shown only where confirmed.</p></div></div><div className="segmented">{['Skills','Credentials','History'].map(x=><button className={tab===x?'active':''} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>
    {tab==='Skills'&&<div className="skill-list">{[['Soil health','Assessed','Advanced'],['Crop production','2 modules','Intermediate'],['Water management','1 module','Foundation'],['Food safety','Assessed','Foundation']].map(([x,y,z],i)=><div className="skill-item" key={x}><span className="skill-icon"><Icon name={i===0?'leaf':i===1?'trend':i===2?'shield':'check'}/></span><div><h3>{x}</h3><p>{y}</p><Progress value={[88,70,45,40][i]}/></div><Badge tone={i<2?'green':'grey'}>{z}</Badge></div>)}</div>}
    {tab==='Credentials'&&<div className="credential-list"><button onClick={()=>go('certificate')}><span className="cert-mini"><Icon name="award"/></span><div><h3>Soil Health Fundamentals</h3><p>Earned 18 June 2026</p></div><Icon name="chevron"/></button><button onClick={()=>go('certificate')}><span className="cert-mini"><Icon name="award"/></span><div><h3>Safe Food Handling</h3><p>Earned 04 May 2026</p></div><Icon name="chevron"/></button></div>}
    {tab==='History'&&<div className="timeline">{['Passed Soil Health assessment','Completed Soil Health Fundamentals','Earned Consistent Grower badge','Completed Safe Food Handling'].map((x,i)=><div key={x}><span/><section><strong>{x}</strong><p>{i<2?'18 June 2026':'04 May 2026'}</p></section></div>)}</div>}
    <Button full variant="secondary" icon="eye">Preview public passport</Button></div></Screen>
}

function Certificate({ go, toast }: { go: (p: Page)=>void; toast:(m:string)=>void }) {
  return <Screen><Header title="Certificate" back={()=>go('passport')} right={<button className="icon-btn"><Icon name="more"/></button>}/><div className="content"><div className="certificate"><div className="cert-pattern"/><Logo/><span className="cert-kicker">CERTIFICATE OF COMPLETION</span><Icon name="award" size={55}/><p>This is presented to</p><h1>Thabo Mokoena</h1><p>for successfully completing</p><h2>Soil Health<br/>Fundamentals</h2><div className="cert-meta"><span><small>DATE EARNED</small><strong>18 June 2026</strong></span><span><small>REFERENCE</small><strong>AGR-26-01842</strong></span></div><div className="verified"><Icon name="shield" size={17}/> Issued by AgriLearn</div></div><div className="notice"><Icon name="shield"/><p>This certificate confirms assessed learning completed on AgriLearn. It does not claim formal accreditation.</p></div><div className="dual-actions"><Button variant="secondary" icon="download" onClick={()=>toast('Certificate download prepared')}>Download</Button><Button icon="share" onClick={()=>toast('Share link copied')}>Share</Button></div></div></Screen>
}

function Notifications({ go }: { go:(p:Page)=>void }) {
  const items = [
    ['briefcase','New invitation from GreenRise Produce','You’ve been invited to join a seasonal crop project.','12 min','new'],
    ['award','Your certificate is ready','Soil Health Fundamentals has been added to your Passport.','1 hr','new'],
    ['book','New course for you','Try Introduction to Agribusiness Planning.','Yesterday','new'],
    ['check','Assessment result','You passed Food Safety Basics with 82%.','3 days',''],
  ]
  return <Screen><Header title="Notifications" subtitle="3 unread updates" back={()=>go('home')} right={<button className="text-link">Mark all read</button>}/><div className="content notification-list">{items.map(([icon,title,text,time,state])=><button key={title} className={state} onClick={()=>title.includes('invitation')&&go('invitation')}><span className="notice-icon"><Icon name={icon as IconName}/></span><div><div><strong>{title}</strong><small>{time}</small></div><p>{text}</p></div>{state&&<i/>}</button>)}</div></Screen>
}

function Invitation({ go, toast }: { go:(p:Page)=>void;toast:(m:string)=>void }) {
  const [status,setStatus]=useState('Pending')
  return <Screen><Header title="Invitation" back={()=>go('notifications')}/><div className="content"><div className="invite-brand"><span className="business-logo"><Icon name="leaf"/></span><div><Badge tone={status==='Accepted'?'green':'gold'}>{status.toUpperCase()}</Badge><h1>GreenRise Produce</h1><p>Verified agricultural business</p></div></div><div className="invite-card"><span className="eyebrow">PROJECT INVITATION</span><h2>Seasonal vegetable production project</h2><p>We’re looking for a skilled grower to support our 12-week summer vegetable production project in Cullinan.</p><div className="invite-facts"><p><Icon name="location"/>Cullinan, Gauteng</p><p><Icon name="calendar"/>01 September – 24 November</p><p><Icon name="briefcase"/>Paid project · Part-time</p></div></div><section className="plain-section"><h2>Why they invited you</h2><p>Your Skills Passport shows assessed skills in soil health and crop production that match this project.</p><div className="mini-skills"><Badge>Soil health</Badge><Badge>Crop production</Badge></div></section><section className="plain-section"><h2>Message from Lerato</h2><div className="quote">“Hi Thabo, your practical learning record stood out to our team. We’d like to invite you to discuss supporting our next growing cycle.”</div></section>{status==='Pending'?<div className="dual-actions"><Button full variant="secondary" onClick={()=>{setStatus('Declined');toast('Invitation declined')}}>Decline</Button><Button full onClick={()=>{setStatus('Accepted');toast('Invitation accepted')}}>Accept invitation</Button></div>:<div className="success-panel"><Icon name="check"/><div><strong>Invitation {status.toLowerCase()}</strong><p>{status==='Accepted'?'GreenRise Produce has been notified.':'You will not receive further updates.'}</p></div></div>}</div></Screen>
}

function Profile({ role, setRole, go }: { role:Role;setRole:(r:Role)=>void;go:(p:Page)=>void }) {
  return <Screen><Header title={role==='admin'?'Settings':'Profile'} right={<button className="icon-btn"><Icon name="settings"/></button>}/><div className="content"><div className="profile-card"><div className="avatar large">TM</div><h2>{role==='admin'?'Naledi Dlamini':role==='trainer'?'Nomsa Mahlangu':'Thabo Mokoena'}</h2><p>{role==='admin'?'Platform Administrator':role==='trainer'?'Content Author · Crop Production':'Farmer · Gauteng'}</p><Button variant="secondary" icon="edit">Edit profile</Button></div><span className="menu-label">ACCOUNT</span><div className="menu-list">{[['user','Personal information'],['bell','Notification preferences'],['lock','Privacy & security'],['settings','Language · English'],['mail','Help & support']].map(([i,x])=><button key={x}><Icon name={i as IconName}/><span>{x}</span><Icon name="chevron" size={17}/></button>)}</div><span className="menu-label">SWITCH PROTOTYPE ROLE</span><div className="role-switcher">{(['learner','employer','trainer','admin'] as Role[]).map(r=><button key={r} className={role===r?'active':''} onClick={()=>{setRole(r);go(r==='learner'?'home':r)}}>{r==='employer'?'SMME + Employer':r[0].toUpperCase()+r.slice(1)}</button>)}</div><Button full variant="danger" onClick={()=>go('welcome')}>Log out</Button></div></Screen>
}

function Employer({ page, go, toast }: { page:Page;go:(p:Page)=>void;toast:(m:string)=>void }) {
  if(page==='business') return <Screen><Header title="Business profile" back={()=>go('employer')} right={<Button variant="ghost" icon="edit">Edit</Button>}/><div className="business-cover"><img src={photos.greenhouse} alt="Commercial greenhouse"/><span className="business-logo large"><Icon name="leaf" size={32}/></span></div><div className="content business-content"><Badge>PROFILE COMPLETE</Badge><h1>GreenRise Produce</h1><p className="lead">Sustainable vegetable production and market supply for local communities.</p><div className="info-list"><p><Icon name="briefcase"/><span><small>SECTOR</small><strong>Crop Production & Horticulture</strong></span></p><p><Icon name="location"/><span><small>LOCATION</small><strong>Cullinan, Gauteng</strong></span></p><p><Icon name="users"/><span><small>BUSINESS SIZE</small><strong>12 employees</strong></span></p><p><Icon name="mail"/><span><small>CONTACT</small><strong>lerato@greenrise.co.za</strong></span></p></div><h2>About the business</h2><p>We grow seasonal vegetables using water-wise methods and support emerging growers through practical project opportunities.</p><Button full onClick={()=>go('job')} icon="plus">Create a job vacancy</Button></div></Screen>
  if(page==='job') return <Screen><Header title="Create job vacancy" subtitle="Step 1 of 3 · Job details" back={()=>go('business')}/><div className="stepper"><span className="active"/><span/><span/></div><div className="content form-stack"><Field label="Job title" placeholder="e.g. Assistant Crop Supervisor"/><SelectField label="Employment type"><option>Fixed-term contract</option><option>Full-time</option><option>Part-time</option></SelectField><Field label="Location" placeholder="Cullinan, Gauteng"/><label className="field"><span>Job description</span><textarea defaultValue="Support day-to-day crop production, irrigation monitoring and field record keeping."/></label><label className="field"><span>Required skills</span><textarea defaultValue="Crop production, soil health, basic irrigation knowledge"/></label><Field label="Application deadline" placeholder="30 August 2026"/><Button full onClick={()=>{toast('Job published successfully');go('applications')}} icon="check">Preview & publish</Button></div></Screen>
  if(page==='applications') return <Screen><Header title="Applications" subtitle="Assistant Crop Supervisor" back={()=>go('employer')} right={<button className="icon-btn"><Icon name="filter"/></button>}/><div className="content"><div className="application-stats"><span><strong>18</strong><small>Total</small></span><span><strong>6</strong><small>Shortlisted</small></span><span><strong>3</strong><small>New</small></span></div><div className="segmented"><button className="active">All</button><button>Shortlisted</button><button>Reviewed</button></div><div className="applicant-list">{[['TM','Thabo Mokoena','Soil health · Crop production','87% match'],['LN','Lerato Ncube','Irrigation · Food safety','82% match'],['SK','Sipho Khumalo','Livestock · Farm safety','76% match']].map((x,i)=><button key={x[1]} onClick={()=>go('applicant')}><span className="avatar">{x[0]}</span><div><div><h3>{x[1]}</h3>{i===0&&<i/>}</div><p>{x[2]}</p><Badge>{x[3]}</Badge></div><Icon name="chevron"/></button>)}</div></div></Screen>
  if(page==='applicant') return <Screen><Header title="Learner profile" back={()=>go('applications')} right={<button className="icon-btn"><Icon name="more"/></button>}/><div className="content"><div className="applicant-profile"><div className="avatar large">TM</div><h1>Thabo Mokoena</h1><p>Farmer · Gauteng</p><Badge>87% SKILL MATCH</Badge></div><div className="verification"><Icon name="shield"/><div><strong>Skills Passport available</strong><p>4 skills · 2 assessed credentials</p></div><Icon name="chevron"/></div><h2 className="section-title">Matching skills</h2><div className="matching-skills"><p><span><Icon name="check"/></span><strong>Soil health</strong><Badge>Advanced</Badge></p><p><span><Icon name="check"/></span><strong>Crop production</strong><Badge>Intermediate</Badge></p><p><span><Icon name="check"/></span><strong>Water management</strong><Badge tone="grey">Foundation</Badge></p></div><h2 className="section-title">Application note</h2><div className="quote">“I have hands-on experience with vegetable production and recently completed assessed soil health learning.”</div><div className="dual-actions"><Button variant="secondary" onClick={()=>toast('Applicant shortlisted')} icon="check">Shortlist</Button><Button onClick={()=>go('sendInvite')} icon="mail">Send invitation</Button></div></div></Screen>
  if(page==='sendInvite') return <Screen><Header title="Send invitation" back={()=>go('applicant')}/><div className="content"><div className="recipient"><div className="avatar">TM</div><div><small>INVITING</small><strong>Thabo Mokoena</strong><p>Farmer · 87% match</p></div></div><div className="form-stack"><SelectField label="Invitation type"><option>Job invitation</option><option>Business or project invitation</option></SelectField><SelectField label="Related opportunity"><option>Assistant Crop Supervisor</option><option>Summer vegetable project</option></SelectField><label className="field"><span>Personal message</span><textarea defaultValue="Hi Thabo, your practical learning record stood out to our team. We’d like to invite you to discuss this opportunity."/></label><div className="preview-note"><Icon name="eye"/><p>Thabo will see your business profile, opportunity details and this message.</p></div><Button full onClick={()=>{toast('Invitation sent to Thabo');go('employer')}} icon="mail">Send invitation</Button></div></div></Screen>
  return <Screen><div className="workspace-hero"><div className="home-top"><Logo light/><button className="notification-btn"><Icon name="bell"/></button></div><span className="eyebrow light-text">EMPLOYER WORKSPACE</span><h1>Good morning, Lerato</h1><p>GreenRise Produce · Business profile active</p></div><div className="content workspace-content"><div className="quick-grid"><button onClick={()=>go('job')}><span><Icon name="plus"/></span><strong>Create job</strong><small>Post a vacancy</small></button><button onClick={()=>go('applicant')}><span><Icon name="search"/></span><strong>Find learners</strong><small>Search by skills</small></button><button onClick={()=>go('business')}><span><Icon name="building"/></span><strong>Business profile</strong><small>View & update</small></button><button onClick={()=>go('sendInvite')}><span><Icon name="mail"/></span><strong>Invitations</strong><small>3 pending</small></button></div><div className="section-head"><h2>Hiring overview</h2><button className="text-link" onClick={()=>go('applications')}>View all</button></div><div className="hiring-card"><div><strong>2</strong><span>Active jobs</span></div><div><strong>18</strong><span>Applications</span></div><div><strong>6</strong><span>Shortlisted</span></div></div><button className="active-job" onClick={()=>go('applications')}><span className="job-icon"><Icon name="briefcase"/></span><div><Badge>ACTIVE</Badge><h3>Assistant Crop Supervisor</h3><p>Cullinan · 18 applicants · Closes in 8 days</p></div><Icon name="chevron"/></button><div className="section-head"><h2>Suggested learners</h2><button className="text-link" onClick={()=>go('applicant')}>Find talent</button></div><div className="talent-card"><div className="avatar">TM</div><div><h3>Thabo Mokoena</h3><p>Soil health · Crop production</p><Badge>87% MATCH</Badge></div><Button variant="secondary" onClick={()=>go('sendInvite')}>Invite</Button></div></div></Screen>
}

function Trainer({ page, go, toast }: { page:Page;go:(p:Page)=>void;toast:(m:string)=>void }) {
  if(page==='modules') return <Screen><Header title="My content" subtitle="12 learning modules" right={<button className="icon-btn"><Icon name="filter"/></button>}/><div className="content"><div className="segmented"><button className="active">All</button><button>Drafts</button><button>Published</button></div>{[['Soil Health Fundamentals','Published','1,248 learners'],['Water-wise Irrigation','Under Review','Submitted yesterday'],['Integrated Pest Management','Draft','Last edited 3 days ago']].map((x,i)=><button className="module-row" key={x[0]} onClick={()=>i===2?go('createModule'):go('previewModule')}><span className="module-thumb"><Icon name={i===0?'leaf':i===1?'shield':'book'}/></span><div><Badge tone={i===0?'green':i===1?'gold':'grey'}>{x[1].toUpperCase()}</Badge><h3>{x[0]}</h3><p>{x[2]}</p></div><Icon name="chevron"/></button>)}<Button full onClick={()=>go('createModule')} icon="plus">Create new module</Button></div></Screen>
  if(page==='createModule') return <Screen><Header title="Create module" subtitle="Step 1 of 4 · Module details" back={()=>go('trainer')}/><div className="stepper four"><span className="active"/><span/><span/><span/></div><div className="content form-stack"><div className="draft-status"><Badge tone="grey">DRAFT SAVED</Badge><small>Just now</small></div><label className="upload-cover"><Icon name="upload"/><strong>Add a cover image</strong><small>JPG or PNG · Recommended 16:9</small></label><Field label="Module title" placeholder="e.g. Integrated Pest Management"/><SelectField label="Agricultural category"><option>Crop Production</option><option>Soil Management</option><option>Climate-Smart Agriculture</option></SelectField><label className="field"><span>Short description</span><textarea defaultValue="Learn practical, low-impact ways to identify, prevent and manage common crop pests."/></label><label className="field"><span>Learning objectives</span><textarea defaultValue={"Identify common crop pests\nChoose suitable prevention methods\nApply treatments safely"}/></label><Button full onClick={()=>go('createAssessment')} icon="arrow">Save & add lessons</Button></div></Screen>
  if(page==='createAssessment') return <Screen><Header title="Build your module" subtitle="Step 2 of 4 · Lessons & assessment" back={()=>go('createModule')}/><div className="stepper four"><span className="done"/><span className="active"/><span/><span/></div><div className="content"><div className="builder-summary"><span><strong>3</strong><small>Lessons</small></span><span><strong>28 min</strong><small>Learning time</small></span><span><strong>5</strong><small>Questions</small></span></div><h2 className="section-title">Lessons</h2>{[['video','Recognising crop pests','Video · 08:20'],['file','Prevention in the field','Reading · 7 min'],['video','Safe treatment methods','Video · 11:40']].map((x,i)=><div className="builder-row" key={x[1]}><span>{i+1}</span><Icon name={x[0] as IconName}/><div><strong>{x[1]}</strong><p>{x[2]}</p></div><Icon name="more"/></div>)}<Button full variant="secondary" icon="plus">Add lesson</Button><h2 className="section-title">Final assessment</h2><button className="assessment-builder"><span><Icon name="check"/></span><div><strong>Knowledge assessment</strong><p>5 multiple-choice questions · Pass mark 70%</p></div><Icon name="edit"/></button><Button full onClick={()=>go('previewModule')} icon="eye">Preview module</Button></div></Screen>
  if(page==='previewModule') return <Screen><Header title="Module preview" back={()=>go('createAssessment')} right={<Badge tone="grey">DRAFT</Badge>}/><div className="preview-cover"><img src={photos.crops} alt="Green crops"/><span><Icon name="play"/></span></div><div className="content"><Badge>CROP PRODUCTION</Badge><h1>Integrated Pest Management</h1><p className="lead">Learn practical, low-impact ways to identify, prevent and manage common crop pests.</p><div className="course-facts"><span><Icon name="clock"/><strong>28 min</strong><small>Duration</small></span><span><Icon name="book"/><strong>3 lessons</strong><small>Content</small></span><span><Icon name="check"/><strong>5 questions</strong><small>Assessment</small></span></div><section><h2>Learning objectives</h2>{['Identify common crop pests','Choose suitable prevention methods','Apply treatments safely'].map(x=><p className="check-line" key={x}><span><Icon name="check"/></span>{x}</p>)}</section><div className="approval-note"><Icon name="shield"/><div><strong>Ready for review?</strong><p>An administrator will review your lessons and assessment before learners can access this module.</p></div></div><Button full onClick={()=>{toast('Module submitted for approval');go('submitted')}} icon="upload">Submit for approval</Button></div></Screen>
  if(page==='submitted') return <Screen><Header title="Submission status" back={()=>go('trainer')}/><div className="content centered status-content"><span className="hero-icon gold"><Icon name="clock" size={35}/></span><Badge tone="gold">UNDER REVIEW</Badge><h1>Your module is with our review team</h1><p>Integrated Pest Management was submitted on 19 June 2026. Reviews usually take 2–3 working days.</p><div className="status-track"><div className="done"><span><Icon name="check"/></span><section><strong>Submitted</strong><p>19 June · 10:42</p></section></div><div className="active"><span/><section><strong>Administrator review</strong><p>In progress</p></section></div><div><span/><section><strong>Decision</strong><p>We’ll notify you</p></section></div></div><Button full variant="secondary" onClick={()=>go('modules')}>Return to my content</Button></div></Screen>
  return <Screen><div className="workspace-hero trainer-hero"><div className="home-top"><Logo light/><button className="notification-btn"><Icon name="bell"/></button></div><span className="eyebrow light-text">TRAINER WORKSPACE</span><h1>Welcome back, Nomsa</h1><p>Your content is helping 2,460 learners grow.</p></div><div className="content workspace-content"><Button full variant="gold" onClick={()=>go('createModule')} icon="plus">Create a new module</Button><div className="metric-grid"><div><Icon name="book"/><strong>12</strong><span>Total modules</span></div><div><Icon name="eye"/><strong>8</strong><span>Published</span></div><div><Icon name="edit"/><strong>3</strong><span>Drafts</span></div><div><Icon name="clock"/><strong>1</strong><span>In review</span></div></div><div className="section-head"><h2>Recent content</h2><button className="text-link" onClick={()=>go('modules')}>View all</button></div><button className="performance-card" onClick={()=>go('previewModule')}><div><Badge>PUBLISHED</Badge><h3>Soil Health Fundamentals</h3><p>1,248 learners · 4.8 average rating</p></div><span><strong>86%</strong><small>completion</small></span></button><div className="insight-card"><Icon name="trend"/><div><strong>18% more completions this month</strong><p>Your Soil Health module is your top performer.</p></div></div><div className="section-head"><h2>Recent activity</h2></div><div className="activity-list"><p><span><Icon name="check"/></span><strong>12 learners passed your assessment</strong><small>2 hours ago</small></p><p><span><Icon name="mail"/></span><strong>Water-wise Irrigation is under review</strong><small>Yesterday</small></p></div></div></Screen>
}

function Admin({ page, go, toast }: { page:Page;go:(p:Page)=>void;toast:(m:string)=>void }) {
  if(page==='approvals') return <Screen><Header title="Content approvals" subtitle="7 items require attention" right={<button className="icon-btn"><Icon name="filter"/></button>}/><div className="content"><div className="segmented"><button className="active">Pending 7</button><button>Reviewed</button><button>Returned</button></div>{[['Integrated Pest Management','Nomsa Mahlangu','Submitted 2h ago','3 lessons · 5 questions'],['Safe Livestock Handling','Pieter Botha','Submitted yesterday','5 lessons · 8 questions'],['Farm Budgeting Basics','Zanele Nkosi','Submitted 2 days ago','4 lessons · 6 questions']].map((x,i)=><button className="approval-row" key={x[0]} onClick={()=>go('review')}><span className="module-thumb"><Icon name={i===1?'users':i===2?'chart':'leaf'}/></span><div><Badge tone={i===0?'gold':'grey'}>{i===0?'NEW':'PENDING REVIEW'}</Badge><h3>{x[0]}</h3><p>By {x[1]} · {x[2]}</p><small>{x[3]}</small></div><Icon name="chevron"/></button>)}</div></Screen>
  if(page==='review') return <Screen><Header title="Review module" subtitle="Integrated Pest Management" back={()=>go('approvals')} right={<button className="icon-btn"><Icon name="more"/></button>}/><div className="content"><div className="review-author"><div className="avatar">NM</div><div><small>SUBMITTED BY</small><strong>Nomsa Mahlangu</strong><p>19 June 2026 · 10:42</p></div><Badge tone="gold">UNDER REVIEW</Badge></div><div className="review-checks"><div><span><Icon name="check"/></span><section><strong>Module information</strong><p>Title, description and objectives</p></section><Badge>COMPLETE</Badge></div><button><span><Icon name="book"/></span><section><strong>Learning content</strong><p>3 lessons · 28 minutes</p></section><Icon name="chevron"/></button><button><span><Icon name="check"/></span><section><strong>Assessment</strong><p>5 questions · 70% pass mark</p></section><Icon name="chevron"/></button><div><span><Icon name="shield"/></span><section><strong>Quality & accessibility</strong><p>Captions and reading level</p></section><Badge>CHECKED</Badge></div></div><label className="field"><span>Feedback for trainer (optional)</span><textarea placeholder="Add a clear, constructive note..."/></label><div className="approval-note"><Icon name="shield"/><div><strong>Publishing control</strong><p>Approved content becomes available to learners only after it is published.</p></div></div><div className="admin-actions"><Button variant="danger" onClick={()=>{toast('Module returned with feedback');go('approvals')}}>Return for revision</Button><Button onClick={()=>{toast('Module approved and published');go('approvals')}} icon="check">Approve module</Button></div></div></Screen>
  if(page==='users') return <Screen><Header title="User management" subtitle="12,486 registered users" right={<button className="icon-btn"><Icon name="filter"/></button>}/><div className="content"><label className="search"><Icon name="search"/><input placeholder="Search name, email or ID..."/></label><div className="segmented"><button className="active">All</button><button>Learners</button><button>Trainers</button><button>SMMEs</button></div><div className="user-list">{[['TM','Thabo Mokoena','Learner · Farmer','Active'],['NM','Nomsa Mahlangu','Trainer · Crop Production','Active'],['LP','Lerato Phiri','SMME · GreenRise Produce','Active'],['SK','Sipho Khumalo','Learner · Worker','Review']].map(x=><button key={x[1]}><span className="avatar">{x[0]}</span><div><h3>{x[1]}</h3><p>{x[2]}</p></div><Badge tone={x[3]==='Active'?'green':'gold'}>{x[3]}</Badge><Icon name="chevron"/></button>)}</div></div></Screen>
  if(page==='reports') return <Screen><Header title="Reports & analytics" subtitle="Platform performance · June 2026"/><div className="content"><div className="report-highlight"><Icon name="trend"/><div><small>MONTHLY ACTIVE LEARNERS</small><h1>8,942</h1><p><strong>+12.8%</strong> compared with May</p></div></div><h2 className="section-title">Learning performance</h2><div className="bar-chart">{[58,72,48,86,65,78,92].map((n,i)=><span key={i} style={{height:`${n}%`}}><i>{['M','T','W','T','F','S','S'][i]}</i></span>)}</div><div className="report-list"><div><span><Icon name="award"/></span><section><strong>1,842</strong><p>Certificates issued</p></section><b>+8.2%</b></div><div><span><Icon name="book"/></span><section><strong>72%</strong><p>Average completion rate</p></section><b>+4.1%</b></div><div><span><Icon name="briefcase"/></span><section><strong>126</strong><p>Active opportunities</p></section><b>+16.0%</b></div></div></div></Screen>
  return <Screen><div className="workspace-hero admin-hero"><div className="home-top"><Logo light/><button className="notification-btn"><Icon name="bell"/><span>7</span></button></div><span className="eyebrow light-text">ADMINISTRATION</span><h1>Platform overview</h1><p>Friday, 19 June 2026</p></div><div className="content workspace-content"><div className="admin-metrics"><div><span><Icon name="users"/></span><small>REGISTERED LEARNERS</small><strong>12,486</strong><b>+8.4%</b></div><div><span><Icon name="book"/></span><small>PUBLISHED MODULES</small><strong>184</strong><b>+12</b></div><div><span><Icon name="award"/></span><small>CERTIFICATES ISSUED</small><strong>8,924</strong><b>+6.2%</b></div><div><span><Icon name="building"/></span><small>ACTIVE SMMEs</small><strong>342</strong><b>+18</b></div></div><button className="attention-card" onClick={()=>go('approvals')}><span><Icon name="clock"/></span><div><strong>7 content approvals waiting</strong><p>2 have been pending for more than 48 hours</p></div><Icon name="arrow"/></button><div className="section-head"><h2>Platform growth</h2><button className="text-link" onClick={()=>go('reports')}>Full report</button></div><div className="mini-chart"><div><small>ACTIVE LEARNERS</small><strong>8,942</strong><Badge>+12.8%</Badge></div><svg viewBox="0 0 300 90" preserveAspectRatio="none"><path d="M0 75 C35 65 45 72 75 52 S125 60 150 38 S205 44 230 21 S270 30 300 8"/><path className="fill" d="M0 75 C35 65 45 72 75 52 S125 60 150 38 S205 44 230 21 S270 30 300 8 V90 H0Z"/></svg></div><div className="section-head"><h2>Recent activity</h2></div><div className="activity-list"><p><span><Icon name="upload"/></span><strong>New module submitted by Nomsa M.</strong><small>12 minutes ago</small></p><p><span><Icon name="users"/></span><strong>48 new learners registered</strong><small>Today</small></p><p><span><Icon name="briefcase"/></span><strong>GreenRise posted a new vacancy</strong><small>2 hours ago</small></p></div></div></Screen>
}

const noNavPages: Page[] = ['welcome','onboarding','register','category','personal','verify','login','course','lesson','assessment','results','certificate','notifications','invitation','business','job','applicant','sendInvite','createModule','createAssessment','previewModule','submitted','review']

export default function App() {
  const [page,setPage] = useState<Page>('welcome')
  const [role,setRole] = useState<Role>('learner')
  const [enrolled,setEnrolled] = useState(false)
  const [message,setMessage] = useState('')
  const go = (p:Page) => {
    setPage(p)
    if(p==='trainer') setRole('trainer')
    if(p==='admin') setRole('admin')
    if(p==='employer') setRole('employer')
    window.scrollTo({top:0,behavior:'smooth'})
  }
  const toast = (m:string) => { setMessage(m); window.setTimeout(()=>setMessage(''),2600) }
  const screen = useMemo(() => {
    if(['welcome','onboarding'].includes(page)) return page==='welcome'?<Welcome go={go}/>:<Onboarding go={go}/>
    if(['register','category','personal','verify','login'].includes(page)) return <Auth page={page} go={go}/>
    if(page==='home') return <LearnerHome go={go} toast={toast}/>
    if(page==='explore') return <Explore go={go}/>
    if(page==='course') return <CourseDetail go={go} enrolled={enrolled} setEnrolled={setEnrolled}/>
    if(page==='learning') return <MyLearning go={go}/>
    if(page==='lesson') return <Lesson go={go}/>
    if(page==='assessment') return <Assessment go={go}/>
    if(page==='results') return <Results go={go}/>
    if(page==='passport') return <Passport go={go}/>
    if(page==='certificate') return <Certificate go={go} toast={toast}/>
    if(page==='notifications') return <Notifications go={go}/>
    if(page==='invitation') return <Invitation go={go} toast={toast}/>
    if(page==='profile') return <Profile role={role} setRole={setRole} go={go}/>
    if(['employer','business','job','applications','applicant','sendInvite'].includes(page)) return <Employer page={page} go={go} toast={toast}/>
    if(['trainer','modules','createModule','createAssessment','previewModule','submitted'].includes(page)) return <Trainer page={page} go={go} toast={toast}/>
    return <Admin page={page} go={go} toast={toast}/>
  },[page,role,enrolled])
  useEffect(()=>{ document.title='AgriLearn — Grow your skills' },[])
  return <div className="app-stage"><div className="phone-shell">{screen}{!noNavPages.includes(page)&&<Nav role={role} page={page} go={go}/>} {message&&<div className="global-toast"><Icon name="check"/><span>{message}</span></div>}</div><div className="prototype-note"><Logo/><p>Interactive mobile prototype</p><span>390 × 844 · Use the on-screen controls to explore every role.</span></div></div>
}
