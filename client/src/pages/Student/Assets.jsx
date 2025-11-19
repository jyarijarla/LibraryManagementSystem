import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ErrorPopup } from '../../components/FeedbackUI/FeedbackUI'
import { useOverlay } from '../../components/FeedbackUI/OverlayContext'
import { useLoading } from '../../components/FeedbackUI/LoadingContext'
import { AssetCard } from './AssetCard'
import { Search, BookOpen, Disc, Headphones, Film, Laptop, Building2, SearchX } from 'lucide-react'
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://librarymanagementsystem-z2yw.onrender.com/api'

const ASSET_TABS = [
    {
        id: 'books',
        label: 'Books',
        icon: BookOpen,
        placeholder: 'Search books...',
        activeClass: 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
    },
    {
        id: 'cds',
        label: 'CDs',
        icon: Disc,
        placeholder: 'Search CDs...',
        activeClass: 'bg-purple-50 text-purple-700 border-b-2 border-purple-500'
    },
    {
        id: 'audiobooks',
        label: 'Audiobooks',
        icon: Headphones,
        placeholder: 'Search audiobooks...',
        activeClass: 'bg-green-50 text-green-700 border-b-2 border-green-500'
    },
    {
        id: 'movies',
        label: 'Movies',
        icon: Film,
        placeholder: 'Search movies...',
        activeClass: 'bg-red-50 text-red-700 border-b-2 border-red-500'
    },
    {
        id: 'technology',
        label: 'Technology',
        icon: Laptop,
        placeholder: 'Search devices...',
        activeClass: 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
    },
    {
        id: 'study-rooms',
        label: 'Study Rooms',
        icon: Building2,
        placeholder: 'Search rooms...',
        activeClass: 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
    }
]

const renderCellContent = (item, col, rowIndex) => {
    if (col.key === 'rowNum') {
        return rowIndex + 1
    }

    if (col.key === 'Availability') {
        const availString = (item[col.key] === 1 ? 'available' : 'unavailable')
        return (
            <span className={`status-badge ${availString}`}>
                {availString}
            </span>
        )
    }

    if (col.key === 'Available_Copies') {
        return (
            <span className={`availability-indicator ${item[col.key] > 0 ? 'in-stock' : 'out-of-stock'}`}>
                {item[col.key] === null ? '-' : item[col.key]}
            </span>
        )
    }

    return item[col.key]
}

