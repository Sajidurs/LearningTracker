import { motion } from "framer-motion";

const steps = [
  { step: "01", title: "Pick a Subject", description: "Choose what you want to learn — a language, coding, music, anything." },
  { step: "02", title: "Break It Down", description: "Split it into topics and subtopics. Add videos, notes, and resources." },
  { step: "03", title: "Plan Your Weeks", description: "Drag topics into weekly slots. Set a target completion date." },
  { step: "04", title: "Learn & Earn", description: "Complete topics to earn points. Redeem rewards you set for yourself." },
];

const HowItWorksSection = () => {
  return (
    <section className="py-32 md:py-40 relative">
      <div className="absolute top-0 right-[-200px] w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[140px] pointer-events-none" />

      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400 mb-4 block">Process</span>
          <h2 className="text-4xl md:text-5xl lg:text-[52px] font-bold text-white mb-5 tracking-[-0.02em]">How It Works</h2>
          <p className="text-[#a1a1aa] max-w-xl mx-auto text-lg leading-relaxed">Four simple steps to transform your learning.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="relative p-8 rounded-3xl bg-[#151515] border border-[#252525] group hover:border-[#333] transition-all duration-300"
            >
              <div className="text-5xl font-black text-white/[0.04] absolute top-4 right-6 group-hover:text-white/[0.08] transition-colors duration-300">
                {s.step}
              </div>
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-5">
                  <span className="text-sm font-bold text-white">{s.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 tracking-tight">{s.title}</h3>
                <p className="text-sm text-[#a1a1aa] leading-relaxed">{s.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
