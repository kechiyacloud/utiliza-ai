import React from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

/**
 * A reusable phone input component with country code picker.
 * Styled to match the application's design system.
 */
const PhoneInputField = ({ value, onChange, onBlur, error, placeholder = "Enter phone number" }) => {
    // Extract dial code and number from the value
    // value is usually "919551416338" or "+919551416338"
    const [localNumber, setLocalNumber] = React.useState('');
    const [dialCode, setDialCode] = React.useState('91'); // Default to India
    const [country, setCountry] = React.useState('in');

    // Sync local state with incoming value
    React.useEffect(() => {
        if (!value) {
            setLocalNumber('');
            return;
        }
        
        // If value starts with dialCode, strip it for the local input
        if (value.startsWith(dialCode)) {
            setLocalNumber(value.slice(dialCode.length));
        } else if (value.startsWith('+' + dialCode)) {
            setLocalNumber(value.slice(dialCode.length + 1));
        } else {
            setLocalNumber(value);
        }
    }, [value, dialCode]);

    const handleInternalChange = (newNumber) => {
        const cleaned = newNumber.replace(/\D/g, '');
        setLocalNumber(cleaned);
        // Always send full number back: dialCode + cleaned
        onChange(dialCode + cleaned, { dialCode, country });
    };

    const handleCountryChange = (fullValue, data) => {
        const newDialCode = data.dialCode;
        setDialCode(newDialCode);
        setCountry(data.countryCode);
        // Update parent with new dialCode + existing localNumber
        onChange(newDialCode + localNumber, data);
    };

    return (
        <div className="w-full">
            <style>
                {`
                .custom-phone-container .react-tel-input .flag-dropdown {
                    border: none !important;
                    background: transparent !important;
                    position: static !important;
                    width: 100% !important;
                    height: 100% !important;
                }
                .custom-phone-container .react-tel-input .selected-flag {
                    width: 100% !important;
                    height: 100% !important;
                    padding: 0 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background: transparent !important;
                    position: relative !important;
                }
                .custom-phone-container .react-tel-input .selected-flag .flag {
                    position: absolute !important;
                    top: 50% !important;
                    margin-top: -5px !important;
                    left: 12px !important;
                }
                .custom-phone-container .react-tel-input .selected-flag .arrow {
                    position: absolute !important;
                    top: 50% !important;
                    margin-top: -2px !important;
                    left: 36px !important;
                    border-top-color: #6b7280 !important;
                }
                .custom-phone-container .react-tel-input .country-list {
                    margin-top: 4px !important;
                    border-radius: 0.5rem !important;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
                    z-index: 50 !important;
                    width: 250px !important;
                }
                .custom-phone-container .react-tel-input .country-list .search {
                    padding: 8px !important;
                }
                .custom-phone-container .react-tel-input .country-list .search-box {
                    width: 100% !important;
                    border-radius: 0.375rem !important;
                }
                `}
            </style>
            
            <div className={`custom-phone-container flex items-stretch h-[38px] border rounded-md transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 ${
                error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
            }`}>
                {/* Segment 1: Country Picker (Flag Only) */}
                <div className="flex-shrink-0 flex items-center justify-center bg-gray-50/50 border-r border-gray-200 min-w-[56px]">
                    <PhoneInput
                        country={country}
                        onChange={handleCountryChange}
                        inputStyle={{ display: 'none' }} // Hide the internal input
                        buttonClass="!border-none !bg-transparent !h-full !w-full !flex !items-center !justify-center"
                        containerClass="!w-full !h-full"
                        dropdownClass="custom-dropdown"
                        enableSearch={true}
                    />
                </div>

                {/* Segment 2: Fixed Dial Code */}
                <div className="flex-shrink-0 flex items-center px-3 bg-gray-100/50 text-gray-500 font-bold text-xs border-r border-gray-200 min-w-[45px] justify-center">
                    +{dialCode}
                </div>

                {/* Segment 3: Local Number Input */}
                <input
                    type="text"
                    value={localNumber}
                    onChange={(e) => handleInternalChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 text-sm bg-transparent outline-none placeholder:text-gray-400"
                />
            </div>
        </div>
    );
};

export default PhoneInputField;
