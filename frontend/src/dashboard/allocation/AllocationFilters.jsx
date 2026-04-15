import React, { useState, useEffect } from 'react';
import { Layers, Filter, MapPin } from 'lucide-react';
import { fetchFilterOptions } from '../../api/allocationApi';
import MultiSelectDropdown from '../../components/MultiSelectDropdown';

const AllocationFilters = ({ filters, setFilters }) => {
    const [departments, setDepartments] = useState([]);
    const [locations, setLocations] = useState([]);

    useEffect(() => {
        const loadOptions = async () => {
            const options = await fetchFilterOptions();
            if (options) {
                if (options.departments) setDepartments(options.departments);
                if (options.locations) setLocations(options.locations);
            }
        };
        loadOptions();
    }, []);

    const selectedDeptArray = Array.isArray(filters.department) 
        ? filters.department 
        : (filters.department && filters.department !== 'All Departments' ? [filters.department] : []);

    return (
        <div className="flex gap-2 flex-wrap items-center">
            {/* Department Filter remains as the primary filter */}
            <MultiSelectDropdown
              options={departments}
              selectedValues={selectedDeptArray}
              onChange={(vals) => setFilters({ ...filters, department: vals })}
              placeholder="Select Departments"
              icon={Layers}
            />
        </div>
    );
};

export default AllocationFilters;
