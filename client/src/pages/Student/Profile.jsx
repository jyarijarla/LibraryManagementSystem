import { useState, useEffect } from 'react'

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api'


  
export default function Profile() {


    const [form, setForm] = useState({First_Name: '', Last_Name: '', User_Email: '', User_Phone: '', Date_Of_Birth: ''})
    const userID = localStorage.getItem('userID')
    const token = localStorage.getItem('token')

    useEffect(() => {
        

        const load = async () => {
            const res = await fetch(`${API_URL}/students/${userID}`, {

                headers: {Authorization: `Bearer ${token}`}


            })
            const load = await res.json()
            if (!res.ok) {
                alert("Update failed: " + data.message)
                return
}

            const data = await res.json()
            setForm(data)

        }
        load()
    }, [])

    

const handleUpdate = async () => {
    const res = await fetch(`${API_URL}/students/${userID}`, {

        method: 'PUT',
        headers: {

            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
    })
    if (res.ok) {

        localStorage.setItem('user', JSON.stringify(form)) // updates the topbar
        alert('Profile updated successfully!')

    }


}
    return (

        <div className="student-profile-page">
    <h2>Edit Profile</h2>

            <label>First Name</label>
            <input
                value={form.First_Name}
                onChange={(e) => setForm({ ...form, First_Name: e.target.value })}
            />

            <label>Last Name</label>
            <input
                value={form.Last_Name}
                onChange={(e) => setForm({ ...form, Last_Name: e.target.value })}
            />

            <label>Email</label>
            <input
                value={form.Email}
                onChange={(e) => setForm({ ...form, Email: e.target.value })}
            />
            <label>Phone</label>
            <input
                value={form.Phone}
                onChange={(e) => setForm({ ...form, Phone: e.target.value})}
            
            />

            <label>DOB</label>
            <input
            
                value = {form.DOB}
                onChange = {(e) => setForm({ ...form, DOB: e.target.value})}
            />

            <button className="student-btn-primary" onClick={handleUpdate}>
                Save Changes
            </button>


        </div>
    )

}

