import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLoading } from '../../components/FeedbackUI/LoadingContext';

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://librarymanagementsystem-z2yw.onrender.com/api';

export default function useBorrowerData() {
    const { setLoading } = useLoading();
    const [fines, setFines] = useState([]);
    const [loans, setLoans] = useState([]);
    const [holds, setHolds] = useState([]);
    const [history, setHistory] = useState([]);

    const [error, setErrorState] = useState('');
    const setError = (sendError) => {
        setErrorState(sendError);
        setTimeout(() => setErrorState(''), 5000);
    };

    const [processingId, setProcessingId] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAllData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAllData = async () => {
        setLoading({ isLoading: true });
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user.id || user.User_ID;

            if (!userId) throw new Error('User ID not found');

            const headers = { 'Authorization': `Bearer ${token}` };

            // 1. Fetch Fines
            const finesRes = await fetch(`${API_URL}/fines/user/${userId}`, { headers });
            if (finesRes.ok) {
                const finesData = await finesRes.json();
                setFines(finesData);
            }

            // 2. Fetch Borrows (Active & History)
            const borrowsRes = await fetch(`${API_URL}/borrow-records/user`, { headers });
            if (borrowsRes.ok) {
                const borrowsData = await borrowsRes.json();
                if (Array.isArray(borrowsData)) {
                    const activeLoans = borrowsData.filter(b => !b.Return_Date);
                    const returnedLoans = borrowsData.filter(b => b.Return_Date);
                    setLoans(activeLoans);
                    setHistory(returnedLoans);
                }
            }

            // 3. Fetch Holds
            const holdsRes = await fetch(`${API_URL}/holds/user`, { headers });
            if (holdsRes.ok) {
                const holdsData = await holdsRes.json();
                if (Array.isArray(holdsData)) {
                    setHolds(holdsData);
                }
            }

        } catch (err) {
            console.error('Error fetching borrower data:', err);
            setError(err.message);
        } finally {
            setLoading({ isLoading: false });
        }
    };

    const handleReturn = async (borrowID) => {
        setLoading({ isLoading: true });
        try {
            await axios.put(`${API_URL}/borrow/return/${borrowID}`,
                { userID: localStorage.getItem('userId') }, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }
            );
            fetchAllData();
        } catch (error) {
            console.error('Error returning asset:', error);
            setError(error.response?.data?.message || error.message);
        } finally {
            setLoading({ isLoading: false });
        }
    };

    const handlePayFine = async (fine) => {
        setProcessingId(fine.Borrow_ID);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/fines/${fine.Borrow_ID}/pay-online`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: fine.Fine_Amount
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Payment failed');
            }

            setSuccessMessage(`Payment successful for ${fine.Item_Title}`);
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchAllData(); // Refresh all data
        } catch (err) {
            console.error('Payment error:', err);
            alert(`Payment failed: ${err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const filterData = (data) => {
        if (!searchTerm) return data;
        return data.filter(item =>
            (item.Asset_Title && item.Asset_Title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.Item_Title && item.Item_Title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.Author && item.Author.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    };

    const unpaidFines = fines.filter(f => f.Status !== 'Paid' && f.Status !== 'Waived' && parseFloat(f.Fine_Amount) > 0);
    const paidFines = fines.filter(f => f.Status === 'Paid' || f.Status === 'Waived');

    const totalFinesAmount = unpaidFines.reduce((sum, f) => sum + parseFloat(f.Fine_Amount), 0);
    const activeHoldsCount = holds.filter(h => h.Status === 'Active').length;

    return {
        fines,
        loans,
        holds,
        history,
        error,
        setError,
        processingId,
        successMessage,
        setSuccessMessage,
        searchTerm,
        setSearchTerm,
        filterData,
        unpaidFines,
        paidFines,
        totalFinesAmount,
        activeHoldsCount,
        handleReturn,
        handlePayFine,
        fetchAllData
    };
}
