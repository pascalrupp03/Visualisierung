/* eslint-disable react-refresh/only-export-components */
import { useState, createContext, useContext, type ReactNode } from 'react';
import type { UserData, View } from '../types/data';

interface AppContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  userData: UserData;
  setUserData: (data: UserData) => void;
  hasStarted: boolean;
  setHasStarted: (started: boolean) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  showAverage: boolean;
  setShowAverage: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [userData, setUserData] = useState<UserData>({ age: 25, salary: 2500, apartmentSize: 40 });
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2015);
  const [showAverage, setShowAverage] = useState(false);

  return (
    <AppContext.Provider value={{ 
      currentView, setCurrentView, userData, setUserData, hasStarted, setHasStarted,
      selectedYear, setSelectedYear, showAverage, setShowAverage
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppState must be used within an AppProvider');
  return context;
};
