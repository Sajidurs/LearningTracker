import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent"}`}>
      <div className="container mx-auto flex items-center justify-between h-16 px-4 max-w-7xl">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Track and Grow</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/about" className="text-sm text-[#a1a1aa] hover:text-white transition-colors duration-200">About</Link>
          <Link to="/pricing" className="text-sm text-[#a1a1aa] hover:text-white transition-colors duration-200">Pricing</Link>
          <Link to="/contact" className="text-sm text-[#a1a1aa] hover:text-white transition-colors duration-200">Contact</Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" asChild className="text-[#a1a1aa] hover:text-white hover:bg-white/[0.06] rounded-full px-5 h-9 text-sm">
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild className="rounded-full px-5 h-9 text-sm bg-white text-black hover:bg-white/90 border-0 font-medium">
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-white">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/[0.06] px-4 pb-4 space-y-1">
          <Link to="/about" className="block text-sm text-[#a1a1aa] py-2.5 hover:text-white" onClick={() => setMobileOpen(false)}>About</Link>
          <Link to="/pricing" className="block text-sm text-[#a1a1aa] py-2.5 hover:text-white" onClick={() => setMobileOpen(false)}>Pricing</Link>
          <Link to="/contact" className="block text-sm text-[#a1a1aa] py-2.5 hover:text-white" onClick={() => setMobileOpen(false)}>Contact</Link>
          <div className="flex gap-3 pt-3">
            <Button variant="ghost" asChild className="flex-1 text-[#a1a1aa] border border-white/[0.1] rounded-full h-9">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild className="flex-1 rounded-full h-9 bg-white text-black hover:bg-white/90 border-0">
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
