import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Sarah K.", role: "Language Learner", quote: "Track and Grow turned my chaotic study habits into a structured journey. The points system keeps me coming back every day!" },
  { name: "James T.", role: "Web Developer", quote: "I used this to plan my React learning path. The weekly planner is a game-changer for organizing complex topics." },
  { name: "Priya M.", role: "Medical Student", quote: "Breaking anatomy into weekly chunks with rewards made studying feel like a game. My retention improved significantly." },
];

const TestimonialsSection = () => {
  return (
    <section className="py-32 md:py-40 relative">
      <div className="absolute bottom-0 left-[-200px] w-[400px] h-[400px] bg-orange-500/6 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400 mb-4 block">Testimonials</span>
          <h2 className="text-4xl md:text-5xl lg:text-[52px] font-bold text-white mb-5 tracking-[-0.02em]">Loved by Learners</h2>
          <p className="text-[#a1a1aa] max-w-xl mx-auto text-lg leading-relaxed">See how others are transforming their learning experience.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="p-8 rounded-3xl bg-[#151515] border border-[#252525] hover:border-[#333] transition-all duration-300"
            >
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-orange-400 text-orange-400" />
                ))}
              </div>
              <p className="text-[15px] text-[#a1a1aa] mb-6 leading-relaxed">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-[#52525b]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
