import { useState, useEffect } from 'react'


const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://librarymanagementsystem-z2yw.onrender.com/api'


  
export default function Profile() {


    const [form, setForm] = useState({First_Name: '', Last_Name: '', User_Email: '', User_Phone: '', Date_Of_Birth: ''})
    const userID = localStorage.getItem('userId')
    const token = localStorage.getItem('token')

    useEffect(() => {
        
        console.log(">>> Effect running, userID=", userID);

        if (!userID) return;

        const load = async () => {

            console.log(">>> Fetching:", `${API_URL}/students/${userID}`);


            const res = await fetch(`${API_URL}/students/${userID}`, {

                headers: {Authorization: `Bearer ${token}`}


            })

            console.log(">>> Response status:", res.status);

            const result = await res.json()

            console.log(">>> Response JSON:", result);

            if (!res.ok) {

                alert("Failed: " + result.message)
                return
            }


            
            setForm({
  First_Name: result[0]?.First_Name ?? "",
  Last_Name: result[0]?.Last_Name ?? "",
  User_Email: result[0]?.User_Email ?? "",
  User_Phone: result[0]?.User_Phone ?? "",
  Date_Of_Birth: result[0]?.Date_Of_Birth ?? ""
});



        }
        load()
    }, [userID])

    

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
                value={form.User_Email}
                onChange={(e) => setForm({ ...form, User_Email: e.target.value })}
            />
            <label>Phone</label>
            <input
                value={form.User_Phone}
                onChange={(e) => setForm({ ...form, User_Phone: e.target.value})}
            
            />

            <label>Date_Of_Birth</label>
            <input
            
                value = {form.Date_Of_Birth.slice(0,10)} // yyyy-mm-dd
                onChange = {(e) => setForm({ ...form, Date_Of_Birth: e.target.value})}
            />

            <button className="student-btn-primary" onClick={handleUpdate}>
                Save Changes
            </button>


        </div>
    )

}

