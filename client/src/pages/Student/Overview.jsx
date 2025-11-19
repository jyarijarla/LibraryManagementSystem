import { useState } from "react";
import { ErrorPopup } from '../../components/FeedbackUI/FeedbackUI'
import { useOverlay } from '../../components/FeedbackUI/OverlayContext'
import { useLoading } from '../../components/FeedbackUI/LoadingContext'
const API_URL = window.location.hostname === 'localhost' 
? 'http://localhost:3000/api'
: 'https://librarymanagementsystem-z2yw.onrender.com/api'

export function Overview(){
  const { setLoading } = useLoading();
  return (
    <div className="tab-content">
      <div className="section-header"></div>

      <ErrorPopup errorMessage={error} />
    </div>
  )
}