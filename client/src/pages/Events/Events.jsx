//import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import './Events.css'

import React, { useState, useEffect } from "react";

const Events = () => {
  // State for events
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api'

  // Fetch events from backend
  useEffect(() => {
    fetch(`${API_URL}/events`)
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
          <div key={event.Event_ID} className="event-card">
            {event.Image_URL && <img src={event.Image_URL} alt={Event.Title} className="event-image" />}
            <div className="event-content">
              <h2 className="event-title">{event.Title}</h2>
              <p className="event-date">
                {event.Event_Date ? new Date(event.Event_Date).toLocaleDateString() : ''}
                {event.Start_Time ? ` @ ${event.Start_Time.slice(0,5)}` : ''}
                {event.End_Time ? ` - ${event.End_Time.slice(0,5)}` : ''}
              </p>
              {event.Details && <p className="event-details">{event.Details}</p>}
              {event.Recurring && <span className="event-recurring">🔁 Recurring</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}





export default Events;
