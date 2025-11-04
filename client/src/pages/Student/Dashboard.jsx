import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Dashboard.css';

const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://librarymanagementsystem-z2yw.onrender.com/api';

function StudentDashboard() {
  // -------------------- ROUTER & NAV --------------------
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // -------------------- TABS --------------------
  const [activeTab, setActiveTab] = useState('overview');
  const [activeAssetTab, setActiveAssetTab] = useState('books');

  // -------------------- DATA STATES --------------------
  const [books, setBooks] = useState([]);
  const [cds, setCds] = useState([]);
  const [audiobooks, setAudiobooks] = useState([]);
  const [movies, setMovies] = useState([]);
  const [technology, setTechnology] = useState([]);
  const [studyRooms, setStudyRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [borrowRecords, setBorrowRecords] = useState([]);

  // -------------------- UI STATES --------------------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [assetForm, setAssetForm] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now());

  // -------------------- TAB HANDLERS --------------------
  const changeTab = (tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    if (tab === 'assets') {
      params.set('assetTab', activeAssetTab);
    }
    setSearchParams(params);
  };

  const changeAssetTab = (assetTab) => {
    setActiveAssetTab(assetTab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'assets');
    params.set('assetTab', assetTab);
    setSearchParams(params);
  };

  // -------------------- LOGOUT --------------------
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  // -------------------- FETCH DATA (PLACEHOLDER) --------------------
  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'overview') {
        // Fetch all data for overview - don't fail if one fails
        console.log('Fetching overview data...')
        await Promise.allSettled([
          fetchAssets('books').catch(e => console.error('Books error:', e)),
          fetchAssets('cds').catch(e => console.error('CDs error:', e)),
          fetchAssets('audiobooks').catch(e => console.error('Audiobooks error:', e)),
          fetchAssets('movies').catch(e => console.error('Movies error:', e)),
          fetchAssets('technology').catch(e => console.error('Technology error:', e)),
          fetchAssets('study-rooms').catch(e => console.error('Study rooms error:', e)),
          //fetchStudents().catch(e => console.error('Students error:', e)),
          fetchBorrowRecords().catch(e => console.error('Borrow records error:', e))
        ])
        console.log('Overview data fetch completed')
      } else if (activeTab === 'assets') {
        await fetchAssets(activeAssetTab)
      } //else if (activeTab === 'students') {
        //await fetchStudents()
       else if (activeTab === 'records') {
        await fetchBorrowRecords()
      } else if (activeTab === 'reports') {
        await fetchReports()
      }
    } catch (err) {
      console.error('Error in fetchData:', err)
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, activeAssetTab]);

  // -------------------- RENDER PLACEHOLDERS --------------------
  const renderOverview = () => (
    <div className="tab-content">
      <h2>Dashboard Overview</h2>
      
      <p>Currently Borrowed: {borrowRecords.filter(r => !r.Return_Date).length}</p>
      {error && <div className="error">{error}</div>}
    </div>
  );

  const renderAssets = () => {
      const columns = getAssetTableColumns()
      const data = getCurrentAssetData()
      
      // Get appropriate button text
      const getAddButtonText = () => {
        if (activeAssetTab === 'study-rooms') {
          return '+ Reserve Study Room'
        }
        return `+ Add ${activeAssetTab.slice(0, -1)}`
      }
  
      return (
        <div className="tab-content">
          <div className="section-header">
            <h2>{activeAssetTab.charAt(0).toUpperCase() + activeAssetTab.slice(1)}</h2>
            <button className="add-button" onClick={openAddAssetModal}>
              {getAddButtonText()}
            </button>
          </div>
  
          <ErrorPopup errorMessage={error} />
  
          {/* Sub-tabs for different asset types */}
          <div className="asset-tabs">
            <button 
              className={`asset-tab ${activeAssetTab === 'books' ? 'active' : ''}`}
              onClick={() => changeAssetTab('books')}
            >
              📚 Books
            </button>
            <button 
              className={`asset-tab ${activeAssetTab === 'cds' ? 'active' : ''}`}
              onClick={() => changeAssetTab('cds')}
            >
              💿 CDs
            </button>
            <button 
              className={`asset-tab ${activeAssetTab === 'audiobooks' ? 'active' : ''}`}
              onClick={() => changeAssetTab('audiobooks')}
            >
              🎧 Audiobooks
            </button>
            <button 
              className={`asset-tab ${activeAssetTab === 'movies' ? 'active' : ''}`}
              onClick={() => changeAssetTab('movies')}
            >
              🎬 Movies
            </button>
            <button 
              className={`asset-tab ${activeAssetTab === 'technology' ? 'active' : ''}`}
              onClick={() => changeAssetTab('technology')}
            >
              💻 Technology
            </button>
            <button 
              className={`asset-tab ${activeAssetTab === 'study-rooms' ? 'active' : ''}`}
              onClick={() => changeAssetTab('study-rooms')}
            >
              🚪 Study Rooms
            </button>
          </div>
  
          <div className="cards-container">
            {data.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>No {activeAssetTab} found</p>
              </div>
            ) : (
              data.map((item, index) => (
                <div key={item.Asset_ID} className="asset-card">
                  <div className="card-header">
                    <span className="card-number">#{index + 1}</span>
                    <div className="card-actions">
                      <button 
                        className="icon-btn edit-icon" 
                        onClick={() => openEditAssetModal(item)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="icon-btn delete-icon" 
                        onClick={() => openDeleteModal(item)}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
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
    };

  
  const renderBorrowRecords = () => <div className="tab-content"><h2>Inventory</h2></div>;
  const renderReports = () => <div className="tab-content"><h2>Reports</h2></div>;

  // -------------------- MAIN RENDER --------------------
  return (
    <div className="dashboard-container">
      <nav className="student-navbar">
        <div className="student-navbar-content">
          <div className="student-navbar-left">
            <h2 className="student-navbar-title">📚 Library Management System</h2>
          </div>
          <div className="student-navbar-right">
            <span className="student-navbar-role">Student</span>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>

      {loading && <div className="loading">Loading...</div>}
      {successMessage && <div className="success">{successMessage}</div>}

      <div className="dashboard-content">
        <div className="tabs-container">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => changeTab('overview')}>Overview</button>
          <button className={activeTab === 'assets' ? 'active' : ''} onClick={() => changeTab('assets')}>Assets</button>
          
          <button className={activeTab === 'inventory' ? 'active' : ''} onClick={() => changeTab('inventory')}>Inventory</button>
          <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => changeTab('reports')}>Reports</button>
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'assets' && renderAssets()}
       
        {activeTab === 'inventory' && renderBorrowRecords()}
        {activeTab === 'reports' && renderReports()}
      </div>
    </div>
  );
}

export default StudentDashboard;
