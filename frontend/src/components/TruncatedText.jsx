import React from 'react';

const TruncatedText = ({ text, className = "", maxWidth = "250px" }) => {
    if (!text) return null;

    return (
        <div 
            className={`truncate ${className}`}
            style={{ 
                maxWidth,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }}
            title={text}
        >
            {text}
        </div>
    );
};

export default TruncatedText;
