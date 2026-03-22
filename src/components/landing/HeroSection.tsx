import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import appPreview from "@/assets/app-preview.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden flex flex-col items-center">
      {/* Aurora ambient blurs */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-600/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[-100px] right-[-200px] w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[100px] left-[-200px] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero text - centered */}
      <div className="relative z-10 container mx-auto px-4 pt-36 md:pt-48 pb-10 text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] mb-8">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Now in Public Beta</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-[80px] font-extrabold text-white leading-[1.05] tracking-[-0.02em] mb-6">
            Everything You
            <br />
            Need to{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">Learn</span>
          </h1>

          <p className="text-lg md:text-xl text-[#a1a1aa] max-w-xl mx-auto mb-10 leading-relaxed">
            Track and Grow is your all-in-one gamified learning platform. Plan, track,
            earn points, and redeem rewards — all in one place.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild className="rounded-full text-base px-8 h-12 gap-2 group bg-white text-black hover:bg-white/90 border-0 font-semibold">
              <Link to="/signup">
                Get Started Free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="rounded-full text-base px-6 h-12 gap-2 text-[#a1a1aa] hover:text-white hover:bg-white/[0.06] border border-white/[0.1]">
              <Link to="/about">
                <Play className="w-4 h-4" />
                See in Action
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* App preview with glow */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="relative z-10 container mx-auto px-4 mt-16 md:mt-20"
      >
        <div className="relative max-w-6xl mx-auto">
          {/* Glow orb behind preview */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-gradient-to-r from-indigo-600/30 via-violet-600/20 to-blue-600/30 rounded-full blur-[100px] pointer-events-none" />
          <img
            src={appPreview}
            alt="Track and Grow dashboard preview"
            className="relative w-full rounded-2xl border border-white/[0.08] shadow-2xl"
          />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
