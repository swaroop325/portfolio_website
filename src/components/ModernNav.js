import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export const DEFAULT_NAV_ITEMS = [
  { id: 'hero', label: 'Home' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'work', label: 'Work' },
  { id: 'writing', label: 'Writing' },
  { id: 'badges', label: 'Credentials' },
  { id: 'contact', label: 'Contact' },
]

// `items` must list real section ids; index.js passes the same list it uses
// for scroll-spy, minus any section that is not rendered.
const ModernNav = ({ activeSection, items = DEFAULT_NAV_ITEMS }) => {
  const navItems = items

  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId) => {
    if (typeof document === 'undefined') return
    const element = document.getElementById(sectionId)
    if (element) {
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
      setIsMobileMenuOpen(false) // Close mobile menu after navigation
    }
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: isScrolled ? '1rem 2rem' : '1.5rem 2rem',
        background: isScrolled
          ? 'rgba(10, 10, 25, 0.8)'
          : 'rgba(10, 10, 25, 0.3)',
        backdropFilter: 'blur(10px)',
        borderBottom: isScrolled ? '1px solid rgba(100, 200, 255, 0.2)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            cursor: 'pointer',
          }}
          onClick={() => scrollToSection('hero')}
          role="button"
          tabIndex={0}
          aria-label="Back to top"
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), scrollToSection('hero'))}
        >
          &lt;Swaroop.dev /&gt;
        </motion.div>

        {/* Desktop Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
          className="desktop-nav"
        >
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              aria-current={activeSection === item.id ? 'true' : undefined}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '0.5rem 1rem',
                background:
                  activeSection === item.id
                    ? 'rgba(0, 212, 255, 0.2)'
                    : 'transparent',
                border:
                  activeSection === item.id
                    ? '1px solid rgba(0, 212, 255, 0.5)'
                    : '1px solid transparent',
                borderRadius: '8px',
                color: activeSection === item.id ? '#00d4ff' : '#fff',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: activeSection === item.id ? '600' : '400',
                transition: 'all 0.3s ease',
              }}
            >
              {item.label}
            </motion.button>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-nav-menu"
          style={{
            display: 'none',
            background: 'rgba(0, 212, 255, 0.2)',
            border: '1px solid rgba(0, 212, 255, 0.5)',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            color: '#00d4ff',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
          className="mobile-menu-btn"
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </motion.button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <motion.div
          id="mobile-nav-menu"
          className="mobile-nav-menu"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'rgba(10, 10, 25, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(100, 200, 255, 0.2)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              aria-current={activeSection === item.id ? 'true' : undefined}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '1rem',
                background:
                  activeSection === item.id
                    ? 'rgba(0, 212, 255, 0.2)'
                    : 'transparent',
                border:
                  activeSection === item.id
                    ? '1px solid rgba(0, 212, 255, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: activeSection === item.id ? '#00d4ff' : '#fff',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: activeSection === item.id ? '600' : '400',
                textAlign: 'left',
                width: '100%',
              }}
            >
              {item.label}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Mobile Navigation Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            '@media (max-width: 1023px) { .desktop-nav { display: none !important; } .mobile-menu-btn { display: block !important; } }',
        }}
      />
    </motion.nav>
  )
}

export default ModernNav
