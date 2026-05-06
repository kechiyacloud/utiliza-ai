import React from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

/**
 * A reusable phone input component with country code picker.
 * Styled to match the application's design system.
 */
const PhoneInputField = ({ value, onChange, error, placeholder = "Select phone number" }) => {
    return (
        <div className="phone-input-container w-full">
            <style>
                {`
                .react-tel-input .form-control {
                    width: 100% !important;
                    height: 38px !important;
                    font-size: 0.875rem !important;
                    border-radius: 0.375rem !important;
                    border: 1px solid ${error ? '#ef4444' : '#d1d5db'} !important;
                    background-color: ${error ? '#fef2f2' : '#ffffff'} !important;
                    padding-left: 48px !important;
                    transition: all 0.2s ease-in-out;
                    color: #374151;
                }
                .react-tel-input .form-control:focus {
                    border-color: #3b82f6 !important;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25) !important;
                    outline: none !important;
                }
                .react-tel-input .flag-dropdown {
                    border-radius: 0.375rem 0 0 0.375rem !important;
                    border: 1px solid ${error ? '#ef4444' : '#d1d5db'} !important;
                    border-right: none !important;
                    background-color: transparent !important;
                    width: 42px !important;
                }
                .react-tel-input .flag-dropdown.open {
                    background-color: #ffffff !important;
                }
                .react-tel-input .selected-flag {
                    width: 100% !important;
                    padding: 0 0 0 8px !important;
                }
                .react-tel-input .selected-flag .arrow {
                    left: 28px !important;
                }
                .react-tel-input .country-list {
                    border-radius: 0.375rem !important;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
                    border: 1px solid #d1d5db !important;
                    margin-top: 4px !important;
                }
                .react-tel-input .country-list .search {
                    padding: 8px !important;
                }
                .react-tel-input .country-list .search-box {
                    width: 100% !important;
                    border-radius: 0.375rem !important;
                    border: 1px solid #d1d5db !important;
                }
                .react-tel-input .country-list .country {
                    padding: 8px 12px !important;
                    font-size: 0.875rem !important;
                }
                .react-tel-input .country-list .country.highlight {
                    background-color: #eff6ff !important;
                }
                .react-tel-input .country-list .country:hover {
                    background-color: #f3f4f6 !important;
                }
                `}
            </style>
            <PhoneInput
                country={'in'}
                value={value}
                onChange={(phone) => onChange(phone)}
                enableSearch={true}
                placeholder={placeholder}
                inputProps={{
                    name: 'phone',
                    required: true,
                }}
                containerClass="phone-input-wrapper"
            />
        </div>
    );
};

export default PhoneInputField;
