import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import GFT from '../images/gft.jpeg'
import CFT from '../images/cft.jpeg'
import Infy from '../images/infy.jpeg'
import ACT from '../images/activate.jpeg'
import '../assets/css/experience-mobile.css'
import { experiences as experienceData, yearsOfExperience } from '../data/portfolioData'

// Career facts live in portfolioData.js; this file only adds presentation.
const LOGOS = {
  'Activate Interactive': ACT,
  'Infosys Limited': Infy,
  'Craftveda Technology': CFT,
  'GoFrugal Technologies': GFT,
}
const GRADIENTS = [
  'linear-gradient(135deg, #00d4ff 0%, #00ff88 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
]
const initials = (name) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

const ExperienceSection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const experiences = experienceData.map((exp, i) => ({
    ...exp,
    logo: LOGOS[exp.company],
    gradient: GRADIENTS[i % GRADIENTS.length],
  }))

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
  }

  return (
    <section
      id="experience"
      ref={ref}
      style={{
        minHeight: '100vh',
        padding: '6rem 1rem',
        position: 'relative',
      }}
      className="experience-section"
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{
            textAlign: 'center',
            marginBottom: '4rem',
          }}
        >
          <motion.div
            style={{
              fontSize: '1rem',
              color: '#00d4ff',
              marginBottom: '1rem',
              fontFamily: 'monospace',
            }}
          >
            {'<experience>'}
          </motion.div>

          <h2
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 'bold',
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, #fff, #00d4ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Work Experience
          </h2>

          <p
            style={{
              fontSize: '1.1rem',
              color: 'rgba(255, 255, 255, 0.7)',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            {yearsOfExperience} years building and leading enterprise systems for Singapore government agencies and
            enterprise teams
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          style={{
            display: 'grid',
            gap: '2rem',
          }}
        >
          {experiences.map((exp, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ scale: 1.02, y: -5 }}
              style={{
                position: 'relative',
                padding: '2rem',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
                cursor: 'default',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: exp.gradient,
                }}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto minmax(0, 1fr)',
                  gap: '1.5rem',
                  alignItems: 'start',
                }}
                className="exp-card-content"
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '15px',
                    overflow: 'hidden',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: exp.logo ? undefined : exp.gradient,
                  }}
                >
                  {exp.logo ? (
                    <img
                      src={exp.logo}
                      alt={exp.company}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <span
                      role="img"
                      aria-label={exp.company}
                      style={{ fontWeight: 800, fontSize: '1.6rem', color: '#04121a', letterSpacing: '-0.02em' }}
                    >
                      {initials(exp.company)}
                    </span>
                  )}
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '0.5rem',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                    className="exp-card-header"
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          color: '#fff',
                          marginBottom: '0.5rem',
                        }}
                      >
                        {exp.role}
                      </h3>
                      <p
                        style={{
                          fontSize: '1.1rem',
                          color: '#00d4ff',
                          fontWeight: '600',
                        }}
                      >
                        {exp.company}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <p
                        style={{
                          fontSize: '0.9rem',
                          color: 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        {exp.period}
                      </p>
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'rgba(255, 255, 255, 0.5)',
                        }}
                      >
                        {exp.location}
                      </p>
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: '1rem',
                      color: 'rgba(255, 255, 255, 0.8)',
                      lineHeight: '1.6',
                      marginBottom: '1rem',
                    }}
                  >
                    {exp.description}
                  </p>

                  {exp.positions && exp.positions.length > 1 && (
                    <ol
                      aria-label={`Roles at ${exp.company}`}
                      style={{
                        listStyle: 'none',
                        margin: '0 0 1rem',
                        padding: '0 0 0 1rem',
                        borderLeft: '2px solid rgba(0, 212, 255, 0.3)',
                        display: 'grid',
                        gap: '0.35rem',
                      }}
                    >
                      {exp.positions.map((pos) => (
                        <li key={pos.title} style={{ fontSize: '0.92rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                          <strong style={{ color: '#fff', fontWeight: 600 }}>{pos.title}</strong>
                          <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontFamily: 'monospace', fontSize: '0.8rem', marginLeft: '0.6rem' }}>
                            {pos.period}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul
                      style={{
                        marginBottom: '1.5rem',
                        paddingLeft: '1.2rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.95rem',
                        lineHeight: '1.8',
                      }}
                    >
                      {exp.achievements.slice(0, 6).map((achievement, idx) => (
                        <li key={idx}>{achievement}</li>
                      ))}
                    </ul>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    {exp.technologies.map((tech, techIndex) => (
                      <span
                        key={techIndex}
                        style={{
                          padding: '0.4rem 0.8rem',
                          background: 'rgba(0, 212, 255, 0.1)',
                          border: '1px solid rgba(0, 212, 255, 0.3)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: '#00d4ff',
                        }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default ExperienceSection
