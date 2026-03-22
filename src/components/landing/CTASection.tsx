import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-32 md:py-40 relative overflow-hidden">
      {/* Aurora backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-600/20 via-violet-600/15 to-blue-600/20 rounded-full blur-[150px] pointer-events-none" />

      <div className="container mx-auto px-4 max-w-7xl">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          {/* Glowing logo */}
          <div className="relative mx-auto w-20 h-20 mb-10">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl blur-xl opacity-50" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-9 h-9 text-white" />
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-white mb-5 tracking-[-0.02em]">
            Join the Movement
          </h2>
          <p className="text-[#a1a1aa] mb-10 text-lg max-w-md mx-auto leading-relaxed">
            Join thousands of learners who are achieving their goals with structure and joy.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild className="rounded-full text-base px-8 h-12 gap-2 group bg-white text-black hover:bg-white/90 border-0 font-semibold">
              <Link to="/signup">
                Get Started — It's Free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
