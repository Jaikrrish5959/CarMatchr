import React, { createContext, useEffect, useState } from 'react';
import { API_BASE } from '../services/api';

export interface CatalogFeature {
  id: number;
  name: string;
}

export interface CatalogModel {
  id: number;
  name: string;
  imageUrl?: string | null;
  features: CatalogFeature[];
}

export interface CatalogBrand {
  id: number;
  name: string;
  logoUrl?: string | null;
  models: CatalogModel[];
}

interface CatalogContextType {
  brands: CatalogBrand[];
  refreshCatalog: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brands, setBrands] = useState<CatalogBrand[]>([]);

  const refreshCatalog = async () => {
    const res = await fetch(`${API_BASE}/api/catalog/brands`);
    const data = await res.json();
    setBrands(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    Promise.resolve()
      .then(() => refreshCatalog())
      .catch(() => setBrands([]));
  }, []);

  return (
    <CatalogContext.Provider value={{ brands, refreshCatalog }}>
      {children}
    </CatalogContext.Provider>
  );
};

export { CatalogContext };
