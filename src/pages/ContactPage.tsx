import Navbar from "@/components/landing/Navbar";
import FooterSection from "@/components/landing/FooterSection";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

const ContactPage = () => {
  return (
    <div className="min-h-screen landing-dark">
      <Navbar />
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-lg">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
            <p className="text-white/50">Have a question? We'd love to hear from you.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-white mb-1 block">Name</label>
              <input
                type="text"
                placeholder="Your name"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] text-white text-sm placeholder:text-white/30 outline-none border border-white/10 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white mb-1 block">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] text-white text-sm placeholder:text-white/30 outline-none border border-white/10 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white mb-1 block">Message</label>
              <textarea
                rows={4}
                placeholder="How can we help?"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] text-white text-sm placeholder:text-white/30 outline-none border border-white/10 focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
            <Button className="w-full h-11">
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </motion.div>
        </div>
      </section>
      <FooterSection />
    </div>
  );
};

export default ContactPage;
