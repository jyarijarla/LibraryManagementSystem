import React, { useState, useRef, useEffect } from 'react';

// users: array of user objects
// value: selected userId
// onChange: function(userId)
function UserDropdown({ users, value, onChange, allLabel }) {
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

  const selectedUser = users.find(u => (u.studentId || u.username) === value || u.username === value || (u.id === '' && value === ''));

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        placeholder="Select user..."
        value={selectedUser ? (selectedUser.id === '' ? (typeof allLabel !== 'undefined' ? allLabel : 'All Students') : `${selectedUser.studentId || selectedUser.username} - ${selectedUser.firstname} ${selectedUser.lastname}`) : search}
        onChange={e => { setSearch(e.target.value); setOpen(true); onChange(''); }}
        onFocus={() => setOpen(true)}
        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%' }}
        autoComplete="off"
      />
      {open && (
        <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', maxHeight: '220px', overflowY: 'auto', zIndex: 10 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px', color: '#888' }}>No students found</div>
          ) : (
            filtered.map(u => (
              <div
                key={u.id === '' ? 'all-students' : u.id}
                onClick={() => { onChange(u.id === '' ? '' : (u.studentId || u.username)); setOpen(false); setSearch(''); }}
                style={{ padding: '10px', cursor: 'pointer', background: (value === (u.studentId || u.username) || (u.id === '' && value === '')) ? '#f3f4f6' : '#fff', borderBottom: '1px solid #eee' }}
              >
                {u.id === ''
                  ? (typeof allLabel !== 'undefined' ? allLabel : 'All Students')
                  : (<><strong>{u.studentId || u.username}</strong> — {u.firstname} {u.lastname}</>)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default UserDropdown;