import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

const steps: Step[] = [
  {
    target: '#tour-node-panel',
    content: 'Drag nodes from here to the canvas.',
  },
  {
    target: '#tour-canvas',
    content: 'Build your flow on the canvas.',
  },
  {
    target: '#tour-run-panel',
    content: 'View and manage runs here.',
  },
];

export interface TourHandle {
  start: () => void;
}

const Tour = forwardRef<TourHandle>((_props, ref) => {
  const tourKey = 'flowEditorTourCompleted';
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(tourKey)) {
      setRun(true);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    start: () => {
      localStorage.removeItem(tourKey);
      setRun(true);
    },
  }));

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(tourKey, 'true');
      setRun(false);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      callback={handleCallback}
    />
  );
});

export default Tour;

