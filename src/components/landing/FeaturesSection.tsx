import { BookOpen, Calendar, BarChart3, Trophy, Target, Gift } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: BookOpen, title: "Learning Journeys", description: "Create structured paths for any topic. Break complex subjects into manageable steps.", size: "lg" },
  { icon: Calendar, title: "Weekly Planner", description: "Drag-and-drop topics into weekly slots. Visualize your schedule at a glance.", size: "sm" },
  { icon: BarChart3, title: "Progress Analytics", description: "Track completion rates, points earned, and learning streaks with rich charts.", size: "sm" },
  { icon: Target, title: "Points System", description: "Earn points for every completed topic. Stay motivated with measurable progress.", size: "sm" },
  { icon: Trophy, title: "Gamification", description: "Level up, unlock achievements, and celebrate milestones along the way.", size: "sm" },
  { icon: Gift, title: "Reward Redemption", description: "Set personal rewards and redeem them with earned points. You deserve it!", size: "lg" },
];

const FeaturesSection = () => {
  return (
    <section className="py-32 md:py-40 relative">
      {/* Aurora glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400 mb-4 block">Features</span>
          <h2 className="text-4xl md:text-5xl lg:text-[52px] font-bold text-white mb-5 tracking-[-0.02em]">
            Unmatched Productivity
          </h2>
          <p className="text-[#a1a1aa] max-w-xl mx-auto text-lg leading-relaxed">
            A complete system that combines planning, tracking, and motivation.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className={`group relative p-8 rounded-3xl bg-[#151515] border border-[#252525] hover:border-[#333] transition-all duration-300 overflow-hidden ${
                feature.size === "lg" ? "lg:col-span-2" : ""
              }`}
            >
              {/* Subtle inner glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />

              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center mb-5 group-hover:border-indigo-500/30 transition-colors duration-300">
                  <feature.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-[15px] text-[#a1a1aa] leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
