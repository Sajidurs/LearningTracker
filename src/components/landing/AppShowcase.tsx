import { motion } from "framer-motion";

import noteImg from "@/assets/Note.png";
import dashboardImg from "@/assets/Dashboard.png";
import learningImg from "@/assets/Learning Jounerys.png";
import calendarImg from "@/assets/Calender.png";

const screenshots = [
  {
    title: "Rich Notes",
    description: "Capture thoughts and study guides directly within your workflow.",
    image: noteImg
  },
  {
    title: "Performance Tracking",
    description: "Analyze your learning analytics and study time with precision.",
    image: dashboardImg
  },
  {
    title: "Learning Journeys",
    description: "Organize your subjects into structured paths for better retention.",
    image: learningImg
  },
  {
    title: "Smart Calendar",
    description: "Plan your weeks and schedule topics with ease.",
    image: calendarImg
  }
];

const AppShowcase = () => {
  return (
    <section className="py-24 bg-black relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400 mb-4 block">Immersive Experience</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Designed for Focus</h2>
          <p className="text-[#a1a1aa] max-w-2xl mx-auto text-lg">
            Experience a beautifully crafted interface that stays out of your way and helps you concentrate on what matters most: learning.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {screenshots.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col group"
            >
              <div className="relative aspect-[9/19] rounded-[2rem] border-8 border-[#1a1a1a] bg-[#1a1a1a] overflow-hidden shadow-2xl mb-6 group-hover:scale-[1.02] transition-transform duration-500">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
              <p className="text-[#a1a1aa] text-sm leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AppShowcase;
