/**
 * LocationContext.tsx
 * Provides a selected Tamil Nadu location (state-wide or a specific district)
 * throughout the app. Only Tamil Nadu and its districts are supported.
 */
import React, { createContext, useContext, useState } from 'react';

export const TN_DISTRICTS = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
  'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanyakumari',
  'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam',
  'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram',
  'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni',
  'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupattur',
  'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Vellore', 'Villupuram',
  'Virudhunagar',
] as const;

export type TNDistrict = typeof TN_DISTRICTS[number];

/** 'Tamil Nadu' means show all districts; otherwise a specific district name */
export type LocationSelection = 'Tamil Nadu' | TNDistrict;

interface LocationContextValue {
  location: LocationSelection;
  setLocation: (loc: LocationSelection) => void;
}

const LocationContext = createContext<LocationContextValue>({
  location: 'Tamil Nadu',
  setLocation: () => {},
});

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<LocationSelection>('Tamil Nadu');
  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
