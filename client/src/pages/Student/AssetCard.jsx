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
    const response = await axios.post(`${API_URL}/borrow`,
        { userID: localStorage.getItem("userId"), assetID: assetID },{
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
        })
    return response.data;
}
async function holdAsset(assetID) {
    const response = await axios.post(`${API_URL}/borrow`,
        { userID: localStorage.getItem("userId"), assetID: assetID },{
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
        })
    return response.data;
}
async function returnAsset(borrowID) {
    const response = await axios.post(`${API_URL}/`,
        { userID: localStorage.getItem("userId"), assetID: assetID },{
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
        })
    return response.data;
}
export function AssetCard({ assetType, getAsset, onAssetChange }) {
    console.log("Re-rendered")
    const { closeOverlay } = useOverlay();
    const { setLoading } = useLoading();
    const assetSelected = getAsset();
    const handleBorrow = async() => {
        setLoading({ isLoading: true })
        try {
            await borrowAsset(assetSelected.Asset_ID);
            console.log("Borrowed asset")
            await onAssetChange();
        } catch (error) {
            console.error("Borrow failed", error);
        } finally {
            setLoading({ isLoading: false })
        }
    } 
    const handleHold = async() => {
        setLoading({ isLoading: true })
        try {
            await holdAsset(assetSelected.Asset_ID);
            console.log("Held asset")
            await onAssetChange();
        } catch (error) {
            console.error("Hold failed", error);
        } finally {
            setLoading({ isLoading: false })
        }
    }
    const handleReturn = async() => {
        setLoading({ isLoading: true })
        try {
            await returnAsset(assetSelected.Asset_ID);
            await onAssetChange();
        } catch (error) {
            console.error("Return failed", error)
        } finally {
            setLoading({ isLoading: false })
        }
    }
    return (
        <div key={assetSelected} className='asset-card-content '>
            <div className='asset-card-header'>
                <svg width="24" height="24" viewBox="0 0 24 24" className='asset-close-button' aria-label='close' onClick={ () => {
                        closeOverlay()}
                    }>
                    <path className='asset-close-x' d="M4 4 L20 20 M20 4 L4 20" stroke="black" strokeWidth="2"/>
                </svg>
            </div>
            <div className='asset-card-scroll-wrapper'>
                <div className='asset-card-inner-content'>
                    <div className='asset-card-section'>
                        <div className='asset-card-image-content asset-card-section-col'>
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
                        <div className='asset-card-asset-details asset-card-section-col'>
                            <span className='asset-card-button-section'>
                                <span className='asset-card-button-helper'><small>Available Copies: {assetSelected.Available_Copies || assetSelected.Availability}/{assetSelected.Copies || 1}</small></span>
                                <span className='asset-card-button-container'>
                                    <button className='asset-card-button' onClick={handleBorrow}>
                                        {'Borrow'}
                                    </button>
                                    <button className='asset-card-button' onClick={handleHold}>
                                        {'Hold'}
                                    </button>
                                </span>
                            </span>
                            <span className='asset-card-button-section'>
                                <span className='asset-card-button-container'>
                                    <button className='asset-card-button'>Waitlist</button>
                                </span>
                            </span>
                            <span className='asset-card-button-section'>
                                <span className='asset-card-button-container'>
                                    <button className='asset-card-button' onClick={handleReturn}>Return</button>
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}