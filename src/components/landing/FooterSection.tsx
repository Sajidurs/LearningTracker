import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const FooterSection = () => {
  return (
    <footer className="py-12 border-t border-[#1a1a1a]">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">Track and Grow</span>
          </Link>
          <div className="flex items-center gap-8 text-sm text-[#52525b]">
            <Link to="/about" className="hover:text-white transition-colors duration-200">About</Link>
            <Link to="/pricing" className="hover:text-white transition-colors duration-200">Pricing</Link>
            <Link to="/contact" className="hover:text-white transition-colors duration-200">Contact</Link>
          </div>
          <p className="text-xs text-[#52525b]">© 2026 Track and Grow. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
