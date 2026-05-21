export const isValidPhoto = (url) => {
    if (!url || typeof url !== 'string') return false;
    const cleanUrl = url.trim().toLowerCase();
    if (cleanUrl === '' || ['n/a', 'null', 'undefined', 'placeholder'].includes(cleanUrl)) return false;
    return true;
};
