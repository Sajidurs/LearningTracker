import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  interval: string;
  features: string[];
  sort_order: number;
}

const PricingSection = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from("plans")
        .select("id, name, slug, price, interval, features, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (data) {
        setPlans(data.map(p => ({
          ...p,
          features: Array.isArray(p.features) ? (p.features as string[]) : [],
        })));
      }
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const formatPrice = (price: number) => `$${(price / 100).toFixed(0)}`;
  const midIndex = Math.floor(plans.length / 2);

  return (
    <section className="py-32 md:py-40 relative" id="pricing">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-600/8 rounded-full blur-[160px] pointer-events-none" />

      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400 mb-4 block">Pricing</span>
          <h2 className="text-4xl md:text-5xl lg:text-[52px] font-bold text-white mb-5 tracking-[-0.02em]">Simple, Transparent Pricing</h2>
          <p className="text-[#a1a1aa] max-w-xl mx-auto text-lg leading-relaxed">Start free. Upgrade when you're ready.</p>
        </motion.div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-96 rounded-3xl border border-[#252525] bg-[#151515] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className={`grid gap-6 max-w-5xl mx-auto ${plans.length >= 3 ? "md:grid-cols-3" : plans.length === 2 ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
            {plans.map((plan, i) => {
              const highlighted = i === midIndex && plans.length >= 3;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className={`relative p-8 rounded-3xl border transition-all duration-300 ${
                    highlighted
                      ? "bg-[#151515] border-indigo-500/50 shadow-[0_0_60px_-20px_rgba(79,70,229,0.3)]"
                      : "bg-[#151515] border-[#252525] hover:border-[#333]"
                  }`}
                >
                  {highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-white mb-1 tracking-tight">{plan.name}</h3>
                  <div className="text-4xl font-bold text-white mb-1 tracking-tight">
                    {plan.price === 0 ? "$0" : formatPrice(plan.price)}
                    <span className="text-sm font-normal text-[#52525b] ml-1">
                      {plan.price === 0 ? "forever" : `/${plan.interval}`}
                    </span>
                  </div>
                  <div className="w-full h-px bg-[#252525] my-6" />
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-[#a1a1aa]">
                        <div className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-indigo-400" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className={`w-full rounded-full h-11 font-medium ${
                    highlighted
                      ? "bg-white text-black hover:bg-white/90 border-0"
                      : "bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]"
                  }`}>
                    <Link to={`/signup?plan=${plan.slug}`}>
                      {plan.price === 0 ? "Start Free" : `Get ${plan.name}`}
                    </Link>
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;
