import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { runBootSequence } from './BootCoordinator';

export const useBoot = () => {
  const dispatch = useDispatch();
  const boot = useSelector((state: any) => state.boot);

  useEffect(() => {
    if (boot?.status === 'idle') {
      runBootSequence(dispatch);
    }
  }, [boot?.status]);

  return boot;
};
