import React from 'react'
import './About.css'

const About = () => {
  return (
    <div className="about-container">
      <div className="about-content">
        <h1 className="about-title">About the Library System</h1>
        <p className="about-text">
          Our Library System was designed to make borrowing and managing books easier
          for students, faculty, and staff. Whether you’re checking out the latest novel
          or exploring academic research, we aim to provide a seamless digital experience.
        </p>
        <p className="about-text">
          This platform was developed by <strong>Team 3</strong> as part of a full-stack
          web development project. We’re constantly improving it, so stay tuned for more features!
        </p>
      </div>
    </div>
  )
}

export default About
