import Navbar from "@/components/landing/Navbar";
import FooterSection from "@/components/landing/FooterSection";
import { motion } from "framer-motion";
import { Target, Heart, Zap } from "lucide-react";

const AboutPage = () => {
  return (
    <div className="min-h-screen landing-dark">
      <Navbar />
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
            <h1 className="text-4xl font-bold text-white mb-4">About Track and Grow</h1>
            <p className="text-lg text-white/50">We believe learning should be joyful, structured, and rewarding.</p>
          </motion.div>

          <div className="space-y-8">
            {[
              { icon: Target, title: "Our Mission", text: "To help every learner break down complex subjects into achievable milestones, making education accessible and enjoyable for everyone." },
              { icon: Heart, title: "Our Vision", text: "A world where self-directed learning is empowered by smart tools — combining planning, tracking, and motivation in one seamless experience." },
              { icon: Zap, title: "Why Gamification?", text: "Research shows that reward systems increase engagement and retention. By earning points and redeeming rewards, learners stay motivated through even the toughest topics." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-5 p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{item.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <FooterSection />
    </div>
  );
};

export default AboutPage;
