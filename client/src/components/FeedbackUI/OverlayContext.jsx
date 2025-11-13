import './FeedbackUI.css'
import { createContext, useContext, useState } from 'react'

const OverlayContext = createContext();
export const OverlayProvider = ({ children }) => {
    const [overlayContent, setOverlayContent] = useState(null);
    const closeOverlay = () => setOverlayContent(null);
    return (
        <OverlayContext.Provider value={{setOverlayContent, closeOverlay}}>
            {children} 
            {overlayContent && (
                <div className='overlay-wrapper'>
                    {overlayContent}
                </div>
            )}
        </OverlayContext.Provider>
    )
};

export const useOverlay = () => {
    const context = useContext(OverlayContext);
    if(!context) throw new Error("useOverlay needs to be in Overlay Provider");
    return context;
}