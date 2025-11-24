import './AssetCard.css'
import axios from 'axios';
import { useOverlay } from '../../components/FeedbackUI/OverlayContext'
import { useLoading } from '../../components/FeedbackUI/LoadingContext'
import { useEffect, useState } from 'react';

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://librarymanagementsystem-z2yw.onrender.com/api'
const assetTypeMap = {
    'books': {
        table: 'book_inventory',
        attributes: [
            { key: 'ISBN', label: 'ISBN' },
            { key: 'Title', label: 'Title' },
            { key: 'Author', label: 'Author' },
            { key: 'Page_Count', label: 'Pages' },
            { key: 'Copies', label: 'Total Copies' },
            { key: 'Available_Copies', label: 'Available' }
        ]
    },
    'cds': {
        table: 'cd_inventory',
        attributes: [
            { key: 'Title', label: 'Title' },
            { key: 'Artist', label: 'Artist' },
            { key: 'Total_Tracks', label: 'Tracks' },
            { key: 'Total_Duration_In_Minutes', label: 'Duration (min)' },
            { key: 'Copies', label: 'Total Copies' },
            { key: 'Available_Copies', label: 'Available' }
        ]
    },
    'audiobooks': {
        table: 'audiobook_inventory',
        attributes: [
            { key: 'ISBN', label: 'ISBN' },
            { key: 'Title', label: 'Title' },
            { key: 'Author', label: 'Author' },
            { key: 'length', label: 'Length (min)' },
            { key: 'Copies', label: 'Total Copies' },
            { key: 'Available_Copies', label: 'Available' }
        ]
    },
    'movies': {
        table: 'movie_inventory',
        attributes: [
            { key: 'Title', label: 'Title' },
            { key: 'Release_Year', label: 'Year' },
            { key: 'Age_Rating', label: 'Rating' },
            { key: 'Available_Copies', label: 'Available' }
        ]
    },
    'technology': {
        table: 'technology_inventory',
        attributes: [
            { key: 'Model_Num', label: 'Model #' },
            { key: 'Type', label: 'Type' },
            { key: 'Description', label: 'Description' },
            { key: 'Copies', label: 'Quantity' }
        ]
    },
    'study-rooms': {
        table: 'study_room',
        attributes: [
            { key: 'Room_Number', label: 'Room Number' },
            { key: 'Capacity', label: 'Capacity' },
            { key: 'Availability', label: 'Status' }
        ]
    }
};

async function borrowAsset(assetID) {
    const response = await axios.post(`${API_URL}/borrow/${assetID}`,
        null,
        { headers: 
            {'Authorization': `Bearer ${localStorage.getItem('token')}`}
        }
    )
    return response.data;
}

