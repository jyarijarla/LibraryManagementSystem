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
    fetch('http://localhost:3000/api/calendar')
      .then(res => res.json())
      .then(data => {
        setEvents(data || []);
        setLoading(false);
      })

      .catch(err => {

        console.error(err);
        setEvents([]);
        setLoading(false);

      });

  }, []);

        if (loading) return <div className="events-loading">Loading events...</div>;
        if (!events.length) return <div className="events-loading">No events found</div>;

 return (
    <div className="events-container">
      <h1 className="library-events-bubble">Events!</h1>
      <div className="events-grid">
        {events.map(event => (
          <div key={event.event_id} className="event-card">
            {event.image_url && <img src={event.image_url} alt={event.title} className="event-image" />}
            <div className="event-content">
              <h2 className="event-title">{event.title}</h2>
              <p className="event-date">
                {event.event_date ? new Date(event.event_date).toLocaleDateString() : ''}
                {event.start_time ? ` @ ${event.start_time.slice(0,5)}` : ''}
                {event.end_time ? ` - ${event.end_time.slice(0,5)}` : ''}
              </p>
              {event.details && <p className="event-details">{event.details}</p>}
              {event.recurring && <span className="event-recurring">🔁 Recurring</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}





export default Events;
