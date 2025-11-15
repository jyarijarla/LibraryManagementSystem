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
            attributes: []
        },
        'study-rooms': {
            table: 'study_room',
            attributes: []
        }
      };
const fetchAsset = async(assetID) => {
    console.log(`Fetching asset ${assetID}`)
    try {
        const response = await axios.get(`${API_URL}/assets/${assetID}`);
        const assetData = response.data;
        return assetData
    } catch (error) {
        if (error.response){
            console.error(`Failed to fetch asset ${assetID}:`, 
                error.response.status, error.response.data);
        } else if(error.request) {
            console.error(`No response for asset ${assetID}`, error.request);
        } else {
            console.error(`Error fetching asset ${assetID}:`, error.message);
        }
        throw error;
    }
}

export function AssetCard({ assetSelected }) {
    const { closeOverlay } = useOverlay();
    const { setLoading } = useLoading();
    const [asset, setAsset] = useState(null);
    useEffect(() => {
        const loadData = async() =>{
            setLoading({ isLoading: true });
            try{
                const asset = await fetchAsset(assetSelected);
                setAsset(asset);
            } catch (error) {
                console.error("Error loading asset:" ,error)
                closeOverlay();
            } finally {
                setLoading({ isLoading: true });
            }
        }
        loadData();
    }, [assetSelected])
    return (
        <div className='asset-card-content '>
            <div className='asset-card-header'>
                <svg width="24" height="24" viewBox="0 0 24 24" className='asset-close-button' aria-label='close' onClick={ () => {
                        document.getElementById("root").classList.remove('overlay-open');
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
                            <span className='asset-card-button-container'>
                                <button className='asset-card-button'>{`${assetSelected.Available_Copies}/${assetSelected.Copies}`}</button>
                                <button className='asset-card-button'>Test</button>
                                <button className='asset-card-button'>Test</button>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}