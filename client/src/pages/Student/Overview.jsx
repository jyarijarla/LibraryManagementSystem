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

  const fetchAssets = async (assetType) => {
    try {
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
      
      switch(assetType) {
        case 'books': setBooks(sortedData); break;
        case 'cds': setCds(sortedData); break;
        case 'audiobooks': setAudiobooks(sortedData); break;
        case 'movies': setMovies(sortedData); break;
        case 'technology': setTechnology(sortedData); break;
        case 'study-rooms': setStudyRooms(sortedData); break;
        default: break;
      }
    } catch (error) {
      console.error(`Error fetching ${assetType}:`, error)
      // Don't throw - let it fail silently for individual assets
    }
  }

   const getCurrentAssetData = () => {
    switch(activeAssetTab) {
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
    switch(activeAssetTab) {
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
          { key: 'Copies', label: 'Quantity' }
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

  useEffect(() => {
    fetchData();
  }, [activeTab, activeAssetTab]);

  // -------------------- RENDER PLACEHOLDERS --------------------
  const renderOverview = () => (
    <div className="tab-content">
      <h2>Dashboard Overview</h2>
      
      <p>Currently Borrowed: {borrowRecords.filter(r => !r.Return_Date).length}</p>
      <ErrorPopup />
    </div>
  );

  const renderCellContent = (item, col, rowIndex) => {
    if (col.key === 'rowNum') {
      return rowIndex + 1
    }
    
    if (col.key === 'Availability') {
      return (
        <span className={`status-badge ${item[col.key] === 'Available' ? 'available' : 'unavailable'}`}>
          {item[col.key] || 'Available'}
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
