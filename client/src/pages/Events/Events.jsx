//import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import './Events.css'

import React, { useState, useEffect } from "react";

const Events = () => {
  // State for events
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // TODO: Replace with your API
        const res = await fetch("/api/events");
        const data = await res.json();
        setEvents(data);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="events-page">
      {/* Page Header */}
      <header className="events-header">
        <h1>Library Events</h1>
        <p>Discover upcoming activities, workshops, and community gatherings.</p>
      </header>

      {/* Filters/Search (Optional) */}
      {/* <div className="events-filters">
        <input type="text" placeholder="Search events..." />
        <select>
          <option>All</option>
          <option>Kids</option>
          <option>Teens</option>
          <option>Adults</option>
        </select>
      </div> */}

      {/* Events List */}
      <section className="events-list">
        {loading ? (
          <p>Loading events...</p>
        ) : events.length === 0 ? (
          <p>No events found.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="event-card">
              <h3>{event.title}</h3>
              <p>{event.date} — {event.time}</p>
              <p>{event.description}</p>
              <button>View Details</button>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default Events;
