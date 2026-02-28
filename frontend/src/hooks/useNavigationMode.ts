import { useNavigationContext } from '../components/layout/NavigationProvider';

export type { NavigationMode } from '../components/layout/NavigationProvider';

export const useNavigationMode = () => {
  return useNavigationContext();
};
