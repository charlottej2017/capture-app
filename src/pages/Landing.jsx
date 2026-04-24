import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

const features = [
  {
    icon: '📋',
    title: 'Tasks vs Reminders',
    desc: "Finally know the difference. Real deadlines live separately from 'recertify your student loans' nudges.",
  },
  {
    icon: '✉️',
    title: 'Email Integration',
    desc: 'Tag tasks as coming from email so nothing falls through the cracks across inboxes.',
  },
  {
    icon: '🎯',
    title: 'Priority Clarity',
    desc: 'High, Medium, Low — color-coded and grouped so you always know what to tackle first.',
  },
  {
    icon: '📅',
    title: 'Due Dates That Matter',
    desc: "Overdue, today, tomorrow — your tasks tell you exactly how urgent they are at a glance.",
  },
]

export default function Landing() {
  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.logo}>Capture</div>
        <div className={styles.navLinks}>
          <Link to="/login" className={styles.loginLink}>Log in</Link>
          <Link to="/signup" className={styles.ctaBtn}>Get started free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroEyebrow}>
          Your all-in-one task & reminder manager
        </div>
        <h1 className={styles.heroTitle}>
          Stop letting things<br />
          <em>fall through the cracks.</em>
        </h1>
        <div className={styles.heroCtas}>
          <Link to="/signup" className={styles.primaryBtn}>Start for free</Link>
          <Link to="/login" className={styles.ghostBtn}>I have an account</Link>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.featuresGrid}>
          {features.map(f => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className={styles.band}>
        <h2 className={styles.bandTitle}>Your to-do list should work as hard as you do.</h2>
        <Link to="/signup" className={styles.primaryBtn}>Create your account →</Link>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <span className={styles.logo}>Capture</span>
        <a
          href="https://charscontent.com"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.footerLink}
        >
          Char's Content, LLC
        </a>
      </footer>
    </div>
  )
}
