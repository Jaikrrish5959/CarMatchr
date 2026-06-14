import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';

const Layout: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/logo.png" alt="CarMatchr" style={{ height: '32px', width: 'auto', display: 'block', borderRadius: '4px' }} />
                CarMatchr
              </div>
              <p className="footer-desc">
                The reverse marketplace for used cars. Post your requirements and let verified brokers bring the best offers to you.
              </p>
            </div>
            <div>
              <div className="footer-heading">For Buyers</div>
              <Link to="/register" className="footer-link">Post a Requirement</Link>
              <Link to="/register" className="footer-link">How It Works</Link>
              <Link to="/login" className="footer-link">Log In</Link>
            </div>
            <div>
              <div className="footer-heading">For Brokers</div>
              <Link to="/register?role=broker" className="footer-link">Register as Broker</Link>
              <Link to="/login" className="footer-link">Broker Login</Link>
              <span className="footer-link">Pricing</span>
            </div>
            <div>
              <div className="footer-heading">Company</div>
              <span className="footer-link">About Us</span>
              <span className="footer-link">Privacy Policy</span>
              <span className="footer-link">Terms of Service</span>
            </div>
          </div>
          <div className="footer-bottom">
            &copy; {new Date().getFullYear()} CarMatchr. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
