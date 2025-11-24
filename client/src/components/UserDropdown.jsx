import React, { useState, useRef, useEffect } from 'react';

// users: array of user objects
// value: selected userId
// onChange: function(userId)
function UserDropdown({ users, value, onChange, allLabel, multi = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef();

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Separate 'All Students' option and actual students
  const allOption = users.find(u => u.id === '');
  const studentOptions = users.filter(u => u.id !== '');
  const filteredStudents = studentOptions.filter(u => {
    const id = u.studentId || u.username || '';
    const username = u.username || '';
    const name = `${u.firstname || ''} ${u.lastname || ''}`;
    return (
      id.toLowerCase().includes(search.toLowerCase()) ||
      username.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase())
    );
  });
  // Only the first option is 'All Students', rest are actual students
  const filtered = allOption ? [allOption, ...filteredStudents] : filteredStudents;

  // Build selected set (support string or array value)
  const selectedSet = new Set(Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []));

  const displayText = (() => {
    if (multi) {
      // treat empty selection as "All"
      if ((!value || (Array.isArray(value) && value.length === 0)) && allOption) return typeof allLabel !== 'undefined' ? allLabel : 'All Students';
      const names = users.filter(u => u.id !== '' && selectedSet.has(u.studentId || u.username || u.id)).map(u => `${(u.firstname || u.name || '').trim()}${u.lastname ? ` ${u.lastname}` : ''}`.trim());
      if (names.length === 0) return 'Select users...';
      if (names.length <= 2) return names.join(', ');
      return `${names.slice(0,2).join(', ')} +${names.length - 2}`;
    }
    const selectedUser = users.find(u => (u.studentId || u.username) === value || u.username === value || (u.id === '' && value === ''));
    return selectedUser ? (selectedUser.id === '' ? (typeof allLabel !== 'undefined' ? allLabel : 'All Students') : `${(selectedUser.firstname || selectedUser.firstname === '') ? `${selectedUser.firstname || ''} ${selectedUser.lastname || ''}`.trim() : (selectedUser.name || '')}${(selectedUser.studentId || selectedUser.username) ? ` - ${selectedUser.studentId || selectedUser.username}` : ''}`) : search;
  })();

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        placeholder={multi ? 'Select users...' : 'Select user...'}
        value={displayText}
        onChange={e => { setSearch(e.target.value); setOpen(true); if (!multi) onChange(''); }}
        onFocus={() => setOpen(true)}
        readOnly={!multi}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e6eef8', background: '#fff', width: '100%', cursor: 'pointer', boxSizing: 'border-box', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        autoComplete="off"
      />
      {open && (
        <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', maxHeight: '240px', overflowY: 'auto', zIndex: 10 }}>
          <div style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
            <input
              type="search"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px', color: '#888' }}>No students found</div>
          ) : (
            filtered.map(u => {
              const idKey = u.id === '' ? '' : (u.studentId || u.username || u.id);
              const checked = multi ? selectedSet.has(idKey) : (value === idKey || (u.id === '' && value === ''));
              return (
                <div
                  key={u.id === '' ? 'all-students' : u.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (u.id === '' && multi) {
                      // All option selected -> empty array meaning all
                      onChange([]);
                      setOpen(false);
                      setSearch('');
                      return;
                    }
                    if (multi) {
                      const newSet = new Set(selectedSet);
                      if (newSet.has(idKey)) newSet.delete(idKey); else newSet.add(idKey);
                      onChange(Array.from(newSet));
                    } else {
                      onChange(u.id === '' ? '' : idKey);
                      setOpen(false);
                      setSearch('');
                    }
                  }}
                  style={{ padding: '10px', cursor: 'pointer', background: checked ? '#f3f4f6' : '#fff', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  {multi && (
                    <input type="checkbox" readOnly checked={checked} style={{ marginRight: 6 }} />
                  )}
                  {u.id === ''
                    ? (typeof allLabel !== 'undefined' ? allLabel : 'All Students')
                    : (
                      <>
                        <span style={{ marginRight: 8 }}>{`${(u.firstname || u.name || '').trim()}${(u.lastname ? ` ${u.lastname}` : '')}`.trim()}</span>
                        {(u.studentId || u.username) ? <strong> — {u.studentId || u.username}</strong> : null}
                      </>
                    )}
                </div>
              )
            })
          )}

          {/* Footer with Clear / Done for multi-select */}
          {multi && (
            <div style={{ borderTop: '1px solid #eee', padding: 8, display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#fff' }}>
              <button type="button" onClick={(e) => { e.stopPropagation(); onChange([]); setSearch(''); }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff' }}>Clear</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); setSearch(''); }} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff' }}>Done</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserDropdown;