import api from './axios';

export const submitFeedback = async (feedbackData) => {
    const res = await api.post('/feedback', feedbackData);
    return res.data;
};
