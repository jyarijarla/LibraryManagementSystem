import './FeedbackUI.css'
import { createContext, useContext, useState } from 'react'

const OverlayContext = createContext();
export const OverlayProvider = ({ children }) => {
    const [overlayContent, setOverlayContent] = useState(null);
    return (
        <OverlayContext.Provider value={{setOverlayContent}}>
            {overlayContent && (
                <div className='overlay-wrapper'>
                    {overlayContent}
                </div>
            )}
            {children}
        </OverlayContext.Provider>
    )
};

export const useOverlay = () => useContext(OverlayContext);