    import './FeedbackUI.css'
    import { createContext, useContext, useState } from 'react'

    const OverlayContext = createContext();
    export const OverlayProvider = ({ children }) => {
        const [overlayContent, setOverlayContent] = useState(null);
        const [refreshKey, setRefreshKey] = useState(0);
        const closeOverlay = () => setOverlayContent(null);
        const refreshOverlay = () => setRefreshKey(k => k+1);
        return (
            <OverlayContext.Provider value={{setOverlayContent, closeOverlay, refreshOverlay}}>
                {children} 
                {overlayContent && (
                    <div key={refreshKey} className='overlay-wrapper'>
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