import './FeedbackUI.css'
export const LoadingOverlay = ({loading, loadMessage}) => {
    if(!loading) return null;
    return(
        <div className="loading-overlay">
            <div className="book-loader-container">
                <div className="book-loader">
                    <div className="book-base">
                        <div className="book-left"></div>
                        <div className="book-right"></div>
                    </div>
                    <div className="book-page"></div>
                    <div className="book-page"></div>
                    <div className="book-page"></div>
                    <div className="book-spine"></div>
                </div>
                <span className="loading-text loading-dots">
                    {loadMessage || 'Loading'}
                </span>
            </div>
        </div>
    )
}

export const SuccessPopup = ({successMessage}) => {
    if(!successMessage) return null;
    return (
    <div className="success-popup">
        <div className="success-popup-content">
            <span className="success-icon">✓</span>
            <span className="success-text">{successMessage}</span>
        </div>
    </div>
    )
}

export const ErrorPopup = ({errorMessage}) => {
    if(!errorMessage) return null;
    return (
        <div className="error-message">{errorMessage}</div>
    )
}