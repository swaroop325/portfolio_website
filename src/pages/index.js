import React, { useState, useEffect } from 'react'
import { motion, useScroll, MotionConfig } from 'framer-motion'
import Layout from '../components/layout'
import CodeBackground from '../components/CodeBackground'
import ModernNav, { DEFAULT_NAV_ITEMS } from '../components/ModernNav'
import HeroSection from '../components/HeroSection'
import ExperienceSection from '../components/ExperienceSection'
import SkillsSection from '../components/SkillsSection'
import WorkSection from '../components/WorkSection'
import WritingSection from '../components/WritingSection'
import BadgeWall from '../components/BadgeWall'
import ContactSection from '../components/ContactSection'
import SharingModal from '../components/SharingModal'
import ScrollAssistant from '../components/ScrollAssistant'
import { contact } from '../data/portfolioData'
import { hasWriting } from '../lib/writing'
import postsData from '../data/generated/posts.json'
import linkedinData from '../data/linkedin-posts.json'

// One list drives both the nav and scroll-spy, so their ids always match the
// rendered sections. Writing hides itself when there is nothing to show.
const SECTIONS = DEFAULT_NAV_ITEMS.filter((s) => s.id !== 'writing' || hasWriting(postsData, linkedinData))
const SECTION_IDS = SECTIONS.map((s) => s.id)

const IndexPage = () => {
  const [activeSection, setActiveSection] = useState('hero')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const { scrollYProgress } = useScroll()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 2

      for (const section of SECTION_IDS) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const contactData = {
    name: 'Swaroop A.S.',
    phone: contact.phone,
    email: contact.email,
    website: contact.website,
    github: contact.github,
    linkedin: 'https://www.linkedin.com/in/swaroop-a-s-7ab296b8/',
  }

  return (
    <MotionConfig reducedMotion="user">
    <Layout location={typeof window !== 'undefined' ? window.location : {}}>
      <CodeBackground />
      <ModernNav activeSection={activeSection} items={SECTIONS} />

      {/* No page-level fade-in: it server-rendered every section at opacity 0
          and held the hero's LCP until hydration. Sections animate themselves. */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <HeroSection onOpenShareModal={() => setIsShareModalOpen(true)} />
        <ExperienceSection />
        <SkillsSection />
        <WorkSection />
        <WritingSection posts={postsData} linkedin={linkedinData} />
        <BadgeWall />
        <ContactSection onOpenShareModal={() => setIsShareModalOpen(true)} />
      </div>

      {/* Scroll Progress Indicator */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
          transformOrigin: '0%',
          scaleX: scrollYProgress,
          zIndex: 9999,
        }}
      />

      {/* Scroll Assistant - Quick navigation between sections */}
      <ScrollAssistant items={SECTIONS} />

      {/* Sharing Modal - Rendered at root level to avoid z-index issues */}
      <SharingModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        contactData={contactData}
      />
    </Layout>
    </MotionConfig>
  )
}

export default IndexPage
