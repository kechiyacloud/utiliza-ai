export const encodeId = (id) => {
    if (!id) return '';
    try {
        return btoa(id).replace(/=/g, '');
    } catch (e) {
        return id;
    }
};

export const decodeId = (encoded) => {
    if (!encoded) return '';
    try {
        // Check if it's already a raw ID (has CD- or @)
        if (encoded.startsWith('CD-') || encoded.includes('@')) {
            return encoded;
        }
        
        // Add back padding if needed
        let padding = '';
        if (encoded.length % 4 !== 0) {
            padding = '='.repeat(4 - (encoded.length % 4));
        }
        return atob(encoded + padding);
    } catch (e) {
        return encoded;
    }
};
