import React from 'react';
import { useNavigate } from 'react-router-dom';
import AddProjectPanel from './AddProjectPanel';

const AddProjectPage = () => {
    const navigate = useNavigate();

    const handleDone = () => {
        navigate('/info/projects', { state: { projectAdded: true } });
    };

    return (
        <div className="w-full h-full overflow-y-auto bg-white">
            <AddProjectPanel
                isOpen={true}
                pageMode={true}
                onClose={handleDone}
                onAdd={handleDone}
            />
        </div>
    );
};

export default AddProjectPage;
