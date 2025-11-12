import './FeedbackUI.css'
import { LoadingOverlay } from './FeedbackUI';
import { createContext, useContext, useState } from 'react'

const LoadingContext = createContext();
export const LoadingProvider = ({ children }) => {
    const [{ isLoading, loadText }, setLoadingState] = useState({
        isLoading: false,
        loadText: 'Loading...'
    });

    const setLoading = (updates) => {
        alert(`setLoading called: ${JSON.stringify(updates)}`);
        setLoadingState(prev => ({...prev, ...updates}))
    }
    return (
        <LoadingContext.Provider value={{ isLoading, loadText, setLoading}}>
            <LoadingOverlay loading={isLoading} loadMessage={loadText} />
            {children}
        </LoadingContext.Provider>
    )
};

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if(!context) throw new Error("useLoading  needs to be in Loading Provider");
    return context;
}