import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, HelpCircle, Video, Mail, Phone, MapPin, Globe, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface SupportItem {
  id: string;
  section: string;
  title: string;
  content: string | null;
  url: string | null;
  sort_order: number;
}

const getYoutubeEmbedUrl = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
};

const SupportPage = () => {
  const [items, setItems] = useState<SupportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("support_content").select("*").eq("is_active", true).order("sort_order");
      if (data) setItems(data as any);
      setLoading(false);
    };
    fetch();
  }, []);

  const guides = items.filter(i => i.section === "guide");
  const faqs = items.filter(i => i.section === "faq");
  const videos = items.filter(i => i.section === "video");
  const contacts = items.filter(i => i.section === "contact");
  const socials = items.filter(i => i.section === "social");

  const contactIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("email")) return <Mail className="w-4 h-4 text-primary" />;
    if (t.includes("phone")) return <Phone className="w-4 h-4 text-primary" />;
    if (t.includes("address")) return <MapPin className="w-4 h-4 text-primary" />;
    return <Globe className="w-4 h-4 text-primary" />;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Support & Help</h1>
        <p className="text-sm text-muted-foreground">Everything you need to get started and get help.</p>
      </div>

      {/* Quick Start Guide */}
      {guides.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Quick Start Guide</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {guides.map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl bg-card shadow-card border border-border"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{g.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{g.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Video Guides */}
      {videos.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Video className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Video Guides</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {videos.map((v) => {
              const embed = v.url ? getYoutubeEmbedUrl(v.url) : null;
              return (
                <div key={v.id} className="rounded-2xl bg-card shadow-card border border-border overflow-hidden">
                  {embed ? (
                    <div className="aspect-video">
                      <iframe src={embed} className="w-full h-full" title={v.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  ) : v.url ? (
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="block aspect-video bg-muted flex items-center justify-center">
                      <Video className="w-12 h-12 text-muted-foreground" />
                    </a>
                  ) : null}
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-foreground">{v.title}</h3>
                    {v.content && <p className="text-xs text-muted-foreground mt-1">{v.content}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-2">
            {faqs.map((f) => (
              <div key={f.id} className="rounded-2xl bg-card shadow-card border border-border overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === f.id ? null : f.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-medium text-foreground">{f.title}</span>
                  {openFaq === f.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {openFaq === f.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-sm text-muted-foreground">{f.content}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact & Social */}
      {(contacts.length > 0 || socials.length > 0) && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Contact Us</h2>
          </div>
          <div className="p-5 rounded-2xl bg-card shadow-card border border-border space-y-4">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                {contactIcon(c.title)}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.title}</p>
                  <p className="text-sm text-foreground">{c.content}</p>
                </div>
              </div>
            ))}
            {socials.length > 0 && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Follow Us</p>
                <div className="flex flex-wrap gap-2">
                  {socials.map((s) => (
                    <a key={s.id} href={s.url || "#"} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="rounded-full gap-1.5 hover:bg-muted cursor-pointer">
                        <Globe className="w-3 h-3" /> {s.title}
                      </Badge>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default SupportPage;
