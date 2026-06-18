// Typed fetch helper for admin API calls.
// Automatically attaches the admin JWT token from localStorage.
// Throws on non-OK responses with the server error message.

const BASE = (import.meta.env.VITE_API_URL || '') + '/api/admin';

function getToken(): string | null {
  return localStorage.getItem('adminToken');
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        msg = data.error || msg;
      }
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Server returned non-JSON response. Make sure VITE_API_URL env variable is set to your backend URL and the site is redeployed.');
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; owner: { email: string } }>('POST', '/auth/login', { email, password }),

  // Dashboard
  getStats: () => request<DashboardStats>('GET', '/dashboard/stats'),

  // Users
  getUsers: (q?: string) => request<User[]>('GET', `/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  suspendUser: (id: number, suspended: boolean) =>
    request<{ ok: boolean; status: string }>('PATCH', `/users/${id}/suspend`, { suspended }),

  // Brokers
  getBrokers: (q?: string) => request<Broker[]>('GET', `/brokers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  suspendBroker: (id: number, suspended: boolean) =>
    request<{ ok: boolean; status: string }>('PATCH', `/brokers/${id}/suspend`, { suspended }),

  // Requirements
  getRequirements: (q?: string) =>
    request<Requirement[]>('GET', `/requirements${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  deleteRequirement: (id: number) => request<{ ok: boolean }>('DELETE', `/requirements/${id}`),

  // Offers
  getOffers: (q?: string) => request<Offer[]>('GET', `/offers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  deleteOffer: (id: number) => request<{ ok: boolean }>('DELETE', `/offers/${id}`),

  // Listings
  getListings: (q?: string) => request<Listing[]>('GET', `/listings${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  deleteListing: (id: number) => request<{ ok: boolean }>('DELETE', `/listings/${id}`),

  // Logs
  getLogs: () => request<AdminLog[]>('GET', '/logs'),
};

// ---- Types ----
export interface DashboardStats {
  totalUsers: number;
  totalBrokers: number;
  totalRequirements: number;
  totalOffers: number;
  totalListings: number;
  activeUsers: number;
  suspendedUsers: number;
  activeBrokers: number;
  suspendedBrokers: number;
  openRequirements: number;
  closedRequirements: number;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  status: 'active' | 'pending';
  city: string | null;
  createdAt: string;
}

export interface Broker {
  id: number;
  email: string;
  businessName: string | null;
  phone: string | null;
  city: string | null;
  dealerType: 'new' | 'used' | 'both' | null;
  status: 'active' | 'pending';
  createdAt: string;
  listingCount: number;
}

export interface Requirement {
  id: number;
  description: string;
  status: 'open' | 'closed';
  vehicleType: 'new' | 'used';
  city: string | null;
  state: string | null;
  budgetMax: string | null;
  createdAt: string;
  buyerEmail: string | null;
  buyerName: string | null;
  brandName: string | null;
  modelName: string | null;
}

export interface Offer {
  id: number;
  price: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  variant: string | null;
  year: number | null;
  dealerName: string | null;
  dealerLocation: string | null;
  createdAt: string;
  buyerEmail: string | null;
  brokerEmail: string | null;
  brokerName: string | null;
  brandName: string | null;
  modelName: string | null;
}

export interface Listing {
  id: number;
  year: number;
  price: string;
  status: 'active' | 'sold';
  city: string | null;
  kmDriven: number | null;
  fuelType: string | null;
  transmission: string | null;
  createdAt: string;
  brokerEmail: string | null;
  brokerName: string | null;
  brandName: string | null;
  modelName: string | null;
}

export interface AdminLog {
  id: number;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}
