import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WorkStatus = () => {
  const navigate = useNavigate();
  return (
    <div className='flex flex-col w-full h-full bg-white p-6'>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
          title="Go Back"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Work Status</h1>
          <p className="text-sm font-medium text-gray-500">Module coming soon: Track employee daily status and work updates</p>
        </div>
      </div>
      <div className='flex flex-1 justify-center items-center'>
        <Soon_GIF className='w-40 h-40 m-auto' />
      </div>
    </div>
  );
};

export default WorkStatus;
