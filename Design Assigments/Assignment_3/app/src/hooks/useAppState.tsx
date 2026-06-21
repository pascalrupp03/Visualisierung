/* eslint-disable react-refresh/only-export-components */
import { useState, createContext, useContext, type ReactNode } from 'react';
import type { RentOverlayMode, UserData, View } from '../types/data';

interface AppContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  userData: UserData;
  setUserData: (data: UserData) => void;
  hasStarted: boolean;
  setHasStarted: (started: boolean) => void;
  selectedIncomeYear: number;
  setSelectedIncomeYear: (year: number) => void;
  selectedDistrict: string | null;
  setSelectedDistrict: (district: string | null) => void;
  rentOverlayMode: RentOverlayMode;
  setRentOverlayMode: (mode: RentOverlayMode) => void;
  resetToStart: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_USER_DATA: UserData = { age: 25, salary: 2500, apartmentSize: 40 };

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [userData, setUserData] = useState<UserData>(INITIAL_USER_DATA);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedIncomeYear, setSelectedIncomeYear] = useState(2025);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>('Innere Stadt');
  const [rentOverlayMode, setRentOverlayMode] = useState<RentOverlayMode>('average');

  const resetToStart = () => {
    setCurrentView('landing');
    setHasStarted(false);
    setUserData(INITIAL_USER_DATA);
    setSelectedIncomeYear(2025);
    setSelectedDistrict('Innere Stadt');
    setRentOverlayMode('average');
  };

  return (
    <AppContext.Provider value={{
      currentView, setCurrentView, userData, setUserData, hasStarted, setHasStarted,
      selectedIncomeYear, setSelectedIncomeYear,
      selectedDistrict, setSelectedDistrict, rentOverlayMode, setRentOverlayMode,
      resetToStart,
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
