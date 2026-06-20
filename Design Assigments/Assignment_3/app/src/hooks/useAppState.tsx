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
  selectedIncomeYear: number;
  setSelectedIncomeYear: (year: number) => void;
  selectedHousingYear: number;
  setSelectedHousingYear: (year: number) => void;
  selectedDistrict: string | null;
  setSelectedDistrict: (district: string | null) => void;
  showAverage: boolean;
  setShowAverage: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [userData, setUserData] = useState<UserData>({ age: 25, salary: 2500, apartmentSize: 40 });
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedIncomeYear, setSelectedIncomeYear] = useState(2025);
  const [selectedHousingYear, setSelectedHousingYear] = useState(2025);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>('Innere Stadt');
  const [showAverage, setShowAverage] = useState(false);

  // Provide the state and setters to the context
  // This allows any component within the AppProvider to access and modify the state
  return (
    <AppContext.Provider value={{ 
      currentView, setCurrentView, userData, setUserData, hasStarted, setHasStarted,
      selectedIncomeYear, setSelectedIncomeYear, selectedHousingYear, setSelectedHousingYear,
      selectedDistrict, setSelectedDistrict, showAverage, setShowAverage
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
