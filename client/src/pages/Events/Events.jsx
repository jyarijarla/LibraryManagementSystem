import React, { useState, useEffect } from 'react'
import { Calendar, Image as ImageIcon } from 'lucide-react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import './Events.css'

// Decide which API URL to use (local or production)
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api'

const Events = () => {

  // events → list of events pulled from the API
  const [events, setEvents] = useState([])

  // loading → controls loading UI
  const [loading, setLoading] = useState(true)

  // error → stores an error message if fetch fails
  const [error, setError] = useState('')

  // expandedId → stores which card is expanded (null = none)
  const [expandedId, setExpandedId] = useState(null)

function formatTimeTo12Hour(timeStr) {
  if (!timeStr) return ''
  const parts = String(timeStr).split(':')
  const hour = parseInt(parts[0], 10)
  if (Number.isNaN(hour)) return String(timeStr).slice(0, 5)
  const minute = parts[1] ? parts[1].slice(0, 2) : '00'
  const period = hour >= 12 ? 'PM' : 'AM'
  const h12 = ((hour + 11) % 12) + 1
  return `${h12}:${minute} ${period}`
}

  // useEffect runs ONCE when the component loads
  useEffect(() => {
    let mounted = true  // prevents updates if component unmounts mid-fetch

    const load = async () => {
      setLoading(true) // show loading UI

      try {
        // Fetch events from API
        const res = await fetch(`${API_URL}/events`)
        if (!res.ok) throw new Error('Failed to load events')

        const data = await res.json()

        // Filter out soft-deleted events
        const active = Array.isArray(data)
          ? data.filter(ev => Number(ev.deleted || 0) === 0)
          : []

        // Only update state if component is still mounted
        if (mounted) setEvents(active)

      } catch (err) {
        console.error('Error fetching events:', err)

        if (mounted) {
          setError(err.message || 'Failed to load events')
          setEvents([]) // show empty list in case of failure
        }
      } finally {
        if (mounted) setLoading(false) // hide loading UI
      }
    }

    load()

    // Cleanup function if component unmounts
    return () => { mounted = false }
  }, [])
  // Empty array [] = run only once


  // =======================
  //  CONDITIONAL RENDERING
  // =======================

  if (loading) {
    // If loading, show loading screen and stop here
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    )
  }

  if (error) {
    // If there's an error, show error UI
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      </div>
    )
  }

  if (!events.length) {
    // If no events exist, show empty state UI
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-100">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mx-auto mb-4">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No events found</h2>
          <p className="text-sm text-gray-500">There are no active events scheduled right now.</p>
        </div>
      </div>
    )
  }


  // Helper to turn numeric recurrence value into readable label
  const recurrenceLabel = (code) => {
    const num = Number(code || 0)
    switch (num) {
      case 1: return 'Weekly'
      case 2: return 'Daily'
      case 3: return 'Monthly'
      case 4: return 'Yearly'
      case 5: return 'Weekdays'
      case 6: return 'Weekends'
      default: return 'No recurrence'
    }
  }


  return (
    <div className="p-6">

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Library Events
          </h1>
          <p className="text-sm text-gray-600">Upcoming and recurring events at a glance</p>
        </div>
      </div>


      {/* Grid of event cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {events.map(ev => {

          // Determine if THIS card is expanded
          const isExpanded = expandedId === ev.Event_ID

          return (
            <motion.div
              key={ev.Event_ID}
              

              // Basic card styling + visual highlight if expanded
              className={`bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden cursor-pointer event-card-expand ${isExpanded ? 'ring-2 ring-indigo-200' : 'hover:shadow-lg'}`}

              data-expanded={isExpanded}

              // When you click the card:
              // - If it was expanded, collapse it.
              // - If it was collapsed, expand it.
              onClick={() => setExpandedId(isExpanded ? null : ev.Event_ID)}

              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setExpandedId(isExpanded ? null : ev.Event_ID)
                }
              }}
            >


              {/* Event Image */}
              <div className="relative w-full h-48 bg-gray-100">
                {ev.Image_URL ? (
                  <img
                    src={ev.Image_URL}
                    alt={ev.Title || 'Event image'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
              </div>


              {/* Main event content */}
              <div className="p-4 space-y-2">

                {/* Title + recurrence badge + expand/collapse text */}
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {ev.Title || 'Untitled Event'}
                  </h2>

                  <div className="flex items-center gap-2">
                    {/* Show recurrence label only if non-zero */}
                    {Number(ev.recurring || 0) !== 0 && (
                      <span className="text-xs font-medium px-2 py-1 rounded bg-indigo-50 text-indigo-700">
                        {recurrenceLabel(ev.recurring)}
                      </span>
                    )}

                    <span className="text-xs text-gray-400">
                      {isExpanded ? 'Click to collapse' : 'Click to expand'}
                    </span>
                  </div>
                </div>


                {/* Event date/time */}
                <div className="text-sm text-gray-500">
                  {ev.Event_Date ? new Date(ev.Event_Date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  {ev.Start_Time ? ` • ${formatTimeTo12Hour(ev.Start_Time)}` : ''}
                  {ev.End_Time ? ` - ${formatTimeTo12Hour(ev.End_Time)}` : ''}
                </div>


                {/* EXPANDED / COLLAPSED DETAILS */}
                <AnimatePresence initial={false}>

                  {isExpanded ? (
                    // If card expanded → show full details
                    <motion.div
                      key="expanded"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 border-t border-gray-200 space-y-2">
                        {ev.Details ? (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {ev.Details}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            No additional details provided.
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <div className="text-xs text-gray-500">
                            Recurrence: {recurrenceLabel(ev.recurring)}
                          </div>
                        </div>
                      </div>
                    </motion.div>

                  ) : (
                    // If collapsed → show preview (line clamp)
                    <motion.div
                      key="collapsed"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      
                    </motion.div>
                  )}

                </AnimatePresence>

              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default Events
