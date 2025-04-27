// pages/model_training.tsx (or model_training.jsx if you're using JavaScript)

import React, { useState, useRef, useEffect } from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

const ModelTraining = () => {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup timer when component unmounts
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTraining = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-3xl font-bold mb-6">Model Training</h1>

      <button
        onClick={startTraining}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
      >
        Start Training
      </button>

      <div className="w-full max-w-md mt-10">
        <ProgressPrimitive.Root
          value={progress}
          max={100}
          className="relative overflow-hidden bg-gray-200 rounded-full h-6 mt-4"
        >
          <ProgressPrimitive.Indicator
            style={{ width: `${progress}%` }}
            className="bg-blue-500 h-full transition-all duration-300 ease-in-out"
          />
        </ProgressPrimitive.Root>
        <p className="text-center mt-4 font-semibold text-gray-700">{progress}% Completed</p>
      </div>

      <p className="text-gray-500 text-xs mt-8">
        Learn more about{' '}
        <a
          href="https://radix-ui.com/primitives/docs/components/progress"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-blue-600"
        >
          Radix Progress
        </a>
      </p>
    </div>
  );
};

export default ModelTraining;