const getAssetImagePath = (assetType, assetId, extension = 'png') => {
    // Returns image path with specified extension
    // Default to .png, but can be .jpg, .jpeg, .gif, .webp, etc.
    return `/assets/${assetType}/${assetId}.${extension}`
}
export function Assets() {
    const [error, setErrorState] = useState('')
    const setError = (sendError) => {
        setErrorState(sendError)
        setTimeout(() => setError(''), 5000)
    }
    const { setLoading } = useLoading();
    const { setOverlayContent, refreshOverlay } = useOverlay();

    const [searchParams, setSearchParams] = useSearchParams()
    const [activeAssetTab, setActiveAssetTab] = useState(searchParams.get('type') || 'books')
    const [searchQuery, setSearchQuery] = useState('')
    const [availabilityFilter, setAvailabilityFilter] = useState('all')

    const [imageRefreshKey] = useState(() => Date.now()) // Cache buster for images

    // State for all asset types
    const [books, setBooks] = useState([])
    const [cds, setCds] = useState([])
    const [audiobooks, setAudiobooks] = useState([])
    const [movies, setMovies] = useState([])
    const [technology, setTechnology] = useState([])
    const [studyRooms, setStudyRooms] = useState([])

    const changeAssetTab = (assetTab) => {
        setActiveAssetTab(assetTab)
        setSearchQuery('')
        setAvailabilityFilter('all')
        const params = new URLSearchParams(searchParams)
        params.set('type', assetTab)
        setSearchParams(params)
    }

    const fetchAssets = async (assetType) => {
        console.log(`Fetching assets: ${assetType} from ${API_URL}/assets/${assetType}`)
        const response = await fetch(`${API_URL}/assets/${assetType}`)
        console.log(`Response status: ${response.status}`)
        if (!response.ok) {
            const errorText = await response.text()
            console.error(`Failed to fetch ${assetType}:`, errorText)
            throw new Error(`Failed to fetch ${assetType}: ${response.status}`)
        }
        const data = await response.json()
        console.log(`Received ${data.length} ${assetType}`, data)

        // Log images
        data.forEach(item => {
            if (item.Image_URL) {
                console.log(`Asset ${item.Asset_ID} has image:`, item.Image_URL)
            }
        })

        // Sort by Asset_ID in ascending order
        const sortedData = data.sort((a, b) => a.Asset_ID - b.Asset_ID)

        switch (assetType) {
            case 'books': setBooks(sortedData); break;
            case 'cds': setCds(sortedData); break;
            case 'audiobooks': setAudiobooks(sortedData); break;
            case 'movies': setMovies(sortedData); break;
            case 'technology': setTechnology(sortedData); break;
            case 'study-rooms': setStudyRooms(sortedData); break;
            default: break;
        }
    }
    const getCurrentAssetData = () => {
        switch (activeAssetTab) {
            case 'books': return books
            case 'cds': return cds
            case 'audiobooks': return audiobooks
            case 'movies': return movies
            case 'technology': return technology
            case 'study-rooms': return studyRooms
            default: return []
        }
    }
    const getAssetTableColumns = () => {
        switch (activeAssetTab) {
            case 'books':
                return [
                    { key: 'rowNum', label: '#' },
                    { key: 'ISBN', label: 'ISBN' },
                    { key: 'Title', label: 'Title' },
                    { key: 'Author', label: 'Author' },
                    { key: 'Page_Count', label: 'Pages' },
                    { key: 'Copies', label: 'Total Copies' },
                    { key: 'Available_Copies', label: 'Available' }
                ]
            case 'cds':
                return [
                    { key: 'rowNum', label: '#' },
                    { key: 'Title', label: 'Title' },
                    { key: 'Artist', label: 'Artist' },
                    { key: 'Total_Tracks', label: 'Tracks' },
                    { key: 'Total_Duration_In_Minutes', label: 'Duration (min)' },
                    { key: 'Copies', label: 'Total Copies' },
                    { key: 'Available_Copies', label: 'Available' }
                ]
            case 'audiobooks':
                return [
                    { key: 'rowNum', label: '#' },
                    { key: 'ISBN', label: 'ISBN' },
                    { key: 'Title', label: 'Title' },
                    { key: 'Author', label: 'Author' },
                    { key: 'length', label: 'Length (min)' },
                    { key: 'Copies', label: 'Total Copies' },
                    { key: 'Available_Copies', label: 'Available' }
                ]
            case 'movies':
                return [
                    { key: 'rowNum', label: '#' },
                    { key: 'Title', label: 'Title' },
                    { key: 'Release_Year', label: 'Year' },
                    { key: 'Age_Rating', label: 'Rating' },
                    { key: 'Available_Copies', label: 'Available' }
                ]
            case 'technology':
                return [
                    { key: 'rowNum', label: '#' },
                    { key: 'Model_Num', label: 'Model #' },
                    { key: 'Type', label: 'Type' },
                    { key: 'Description', label: 'Description' },
                    { key: 'Available_Copies', label: 'Available' }
                ]
            case 'study-rooms':
                return [
                    { key: 'rowNum', label: '#' },
                    { key: 'Room_Number', label: 'Room Number' },
                    { key: 'Capacity', label: 'Capacity' },
                    { key: 'Availability', label: 'Status' }
                ]
            default:
                return []
        }
    }
    const columns = getAssetTableColumns()
    const data = getCurrentAssetData()
    const dataRef = useRef();
    dataRef.current = data;

    const isAssetAvailable = (asset) => {
        if (typeof asset.Availability === 'number') return asset.Availability === 1
        if (typeof asset.Availability === 'string') return asset.Availability.toLowerCase().includes('avail')
        if (typeof asset.Available_Copies === 'number') return asset.Available_Copies > 0
        return true
    }

    const normalizedQuery = searchQuery.trim().toLowerCase()
    const displayedData = data.filter((item) => {
        const matchesAvailability =
            availabilityFilter === 'all' ||
            (availabilityFilter === 'available' && isAssetAvailable(item)) ||
            (availabilityFilter === 'unavailable' && !isAssetAvailable(item))

        const matchesSearch = !normalizedQuery || Object.values(item || {})
            .filter(value => typeof value === 'string' || typeof value === 'number')
            .some(value => String(value).toLowerCase().includes(normalizedQuery))

        return matchesAvailability && matchesSearch
    })

    const currentTabConfig = ASSET_TABS.find(tab => tab.id === activeAssetTab)

    const refreshAssets = async () => {
        await fetchAssets(activeAssetTab);
        refreshOverlay();
        console.log("Refetching assets")
    }
    useEffect(() => {
        const loadAsset = async () => {
            setLoading({ isLoading: true })
            setError('')
            try {
                await fetchAssets(activeAssetTab);
            } catch (err) {
                console.error('Error loading assets:', err)
                setError(err.message || 'Failed to fetch data')
            } finally {
                setLoading({ isLoading: false })
            }
        };
        loadAsset();
    }, [activeAssetTab])
    return (
        <div className="tab-content">
            <div className="section-header"></div>

            <ErrorPopup errorMessage={error} />

            {/* Sub-tabs for different asset types */}
            <div className="student-asset-toolbar">
                <div className="flex flex-wrap border-b border-gray-200 mb-4">
                    {ASSET_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`flex items-center gap-2 flex-1 min-w-[120px] px-4 py-3 text-sm font-medium transition-all duration-200 ${activeAssetTab === tab.id
                                ? tab.activeClass
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            onClick={() => changeAssetTab(tab.id)}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
                <div className="student-asset-search-row">
                    <div className="student-asset-input">
                        <Search size={18} className="student-asset-search-icon" />
                        <input
                            type="text"
                            placeholder={currentTabConfig?.placeholder || 'Search assets...'}
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                    </div>
                    <select
                        className="student-asset-filter"
                        value={availabilityFilter}
                        onChange={(event) => setAvailabilityFilter(event.target.value)}
                    >
                        <option value="all">All availability</option>
                        <option value="available">Available only</option>
                        <option value="unavailable">Checked out</option>
                    </select>
                    <div className="student-asset-count">
                        Showing:
                        <span>{displayedData.length}</span>
                        {displayedData.length === 1 ? ' item' : ' items'}
                    </div>
                </div>
            </div>

            <div className="cards-container">
                {displayedData.length === 0 ? (
                    <div className="empty-state">
                        <SearchX size={48} className="text-gray-300 mb-4" />
                        <p>No {activeAssetTab} found</p>
                    </div>
                ) : (
                    displayedData.map((item, index) => (
                        <div key={item.Asset_ID} className="asset-card" onClick={() => {
                            setOverlayContent(<AssetCard
                                assetType={activeAssetTab}
                                getAsset={() => dataRef.current.find(asset => asset.Asset_ID === item.Asset_ID)}
                                onAssetChange={refreshAssets}
                                setError={setError} />)
                        }}>
                            <div className="card-header">
                                <span className="card-number">#{index + 1}</span>

                            </div>

                            {/* Image Section */}
                            <div className="card-image">
                                <img
                                    src={
                                        item.Image_URL
                                            ? `${item.Image_URL}?t=${imageRefreshKey}`
                                            : `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'png')}?t=${imageRefreshKey}`
                                    }
                                    alt={item.Title || item.Room_Number || 'Asset'}
                                    onLoad={(e) => {
                                        e.target.style.display = 'block';
                                        const placeholder = e.target.nextElementSibling;
                                        if (placeholder) placeholder.style.display = 'none';
                                    }}
                                    onError={(e) => {
                                        // Try other common extensions if PNG fails
                                        const currentSrc = e.target.src;
                                        if (currentSrc.includes('.png')) {
                                            e.target.src = `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'jpg')}?t=${imageRefreshKey}`;
                                        } else if (currentSrc.includes('.jpg')) {
                                            e.target.src = `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'jpeg')}?t=${imageRefreshKey}`;
                                        } else if (currentSrc.includes('.jpeg')) {
                                            e.target.src = `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'gif')}?t=${imageRefreshKey}`;
                                        } else if (currentSrc.includes('.gif')) {
                                            e.target.src = `${getAssetImagePath(activeAssetTab, item.Asset_ID, 'webp')}?t=${imageRefreshKey}`;
                                        } else {
                                            // All extensions failed, show placeholder
                                            e.target.style.display = 'none';
                                            const placeholder = e.target.nextElementSibling;
                                            if (placeholder) placeholder.style.display = 'flex';
                                        }
                                    }}
                                />
                                <div className="image-placeholder-card">
                                    <span>N/A</span>
                                </div>
                            </div>

                            <div className="card-body">
                                {columns.slice(1).map(col => (
                                    <div key={col.key} className="card-field">
                                        <span className="field-label">{col.label}:</span>
                                        <span className="field-value">
                                            {renderCellContent(item, col, index)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
