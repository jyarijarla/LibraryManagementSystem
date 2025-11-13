import './AssetCard.css'
import { useOverlay } from '../../components/FeedbackUI/OverlayContext'

export function AssetCard({ assetType, assetSelected }) {
    const { closeOverlay } = useOverlay();
    return (
        <div className='asset-card-content '>
            <div className='asset-card-header'>
                <svg width="24" height="24" viewBox="0 0 24 24" className='asset-close-button' aria-label='close' onClick={ () => closeOverlay()}>
                    <path className='asset-close-x' d="M4 4 L20 20 M20 4 L4 20" stroke="black" strokeWidth="2"/>
                </svg>
            </div>
            <div className='asset-card-scroll-wrapper'>
                <div className='asset-card-inner-content'>
                    <div className='asset-card-image-content'>
                        {Boolean(1) && <img className='asset-card-image'
                            src={
                            assetSelected.Image_URL 
                                ? `${assetSelected.Image_URL}` 
                                : `/assets/${assetType}/${assetSelected.Asset_ID}.png`
                            }
                            alt={assetSelected.Title || assetSelected.Room_Number || 'Asset'}
                            onLoad={(e) => {
                                e.target.style.display = 'block';
                                const placeholder = e.target.nextElementSibling;
                                if (placeholder) placeholder.style.display = 'none';
                            }}
                            onError={(e) => {
                                // Try other common extensions if PNG fails
                                const imgExtList = ['png', 'jpg', 'jpeg', 'gif']
                                //current image url
                                const imgURL = new URL(e.target.src);
                                const currExt = imgURL.pathname.split('.').pop().toLowerCase()
                                const nextExt = imgExtList[imgExtList.indexOf(currExt) + 1]
                                //try extension
                                if(nextExt){
                                    e.target.src = `/assets/${assetType}/${assetSelected.Asset_ID}.${nextExt}`
                                } else {
                                    //show placeholder
                                    e.target.style.display = 'none';
                                    const placeholder = e.target.nextElementSibling;
                                    if (placeholder) placeholder.style.display = 'flex';
                                }
                            }}
                            />
                            }
                        <div className="asset-image-placeholder-card">
                            <span>N/A</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}