async function holdAsset(assetID) {
    const response = await axios.post(`${API_URL}/hold/${assetID}`,
        null, 
        { headers: 
            {'Authorization': `Bearer ${localStorage.getItem('token')}`}
        }
    )
    return response.data;
}
async function waitlistAsset(assetID) {
    const response = await axios.post(`${API_URL}/waitlist/${assetID}`,
        null, 
        { headers: 
            {'Authorization': `Bearer ${localStorage.getItem('token')}`}
        }
    )
    return response.data;
}
async function returnAsset(borrowID) {
    const response = await axios.post(`${API_URL}/`,
        { userID: localStorage.getItem("userId"), assetID: assetID }, 
        { headers: 
            {'Authorization': `Bearer ${localStorage.getItem('token')}`}
        }
    )
    return response.data;
}
export function AssetCard({ assetType, getAsset, onAssetChange, setError }) {
    console.log("Re-rendered")
    const { closeOverlay } = useOverlay();
    const { setLoading } = useLoading();
    const assetSelected = getAsset();
    const attributes = assetTypeMap[assetType]?.attributes || [];
    const getDisplayName = (asset, type) => {
        if (!asset) return ''
        switch (type) {
            case 'books':
            case 'cds':
            case 'audiobooks':
            case 'movies':
                return asset.Title || asset.ISBN || `#${asset.Asset_ID}`
            case 'technology':
                return asset.Model_Num || asset.Type || asset.Description || `#${asset.Asset_ID}`
            case 'study-rooms':
                return asset.Room_Number ? `Room ${asset.Room_Number}` : `Room #${asset.Asset_ID}`
            default:
                return asset.Title || asset.Model_Num || asset.Room_Number || `#${asset.Asset_ID}`
        }
    }
    const handleBorrow = async () => {
        setLoading({ isLoading: true })
        try {
            await borrowAsset(assetSelected.Asset_ID);
            console.log("Borrowed asset")
            await onAssetChange();
        } catch (error) {
            console.error("Borrow failed", error);
            setError('Borrow failed')
        } finally {
            setLoading({ isLoading: false })
        }
    }
    const handleHold = async () => {
        setLoading({ isLoading: true })
        try {
            await holdAsset(assetSelected.Asset_ID);
            console.log("Held asset")
            await onAssetChange();
        } catch (error) {
            console.error("Hold failed", error);
            setError('Hold failed')
        } finally {
            setLoading({ isLoading: false })
        }
    }
    const handleReturn = async () => {
        setLoading({ isLoading: true })
        try {
            await returnAsset(assetSelected.Asset_ID);
            await onAssetChange();
        } catch (error) {
            console.error("Return failed", error)
            setError('Return failed')
        } finally {
            setLoading({ isLoading: false })
        }
    }
    const handleWaitlist = async () => {
        setLoading({ isLoading: true })
        try {
            await waitlistAsset(assetSelected.Asset_ID);
            await onAssetChange();
        } catch (error) {
            console.error("Waitlist failed", error)
            setError('Waitlist failed')
        } finally {
            setLoading({ isLoading: false })
        }
    }
    const fetchBorrowsOn = async (assetID) => {
        console.log(`Fetching user's borrows for ${assetID}`);
        const response = await fetch(`${API_URL}/borrow`)
    }
    return (
        <div key={assetSelected?.Asset_ID} className='asset-card-content'>
            <div className='asset-card-header'>
                <div className="asset-card-header-title">{getDisplayName(assetSelected, assetType)}</div>
                <div className='asset-close-button' onClick={closeOverlay} aria-label='Close details'>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </div>
            </div>

            <div className='asset-card-scroll-wrapper'>
                <div className='asset-card-inner-content'>
                    {/* Left Column: Image */}
                    <div className='asset-card-image-content'>
                        <img
                            className='asset-card-image'
                            src={
                                assetSelected.Image_URL
                                    ? `${assetSelected.Image_URL}`
                                    : `/assets/${assetType}/${assetSelected.Asset_ID}.png`
                            }
                            alt={assetSelected.Title || 'Asset Image'}
                            onLoad={(e) => {
                                e.target.style.display = 'block';
                                const placeholder = e.target.nextElementSibling;
                                if (placeholder) placeholder.style.display = 'none';
                            }}
                            onError={(e) => {
                                const imgExtList = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
                                const src = e.target.src;
                                const currentExt = src.split('.').pop().split('?')[0].toLowerCase();
                                const nextExtIndex = imgExtList.indexOf(currentExt) + 1;

                                if (nextExtIndex < imgExtList.length) {
                                    const nextExt = imgExtList[nextExtIndex];
                                    e.target.src = `/assets/${assetType}/${assetSelected.Asset_ID}.${nextExt}`;
                                } else {
                                    e.target.style.display = 'none';
                                    const placeholder = e.target.nextElementSibling;
                                    if (placeholder) placeholder.style.display = 'flex';
                                }
                            }}
                        />
                        <div className="asset-image-placeholder-card" style={{ display: 'none' }}>
                            <span>No Image</span>
                        </div>
                    </div>

                    {/* Right Column: Details & Actions */}
                    <div className='asset-card-asset-details'>
                        <div className="asset-attributes">
                            {attributes.map(attr => (
                                <div key={attr.key} className="asset-attribute-row">
                                    <span className="asset-attribute-label">{attr.label}</span>
                                    <span className="asset-attribute-value">
                                        {(assetSelected && (assetSelected[attr.key] !== undefined && assetSelected[attr.key] !== null))
                                            ? assetSelected[attr.key]
                                            : '-'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="asset-actions-container">
                            <div className="asset-availability-status">
                                <span>Availability</span>
                                <span className={`status-indicator ${assetSelected.Available_Copies > 0 ? 'available' : 'unavailable'}`}>
                                    <span className="dot">●</span>
                                    {assetSelected.Available_Copies > 0
                                        ? `${assetSelected.Available_Copies} of ${assetSelected.Copies || 1} available`
                                        : 'Currently Unavailable'
                                    }
                                </span>
                            </div>

                            <div className="asset-buttons-grid">
                                <button className='asset-btn asset-btn-primary' onClick={handleBorrow}>
                                    Borrow Now
                                </button>
                                <button className='asset-btn asset-btn-secondary' onClick={handleHold}>
                                    Place Hold
                                </button>
                                <button className='asset-btn asset-btn-secondary' onClick={handleWaitlist}>
                                    Join Waitlist
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}